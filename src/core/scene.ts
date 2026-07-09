import * as fs from "node:fs";
import * as path from "node:path";
import { sceneBriefPath } from "../paths";

/**
 * Scene briefs coordinate multiple independent generations (e.g. parallax
 * layers, a floating decoration set) so they share camera angle, lighting,
 * and color grading instead of drifting apart like unrelated calls would.
 *
 * This does NOT guarantee pixel-level spatial alignment between layers —
 * each layer is still a separate image-model call, not a 3D compositor.
 * It only keeps the described visual facts consistent.
 *
 * Unlike style.md, there is no safe default to fall back to: a scene brief
 * is specific to one composition, so `wda gen --scene <id>` errors when the
 * brief is missing instead of writing a generic placeholder that would
 * silently defeat the point.
 */
export function loadSceneBrief(id: string): string {
  const file = sceneBriefPath(id);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Scene "${id}" not found. Run \`wda scene-init ${id} --desc "..."\` first ` +
        `(camera angle, lighting direction, time of day, color grading, perspective).`
    );
  }
  return fs.readFileSync(file, "utf8").trim();
}

export function writeSceneBrief(id: string, desc: string): string {
  const file = sceneBriefPath(id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const content = `# Scene Brief: ${id}

Every layer generated for this scene must match these shared visual facts
(camera angle, lighting direction, time of day, color grading, perspective)
so independently generated layers read as one coherent scene:

${desc.trim()}
`;
  fs.writeFileSync(file, content, "utf8");
  return file;
}
