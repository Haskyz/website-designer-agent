export const ASSET_TYPES = [
  "background",
  "hero",
  "icon",
  "illustration",
  "decoration",
  "banner",
  "texture",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const DEFAULT_SIZES: Record<AssetType, string> = {
  background: "1536x1024",
  hero: "1536x1024",
  banner: "1536x640",
  icon: "1024x1024",
  decoration: "1024x1024",
  illustration: "1024x1024",
  texture: "1024x1024",
};

// icon/decoration default to transparent background (plan section 5/9)
export const TRANSPARENT_BY_DEFAULT: ReadonlySet<AssetType> = new Set([
  "icon",
  "decoration",
]);

export interface GenerateInput {
  prompt: string;
  size: string;
  transparent: boolean;
  model?: string;
  /** path to an existing image to edit (img2img) instead of generating from scratch */
  baseImage?: string;
}

export interface GeneratedImage {
  buffer: Buffer;
  model: string;
}

export interface ImageProvider {
  readonly name: string;
  generate(input: GenerateInput): Promise<GeneratedImage>;
}
