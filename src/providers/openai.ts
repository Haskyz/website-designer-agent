import * as fs from "node:fs";
import * as path from "node:path";
import { GeneratedImage, GenerateInput, ImageProvider } from "../types";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

// gpt-image-1 accepts only these sizes; snap unsupported defaults
// (e.g. banner 1536x640) to the nearest one instead of failing the call.
const SUPPORTED_SIZES = ["1024x1024", "1536x1024", "1024x1536"];

function snapSize(size: string): string {
  if (SUPPORTED_SIZES.includes(size)) return size;
  const [w, h] = size.split("x").map(Number);
  const snapped = !w || !h ? "1024x1024" : w > h ? "1536x1024" : w < h ? "1024x1536" : "1024x1024";
  console.warn(`wda: size ${size} not supported by OpenAI, using ${snapped}`);
  return snapped;
}

export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";

  async generate(input: GenerateInput): Promise<GeneratedImage> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to your environment or a .env file in the project root."
      );
    }
    const model = input.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

    let res: Response;
    if (input.baseImage) {
      // img2img via the edits endpoint (multipart)
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", input.prompt);
      form.append("size", snapSize(input.size));
      if (input.transparent) form.append("background", "transparent");
      const ext = path.extname(input.baseImage).toLowerCase();
      form.append(
        "image",
        new Blob([fs.readFileSync(input.baseImage)], { type: MIME[ext] || "image/png" }),
        path.basename(input.baseImage)
      );
      res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      const body: Record<string, unknown> = {
        model,
        prompt: input.prompt,
        n: 1,
        size: snapSize(input.size),
      };
      if (input.transparent) body.background = "transparent";
      res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // never echo the API key; response bodies from OpenAI do not contain it
      throw new Error(`OpenAI image API failed (HTTP ${res.status}): ${text.slice(0, 500)}`);
    }

    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI response contained no image data.");
    return { buffer: Buffer.from(b64, "base64"), model };
  }
}
