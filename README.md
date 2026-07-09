English | [简体中文](README.zh-CN.md)

# Website Designer Agent

Frontend asset generation pipeline for AI coding agents.

`wda` helps Codex, Claude Code, Cursor, and other agents stop drawing complex visuals with CSS, SVG, or Canvas when a page really needs an image asset. It generates project-ready backgrounds, hero images, icons, illustrations, banners, textures, and decorative layers, saves them into your project, and writes sidecar files so the agent can understand what was generated.

## Why

AI coding agents are good at code, but frontend pages often need real visual assets. Without a tool, agents tend to create generic gradients, hand-written SVG blobs, fake icons, and over-complicated decorative code.

`wda` gives the agent a simple workflow:

1. Identify that the UI needs a real asset.
2. Read or create `.wda/style.md` as the project style anchor.
3. Generate one asset with a low-AI-flavor prompt.
4. Save the image plus `.prompt.md` and `.meta.json`.
5. Reference the image from the frontend code.

## Install

```bash
pnpm install
pnpm build
```

During development, run the CLI through `pnpm dev`:

```bash
pnpm dev -- gen background --desc "warm cozy desk login background, right side empty for a form" --out ./demo/login-bg.webp --provider mock
```

After build:

```bash
node dist/cli.js gen background --desc "warm cozy desk login background, right side empty for a form" --out ./demo/login-bg.webp --provider mock
```

## Providers

`wda` supports:

- `codex`: uses the local Codex CLI image capability when available — no API key needed, runs against your ChatGPT/Codex subscription.
- `openai`: uses the OpenAI Images API and requires `OPENAI_API_KEY`.
- `mock`: writes deterministic placeholder assets for tests, demos, and keyless workflows.

By default, `wda` uses `codex` if the local `codex` command is installed, otherwise it falls back to `openai`.

Configure OpenAI with:

```bash
OPENAI_API_KEY=...
OPENAI_IMAGE_MODEL=gpt-image-1
```

## Commands

### Generate an asset

```bash
wda gen <type> --desc "<description>" --out <file>
```

Supported types:

```text
background
hero
icon
illustration
decoration
banner
texture
```

Useful flags: `--size <wxh>` (defaults per type), `--quality <1-100>` (webp/jpg, default 82), `--transparent`, `--overwrite`, `--dry-run` (print the final prompt without generating).

Examples:

```bash
wda gen background \
  --desc "soft city skyline at dusk, warm blue tones, login page background, leave empty space on the right for the login form" \
  --out src/assets/generated/login-bg.webp
```

```bash
wda gen icon \
  --desc "settings gear line icon for an admin sidebar" \
  --out src/assets/generated/icons/settings.png \
  --transparent
```

### Regenerate — a fresh take on the same brief

```bash
wda regen src/assets/generated/login-bg.webp
wda regen src/assets/generated/login-bg.webp --desc "less busy, more empty space"
```

Reads type, size, and description back from the `.meta.json` sidecar and generates a new version at the same path, so page code and other assets are untouched. Use this when the composition/direction is wrong.

### Edit — adjust the current image in place (img2img)

```bash
wda edit src/assets/generated/login-bg.webp --desc "make the right side quieter and darker"
```

Uses the current file as the base image and applies only the requested change, keeping composition and identity. Use this when the asset is mostly right and just needs a tweak — and to chain multiple generated stages of the same object (e.g. a glowing rune circle that gets progressively more intricate) with much better visual continuity than independent `gen` calls would give you.

### Style anchor — keep a project's assets visually consistent

```bash
wda init-style --desc "quiet editorial SaaS style, warm neutral palette, natural photography, minimal icons"
```

Writes `.wda/style.md`, which every `wda gen` call reads and folds into its prompt. If missing, `wda gen` falls back to a conservative built-in default rather than guessing — style inference is the calling agent's job, not the CLI's.

### Scene brief — coordinate multiple layers of one scene

```bash
wda scene-init hero-desk --desc "low afternoon sun from the left, warm film grain, fixed 35mm camera angle"
wda gen background --scene hero-desk --desc "wooden desk background" --out src/assets/generated/desk-bg.webp
wda gen decoration --scene hero-desk --desc "floating dust motes" --out src/assets/generated/dust.png --transparent
```

Useful for parallax scrolling or layered decoration: every layer generated with the same `--scene` id shares camera angle, lighting, and color grading. This keeps layers visually coherent — it does **not** guarantee pixel-level spatial alignment between them, since each layer is still an independent image-model call, not a 3D compositor.

## Output

For:

```bash
wda gen background --desc "..." --out src/assets/generated/login-bg.webp
```

`wda` writes:

```text
src/assets/generated/login-bg.webp
src/assets/generated/login-bg.prompt.md
src/assets/generated/login-bg.meta.json
```

The sidecar files are for traceability and let an agent regenerate/edit without re-deriving context. They are not a scoring or asset-selection system.

## Agent Skills

The repository includes ready-to-use agent instructions:

```text
skills/codex/SKILL.md
skills/claude/SKILL.md
```

Their core rule is simple: when a frontend page needs a real visual asset, call `wda` instead of hand-drawing complex visuals in code, and prefer `regen`/`edit` over throwaway re-generation once an asset already exists.

## Test

```bash
pnpm build
pnpm test
```

## License

MIT, see [LICENSE](LICENSE).
