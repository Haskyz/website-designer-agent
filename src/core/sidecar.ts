import * as fs from "node:fs";
import * as path from "node:path";
import { AssetType } from "../types";

export interface SidecarInfo {
  type: AssetType;
  desc: string;
  output: string;
  provider: string;
  model: string;
  size: string;
  format: string;
  bytes: number;
  transparent: boolean;
  /** set when the file was produced by `wda edit` — the applied edit instruction */
  editDesc?: string;
  /** scene id if generated with --scene, see core/scene.ts */
  scene?: string;
  prompt: string;
}

// Sidecars are debug/traceability records only — they never drive
// selection or filtering logic (plan section 6).
export function writeSidecars(info: SidecarInfo): {
  promptFile: string;
  metaFile: string;
} {
  const base = info.output.replace(/\.[^.]+$/, "");
  const promptFile = `${base}.prompt.md`;
  const metaFile = `${base}.meta.json`;

  fs.writeFileSync(promptFile, info.prompt + "\n", "utf8");
  fs.writeFileSync(
    metaFile,
    JSON.stringify(
      {
        type: info.type,
        desc: info.desc,
        output: path.relative(process.cwd(), info.output).replace(/\\/g, "/"),
        provider: info.provider,
        model: info.model,
        size: info.size,
        format: info.format,
        bytes: info.bytes,
        transparent: info.transparent,
        ...(info.editDesc ? { editDesc: info.editDesc } : {}),
        ...(info.scene ? { scene: info.scene } : {}),
        styleAnchor: ".wda/style.md",
        promptFile: path.relative(process.cwd(), promptFile).replace(/\\/g, "/"),
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  return { promptFile, metaFile };
}
