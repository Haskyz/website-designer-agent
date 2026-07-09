import * as fs from "node:fs";
import * as path from "node:path";
import { writeSceneBrief } from "../core/scene";
import { sceneBriefPath } from "../paths";

export function runSceneInit(id: string, opts: { desc: string; overwrite: boolean }): void {
  const file = sceneBriefPath(id);
  if (fs.existsSync(file) && !opts.overwrite) {
    throw new Error(
      `${file} already exists. Pass --overwrite to replace it, or edit the file directly.`
    );
  }
  writeSceneBrief(id, opts.desc);
  console.log(`wda: wrote ${path.relative(process.cwd(), file)}`);
}
