[English](README.md) | 简体中文

# Website Designer Agent

面向 AI 编程助手的前端素材生成工具。

`wda` 让 Codex、Claude Code、Cursor 等 AI 编程助手在页面真正需要图片素材时，不再用 CSS、SVG、Canvas 手写复杂的装饰图形。它能生成可直接用于项目的背景图、首屏大图、图标、插画、横幅、纹理和装饰元素，保存到项目目录，并写入 sidecar 文件让 agent 理解生成了什么。

## 为什么做这个

AI 编程助手擅长写代码，但前端页面经常需要真实的视觉素材。没有工具辅助时，agent 往往会画出千篇一律的渐变、手写一堆 SVG、伪造图标、写过度复杂的装饰代码。

`wda` 给 agent 一套简单的工作流：

1. 判断页面确实需要一个真实素材。
2. 读取或创建 `.wda/style.md` 作为项目风格锚点。
3. 用一份"去 AI 味"的 prompt 生成一张素材。
4. 保存图片，同时写入 `.prompt.md` 和 `.meta.json`。
5. 在前端代码里直接引用这张图。

## 安装

```bash
npm install -g website-designer-agent
wda --help
```

或者不安装，直接用 npx 跑：

```bash
npx website-designer-agent gen background --desc "温暖书桌氛围的登录页背景，右侧留白放表单" --out ./demo/login-bg.webp --provider mock
```

### 从源码构建（贡献者）

```bash
git clone https://github.com/Haskyz/website-designer-agent.git
cd website-designer-agent
pnpm install
pnpm build
```

开发阶段可以直接用 `pnpm dev` 跑 CLI：

```bash
pnpm dev -- gen background --desc "温暖书桌氛围的登录页背景，右侧留白放表单" --out ./demo/login-bg.webp --provider mock
```

## Provider（图片生成来源）

`wda` 支持三种 provider：

- `codex`：调用本机已安装的 Codex CLI 出图能力——不需要 API key，走的是你的 ChatGPT/Codex 订阅额度。
- `openai`：调用 OpenAI Images API，需要配置 `OPENAI_API_KEY`。
- `mock`：生成确定性的占位素材，用于测试、演示，以及没有 API key 时的工作流。

默认情况下，`wda` 会在本机装有 `codex` 命令时优先使用它，没有的话自动回退到 `openai`。

配置 OpenAI：

```bash
OPENAI_API_KEY=...
OPENAI_IMAGE_MODEL=gpt-image-1
```

## 命令

### 生成一个素材

```bash
wda gen <type> --desc "<描述>" --out <文件路径>
```

支持的类型：

```text
background     背景图
hero           首屏大图
icon           图标
illustration   插画
decoration     装饰元素
banner         横幅
texture        纹理
```

常用参数：`--size <宽x高>`（每种类型有各自默认值）、`--quality <1-100>`（webp/jpg 压缩质量，默认 82）、`--transparent`（透明背景）、`--overwrite`（允许覆盖已有文件）、`--dry-run`（只打印最终 prompt，不实际生成）。

示例：

```bash
wda gen background \
  --desc "黄昏城市天际线，暖蓝色调，登录页背景，右侧留白放登录表单" \
  --out src/assets/generated/login-bg.webp
```

```bash
wda gen icon \
  --desc "设置齿轮图标，线性风格，用于后台侧边栏" \
  --out src/assets/generated/icons/settings.png \
  --transparent
```

### regen——针对同一份描述重新抽一张

```bash
wda regen src/assets/generated/login-bg.webp
wda regen src/assets/generated/login-bg.webp --desc "画面再干净一些，多留点空白"
```

从 `.meta.json` sidecar 里读回类型、尺寸和描述，在同一路径生成一版新的，页面代码和其他素材完全不受影响。适合"这个方向不对，重来"的场景。

### edit——在原图基础上原地微调（图生图）

```bash
wda edit src/assets/generated/login-bg.webp --desc "右侧再暗一点、更安静一些"
```

以当前文件为底图，只应用你要求的这一个改动，保留原有构图和视觉身份。适合"大体满意，就是想调一下"的场景——也适合把同一个物体的多个生成阶段串联起来（比如一个逐渐变得更繁复、更亮的发光符文圆环），比各自独立调用 `gen` 的视觉连贯性好得多。

### 风格锚点——让一个项目里的素材视觉统一

```bash
wda init-style --desc "克制的编辑风 SaaS 调性，暖色中性色板，自然摄影质感，图标简洁"
```

写入 `.wda/style.md`，之后每次 `wda gen` 都会读取并拼进 prompt。如果这个文件不存在，`wda gen` 会回退到一份保守的内置默认值，而不是自己去猜——风格的推断是调用方 agent 的职责，不是 CLI 该做的事。

### 场景简报——协调同一个场景里的多个图层

```bash
wda scene-init hero-desk --desc "午后斜射的暖光从左侧打入，暖调胶片颗粒感，固定 35mm 机位"
wda gen background --scene hero-desk --desc "木质书桌背景" --out src/assets/generated/desk-bg.webp
wda gen decoration --scene hero-desk --desc "漂浮的光尘颗粒" --out src/assets/generated/dust.png --transparent
```

适合做视差滚动或分层装饰：用同一个 `--scene` id 生成的每一层都会共享镜头角度、光照方向和色调。这能保证多层素材在视觉上不打架——但**不保证像素级的空间对齐**，因为每一层依然是独立的一次图片模型调用，不是 3D 合成引擎。

## 输出文件

以这条命令为例：

```bash
wda gen background --desc "..." --out src/assets/generated/login-bg.webp
```

`wda` 会写入：

```text
src/assets/generated/login-bg.webp
src/assets/generated/login-bg.prompt.md
src/assets/generated/login-bg.meta.json
```

sidecar 文件用于追溯，也让 agent 可以在不重新推导上下文的情况下直接 `regen`/`edit`。它们不是打分或选图系统。

## Agent Skill——教会你的 AI 编程助手用 `wda`

光装好 CLI 还不够，还得让 agent 知道"什么时候该调用 `wda`"，而不是自己动手画图。仓库里带了可以直接用的 agent 指令文件：

```text
skills/claude/SKILL.md
skills/codex/SKILL.md
```

核心规则很简单：页面需要真实视觉素材时调用 `wda`，而不是用代码手写 CSS/SVG/Canvas；素材已经存在时优先用 `regen`/`edit`，而不是每次都推倒重来。

### Claude Code

Claude Code 会自动加载放在 `.claude/skills/<name>/` 目录下的 `SKILL.md`。给单个项目装上：

```bash
mkdir -p .claude/skills/wda
curl -fsSL https://raw.githubusercontent.com/Haskyz/website-designer-agent/main/skills/claude/SKILL.md \
  -o .claude/skills/wda/SKILL.md
```

想让所有项目都能用，就放到用户目录下：`~/.claude/skills/wda/SKILL.md`。

### Codex

Codex CLI 会自动读取仓库根目录的 `AGENTS.md`。没有这个文件就会新建一个，已经有的话会追加进去：

```bash
curl -fsSL https://raw.githubusercontent.com/Haskyz/website-designer-agent/main/skills/codex/SKILL.md >> AGENTS.md
```

（如果你的 Codex 版本支持专门的 skills 目录，也可以用那种方式装——具体看 `codex --help` 里你那个版本的说明。）

### Cursor 及其他 agent

这份指令跟具体 agent 无关，把 `skills/claude/SKILL.md` 的内容贴进对应工具的项目级指令机制就行（比如 Cursor 的 `.cursor/rules`）。

## 测试

```bash
pnpm build
pnpm test
```

## 许可证

MIT，见 [LICENSE](LICENSE)。
