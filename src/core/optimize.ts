import * as path from "node:path";
import sharp from "sharp";

export interface OptimizeResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
}

/**
 * Web-friendly output pipeline: resize the raw provider image to the
 * requested size and re-encode by output extension. Raw generations can
 * be 500KB-2MB — never ship those to a web page as-is.
 */
export async function optimizeForWeb(
  raw: Buffer,
  outPath: string,
  size: string,
  quality: number
): Promise<OptimizeResult> {
  const ext = path.extname(outPath).toLowerCase();
  const [w, h] = size.split("x").map(Number);
  if (!w || !h) throw new Error(`Invalid --size "${size}", expected e.g. 1536x1024`);
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new Error(`Invalid --quality "${quality}", expected an integer 1-100`);
  }

  let img = sharp(raw).resize(w, h, { fit: "cover", withoutEnlargement: false });

  let format: string;
  if (ext === ".webp") {
    img = img.webp({ quality });
    format = "webp";
  } else if (ext === ".png") {
    img = img.png({ compressionLevel: 9 });
    format = "png";
  } else if (ext === ".jpg" || ext === ".jpeg") {
    img = img.jpeg({ quality, mozjpeg: true });
    format = "jpeg";
  } else {
    throw new Error(`Unsupported output extension "${ext}". Use .webp (recommended), .png, or .jpg`);
  }

  const buffer = await img.toBuffer();
  return { buffer, format, width: w, height: h };
}
