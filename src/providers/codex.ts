import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import sharp from "sharp";
import { GeneratedImage, GenerateInput, ImageProvider } from "../types";

function tail(text: string, chars = 800): string {
  return text.length > chars ? "..." + text.slice(-chars) : text;
}

export function codexAvailable(): boolean {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
    execFileSync(cmd, ["codex"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates images through the local Codex CLI (ChatGPT subscription,
 * no API key). Codex writes the file into the workspace sandbox; we read
 * it back and hand the buffer to the shared compression pipeline.
 */
export class CodexImageProvider implements ImageProvider {
  readonly name = "codex";

  async generate(input: GenerateInput): Promise<GeneratedImage> {
    const tmpName = `.wda-tmp-${crypto.randomBytes(6).toString("hex")}.png`;
    const tmpPath = path.resolve(process.cwd(), tmpName);
    let lastStdout = "";
    let lastStderr = "";

    const prompt = [
      input.baseImage
        ? `Edit the attached image with your native image generation capability and save the edited result as a PNG file to exactly this relative path: ${tmpName}. Keep the overall composition, style, and everything not covered by the instructions as close to the original as possible.`
        : `Generate an image with your native image generation capability and save it as a PNG file to exactly this relative path: ${tmpName}`,
      `Target size: ${input.size} (or the closest supported size, landscape/portrait orientation must match).`,
      input.transparent
        ? "The image must have a transparent background (PNG with alpha). If your image tool cannot output transparency directly, removing the background afterwards is allowed."
        : "Make exactly one image generation call and save the result. Do not post-process, inspect, or verify the image afterwards — the caller handles resizing and compression.",
      "Do not read any project files. Do not draw the image with code, SVG, or canvas. Do not create any other files.",
      "If you do not have image generation capability, print exactly NO_IMAGE_TOOL and stop without creating any file.",
      "",
      input.baseImage ? "Edit instructions:" : "Image description:",
      input.prompt,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const exitCode = await new Promise<number>((resolve, reject) => {
        // prompt goes through stdin ("-") so Windows shell quoting can't
        // mangle the multiline text; argv stays fixed and safe
        const args = ["exec", "--sandbox", "workspace-write", "--skip-git-repo-check"];
        if (input.baseImage) args.push("-i", input.baseImage);
        args.push("-");
        const child = spawn(
          "codex",
          args,
          // ponytail: 10 min flat timeout; make configurable if slow models need it
          { cwd: process.cwd(), timeout: 600_000, shell: process.platform === "win32" }
        );
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => (stdout += d));
        child.stderr.on("data", (d) => (stderr += d));
        child.on("error", (err) => reject(new Error(`codex exec failed: ${err.message}`)));
        child.on("close", (code) => {
          lastStdout = stdout;
          lastStderr = stderr;
          if (stdout.includes("NO_IMAGE_TOOL")) {
            return reject(
              new Error(
                "This codex CLI has no image generation capability. Use --provider openai with an OPENAI_API_KEY instead."
              )
            );
          }
          resolve(code ?? -1);
        });
        child.stdin.write(prompt);
        child.stdin.end();
      });

      // codex sometimes writes the image successfully, then fails a later
      // step (e.g. a secondary verification call hitting a rate limit) and
      // exits non-zero — check the file before trusting the exit code
      if (!fs.existsSync(tmpPath)) {
        if (exitCode !== 0) {
          throw new Error(
            `codex exec exited with code ${exitCode} and produced no image file. stderr tail:\n${tail(lastStderr)}`
          );
        }
        // codex can also exit 0 without creating the file (observed for
        // transparent requests that take an unusually long internal detour)
        throw new Error(
          `codex exec finished but produced no image file. Last output:\n${tail(lastStdout)}\n` +
            `Retrying the same command (wda gen/regen) usually succeeds — this has been observed to be transient.`
        );
      }
      if (exitCode !== 0) {
        // don't trust a partial/corrupt write just because it exists —
        // confirm it actually decodes before treating the bad exit as harmless
        try {
          await sharp(tmpPath).metadata();
        } catch (err) {
          throw new Error(
            `codex exec exited with code ${exitCode} and left an unreadable image file ` +
              `(${err instanceof Error ? err.message : String(err)}). stderr tail:\n${tail(lastStderr)}`
          );
        }
        console.warn(
          `wda: codex exec exited with code ${exitCode} after already writing the image; using it anyway.`
        );
      }
      return { buffer: fs.readFileSync(tmpPath), model: "codex" };
    } finally {
      fs.rmSync(tmpPath, { force: true });
    }
  }
}
