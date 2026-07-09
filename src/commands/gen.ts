import * as fs from "node:fs";
import * as path from "node:path";
import { buildPrompt } from "../core/prompt-builder";
import { loadStyleAnchor } from "../core/style-anchor";
import { loadSceneBrief } from "../core/scene";
import { optimizeForWeb } from "../core/optimize";
import { writeSidecars } from "../core/sidecar";
import { CodexImageProvider, codexAvailable } from "../providers/codex";
import { MockImageProvider } from "../providers/mock";
import { OpenAIImageProvider } from "../providers/openai";
import {
  ASSET_TYPES,
  AssetType,
  DEFAULT_SIZES,
  ImageProvider,
  TRANSPARENT_BY_DEFAULT,
} from "../types";

export interface GenOptions {
  desc: string;
  out: string;
  provider?: string;
  model?: string;
  size?: string;
  quality: string;
  overwrite: boolean;
  transparent?: boolean;
  scene?: string;
  dryRun: boolean;
}

// default: local codex CLI (ChatGPT subscription, no API key);
// fall back to openai when codex is not installed
export function resolveProvider(name?: string): ImageProvider {
  if (!name) {
    if (codexAvailable()) return new CodexImageProvider();
    console.log("wda: codex CLI not found, falling back to openai provider");
    return new OpenAIImageProvider();
  }
  if (name === "codex") return new CodexImageProvider();
  if (name === "openai") return new OpenAIImageProvider();
  if (name === "mock") return new MockImageProvider();
  throw new Error(`Unknown provider "${name}". Supported: codex, openai, mock`);
}

export async function runGen(type: string, opts: GenOptions): Promise<void> {
  if (!(ASSET_TYPES as readonly string[]).includes(type)) {
    throw new Error(`Unknown type "${type}". Supported: ${ASSET_TYPES.join(", ")}`);
  }
  const assetType = type as AssetType;
  const out = path.resolve(opts.out);
  const size = opts.size || DEFAULT_SIZES[assetType];
  const transparent = opts.transparent ?? TRANSPARENT_BY_DEFAULT.has(assetType);

  const style = loadStyleAnchor({ createIfMissing: !opts.dryRun });
  if (style.created) {
    console.log(
      "wda: no .wda/style.md found, wrote conservative default. " +
        "Run `wda init-style --desc \"...\"` to set a project-specific style anchor."
    );
  }

  const sceneBrief = opts.scene ? loadSceneBrief(opts.scene) : undefined;

  const prompt = buildPrompt({
    type: assetType,
    desc: opts.desc,
    styleAnchor: style.content,
    size,
    transparent,
    sceneBrief,
  });

  if (opts.dryRun) {
    console.log(prompt);
    return;
  }

  if (fs.existsSync(out) && !opts.overwrite) {
    throw new Error(`${out} already exists. Pass --overwrite to replace it.`);
  }

  const provider = resolveProvider(opts.provider);
  const image = await provider.generate({ prompt, size, transparent, model: opts.model });
  const optimized = await optimizeForWeb(image.buffer, out, size, parseInt(opts.quality, 10));

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, optimized.buffer);
  const { promptFile, metaFile } = writeSidecars({
    type: assetType,
    desc: opts.desc,
    output: out,
    provider: provider.name,
    model: image.model,
    size,
    format: optimized.format,
    bytes: optimized.buffer.length,
    transparent,
    scene: opts.scene,
    prompt,
  });

  const kb = (optimized.buffer.length / 1024).toFixed(0);
  console.log(`wda: generated ${path.relative(process.cwd(), out)} (${optimized.format}, ${kb}KB)`);
  console.log(`wda: sidecars ${path.basename(promptFile)}, ${path.basename(metaFile)}`);
}
