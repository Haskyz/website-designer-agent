import * as fs from "node:fs";
import * as path from "node:path";
import { writeStyleAnchor } from "../core/style-anchor";
import { styleAnchorPath } from "../paths";

export function runInitStyle(opts: { desc: string; overwrite: boolean }): void {
  const file = styleAnchorPath();
  if (fs.existsSync(file) && !opts.overwrite) {
    throw new Error(
      `${file} already exists. Pass --overwrite to replace it, or edit the file directly.`
    );
  }
  writeStyleAnchor(opts.desc);
  console.log(`wda: wrote ${path.relative(process.cwd(), file)}`);
}
