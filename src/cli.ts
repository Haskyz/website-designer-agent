#!/usr/bin/env node
import { Command } from "commander";
import { runGen } from "./commands/gen";
import { runInitStyle } from "./commands/init-style";
import { runEdit } from "./commands/edit";
import { runRegen } from "./commands/regen";
import { runSceneInit } from "./commands/scene-init";
import { ASSET_TYPES } from "./types";

// load .env from cwd if present (Node >= 20.12)
try {
  process.loadEnvFile();
} catch {
  // no .env — fine, environment variables may be set directly
}

const program = new Command();

program
  .name("wda")
  .description(
    "Website Designer Agent — generate production frontend assets (backgrounds, icons, illustrations) instead of hand-drawing them in code."
  )
  .version("0.1.0");

program
  .command("gen")
  .description(`Generate one asset. Types: ${ASSET_TYPES.join(", ")}`)
  .argument("<type>", "asset type")
  .requiredOption("--desc <text>", "asset description")
  .requiredOption("--out <path>", "output file path: .webp (recommended), .png, or .jpg")
  .option("--provider <name>", "image provider: codex | openai | mock (default: codex if installed, else openai)")
  .option("--model <name>", "image model for openai provider (default: OPENAI_IMAGE_MODEL or gpt-image-1)")
  .option("--size <wxh>", "image size, defaults per asset type")
  .option("--quality <n>", "webp/jpg quality 1-100", "82")
  .option("--overwrite", "overwrite existing output file", false)
  .option("--transparent", "force transparent background (icon/decoration default to transparent)")
  .option(
    "--scene <id>",
    "coordinate this layer with others sharing the same scene id (see wda scene-init); requires the scene to already exist"
  )
  .option("--dry-run", "print the final prompt without generating", false)
  .action(async (type, opts) => {
    await runGen(type, opts);
  });

program
  .command("regen")
  .description("Regenerate one existing asset from its .meta.json sidecar, keeping the same path")
  .argument("<file>", "previously generated asset file")
  .option("--desc <text>", "replace the description to steer the new result")
  .option("--provider <name>", "image provider: codex | openai | mock")
  .option("--model <name>", "image model for openai provider")
  .option("--quality <n>", "webp/jpg quality 1-100", "82")
  .action(async (file, opts) => {
    await runRegen(file, opts);
  });

program
  .command("edit")
  .description("Edit an existing asset in place (img2img): keep the current take, adjust it")
  .argument("<file>", "existing image file to use as the base")
  .requiredOption("--desc <text>", "what to change")
  .option("--provider <name>", "image provider: codex | openai | mock")
  .option("--model <name>", "image model for openai provider")
  .option("--quality <n>", "webp/jpg quality 1-100", "82")
  .action(async (file, opts) => {
    await runEdit(file, opts);
  });

program
  .command("scene-init")
  .description(
    "Create .wda/scenes/<id>.md, a shared brief (camera, lighting, color) that keeps " +
      "multiple layers generated for the same scene visually consistent"
  )
  .argument("<id>", "scene id, referenced by wda gen --scene <id>")
  .requiredOption(
    "--desc <text>",
    "shared visual facts: camera angle, lighting direction, time of day, color grading, perspective"
  )
  .option("--overwrite", "replace an existing scene brief", false)
  .action((id, opts) => {
    runSceneInit(id, opts);
  });

program
  .command("init-style")
  .description("Create .wda/style.md, the project visual style anchor")
  .requiredOption("--desc <text>", "style direction, written by the calling agent or user")
  .option("--overwrite", "replace an existing style anchor", false)
  .action((opts) => {
    runInitStyle(opts);
  });

program.parseAsync().catch((err: unknown) => {
  console.error(`wda: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
