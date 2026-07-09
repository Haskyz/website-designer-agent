import { readPrompt } from "../paths";
import { AssetType } from "../types";

export interface PromptParts {
  type: AssetType;
  desc: string;
  styleAnchor: string;
  size: string;
  transparent: boolean;
  /** shared camera/lighting/color facts for multi-layer scenes, see core/scene.ts */
  sceneBrief?: string;
}

// Assembly order fixed by plan section 7:
// type instruction → user desc → style anchor → scene brief → negative base → output constraints
export function buildPrompt(p: PromptParts): string {
  const constraints = [
    `Target size: ${p.size}.`,
    p.transparent ? "Transparent background (PNG with alpha)." : "",
    "No text, letters, numbers, logos, or watermarks anywhere in the image.",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    readPrompt(p.type),
    `## Asset description\n${p.desc.trim()}`,
    `## Project style anchor\n${p.styleAnchor}`,
    p.sceneBrief ? `## Shared scene brief (must match other layers of this scene)\n${p.sceneBrief}` : "",
    `## Never do\n${readPrompt("negative-base")}`,
    `## Output constraints\n${constraints}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
