// Smallest end-to-end check: build output must generate files via mock provider.
// Run `pnpm build` first; `pnpm test` executes this against dist/cli.js.
const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CLI = path.resolve(__dirname, "..", "dist", "cli.js");

function run(args, cwd) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

test("gen icon with mock provider writes image + sidecars + default style anchor", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wda-test-"));
  const out = path.join(tmp, "demo", "star.png");

  const r = run(["gen", "icon", "--desc", "star icon", "--out", out, "--provider", "mock"], tmp);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(out), "png missing");
  assert.ok(fs.existsSync(path.join(tmp, "demo", "star.prompt.md")), "prompt sidecar missing");
  assert.ok(fs.existsSync(path.join(tmp, "demo", "star.meta.json")), "meta sidecar missing");
  assert.ok(fs.existsSync(path.join(tmp, ".wda", "style.md")), "default style anchor missing");

  const meta = JSON.parse(fs.readFileSync(path.join(tmp, "demo", "star.meta.json"), "utf8"));
  assert.strictEqual(meta.type, "icon");
  assert.strictEqual(meta.provider, "mock");
  assert.strictEqual(meta.size, "1024x1024");
  assert.strictEqual(meta.format, "png");
  assert.ok(meta.bytes > 0);

  // png must be resized to the requested size, not the raw 1x1 mock
  const png = fs.readFileSync(out);
  assert.strictEqual(png.readUInt32BE(16), 1024, "png width should be 1024");

  // webp output goes through the webp encoder
  const webpOut = path.join(tmp, "demo", "star.webp");
  const rw = run(
    ["gen", "icon", "--desc", "star icon", "--out", webpOut, "--provider", "mock"],
    tmp
  );
  assert.strictEqual(rw.status, 0, rw.stderr);
  assert.strictEqual(fs.readFileSync(webpOut).toString("ascii", 0, 4), "RIFF");

  // existing file without --overwrite must fail
  const r2 = run(["gen", "icon", "--desc", "star icon", "--out", out, "--provider", "mock"], tmp);
  assert.notStrictEqual(r2.status, 0, "should refuse to overwrite");

  // with --overwrite must succeed
  const r3 = run(
    ["gen", "icon", "--desc", "star icon", "--out", out, "--provider", "mock", "--overwrite"],
    tmp
  );
  assert.strictEqual(r3.status, 0, r3.stderr);

  // regen reuses the sidecar and overwrites in place
  const before = fs.statSync(out).mtimeMs;
  const r4 = run(["regen", path.join("demo", "star.png"), "--provider", "mock"], tmp);
  assert.strictEqual(r4.status, 0, r4.stderr);
  assert.ok(fs.statSync(out).mtimeMs >= before, "regen should rewrite the file");
  const meta2 = JSON.parse(fs.readFileSync(path.join(tmp, "demo", "star.meta.json"), "utf8"));
  assert.strictEqual(meta2.desc, "star icon", "regen without --desc keeps original desc");

  // regen on a file without sidecar fails clearly
  fs.writeFileSync(path.join(tmp, "foreign.png"), "x");
  const r5 = run(["regen", "foreign.png"], tmp);
  assert.notStrictEqual(r5.status, 0, "regen without meta.json should fail");

  // edit keeps the path, changes the pixels, records editDesc
  const pixelsBefore = fs.readFileSync(out);
  const r6 = run(
    ["edit", path.join("demo", "star.png"), "--desc", "make it darker", "--provider", "mock"],
    tmp
  );
  assert.strictEqual(r6.status, 0, r6.stderr);
  assert.ok(!fs.readFileSync(out).equals(pixelsBefore), "edit should change the image");
  const meta3 = JSON.parse(fs.readFileSync(path.join(tmp, "demo", "star.meta.json"), "utf8"));
  assert.strictEqual(meta3.editDesc, "make it darker");
  assert.strictEqual(meta3.desc, "star icon", "original desc preserved");

  // edit on a missing file fails clearly
  const r7 = run(["edit", "nope.png", "--desc", "x", "--provider", "mock"], tmp);
  assert.notStrictEqual(r7.status, 0, "edit without base file should fail");

  fs.rmSync(tmp, { recursive: true, force: true });
});

test("init-style writes anchor, dry-run prints prompt", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wda-test-"));

  const r = run(["init-style", "--desc", "quiet editorial SaaS style"], tmp);
  assert.strictEqual(r.status, 0, r.stderr);
  const anchor = fs.readFileSync(path.join(tmp, ".wda", "style.md"), "utf8");
  assert.match(anchor, /quiet editorial SaaS style/);

  const r2 = run(
    ["gen", "background", "--desc", "quiet mountain cabin", "--out", path.join(tmp, "bg.png"), "--dry-run"],
    tmp
  );
  assert.strictEqual(r2.status, 0, r2.stderr);
  assert.match(r2.stdout, /quiet mountain cabin/);
  assert.match(r2.stdout, /quiet editorial SaaS style/); // style anchor injected
  assert.match(r2.stdout, /Never do/); // negative base injected
  assert.ok(!fs.existsSync(path.join(tmp, "bg.png")), "dry-run must not write image");

  fs.rmSync(tmp, { recursive: true, force: true });
});

test("dry-run with no style anchor has no file side effects", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wda-test-"));

  const r = run(
    ["gen", "texture", "--desc", "subtle paper grain", "--out", path.join(tmp, "grain.webp"), "--dry-run"],
    tmp
  );
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /subtle paper grain/);
  assert.ok(!fs.existsSync(path.join(tmp, "grain.webp")), "dry-run must not write image");
  assert.ok(!fs.existsSync(path.join(tmp, ".wda", "style.md")), "dry-run must not create style anchor");

  fs.rmSync(tmp, { recursive: true, force: true });
});

test("scene-init + --scene injects the shared brief into every layer's prompt", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wda-test-"));

  // gen --scene before scene-init must fail clearly
  const rMissing = run(
    ["gen", "decoration", "--desc", "x", "--out", path.join(tmp, "d.png"), "--scene", "desk", "--dry-run"],
    tmp
  );
  assert.notStrictEqual(rMissing.status, 0, "gen --scene should fail when the scene does not exist");

  const rInit = run(
    ["scene-init", "desk", "--desc", "low afternoon sun from the left, warm 35mm film grain"],
    tmp
  );
  assert.strictEqual(rInit.status, 0, rInit.stderr);
  assert.ok(fs.existsSync(path.join(tmp, ".wda", "scenes", "desk.md")));

  const r1 = run(
    [
      "gen",
      "background",
      "--desc",
      "wooden desk",
      "--out",
      path.join(tmp, "bg.png"),
      "--scene",
      "desk",
      "--dry-run",
    ],
    tmp
  );
  const r2 = run(
    [
      "gen",
      "decoration",
      "--desc",
      "floating dust motes",
      "--out",
      path.join(tmp, "motes.png"),
      "--scene",
      "desk",
      "--dry-run",
    ],
    tmp
  );
  assert.strictEqual(r1.status, 0, r1.stderr);
  assert.strictEqual(r2.status, 0, r2.stderr);
  // both layers' prompts carry the same shared scene facts
  assert.match(r1.stdout, /low afternoon sun from the left/);
  assert.match(r2.stdout, /low afternoon sun from the left/);

  fs.rmSync(tmp, { recursive: true, force: true });
});
