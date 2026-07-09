import sharp from "sharp";
import { GeneratedImage, GenerateInput, ImageProvider } from "../types";

// Solid gray placeholder at the requested size — for tests, demos,
// and keyless agent dry runs.
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async generate(input: GenerateInput): Promise<GeneratedImage> {
    if (input.baseImage) {
      // "edit" = negate the base so tests can see a deterministic change
      const buffer = await sharp(input.baseImage).negate({ alpha: false }).png().toBuffer();
      return { buffer, model: "mock" };
    }
    const [w, h] = input.size.split("x").map((n) => Number(n) || 64);
    const buffer = await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: input.transparent
          ? { r: 0, g: 0, b: 0, alpha: 0 }
          : { r: 180, g: 184, b: 190, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    return { buffer, model: "mock" };
  }
}
