import * as fs from "node:fs";
import * as path from "node:path";
import { readPrompt, styleAnchorPath } from "../paths";

/**
 * Read the project style anchor. If missing, copy the static default
 * template verbatim (no inference — that is the calling agent's job,
 * see plan section 4) and continue.
 */
export function loadStyleAnchor(opts: { createIfMissing?: boolean } = {}): {
  content: string;
  created: boolean;
} {
  const file = styleAnchorPath();
  if (fs.existsSync(file)) {
    return { content: fs.readFileSync(file, "utf8").trim(), created: false };
  }
  const fallback = readPrompt("default-style");
  if (opts.createIfMissing === false) {
    return { content: fallback, created: false };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, fallback + "\n", "utf8");
  return { content: fallback, created: true };
}

export function writeStyleAnchor(desc: string): string {
  const file = styleAnchorPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const content = `# Visual Style Anchor

## Base Direction
${desc.trim()}

## Avoid
- visible text, letters, numbers, logos, watermarks, QR codes
- generic purple-blue AI gradients
- glossy plastic 3D render look
- stock-photo feel
- overly symmetrical composition
`;
  fs.writeFileSync(file, content, "utf8");
  return file;
}
