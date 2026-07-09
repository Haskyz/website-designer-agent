# Website Designer Asset Workflow

Use this skill when building or improving frontend pages that need visual assets.

Use `wda` when the UI needs:
- hero images
- page backgrounds
- banners
- icons
- empty-state illustrations
- feature illustrations
- textures
- decorative visual elements

Rules:
- Do not hand-draw complex visuals with CSS, SVG, or Canvas unless the user explicitly asks for code-native graphics.
- Prefer generated image assets when the page needs atmosphere, illustration, realistic objects, unique icons, textures, or branded visual flavor.
- Save generated assets under `src/assets/generated` unless the project uses a different asset convention.
- Prefer `.webp` output for backgrounds, heroes, and banners (much smaller for the web); use `.png` when you need lossless or broad tooling compatibility. Images are automatically resized and compressed for web use.
- The default provider is the local `codex` CLI (no API key needed). Pass `--provider openai` only when codex is unavailable and `OPENAI_API_KEY` is configured.
- If `.wda/style.md` does not exist yet, infer the project style from the user's request, existing pages, CSS, and Tailwind config, then call `wda init-style --desc "..."` yourself before the first `wda gen` — the CLI does not infer style on its own.
- Run `wda gen <type> --desc "..." --out <path>`.
- Read the `.meta.json` and `.prompt.md` sidecar files if you need context.
- Reference the generated file directly from the frontend code.
- Keep UI code simpler because the visual complexity belongs in the generated asset.
- If one asset out of many is not good enough, fix ONLY that file — other assets and code references stay untouched since the path never changes. Repeat until the user is satisfied. Pick the command by what the user wants:
  - Composition/direction is wrong → `wda regen <file>` for a fresh take (reuses the saved description; add `--desc "..."` to steer it).
  - Mostly good, needs adjustment ("darker sky", "more empty space on the right") → `wda edit <file> --desc "<the change>"` to modify the current image while keeping its composition.
- For a brand-new take on an asset, `wda gen` with `--overwrite` also works (without `--overwrite`, `wda gen` errors on an existing output path).

When NOT to use `wda`:
- Simple UI icons when the project already uses lucide/react-icons — use the icon library.
- Strictly editable vector logos or brand marks — handle separately.

Example:

```bash
wda gen background \
  --desc "soft city skyline at dusk, warm blue tones, login page background, leave empty space on the right for the login form" \
  --out src/assets/generated/login-bg.png
```

## Multi-layer scenes (parallax, floating decoration, layered motion)

Motion itself is your job (CSS/JS keyframes) — `wda` only produces the static
image layers. Independent `wda gen` calls can drift apart in camera angle,
lighting, and color even under the same style anchor, which looks wrong once
layers are stacked or animated together. When the user wants an effect built
from multiple coordinated layers (parallax scroll, floating particles over a
scene, a foreground/midground/background split):

1. `wda scene-init <id> --desc "<camera angle, lighting direction, time of day, color grading, perspective>"` once per scene, based on the overall composition you have in mind.
2. Generate every layer with `--scene <id>` added to `wda gen`, one call per layer (background typically opaque, foreground/decoration/particle layers `--transparent`).
3. Stack the layers as separate absolutely-positioned elements and animate each at a different speed/style in CSS (classic parallax: slower motion the further back a layer sits).
4. `wda regen`/`wda edit` on an individual layer also keep `--scene` (regen reads it back automatically from the sidecar).

This keeps layers visually consistent (same light, same mood) but does **not**
guarantee pixel-perfect spatial alignment between them — each layer is still
a separate image-model call, not a 3D compositor. Set expectations
accordingly: fine for parallax/atmosphere, not for effects requiring exact
per-pixel registration between layers.
