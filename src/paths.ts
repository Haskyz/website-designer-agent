import * as path from "node:path";
import * as fs from "node:fs";

// prompts/ ships at package root, next to dist/ after build and src/ in dev
export function promptsDir(): string {
  return path.resolve(__dirname, "..", "prompts");
}

export function readPrompt(name: string): string {
  return fs.readFileSync(path.join(promptsDir(), `${name}.md`), "utf8").trim();
}

export function styleAnchorPath(cwd = process.cwd()): string {
  return path.resolve(cwd, ".wda", "style.md");
}

export function sceneBriefPath(id: string, cwd = process.cwd()): string {
  return path.resolve(cwd, ".wda", "scenes", `${id}.md`);
}
