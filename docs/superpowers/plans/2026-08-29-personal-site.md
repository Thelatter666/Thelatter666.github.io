# 个人博客 / 简历网站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个深色科技风的静态个人站点（Astro 5），含 Three.js 悬挂徽章 hero、在线简历 + 构建期生成的 PDF、三项目证据页与 Markdown 博客，部署到 GitHub Pages，用于 AI 应用开发岗位求职。

**Architecture:** Astro 5 静态站点，所有页面默认零 JS；Hero 3D 作为唯一交互岛，用 `client:visible` + 动态 `import('three')` 分包，内部是自研的固定步长 Verlet 物理求解器（绳索链 + 徽章刚体近似 + 球代理碰撞）。简历数据集中在 `src/data/resume.ts`，项目指标集中在 `src/data/projects.ts`，被在线简历页、PDF 打印模板、项目页三处消费，物理上杜绝数字不一致。PDF 由 GitHub Actions 中 headless Chrome 从 `/resume/print` 渲染产出。

**Tech Stack:** Astro 5（static output）· TypeScript strict · 原生 CSS + CSS 自定义属性 · three（npm，动态 import）· Shiki（Astro 内置）· @astrojs/sitemap · @astrojs/rss · Puppeteer（构建期 PDF）· Vitest（物理与数据一致性测试）· GitHub Actions + GitHub Pages

**Spec 来源：** `docs/superpowers/specs/2026-08-29-personal-site-design.md`（v2，grilling 后）

---

## Global Constraints

以下约束适用于**每一个** task，不再逐条重复：

- 项目根目录：`/Users/happy/Desktop/hy4-个人简历`（原地建站，不新建目录）
- Astro 配置：`site: 'https://thelatter666.github.io'`，**不得设置 `base`**（根路径部署）
- Node 20；包管理器 npm
- **禁止引入 Tailwind / CSS-in-JS / 任何 UI 组件库** —— 只用原生 CSS + CSS 自定义属性
- 所有颜色必须引用 `var(--*)`，**禁止硬编码 hex**
- 所有动效必须支持 `prefers-reduced-motion: reduce`
- **禁止加载中文 web font** —— 使用系统字体栈 `-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif`
- 非首页页面 JS ≈ 0；three 只允许在首页 island 内动态 import
- 代码注释与提交信息使用中文
- Git 规范：分支 `type/description`；提交 `<type>(<scope>): <中文描述>`；types: `feat` `fix` `docs` `refactor` `chore` `test`；合并用 `--no-ff`
- Commit style 中的 type 必须是上述六个之一
- 每个 task 结束时必须提交一次，且提交前 `npm run build` 必须通过

---

## 文件结构总览

```
astro.config.mjs                     # site / integrations / build
package.json                         # scripts: dev build preview test
tsconfig.json                        # extends astro/tsconfigs/strict
src/
  data/
    site.ts                          # 站点元信息与导航
    projects.ts                      # ★ 3 个项目的指标与链接（唯一存放处）
    resume.ts                        # ★ 简历唯一权威源（projects 字段 import 自 projects.ts）
    badges.ts                        # 5 个徽章：轮廓、材质、绳长、锚点、tooltip
  content/
    config.ts                        # blog collection schema
    blog/*.md                        # 文章（含 2 篇 draft 种子文章）
  components/
    hero3d/
      Hero3D.astro                   # island 入口（client:visible）
      scene.ts                       # renderer / 环境 / 灯光 / 相机 / 降级判定
      physics.ts                     # 固定步长 Verlet 求解器
      rope.ts                        # 绳索链 + Line2 渲染
      badge.ts                       # 轮廓 → 几何 / 材质 / 碰撞代理 / SVG
      badgeBody.ts                   # 徽章刚体：朝向 + 角速度 + 软回正
      collision.ts                   # 球代理碰撞 + 力矩
      interaction.ts                 # 拨动 / 抓取 / hover
      constants.ts                   # 全部可调参数集中在此
    ui/
      Nav.astro · Footer.astro · Tag.astro · Button.astro · Card.astro
  layouts/
    BaseLayout.astro                 # 深色，含导航/页脚
    PrintLayout.astro                # 浅色，A4
  pages/
    index.astro · resume/index.astro · resume/print.astro
    projects/index.astro
    blog/index.astro · blog/[slug].astro · blog/tags/[tag].astro
    feed.xml.ts · 404.astro
  styles/
    tokens.css                       # 颜色/间距/字号/圆角/阴影
    global.css
scripts/generate-resume-pdf.mjs      # Puppeteer 渲染 PDF
.github/workflows/deploy.yml
legacy/badge-demos/                  # 5 个原型 HTML 留档（移入，不参与构建）
tests/
  physics.test.ts                    # Verlet 稳定性 / 阻尼收敛 / 帧率无关性
  data-consistency.test.ts           # 三处数字一致
```

---

# Phase 1（P1）—— 站点骨架与设计系统

## Task 1: 项目初始化与依赖

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Modify: `legacy/badge-demos/`（把仓库根 5 个 `*-badge-3d.html` + `*.png` + `*-traced.svg` 移入）

**Interfaces:**
- Produces: 可运行的 Astro 项目骨架，后续所有 task 依赖

- [ ] **Step 1: 移动原型文件到 legacy**

```bash
cd /Users/happy/Desktop/hy4-个人简历
mkdir -p legacy/badge-demos
git mv claude-badge-3d.html deepseek-badge-3d.html openai-badge-3d.html \
      opencode-badge-3d.html zhipu-badge-3d.html legacy/badge-demos/
git mv claude-badge-final.png zhipulogo.png opencode-traced.svg zhipu-traced.svg legacy/badge-demos/
```

预期：仓库根只剩 `docs/`、`legacy/`、`.gitignore`、`.git/`。

- [ ] **Step 2: 写 package.json**

```json
{
  "name": "personal-site",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && node scripts/generate-resume-pdf.mjs",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.14.0",
    "@astrojs/sitemap": "^3.2.0",
    "@astrojs/rss": "^4.0.11",
    "three": "^0.169.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.4",
    "@types/three": "^0.169.0",
    "typescript": "^5.6.0",
    "puppeteer": "^23.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: 写 astro.config.mjs**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://thelatter666.github.io',
  integrations: [sitemap()],
  build: { format: 'directory' },
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed', wrap: true },
  },
});
```

- [ ] **Step 4: 写 tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*.astro", "**/*.ts", "**/*.tsx"],
  "exclude": ["dist", "legacy", "node_modules"]
}
```

- [ ] **Step 5: 写 .gitignore 并安装**

```gitignore
dist/
.astro/
node_modules/
dist/resume.pdf
*.log
.DS_Store
```

```bash
npm install
```

- [ ] **Step 6: 验证空构建通过**

```bash
mkdir -p src/pages
printf -- '---\ntitle: Home\n---\n<html><body><h1>placeholder</h1></body></html>\n' > src/pages/index.astro
npx astro build
```

预期：`Complete!` 且 `dist/index.html` 存在。**注意此时 `npm run build` 会因缺少 PDF 脚本而失败，用 `npx astro build` 验证。**

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "chore(site): 初始化 Astro 5 项目骨架并归档徽章原型"
```

---

## Task 2: Design tokens（加载 ui-ux-pro-max 生成候选值）

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: 全部 CSS 自定义属性，后续所有组件依赖

- [ ] **Step 1: 加载 ui-ux-pro-max skill 生成候选色阶**

```
use_skill: ui-ux-pro-max
```

索取：深色 surface 层级（bg / surface-1 / surface-2 / border / border-strong）、文本层级（text / text-muted / text-dim）、状态色、字号阶梯、间距阶梯、圆角、阴影层级，且带 WCAG AA 对比度校验。

- [ ] **Step 2: 按 spec §10 的硬性约束过滤并落地 tokens.css**

硬性约束（逐条核对，不满足就改）：
- accent 必须来自徽章材质色：陶土铜 `#D97757` 系、钛银 `#c9ccd4`、枪色 `#4a5468`
- 视觉身份从徽章派生（暖陶土铜 accent + 冷色底 + 高光），**不得**采用"通用深色 SaaS 模板"风格走向
- 文本与背景对比度 ≥ 4.5:1（AA）

落地后形如：

```css
:root {
  /* 色阶 —— 冷色底 + 暖陶土铜 accent */
  --color-bg: #0d0908;
  --color-surface-1: #16100e;
  --color-surface-2: #1f1715;
  --color-border: #2b201d;
  --color-border-strong: #3d2e29;
  --color-text: #f0e6e0;
  --color-text-muted: #a8968c;
  --color-text-dim: #7a6a62;
  --color-accent: #d97757;
  --color-accent-dim: #8f4f3a;
  --color-metal: #c9ccd4;
  --color-gunmetal: #4a5468;

  /* 间距（4px 基准） */
  --space-1: 0.25rem; --space-2: 0.5rem;  --space-3: 0.75rem;
  --space-4: 1rem;    --space-6: 1.5rem;  --space-8: 2rem;
  --space-12: 3rem;   --space-16: 4rem;   --space-24: 6rem;

  /* 字号阶梯 */
  --text-xs: 0.75rem;  --text-sm: 0.875rem; --text-base: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.5rem;   --text-2xl: 2rem;
  --text-3xl: 2.75rem; --text-4xl: 3.5rem;

  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 14px; --radius-full: 999px;

  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow-2: 0 4px 12px rgb(0 0 0 / 0.45);
  --shadow-3: 0 12px 32px rgb(0 0 0 / 0.55);

  --font-sans: -apple-system, BlinkMacSystemFont, "PingFang SC",
               "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  --content-width: 68rem;
}
```

- [ ] **Step 3: 写 global.css**

```css
*, *::before, *::after { box-sizing: border-box; }
html { background: var(--color-bg); }
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { line-height: 1.25; margin: 0 0 var(--space-3); font-weight: 700; }
p { margin: 0 0 var(--space-4); }
a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
img { max-width: 100%; display: block; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add src/styles
git commit -m "feat(styles): 建立深色 design tokens 与全局样式"
```

---

## Task 3: 布局、导航与页脚

**Files:**
- Create: `src/data/site.ts`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/ui/Nav.astro`
- Create: `src/components/ui/Footer.astro`

**Interfaces:**
- Produces: `BaseLayout`（props: `title`, `description`），后续所有页面依赖

- [ ] **Step 1: 写 site.ts**

```ts
export const site = {
  url: 'https://thelatter666.github.io',
  name: '唐宗昊',
  role: 'AI 应用开发',
  tagline: 'AI 应用开发 · 让 Agent 从玩具变成工程',
  github: 'https://github.com/Thelatter666',
  email: '17872117576@163.com',
  phone: '17872117576',
} as const;
```

- [ ] **Step 2: 写 Nav.astro（含博客条目的条件显示）**

```astro
---
import { site } from '../data/site';

const items = [
  { label: '首页', href: '/' },
  { label: '简历', href: '/resume' },
  { label: '项目', href: '/projects' },
];

// 文章数 <3 时不显示博客入口，避免"开了博客没写"的负面信号（spec §6）
const postCount = import.meta.env.SSR
  ? (await import('../data/blogCount')).publishedPostCount()
  : 0;
const nav = postCount >= 3
  ? [...items, { label: '博客', href: '/blog' }]
  : items;

const path = Astro.url.pathname.replace(/\/$/, '') || '/';
---
<header class="nav">
  <a class="brand" href="/">{site.name}</a>
  <nav>
    {nav.map((i) => (
      <a href={i.href} aria-current={path === i.href ? 'page' : undefined}>{i.label}</a>
    ))}
  </nav>
</header>
<style>
  .nav {
    display: flex; align-items: center; justify-content: space-between;
    gap: var(--space-6);
    max-width: var(--content-width);
    margin: 0 auto; padding: var(--space-4) var(--space-6);
  }
  .brand { font-weight: 700; color: var(--color-text); letter-spacing: 0.02em; }
  nav { display: flex; gap: var(--space-6); }
  nav a { color: var(--color-text-muted); font-size: var(--text-sm); }
  nav a:hover { color: var(--color-text); text-decoration: none; }
  nav a[aria-current='page'] { color: var(--color-accent); }
</style>
```

- [ ] **Step 3: 写 Footer.astro**

```astro
---
import { site } from '../data/site';
const year = new Date().getFullYear();
---
<footer class="footer">
  <span>© {year} {site.name}</span>
  <a href={site.github} rel="noopener">GitHub</a>
  <a href={`mailto:${site.email}`}>{site.email}</a>
</footer>
<style>
  .footer {
    display: flex; flex-wrap: wrap; gap: var(--space-6);
    max-width: var(--content-width);
    margin: var(--space-16) auto 0;
    padding: var(--space-6);
    border-top: 1px solid var(--color-border);
    color: var(--color-text-dim); font-size: var(--text-sm);
  }
  .footer a { color: var(--color-text-muted); }
</style>
```

- [ ] **Step 4: 写 BaseLayout.astro**

```astro
---
import '../styles/tokens.css';
import '../styles/global.css';
import Nav from '../components/ui/Nav.astro';
import Footer from '../components/ui/Footer.astro';
import { site } from '../data/site';

interface Props { title: string; description?: string; }
const { title, description = site.tagline } = Astro.props;
---
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={new URL(Astro.url.pathname, site.url)} />
  <link rel="canonical" href={new URL(Astro.url.pathname, site.url)} />
  <link rel="sitemap" href="/sitemap-index.xml" />
</head>
<body>
  <Nav />
  <main><slot /></main>
  <Footer />
</body>
</html>
```

- [ ] **Step 5: 写占位 blogCount（Phase 5 会替换成真实实现）**

```ts
// src/data/blogCount.ts
// Phase 5（Task 17）会把这里替换为读取 blog collection 的真实实现。
// 此处返回 0，使博客导航入口在文章数不足时保持隐藏（spec §6）。
export function publishedPostCount(): number {
  return 0;
}
```

- [ ] **Step 6: 构建验证并提交**

```bash
npx astro build && echo OK
git add -A && git commit -m "feat(layout): 新增 BaseLayout、导航与页脚"
```

---

## Task 4: 首页骨架与 hero 占位

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/404.astro`

**Interfaces:**
- Consumes: `BaseLayout`
- Produces: 首页容器；Phase 2 的 `Hero3D` island 将插入 `.hero-visual` 位置

- [ ] **Step 1: 写 index.astro（hero 上下分带占位）**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { site } from '../data/site';
---
<BaseLayout title={`${site.name} · ${site.role}`}>
  <section class="hero">
    <!-- 徽章带：上 55%。Phase 2 把 <Hero3D /> 插入此处 -->
    <div class="hero-visual" data-hero-visual></div>
    <!-- 文字带：下 45%，文本安全区，徽章几何上不可进入（spec §7.2） -->
    <div class="hero-text">
      <h1>{site.tagline}</h1>
      <p class="sub">新疆大学 软件工程 · 2027 届</p>
      <div class="cta">
        <a class="btn primary" href="/resume">查看简历</a>
        <a class="btn" href="/projects">我的项目</a>
      </div>
    </div>
  </section>
</BaseLayout>

<style>
  .hero {
    min-height: calc(100vh - 4rem);
    display: grid;
    grid-template-rows: 55fr 45fr;   /* 徽章带 55% / 文字带 45% */
    align-items: center;
  }
  .hero-visual { position: relative; width: 100%; height: 100%; min-height: 320px; }
  .hero-text {
    max-width: var(--content-width);
    margin: 0 auto; padding: var(--space-8) var(--space-6);
    text-align: center;
  }
  .hero-text h1 { font-size: clamp(var(--text-2xl), 5vw, var(--text-4xl)); }
  .sub { color: var(--color-text-muted); }
  .cta { display: flex; gap: var(--space-4); justify-content: center; flex-wrap: wrap; }
  .btn {
    display: inline-block; padding: var(--space-3) var(--space-6);
    border: 1px solid var(--color-border-strong); border-radius: var(--radius-full);
    color: var(--color-text); font-size: var(--text-sm);
  }
  .btn:hover { border-color: var(--color-accent); text-decoration: none; }
  .btn.primary { background: var(--color-accent); border-color: var(--color-accent); color: #16100e; }
</style>
```

- [ ] **Step 2: 写 404.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="页面不存在">
  <section style="max-width: var(--content-width); margin: 0 auto; padding: var(--space-24) var(--space-6); text-align: center;">
    <h1>404</h1>
    <p style="color: var(--color-text-muted);">这个页面不存在。</p>
    <a href="/">回到首页</a>
  </section>
</BaseLayout>
```

- [ ] **Step 3: 构建验证并提交**

```bash
npx astro build && echo OK
git add -A && git commit -m "feat(pages): 新增首页 hero 分带骨架与 404 页"
```

---

## Task 5: GitHub Actions 部署流水线

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `scripts/generate-resume-pdf.mjs`（本阶段写占位，Phase 3 Task 11 实现）

**Interfaces:**
- Produces: 推送 `main` 即自动构建部署

- [ ] **Step 1: 写 PDF 脚本占位**

```js
// scripts/generate-resume-pdf.mjs
// Phase 3（Task 11）会实现真实逻辑。此处为占位，保证 P1 的流水线可跑通。
console.log('[pdf] 占位：Phase 3 Task 11 实现');
```

- [ ] **Step 2: 写 deploy.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      # 必须：缺此步 PDF 中文全是豆腐块（spec §9.3）
      - name: Install CJK fonts
        run: |
          sudo apt-get update
          sudo apt-get install -y fonts-noto-cjk
          fc-cache -fv

      - name: Cache Puppeteer Chrome
        uses: actions/cache@v4
        with:
          path: ~/.cache/puppeteer
          key: puppeteer-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "ci(deploy): 新增 GitHub Actions 部署流水线与中文字体安装"
```

- [ ] **Step 4: 在 GitHub 创建仓库并首次推送**

仓库名必须为 `Thelatter666.github.io`（决定根路径部署）。随后在仓库 Settings → Pages → Source 选 **GitHub Actions**。

> 此步需本人操作或明确授权后执行。

---

# Phase 2（P2）—— Hero 3D 悬挂徽章系统

> 本 phase 是全站风险最高、代码量最大的部分。物理参数全部集中在 `constants.ts`，便于调参。

## Task 6: 轮廓数据提取与徽章配置

**Files:**
- Create: `src/data/badges.ts`
- Create: `src/components/hero3d/constants.ts`

**Interfaces:**
- Produces: `BADGES: BadgeConfig[]`，Task 7–12 依赖

- [ ] **Step 1: 从 5 个原型 HTML 提取轮廓数组**

从 `legacy/badge-demos/*.html` 中取出各自的轮廓/形状定义（Claude 是 269 点 `CONTOUR` 数组；DeepSeek / OpenAI 是 `solidShapes`；OpenCode 是 `cardShape`/`frameShape`/`blockShape` 三层；Zhipu 是 pixel-traced 多边形），转写为 `Vec2[]`。

OpenCode 的三层结构简化处理：只取 `cardShape` 作为主体轮廓，材质用 `darkMat`（`#030303`）；`frameShape` 与 `blockShape` 作为同组的附加 mesh，在 Task 8 中一并构建。

- [ ] **Step 2: 归一化轮廓（中心原点、最大半径 10）**

```ts
// src/components/hero3d/badge.ts 中的工具函数
export type Vec2 = readonly [number, number];

export function normalizeContour(points: Vec2[], maxRadius = 10): Vec2[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const r = Math.max(maxX - minX, maxY - minY) / 2;
  const s = maxRadius / r;
  return points.map(([x, y]) => [(x - cx) * s, (y - cy) * s] as Vec2);
}
```

- [ ] **Step 3: 写 badges.ts**

```ts
import type { Vec2 } from '../components/hero3d/badge';

export interface BadgeConfig {
  id: 'claude' | 'deepseek' | 'openai' | 'opencode' | 'zhipu';
  brand: string;                 // tooltip 标题
  note: string;                  // tooltip 说明；无证据者用「品牌 + 品类」事实性兜底
  contour: Vec2[];
  material: {
    color: number; metalness: number; roughness: number;
    clearcoat: number; clearcoatRoughness: number; envMapIntensity: number;
  };
  mass: number;
  ropeLength: number;            // 错落：短-长-中-长-短
  anchorXRatio: number;          // 0~1
}

export const BADGES: BadgeConfig[] = [
  {
    id: 'claude', brand: 'Claude', note: 'Claude Code · 主力 agent 编码',
    contour: CLAUDE_CONTOUR,
    material: { color: 0xd98f6c, metalness: 1.0, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 1.15 },
    mass: 1.0, ropeLength: 9.0, anchorXRatio: 0.14,
  },
  {
    id: 'deepseek', brand: 'DeepSeek', note: 'DeepSeek · 深度求索大模型',
    contour: DEEPSEEK_CONTOUR,
    material: { color: 0x2a3550, metalness: 1.0, roughness: 0.18, clearcoat: 0.65, clearcoatRoughness: 0.2, envMapIntensity: 1.2 },
    mass: 1.1, ropeLength: 13.0, anchorXRatio: 0.32,
  },
  {
    id: 'openai', brand: 'OpenAI', note: 'OpenAI · GPT 系列',
    contour: OPENAI_CONTOUR,
    material: { color: 0xc9ccd4, metalness: 1.0, roughness: 0.24, clearcoat: 0.6, clearcoatRoughness: 0.22, envMapIntensity: 1.2 },
    mass: 1.0, ropeLength: 11.0, anchorXRatio: 0.5,
  },
  {
    id: 'opencode', brand: 'OpenCode', note: 'OpenCode · 开源 agent 编码 CLI',
    contour: OPENCODE_CONTOUR,
    material: { color: 0x030303, metalness: 0.12, roughness: 0.58, clearcoat: 0.05, clearcoatRoughness: 0.4, envMapIntensity: 1.0 },
    mass: 0.9, ropeLength: 13.5, anchorXRatio: 0.68,
  },
  {
    id: 'zhipu', brand: '智谱', note: '智谱 GLM · 国产大模型',
    contour: ZHIPU_CONTOUR,
    material: { color: 0x4a5468, metalness: 0.95, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 1.15 },
    mass: 1.0, ropeLength: 9.5, anchorXRatio: 0.86,
  },
];
```

`note` 字段：Claude 与 DeepSeek 有据可查；OpenAI / OpenCode / 智谱 使用事实性兜底描述。**严禁编造使用场景**（spec §16.2）。本人提供真实说明后直接覆盖此处。

- [ ] **Step 4: 写 constants.ts（全部可调参数集中）**

```ts
/** 摆动周期目标（秒）。短绳配宽矮空间，1.25s 是"优雅但不拖沓"的取值。 */
export const PERIOD_S = 1.25;

/** 阻尼比 ζ。0.15 → 每周期振幅衰减至 28%，约 2~3 摆收敛（spec §7.3）。 */
export const ZETA = 0.15;

/** 固定物理步长。必须固定，否则 120Hz 屏上摆动速度翻倍（spec §7.3）。 */
export const FIXED_DT = 1 / 120;

/** 每帧最大迭代次数，防止标签页切回时 accumulator 爆炸。 */
export const MAX_SUBSTEPS = 8;

/** 锚点位于视口上方之外的距离（世界单位）。绳子"出画"垂入。 */
export const ANCHOR_ABOVE_VIEW = 6;

/** 相机仰视角（弧度）。2~4°，再多会看到徽章底面（spec §7.2）。 */
export const CAMERA_PITCH = 0.05;

/** 相机视野角。 */
export const CAMERA_FOV = 38;

/** 绳索段数。多段才有"绳"的滞后感，单段只是直线（spec §7）。 */
export const ROPE_SEGMENTS = 10;

/** 绳索渲染宽度（像素）。THREE.Line 的 linewidth 多数平台被忽略，必须用 Line2。 */
export const ROPE_WIDTH_PX = 1.8;

/** 徽章朝向软回正强度（每秒）。太大则不会自旋失去"叮当乱晃"，太小则 logo 不可读。 */
export const ORIENT_RESTITUTION = 2.4;

/** 角阻尼（每秒速度衰减系数）。 */
export const ANGULAR_DAMPING = 0.35;

/** 碰撞弹性系数。 */
export const RESTITUTION = 0.35;

/** 徽章转动惯量（标量近似）。越小越容易被撞转。 */
export const BADGE_INERTIA = 0.6;

/** idle 风：连续低频噪声幅度 + 阵风幅度（世界单位/秒²）。 */
export const IDLE_NOISE_AMP = 0.35;
export const IDLE_GUST_AMP = 1.6;
export const IDLE_GUST_INTERVAL_S = [4, 9] as const; // 随机区间，各徽章相位错开

/** 速度上限（世界单位/秒）。防止能量注入把徽章甩飞。 */
export const MAX_SPEED = 26;

/** 拨动：作用半径与冲量上限。 */
export const SWIPE_RADIUS = 7;
export const SWIPE_IMPULSE_MAX = 9;

/** 抓取：弹簧刚度与阻尼（临界阻尼附近）。 */
export const GRAB_STIFFNESS = 90;
export const GRAB_DAMPING = 19;
export const GRAB_FORCE_MAX = 220;

/** hover：倾斜限幅（弧度）与视觉放大。 */
export const HOVER_TILT_MAX = 0.22;   // ≈12.6°
export const HOVER_SCALE = 1.06;

/** 徽章带 / 文字带占比（spec §7.2）。 */
export const BADGE_BAND_RATIO = 0.55;

/** 移动端降级阈值（px）。 */
export const MOBILE_BREAKPOINT = 768;
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat(hero): 提取徽章轮廓数据并建立参数常量表"
```

---

## Task 7: 固定步长 Verlet 求解器（先写测试）

**Files:**
- Create: `src/components/hero3d/physics.ts`
- Test: `tests/physics.test.ts`

**Interfaces:**
- Produces: `VerletSolver` 类（Task 8–11 依赖）

- [ ] **Step 1: 写失败测试**

```ts
// tests/physics.test.ts
import { describe, it, expect } from 'vitest';
import { VerletSolver, makeParticle, gravityFromPeriod } from '../src/components/hero3d/physics';

describe('gravityFromPeriod', () => {
  it('由周期与绳长反算重力：T=1.25s, L=10 → g ≈ 252.7', () => {
    expect(gravityFromPeriod(10, 1.25)).toBeCloseTo(252.7, 1);
  });
});

describe('VerletSolver', () => {
  it('帧率无关：16.67ms 与 8.33ms 两种 dt 跑 5 秒后质点位置一致', () => {
    const run = (dtReal: number) => {
      const s = new VerletSolver({ gravity: 250, dampingPerSecond: 1 });
      const p = makeParticle({ x: 5, y: 0, z: 0, invMass: 1 });
      s.particles.push(p);
      for (let t = 0; t < 5; t += dtReal) s.step(dtReal);
      return p.x;
    };
    expect(run(1 / 60)).toBeCloseTo(run(1 / 120), 2);
  });

  it('阻尼收敛：ζ=0.15 时 5 秒后振幅衰减到初始的 15% 以下', () => {
    const zeta = 0.15, period = 1.25;
    const omega = (2 * Math.PI) / period;
    const dampingPerSecond = Math.exp(-zeta * omega);
    const s = new VerletSolver({ gravity: gravityFromPeriod(10, period), dampingPerSecond });
    const p = makeParticle({ x: 5, y: 0, z: 0, invMass: 1 });
    s.particles.push(p);
    let maxAfter = 0;
    for (let t = 0; t < 5; t += 1 / 60) {
      s.step(1 / 60);
      if (t > 4) maxAfter = Math.max(maxAfter, Math.abs(p.x));
    }
    expect(maxAfter).toBeLessThan(5 * 0.15);
  });

  it('速度上限生效：注入极大速度后不超过 MAX_SPEED', () => {
    const s = new VerletSolver({ gravity: 250, dampingPerSecond: 1, maxSpeed: 26 });
    const p = makeParticle({ x: 0, y: 0, z: 0, invMass: 1 });
    p.px = -1000; // 制造巨大隐式速度
    s.particles.push(p);
    s.step(1 / 60);
    const vx = (p.x - p.px) / (1 / 120);
    expect(Math.abs(vx)).toBeLessThanOrEqual(26 + 1e-6);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test
```

预期：FAIL，模块不存在。

- [ ] **Step 3: 实现 physics.ts**

```ts
import { FIXED_DT, MAX_SUBSTEPS, MAX_SPEED } from './constants';

export interface Particle {
  x: number; y: number; z: number;
  px: number; py: number; pz: number;   // 上一帧位置（Verlet 隐式速度）
  invMass: number;                       // 0 = 固定（锚点）
}

export function makeParticle(o: Partial<Particle> & { x: number; y: number; z: number }): Particle {
  return { px: o.x, py: o.y, pz: o.z, invMass: 1, ...o } as Particle;
}

/** 由目标摆动周期与绳长反算重力：g = 4π²L / T²（spec §7.3，不套用 9.8）。 */
export function gravityFromPeriod(ropeLength: number, periodS: number): number {
  return (4 * Math.PI * Math.PI * ropeLength) / (periodS * periodS);
}

/** 由阻尼比 ζ 与周期换算"每秒速度衰减系数"。 */
export function dampingFromZeta(zeta: number, periodS: number): number {
  return Math.exp(-zeta * ((2 * Math.PI) / periodS));
}

export interface SolverOptions {
  gravity: number;
  dampingPerSecond: number;
  maxSpeed?: number;
}

export class VerletSolver {
  particles: Particle[] = [];
  gravity: number;
  private dampingPerSecond: number;
  private maxSpeed: number;
  private acc = 0;
  /** 外力累积器（idle 风、拨动、抓取），每步清零。 */
  private forces = new Map<Particle, { x: number; y: number; z: number }>();

  constructor(opts: SolverOptions) {
    this.gravity = opts.gravity;
    this.dampingPerSecond = opts.dampingPerSecond;
    this.maxSpeed = opts.maxSpeed ?? MAX_SPEED;
  }

  addForce(p: Particle, fx: number, fy: number, fz: number): void {
    const f = this.forces.get(p) ?? { x: 0, y: 0, z: 0 };
    f.x += fx; f.y += fy; f.z += fz;
    this.forces.set(p, f);
  }

  /** 真实帧 dt 进来，内部按 FIXED_DT 累积，保证帧率无关。 */
  step(dtReal: number): void {
    this.acc += Math.min(dtReal, 0.1);
    let n = 0;
    while (this.acc >= FIXED_DT && n < MAX_SUBSTEPS) {
      this.integrate();
      this.acc -= FIXED_DT;
      n++;
    }
    if (n === MAX_SUBSTEPS) this.acc = 0;   // 丢弃积压，避免追帧雪崩
  }

  private integrate(): void {
    const dt2 = FIXED_DT * FIXED_DT;
    const decay = Math.pow(this.dampingPerSecond, FIXED_DT);
    const maxDisp = this.maxSpeed * FIXED_DT;

    for (const p of this.particles) {
      if (p.invMass === 0) { p.px = p.x; p.py = p.y; p.pz = p.z; continue; }

      const f = this.forces.get(p);
      const ax = f ? f.x * p.invMass : 0;
      const ay = (f ? f.y * p.invMass : 0) - this.gravity;
      const az = f ? f.z * p.invMass : 0;

      let vx = (p.x - p.px) * decay + ax * dt2;
      let vy = (p.y - p.py) * decay + ay * dt2;
      let vz = (p.z - p.pz) * decay + az * dt2;

      // 速度上限：限制单步位移
      const disp = Math.hypot(vx, vy, vz);
      if (disp > maxDisp) {
        const k = maxDisp / disp;
        vx *= k; vy *= k; vz *= k;
      }

      p.px = p.x; p.py = p.y; p.pz = p.z;
      p.x += vx; p.y += vy; p.z += vz;
    }
    this.forces.clear();
  }

  /** 位置式距离约束求解（绳索段、抓取弹簧共用）。 */
  solveDistance(a: Particle, b: Particle, rest: number, stiffness = 1): void {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    const wSum = a.invMass + b.invMass;
    if (wSum === 0) return;
    const diff = ((d - rest) / d) * stiffness;
    const kx = dx * diff, ky = dy * diff, kz = dz * diff;
    a.x += kx * (a.invMass / wSum); a.y += ky * (a.invMass / wSum); a.z += kz * (a.invMass / wSum);
    b.x -= kx * (b.invMass / wSum); b.y -= ky * (b.invMass / wSum); b.z -= kz * (b.invMass / wSum);
  }

  velocityOf(p: Particle): { x: number; y: number; z: number } {
    return { x: (p.x - p.px) / FIXED_DT, y: (p.y - p.py) / FIXED_DT, z: (p.z - p.pz) / FIXED_DT };
  }

  /** 直接施加冲量（拨动、碰撞用）。 */
  applyImpulse(p: Particle, ix: number, iy: number, iz: number): void {
    if (p.invMass === 0) return;
    p.px -= ix * p.invMass * FIXED_DT;
    p.py -= iy * p.invMass * FIXED_DT;
    p.pz -= iz * p.invMass * FIXED_DT;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test
```

预期：4 passed。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat(hero): 实现固定步长 Verlet 求解器与阻尼/重力换算"
```

---

## Task 8: 徽章几何、材质与场景

**Files:**
- Create: `src/components/hero3d/badge.ts`
- Create: `src/components/hero3d/scene.ts`

**Interfaces:**
- Consumes: `BADGE_BAND_RATIO`, `CAMERA_FOV`, `CAMERA_PITCH`, `ANCHOR_ABOVE_VIEW`（`constants.ts`）
- Produces: `createBadge()`, `createScene()`（Task 9–12 依赖）

- [ ] **Step 1: 实现 badge.ts（几何 + 碰撞代理 + SVG）**

```ts
import * as THREE from 'three';
import type { BadgeConfig } from '../../data/badges';
import type { Vec2 } from './types';

export { normalizeContour };
export type { Vec2 };

function normalizeContour(points: Vec2[], maxRadius = 10): Vec2[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const r = Math.max(maxX - minX, maxY - minY) / 2 || 1;
  const s = maxRadius / r;
  return points.map(([x, y]) => [(x - cx) * s, (y - cy) * s] as Vec2);
}

export interface BadgeMesh {
  group: THREE.Group;
  material: THREE.MeshPhysicalMaterial;
}

export function createBadge(cfg: BadgeConfig): BadgeMesh {
  const pts = normalizeContour(cfg.contour, 10);
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.5, steps: 1, curveSegments: 12,
    bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.14,
    bevelOffset: 0, bevelSegments: 6,
  });
  geo.center();
  geo.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    color: cfg.material.color,
    metalness: cfg.material.metalness,
    roughness: cfg.material.roughness,
    clearcoat: cfg.material.clearcoat,
    clearcoatRoughness: cfg.material.clearcoatRoughness,
    envMapIntensity: cfg.material.envMapIntensity,
  });

  const mesh = new THREE.Mesh(geo, material);
  const group = new THREE.Group();
  group.add(mesh);
  return { group, material };
}

/**
 * 由轮廓包围盒生成 3~5 个球碰撞代理（spec §7.5）。
 * 徽章是薄片挤出体而非圆形，单球代理要么过早起跳、要么已经穿模。
 */
export function buildCollisionSpheres(cfg: BadgeConfig): { offset: THREE.Vector3; radius: number }[] {
  const pts = normalizeContour(cfg.contour, 10);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const w = maxX - minX, h = maxY - minY;
  const vertical = h >= w;                       // 竖长（如 DeepSeek 24:41）沿 Y 排布
  const major = vertical ? h : w;
  const minor = vertical ? w : h;
  const radius = minor / 2;
  const count = Math.max(3, Math.min(5, Math.round(major / (radius * 1.2))));

  const out: { offset: THREE.Vector3; radius: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const pos = -major / 2 + radius + t * (major - radius * 2);
    out.push({
      offset: vertical ? new THREE.Vector3(0, pos, 0) : new THREE.Vector3(pos, 0, 0),
      radius,
    });
  }
  return out;
}

/** 构建期生成 2D SVG path（与 3D 同源，用于降级渲染，spec §7.8）。 */
export function contourToSvgPath(cfg: BadgeConfig, size = 200): string {
  const pts = normalizeContour(cfg.contour, size * 0.4);
  const to = ([x, y]: Vec2) => `${(size / 2 + x).toFixed(2)} ${(size / 2 - y).toFixed(2)}`;
  return `M ${pts.map(to).join(' L ')} Z`;
}
```

- [ ] **Step 2: 实现 scene.ts**

```ts
import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_PITCH, ANCHOR_ABOVE_VIEW, BADGE_BAND_RATIO } from './constants';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  container: HTMLElement;
  /** 锚点平面在世界坐标中的 Y（视口顶部之上）。 */
  anchorY: number;
  /** 徽章带的水平半宽（世界单位），供锚点 X 分布使用。 */
  halfWidth: number;
}

export function computeAnchorY(camera: THREE.PerspectiveCamera, container: HTMLElement): number {
  // 把可视高度换算到 z=0 平面
  const dist = camera.position.z;
  const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
  return vh / 2 + ANCHOR_ABOVE_VIEW;
}

export function computeHalfWidth(camera: THREE.PerspectiveCamera, container: HTMLElement): number {
  const dist = camera.position.z;
  const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
  return (vh * (container.clientWidth / container.clientHeight)) / 2;
}

export function createScene(container: HTMLElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // 悬挂场景无地面，不启用 shadowMap（spec §7.1：白捡的性能）
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV, container.clientWidth / container.clientHeight, 0.1, 200,
  );
  // 相机略低于徽章带中心并仰视，使空间显高（spec §7.2）
  camera.position.set(0, -2, 42);
  camera.lookAt(0, CAMERA_PITCH * 20, 0);

  // 环境贴图：金属反射的关键
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xfff1e6, 2.2);
  key.position.set(12, 20, 14);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xd97757, 1.6);
  rim.position.set(-16, 6, -12);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x8899cc, 0.6);
  fill.position.set(0, -6, 18);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0xffe4d4, 0.25));

  return {
    renderer, scene, camera, container,
    anchorY: 0,      // 由 layoutBadges 计算后回填
    halfWidth: 0,
  };
}

/** 供 window resize 调用：重算相机与锚点几何。 */
export function resizeScene(ctx: SceneContext): void {
  const { renderer, camera, container } = ctx;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}
```

- [ ] **Step 3: 构建验证并提交**

```bash
npx astro build && echo OK
git add -A && git commit -m "feat(hero): 实现徽章几何、碰撞代理生成与场景搭建"
```

- [ ] **Step 4: 写 types.ts**

```ts
// src/components/hero3d/types.ts
export type Vec2 = readonly [number, number];
```

---

## Task 9: 绳索链与 Line2 渲染

**Files:**
- Create: `src/components/hero3d/rope.ts`

**Interfaces:**
- Consumes: `VerletSolver`, `Particle`（Task 7）；`ROPE_SEGMENTS`, `ROPE_WIDTH_PX`（`constants.ts`）
- Produces: `Rope` 类（Task 10 依赖）

- [ ] **Step 1: 实现 rope.ts**

```ts
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { Particle, VerletSolver } from './physics';
import { makeParticle } from './physics';
import { ROPE_SEGMENTS, ROPE_WIDTH_PX } from './constants';

/**
 * 一条绳索 = 一串 Verlet 质点链。
 * 用多段而非单段距离约束：单段永远是直线，看起来像钢丝；多段才有垂坠弧度与滞后感。
 */
export class Rope {
  readonly nodes: Particle[] = [];
  readonly line: Line2;
  readonly segLength: number;      // 约束求解需要，挂在实例上避免调用方重复计算
  private material: LineMaterial;
  private positions: Float32Array;

  constructor(
    private scene: THREE.Scene,
    anchor: THREE.Vector3,
    segmentLength: number,
    endMass: number,
  ) {
    this.segLength = segmentLength;
    for (let i = 0; i < ROPE_SEGMENTS; i++) {
      const isAnchor = i === 0;
      this.nodes.push(makeParticle({
        x: anchor.x, y: anchor.y - i * segmentLength, z: anchor.z,
        invMass: isAnchor ? 0 : 1,
      }));
    }
    // 末端质点承载徽章，质量更大（影响碰撞冲量分配）
    this.nodes[this.nodes.length - 1].invMass = 1 / endMass;

    this.positions = new Float32Array(ROPE_SEGMENTS * 3);
    const geo = new LineGeometry();
    geo.setPositions(Array.from(this.positions));
    this.material = new LineMaterial({
      color: 0xb9a08f, linewidth: ROPE_WIDTH_PX, transparent: true, opacity: 0.55,
    });
    this.material.resolution.set(window.innerWidth, window.innerHeight);
    this.line = new Line2(geo, this.material);
    this.line.computeLineDistances();
    scene.add(this.line);
  }

  get end(): Particle { return this.nodes[this.nodes.length - 1]; }

  /** 约定求解：把所有段拉回静止长度。迭代次数越多越"硬"。 */
  constrain(solver: VerletSolver, segLength: number, iterations = 6): void {
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < this.nodes.length - 1; i++) {
        solver.solveDistance(this.nodes[i], this.nodes[i + 1], segLength);
      }
    }
  }

  syncGeometry(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const p = this.nodes[i];
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
    }
    this.line.geometry.setPositions(Array.from(this.positions));
  }

  onResize(): void {
    this.material.resolution.set(window.innerWidth, window.innerHeight);
  }

  dispose(): void {
    this.scene.remove(this.line);
    this.line.geometry.dispose();
    this.material.dispose();
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat(hero): 实现多段 Verlet 绳索链与 Line2 渲染"
```

---

## Task 10: 徽章刚体（朝向、角速度、软回正）

**Files:**
- Create: `src/components/hero3d/badgeBody.ts`

**Interfaces:**
- Consumes: `Rope`（Task 9）；`BADGE_INERTIA`, `ORIENT_RESTITUTION`, `ANGULAR_DAMPING`（`constants.ts`）
- Produces: `BadgeBody` 类（Task 11、12 依赖）

- [ ] **Step 1: 实现 badgeBody.ts**

```ts
import * as THREE from 'three';
import type { Particle } from './physics';
import {
  BADGE_INERTIA, ORIENT_RESTITUTION, ANGULAR_DAMPING, HOVER_TILT_MAX, HOVER_SCALE,
} from './constants';

/**
 * 徽章刚体近似 = 绳索末端质点 + 朝向四元数 + 角速度 + 标量转动惯量。
 *
 * 仅为质点时，被撞只会平移不会自转，完全没有"叮当乱晃"。
 * 引入朝向自由度后，碰撞冲量作用于接触点产生力矩（spec §7.4）。
 */
export class BadgeBody {
  readonly quaternion = new THREE.Quaternion();
  readonly angularVelocity = new THREE.Vector3();
  hoverTilt = new THREE.Vector3();     // hover 时的附加倾斜（限幅）
  hoverAmount = 0;                     // 0~1，驱动缩放
  private inertia = BADGE_INERTIA;

  constructor(
    readonly particle: Particle,
    readonly mesh: THREE.Group,
    readonly collisionSpheres: { offset: THREE.Vector3; radius: number }[],
  ) {}

  get position(): THREE.Vector3 {
    return new THREE.Vector3(this.particle.x, this.particle.y, this.particle.z);
  }

  /** 世界空间中的碰撞球心。 */
  worldSpheres(): { center: THREE.Vector3; radius: number }[] {
    return this.collisionSpheres.map((s) => ({
      center: s.offset.clone().applyQuaternion(this.quaternion).add(this.position),
      radius: s.radius,
    }));
  }

  /** 接触点施加冲量 → 线速度 + 角速度（力矩 τ = r × J）。 */
  applyImpulseAt(impulse: THREE.Vector3, worldPoint: THREE.Vector3): void {
    const p = this.particle;
    p.px -= (impulse.x / this.mass) * (1 / 120);
    p.py -= (impulse.y / this.mass) * (1 / 120);
    p.pz -= (impulse.z / this.mass) * (1 / 120);

    const r = worldPoint.clone().sub(this.position);
    const torque = r.clone().cross(impulse);
    this.angularVelocity.addScaledVector(torque, 1 / this.inertia);
  }

  get mass(): number { return 1 / this.particle.invMass; }

  /**
   * 软回正：目标姿态由 up = 绳索方向、forward = 朝向相机构造（spec §7.4）。
   * up 沿绳 → 绳摆时牌子自然跟着倾（真实吊坠行为）；
   * forward 朝相机 → 保证品牌 logo 始终可读。
   */
  update(dt: number, ropeDir: THREE.Vector3, cameraPos: THREE.Vector3): void {
    const up = ropeDir.clone().normalize();
    const toCam = cameraPos.clone().sub(this.position).normalize();
    // 把 toCam 投影到与 up 垂直的平面，再正交化
    const forward = toCam.clone().addScaledVector(up, -toCam.dot(up));
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const trueForward = new THREE.Vector3().crossVectors(up, right).normalize();

    const m = new THREE.Matrix4().makeBasis(right, up, trueForward);
    const target = new THREE.Quaternion().setFromRotationMatrix(m);

    const k = 1 - Math.exp(-ORIENT_RESTITUTION * dt);
    this.quaternion.slerp(target, k);

    // 角速度积分 + 角阻尼
    this.quaternion.multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          this.angularVelocity.x * dt,
          this.angularVelocity.y * dt,
          this.angularVelocity.z * dt,
        ),
      ),
    );
    this.quaternion.normalize();
    this.angularVelocity.multiplyScalar(Math.pow(ANGULAR_DAMPING, dt));
  }

  /** 把朝向与 hover 效果写入 mesh。 */
  syncMesh(): void {
    this.mesh.position.set(this.particle.x, this.particle.y, this.particle.z);
    const q = this.quaternion.clone();
    if (this.hoverAmount > 0) {
      const tilt = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          this.hoverTilt.x * HOVER_TILT_MAX * this.hoverAmount,
          this.hoverTilt.y * HOVER_TILT_MAX * this.hoverAmount,
          0,
        ),
      );
      q.multiply(tilt);
    }
    this.mesh.quaternion.copy(q);
    const s = 1 + (HOVER_SCALE - 1) * this.hoverAmount;
    this.mesh.scale.setScalar(s);
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat(hero): 实现徽章刚体朝向、力矩与软回正"
```

---

## Task 11: 球代理碰撞

**Files:**
- Create: `src/components/hero3d/collision.ts`
- Test: `tests/collision.test.ts`

**Interfaces:**
- Consumes: `BadgeBody`（Task 10）；`RESTITUTION`（`constants.ts`）
- Produces: `resolveCollisions()`（Task 12 依赖）

- [ ] **Step 1: 写失败测试**

```ts
// tests/collision.test.ts
import { describe, it, expect } from 'vitest';
import { resolveCollisions } from '../src/components/hero3d/collision';
import { makeFakeBody } from './helpers/fakeBody';

describe('resolveCollisions', () => {
  it('两徽章重叠时产生分离冲量，且法线沿球心连线', () => {
    const a = makeFakeBody({ x: 0, y: 0, z: 0 }, [{ offset: { x: 0, y: 0, z: 0 }, radius: 3 }]);
    const b = makeFakeBody({ x: 4, y: 0, z: 0 }, [{ offset: { x: 0, y: 0, z: 0 }, radius: 3 }]);
    resolveCollisions([a, b], 0.35);
    // 重叠 2 单位 → A 被推向 -x，B 被推向 +x
    expect(a.particle.x).toBeLessThan(0);
    expect(b.particle.x).toBeGreaterThan(4);
  });

  it('偏心碰撞产生角速度（力矩），正心碰撞不产生', () => {
    const a = makeFakeBody({ x: 0, y: 0, z: 0 }, [{ offset: { x: 0, y: 0, z: 0 }, radius: 3 }]);
    const b = makeFakeBody({ x: 4, y: 0, z: 0 }, [{ offset: { x: 0, y: 0, z: 0 }, radius: 3 }]);
    b.particle.py = b.particle.y + 2.5;   // 给 B 一个偏心入射速度
    resolveCollisions([a, b], 0.35);
    expect(a.angularVelocity.length()).toBeGreaterThan(0);
  });

  it('不重叠时不产生任何冲量', () => {
    const a = makeFakeBody({ x: 0, y: 0, z: 0 }, [{ offset: { x: 0, y: 0, z: 0 }, radius: 3 }]);
    const b = makeFakeBody({ x: 20, y: 0, z: 0 }, [{ offset: { x: 0, y: 0, z: 0 }, radius: 3 }]);
    const before = { ax: a.particle.x, bx: b.particle.x };
    resolveCollisions([a, b], 0.35);
    expect(a.particle.x).toBe(before.ax);
    expect(b.particle.x).toBe(before.bx);
  });
});
```

- [ ] **Step 2: 写测试辅助**

```ts
// tests/helpers/fakeBody.ts
import * as THREE from 'three';
import { BadgeBody } from '../../src/components/hero3d/badgeBody';
import { makeParticle } from '../../src/components/hero3d/physics';

export function makeFakeBody(
  pos: { x: number; y: number; z: number },
  spheres: { offset: { x: number; y: number; z: number }; radius: number }[],
): BadgeBody {
  const particle = makeParticle({ ...pos, invMass: 1 });
  return new BadgeBody(
    particle,
    new THREE.Group(),
    spheres.map((s) => ({
      offset: new THREE.Vector3(s.offset.x, s.offset.y, s.offset.z),
      radius: s.radius,
    })),
  );
}
```

- [ ] **Step 3: 运行测试确认失败**

```bash
npm test
```

预期：FAIL，模块不存在。

- [ ] **Step 4: 实现 collision.ts**

```ts
import * as THREE from 'three';
import type { BadgeBody } from './badgeBody';
import { RESTITUTION } from './constants';

const FIXED_DT = 1 / 120;

/**
 * 跨徽章球代理碰撞（spec §7.5）。
 * 同徽章内部的球不做检测，绳索与徽章也不做（YAGNI）。
 * 5 徽章 × 5 球 = 25 球，跨徽章组合约 250 次测试/步，开销可忽略。
 */
export function resolveCollisions(bodies: BadgeBody[], restitution = RESTITUTION): void {
  const spheres = bodies.map((b) => b.worldSpheres());

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const A = bodies[i], B = bodies[j];
      for (const sa of spheres[i]) {
        for (const sb of spheres[j]) {
          const d = sb.center.clone().sub(sa.center);
          const dist = d.length();
          const minDist = sa.radius + sb.radius;
          if (dist >= minDist || dist < 1e-6) continue;

          const n = d.divideScalar(dist);                 // 碰撞法线 A→B
          const penetration = minDist - dist;

          // 位置修正，先把重叠推开（防抖）
          const wA = A.particle.invMass, wB = B.particle.invMass;
          const wSum = wA + wB;
          if (wSum === 0) continue;
          A.particle.x -= n.x * penetration * (wA / wSum);
          A.particle.y -= n.y * penetration * (wA / wSum);
          A.particle.z -= n.z * penetration * (wA / wSum);
          B.particle.x += n.x * penetration * (wB / wSum);
          B.particle.y += n.y * penetration * (wB / wSum);
          B.particle.z += n.z * penetration * (wB / wSum);

          // 相对速度沿法线分量
          const vA = velocityOf(A.particle), vB = velocityOf(B.particle);
          const rel = vB.clone().sub(vA);
          const vn = rel.dot(n);
          if (vn > 0) continue;                            // 已经在分离

          const jImpulse = (-(1 + restitution) * vn) / wSum;
          const impulse = n.clone().multiplyScalar(jImpulse);

          // 冲量作用于接触点 → 线速度 + 力矩
          const contactA = sa.center.clone().addScaledVector(n, sa.radius);
          A.applyImpulseAt(impulse.clone().negate(), contactA);
          B.applyImpulseAt(impulse, contactA);
        }
      }
    }
  }
}

function velocityOf(p: { x: number; y: number; z: number; px: number; py: number; pz: number }) {
  return new THREE.Vector3((p.x - p.px) / FIXED_DT, (p.y - p.py) / FIXED_DT, (p.z - p.pz) / FIXED_DT);
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npm test
```

预期：7 passed（4 物理 + 3 碰撞）。

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat(hero): 实现徽章球代理碰撞与力矩响应"
```

---

## Task 12: 交互（拨动 / 抓取 / hover）与 Hero3D 组装

**Files:**
- Create: `src/components/hero3d/interaction.ts`
- Create: `src/components/hero3d/Hero3D.astro`
- Modify: `src/pages/index.astro`（插入 island）

**Interfaces:**
- Consumes: Task 6–11 全部产出
- Produces: 可运行的 hero

- [ ] **Step 1: 实现 interaction.ts**

```ts
import * as THREE from 'three';
import type { BadgeBody } from './badgeBody';
import type { VerletSolver } from './physics';
import {
  SWIPE_RADIUS, SWIPE_IMPULSE_MAX, GRAB_STIFFNESS, GRAB_DAMPING, GRAB_FORCE_MAX,
} from './constants';

const PLANE_Z = 0;   // 徽章所在的深度平面

/** 鼠标屏幕坐标 → 世界坐标（投影到 z = PLANE_Z 平面）。 */
export function screenToWorld(
  nx: number, ny: number, camera: THREE.PerspectiveCamera,
): THREE.Vector3 {
  const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize();
  const t = (PLANE_Z - camera.position.z) / dir.z;
  return camera.position.clone().addScaledVector(dir, t);
}

/**
 * 拨动：鼠标划过时对附近徽章施加**偏心**冲量（偏离质心以带出自旋）。
 * 正心冲量只会平移，偏心才有"被手背扫过"的味道（spec §7.6）。
 */
export function applySwipe(
  world: THREE.Vector3,
  mouseVel: THREE.Vector2,
  bodies: BadgeBody[],
  solver: VerletSolver,
): void {
  for (const b of bodies) {
    const d = b.position.clone().sub(world);
    const dist = d.length();
    if (dist > SWIPE_RADIUS) continue;
    const falloff = 1 - dist / SWIPE_RADIUS;
    const impulse = new THREE.Vector3(mouseVel.x, -mouseVel.y, 0)
      .multiplyScalar(falloff * SWIPE_IMPULSE_MAX);
    if (impulse.length() > SWIPE_IMPULSE_MAX) impulse.setLength(SWIPE_IMPULSE_MAX);

    // 偏心：接触点取靠近鼠标一侧的球面点，产生力矩
    const r = d.lengthSq() > 1e-6 ? d.clone().normalize().multiplyScalar(-1.5) : new THREE.Vector3(1, 0, 0);
    b.applyImpulseAt(impulse, b.position.clone().add(r));
  }
}

/**
 * 抓取：临界阻尼弹簧跟随鼠标。
 * 弹簧力必须限幅，否则会注入无限能量把徽章甩飞（spec §7.6）。
 */
export function applyGrab(
  body: BadgeBody, target: THREE.Vector3, solver: VerletSolver,
): void {
  const p = body.particle;
  const v = new THREE.Vector3((p.x - p.px) * 120, (p.y - p.py) * 120, (p.z - p.pz) * 120);
  const f = target.clone().sub(body.position).multiplyScalar(GRAB_STIFFNESS)
    .addScaledVector(v, -GRAB_DAMPING);
  if (f.length() > GRAB_FORCE_MAX) f.setLength(GRAB_FORCE_MAX);
  solver.addForce(p, f.x, f.y, f.z);
}
```

- [ ] **Step 2: 实现 Hero3D.astro（含降级判定、idle 风、渲染循环）**

```astro
---
import { BADGES } from '../../data/badges';
import { contourToSvgPath } from './badge';
// 构建期生成降级用的静态 SVG（spec §7.8：与 3D 同源的轮廓数组）
const fallbackBadges = BADGES.map((b) => ({
  brand: b.brand, note: b.note, path: contourToSvgPath(b, 200),
}));
---
<div class="hero3d" data-hero3d>
  <!-- 降级层：reduced-motion / 无 WebGL / 窄屏 时显示，构建期已渲染好 -->
  <ul class="fallback" data-hero-fallback hidden>
    {fallbackBadges.map((b) => (
      <li>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <path d={b.path} fill="currentColor" />
        </svg>
        <span>{b.brand}</span>
      </li>
    ))}
  </ul>
  <div class="canvas-host" data-hero-canvas></div>
</div>

<script>
  // 岛内动态 import：three 独立分包，其他页面完全不加载（spec §7.9）
  const host = document.querySelector('[data-hero3d]');
  const fallback = document.querySelector('[data-hero-fallback]');
  const canvasHost = document.querySelector('[data-hero-canvas]');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.innerWidth < 768;
  const hasWebGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
  })();

  if (host && (reduced || narrow || !hasWebGL)) {
    fallback?.removeAttribute('hidden');
    canvasHost?.remove();
  } else if (host) {
    const { mountHero } = await import('./mount');
    mountHero(host);
  }
</script>

<style>
  .hero3d { position: relative; width: 100%; height: 100%; }
  .canvas-host { position: absolute; inset: 0; }
  .canvas-host canvas { display: block; width: 100%; height: 100%; }
  .fallback {
    position: absolute; inset: 0; margin: 0; padding: 0; list-style: none;
    display: flex; align-items: center; justify-content: center;
    gap: clamp(1rem, 4vw, 3rem); flex-wrap: wrap;
    color: var(--color-metal);
  }
  .fallback li { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .fallback svg { width: clamp(44px, 8vw, 84px); height: auto; opacity: 0.9; }
  .fallback span { font-size: var(--text-xs); color: var(--color-text-dim); }
</style>
```

- [ ] **Step 3: 实现 mount.ts（组装全部模块 + idle 风 + 渲染循环）**

```ts
import * as THREE from 'three';
import { BADGES } from '../../data/badges';
import { createScene, resizeScene, computeAnchorY, computeHalfWidth } from './scene';
import { VerletSolver, gravityFromPeriod, dampingFromZeta } from './physics';
import { Rope } from './rope';
import { createBadge, buildCollisionSpheres } from './badge';
import { BadgeBody } from './badgeBody';
import { resolveCollisions } from './collision';
import { screenToWorld, applySwipe, applyGrab } from './interaction';
import {
  PERIOD_S, ZETA, ROPE_SEGMENTS, ANCHOR_ABOVE_VIEW, IDLE_NOISE_AMP,
  IDLE_GUST_AMP, IDLE_GUST_INTERVAL_S, MOBILE_BREAKPOINT,
} from './constants';

export function mountHero(rootEl: Element): () => void {
  const canvasHost = rootEl.querySelector('[data-hero-canvas]') as HTMLElement;
  const ctx = createScene(canvasHost);
  const { scene, camera, renderer } = ctx;

  const solver = new VerletSolver({
    gravity: gravityFromPeriod(11, PERIOD_S),
    dampingPerSecond: dampingFromZeta(ZETA, PERIOD_S),
  });

  const bodies: BadgeBody[] = [];
  const ropes: Rope[] = [];
  const gustTimers: number[] = [];

  function layout() {
    for (const r of ropes) r.dispose();
    ropes.length = 0;
    solver.particles.length = 0;
    bodies.length = 0;
    gustTimers.length = 0;
    while (scene.children.length > 4) scene.remove(scene.children[scene.children.length - 1]);

    ctx.anchorY = computeAnchorY(camera, canvasHost);
    ctx.halfWidth = computeHalfWidth(camera, canvasHost);
    const usable = ctx.halfWidth * 0.92;

    BADGES.forEach((cfg, i) => {
      const anchor = new THREE.Vector3(
        -usable + (2 * usable) * cfg.anchorXRatio,
        ctx.anchorY,
        0,
      );
      const segLen = cfg.ropeLength / (ROPE_SEGMENTS - 1);
      const rope = new Rope(scene, anchor, segLen, cfg.mass);
      ropes.push(rope);
      solver.particles.push(...rope.nodes);

      const { group } = createBadge(cfg);
      scene.add(group);
      const spheres = buildCollisionSpheres(cfg);
      const body = new BadgeBody(rope.end, group, spheres);
      bodies.push(body);

      // 各徽章噪声相位错开，否则 5 个牌子同步摆动会非常机械（spec §7.3）
      gustTimers.push(IDLE_GUST_INTERVAL_S[0] + Math.random() * i);
    });
  }

  layout();

  // ---- 交互状态 ----
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  let lastPointer = new THREE.Vector2(-10, -10);
  let grabbed: BadgeBody | null = null;
  const grabTarget = new THREE.Vector3();
  let hovered: BadgeBody | null = null;

  const host = canvasHost;
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  });
  host.addEventListener('pointerdown', (e) => {
    // 仅在鼠标上启用抓取：触屏拖拽会与页面滚动冲突（spec §7.6）
    if (e.pointerType !== 'mouse') return;
    const r = host.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -(((e.clientY - r.top) / r.height) * 2 - 1),
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(bodies.map((b) => b.mesh), true);
    if (hits.length) {
      const body = bodies.find((b) => {
        let o: THREE.Object3D | null = hits[0].object;
        while (o) { if (o === b.mesh) return true; o = o.parent; }
        return false;
      });
      if (body) { grabbed = body; grabTarget.copy(screenToWorld(ndc.x, ndc.y, camera)); }
    }
  });
  window.addEventListener('pointerup', () => { grabbed = null; });

  const onResize = () => { resizeScene(ctx); ropes.forEach((r) => r.onResize()); layout(); };
  window.addEventListener('resize', onResize);

  // ---- 滚动暂停（spec §7.9）----
  let visible = true;
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; });
  io.observe(host);

  const clock = new THREE.Clock();
  let raf = 0;
  let time = 0;

  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    time += dt;

    // 拨动：只在指针移动时施加，且仅在未抓取时
    if (!grabbed) {
      const vel = pointer.clone().sub(lastPointer);
      if (vel.lengthSq() > 1e-6) {
        applySwipe(screenToWorld(pointer.x, pointer.y, camera), vel, bodies, solver);
      }
    }
    lastPointer.copy(pointer);

    // idle 风：连续低频噪声（防死寂）+ 偶发阵风（造生命感），各徽章相位错开
    bodies.forEach((b, i) => {
      const phase = i * 1.7;
      const noise = Math.sin(time * 0.7 + phase) * 0.6 + Math.sin(time * 0.31 + phase * 2.3) * 0.4;
      solver.addForce(b.particle, noise * IDLE_NOISE_AMP, 0, 0);

      gustTimers[i] -= dt;
      if (gustTimers[i] <= 0) {
        const [lo, hi] = IDLE_GUST_INTERVAL_S;
        gustTimers[i] = lo + Math.random() * (hi - lo);
        solver.addForce(b.particle, (Math.random() - 0.5) * 2 * IDLE_GUST_AMP, 0, 0);
      }
    });

    if (grabbed) applyGrab(grabbed, grabTarget, solver);

    solver.step(dt);
    ropes.forEach((r) => r.constrain(solver, r.segLength));
    resolveCollisions(bodies);

    bodies.forEach((b, i) => {
      const nodes = ropes[i].nodes;
      const prev = nodes[nodes.length - 2];
      const ropeDir = new THREE.Vector3(
        b.particle.x - prev.x, b.particle.y - prev.y, b.particle.z - prev.z,
      );
      b.update(dt, ropeDir, camera.position);
      b.hoverAmount += ((b === hovered ? 1 : 0) - b.hoverAmount) * Math.min(1, dt * 8);
      b.syncMesh();
    });
    ropes.forEach((r) => r.syncGeometry());

    renderer.render(scene, camera);
  }
  tick();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener('resize', onResize);
    ropes.forEach((r) => r.dispose());
    renderer.dispose();
  };
}
```

- [ ] **Step 4: 在首页挂载 island**

修改 `src/pages/index.astro`：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero3D from '../components/hero3d/Hero3D.astro';
import { site } from '../data/site';
---
<BaseLayout title={`${site.name} · ${site.role}`}>
  <section class="hero">
    <div class="hero-visual"><Hero3D client:visible /></div>
    <div class="hero-text">
      <h1>{site.tagline}</h1>
      <p class="sub">新疆大学 软件工程 · 2027 届</p>
      <div class="cta">
        <a class="btn primary" href="/resume">查看简历</a>
        <a class="btn" href="/projects">我的项目</a>
      </div>
    </div>
  </section>
</BaseLayout>
<!-- style 同 Task 4 -->
```

- [ ] **Step 5: 构建验证并提交**

```bash
npx astro build && echo OK
git add -A && git commit -m "feat(hero): 挂载 Hero 3D 岛并实现拨动/抓取/hover 交互"
```

---

# Phase 3（P3）—— 简历数据与 PDF 流水线

## Task 13: 项目与简历数据层

**Files:**
- Create: `src/data/projects.ts`
- Create: `src/data/resume.ts`

**Interfaces:**
- Produces: `PROJECTS`, `resume`（Task 14–16 依赖）

- [ ] **Step 1: 写 projects.ts（3 个项目的指标与链接）**

```ts
export interface ProjectEntry {
  id: 'ai-image-search' | 'ai-travel' | 'kaoyandaily';
  name: string;
  subtitle: string;
  period: string;
  stack: string[];
  metrics: { label: string; value: string }[];
  github: string;
  demo?: string;
  highlights: string[];
  depth: 'card' | 'deep';
}

export const PROJECTS: ProjectEntry[] = [
  {
    id: 'ai-image-search',
    name: 'AI 图像检索系统',
    subtitle: '基于 ResNet / YOLO / pgvector 的端到端图像理解与相似检索平台',
    period: '2026.07',
    stack: ['Python', 'FastAPI', 'PyTorch', 'YOLOv8', 'PostgreSQL', 'pgvector', 'Docker'],
    metrics: [
      { label: '检索管线', value: '2 条' },
      { label: '特征维度', value: '1858-d / 2048-d' },
      { label: '测试', value: '108 项全绿' },
    ],
    github: 'https://github.com/Thelatter666/ai-image-search-system',
    highlights: [
      '设计双检索管线：传统 HSV+HOG 特征（1858-d）与 ResNet-50 深度特征（2048-d），按场景取舍——颜色纹理类走前者，物体语义类走后者。',
      '使用 PostgreSQL + pgvector 存储向量并建 HNSW 索引；针对 HNSW 2000 维上限，判断 deep_vector 走顺序扫描在数据量 <10 万时性能足够，不做无谓降维。',
    ],
    depth: 'card',
  },
  {
    id: 'ai-travel',
    name: 'AI 智能旅行规划助手',
    subtitle: '慢节奏度假风的 LLM 行程规划工具',
    period: '2026.07',
    stack: ['Python', 'FastAPI', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'LLM API'],
    metrics: [
      { label: '结构化输出', value: '纯 JSON 铁律' },
      { label: '容错层级', value: '4 层' },
    ],
    github: 'https://github.com/Thelatter666/ai_travel',
    highlights: [
      '面向大模型编写 System Prompt 实现节奏控制（每日活动上限、强制午休）与文风引导，并要求纯 JSON 输出。',
      '构建四层容错解析链：markdown 代码块提取 → JSON 正则匹配 → 类型规范化 → 缺失字段补全；API Key 缺失时自动降级 Mock。',
    ],
    depth: 'card',
  },
  {
    id: 'kaoyandaily',
    name: '考研学习一体化管理平台',
    subtitle: '考试倒计时、任务计划/复盘、番茄钟、学习森林热力图与三科可视化看板',
    period: '2026.07 – 2026.08',
    stack: ['React 18', 'TypeScript', 'Vite', 'Express', 'MySQL 8', 'Zod', 'Vitest', 'Playwright', 'Nginx'],
    metrics: [
      { label: '页面', value: '12 个' },          // 已核实：App.tsx 的 pageLoaders
      { label: '代码量', value: '约 1.2 万行 TypeScript' },
      { label: 'Git 提交', value: '187 次' },      // 已核实：git rev-list --count HEAD
      { label: '路由模块', value: '11 个' },
      { label: '测试', value: '待实跑填入' },
    ],
    github: 'https://github.com/Thelatter666/kaoyandaka4',
    highlights: [
      '编写 AGENT.md 约束推理路径，通过 Skill 封装（数据库迁移、CRUD 生成、参数校验）把高频任务变成一键生成，显著压缩需求到可运行原型的周期。',
      '对 Agent 产出的 12 个页面与 11 个路由模块做全量 Review 并修复类型与逻辑缺陷，以 Zod 完成前后端共享校验，最终交付约 1.2 万行可运行 TypeScript。',
    ],
    depth: 'deep',
  },
];
```

**注意**：`kaoyandaily` 的测试数量需实跑 `npx vitest run`（在 `/Users/happy/Desktop/kaoyandaily`）后替换"待实跑填入"。

- [ ] **Step 2: 写 resume.ts**

```ts
import { PROJECTS } from './projects';

export interface Contact { label: string; value: string; href?: string; }
export interface EducationEntry { school: string; detail: string; period: string; note: string; }
export interface SkillEntry { title: string; body: string; }
export interface AwardEntry { text: string; }

export interface Resume {
  profile: { name: string; role: string; contacts: Contact[] };
  education: EducationEntry[];
  skills: SkillEntry[];
  projects: typeof PROJECTS;      // 直接 import，不做二次录入（spec §5.5）
  awards: string[];
  footer: { traits: string[]; updatedAt: string };
}

export const resume: Resume = {
  profile: {
    name: '唐宗昊',
    role: 'AI 应用开发',
    contacts: [
      { label: '电话', value: '17872117576', href: 'tel:17872117576' },
      { label: '邮箱', value: '17872117576@163.com', href: 'mailto:17872117576@163.com' },
      { label: 'GitHub', value: 'github.com/Thelatter666', href: 'https://github.com/Thelatter666' },
      { label: '网站', value: 'thelatter666.github.io', href: 'https://thelatter666.github.io' },
    ],
  },
  education: [{
    school: '新疆大学',
    detail: '（211）· 软件工程 · 本科',
    period: '2023.09 – 2027.06（预计）',
    note: 'GPA：3.0　·　英语六级（CET-6）',
  }],
  // 技能区 5 条：新增「AI 应用技术栈」，删除「Linux 开发环境」（spec §5.3.1）
  skills: [
    {
      title: 'AI Agent 工程化',
      body: '在核心项目中编写 AGENT.md 约束推理路径，封装 Skill 固化高频工作流，并通过 MCP 连接外部工具链，完成需求拆解、代码生成与验证闭环。',
    },
    {
      title: 'AI 应用技术栈',
      body: '使用 Python + FastAPI 构建模型服务，使用 PyTorch（ResNet / YOLO）完成特征提取与目标检测，使用 pgvector 做向量检索；具备 LLM API 集成与 Prompt 工程能力（结构化输出、多层容错解析）。',
    },
    {
      title: 'Agent 辅助全栈生态',
      body: '使用 React 18 + TypeScript 构建前端页面，使用 Express + MySQL 8 实现后端接口，并对 Agent 生成代码进行人工 Review、调试与 Bug 修复。',
    },
    {
      title: '测试与工程化协同',
      body: '使用 Vitest 编写单元测试、使用 Playwright 验证核心用户路径，并结合 Git 语义化提交完成版本管理。',
    },
    {
      title: '部署与运维',
      body: '在 Linux 云服务器上完成项目部署，配置 Nginx 反向代理，并持续进行线上迭代与问题排查。',
    },
  ],
  projects: PROJECTS,
  awards: [
    '蓝桥杯 C/C++ 大学 A 组 · 新疆赛区二等奖',
    '全国大学生数学竞赛 · 省级三等奖',
    '大学英语四级（CET-4）',
    '大学英语六级（CET-6）',
  ],
  footer: { traits: ['自驱力强', '持续学习 RAG', '规范优先'], updatedAt: '2026.08' },
};
```

> 已删除原简历的「校园经历 · 创新创业委员」字段（spec §5.3）。

- [ ] **Step 3: 写数据一致性测试**

```ts
// tests/data-consistency.test.ts
import { describe, it, expect } from 'vitest';
import { resume } from '../src/data/resume';
import { PROJECTS } from '../src/data/projects';

describe('简历与项目数据', () => {
  it('resume.projects 与 PROJECTS 是同一个引用（杜绝二次录入）', () => {
    expect(resume.projects).toBe(PROJECTS);
  });

  it('技能区恰好 5 条，且不含「Linux 开发环境」', () => {
    expect(resume.skills).toHaveLength(5);
    expect(resume.skills.map((s) => s.title)).not.toContain('Linux 开发环境');
  });

  it('技能区包含「AI 应用技术栈」', () => {
    expect(resume.skills.map((s) => s.title)).toContain('AI 应用技术栈');
  });

  it('恰好 3 个项目，且简历要点均为 2 条（控制在一页内）', () => {
    expect(PROJECTS).toHaveLength(3);
    for (const p of PROJECTS) expect(p.highlights).toHaveLength(2);
  });

  it('简历无 campus（校园经历）字段', () => {
    expect(resume).not.toHaveProperty('campus');
  });
});
```

- [ ] **Step 4: 运行测试并提交**

```bash
npm test
git add -A && git commit -m "feat(data): 建立简历与项目数据层及一致性测试"
```

---

## Task 14: 在线简历页

**Files:**
- Create: `src/pages/resume/index.astro`

**Interfaces:**
- Consumes: `resume`（Task 13）、`BaseLayout`（Task 3）
- Produces: `/resume`

- [ ] **Step 1: 写简历页（深色，含下载 PDF 主按钮 + #agent-workflow 闭环链接）**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { resume } from '../../data/resume';

const agentSkill = resume.skills.find((s) => s.title === 'AI Agent 工程化');
---
<BaseLayout title="简历 · 唐宗昊" description="唐宗昊 — AI 应用开发，简历">
  <article class="resume">
    <header class="masthead">
      <div>
        <h1>{resume.profile.name}</h1>
        <p class="role">{resume.profile.role}</p>
      </div>
      <ul class="contact">
        {resume.profile.contacts.map((c) => (
          <li><span>{c.label}</span>{c.href ? <a href={c.href}>{c.value}</a> : c.value}</li>
        ))}
      </ul>
    </header>

    <div class="actions">
      <a class="btn primary" href="/resume.pdf" download>下载 PDF 简历</a>
    </div>

    <section>
      <h2>教育背景</h2>
      {resume.education.map((e) => (
        <div class="entry">
          <div class="entry-head"><h3>{e.school} <span>{e.detail}</span></h3><span class="date">{e.period}</span></div>
          <p>{e.note}</p>
        </div>
      ))}
    </section>

    <section>
      <h2>专业技能</h2>
      <div class="skill-grid">
        {resume.skills.map((s) => (
          <div class="skill">
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            {s.title === 'AI Agent 工程化' && (
              <a class="evidence" href="/projects#agent-workflow">查看工作流证据 →</a>
            )}
          </div>
        ))}
      </div>
    </section>

    <section>
      <h2>核心项目经历</h2>
      {resume.projects.map((p) => (
        <div class="entry">
          <div class="entry-head"><h3>{p.name} <span>{p.subtitle}</span></h3><span class="date">{p.period}</span></div>
          <ul>
            {p.highlights.map((h) => <li>{h}</li>)}
          </ul>
          <p class="stack">{p.stack.join(' · ')}</p>
        </div>
      ))}
    </section>

    <section>
      <h2>竞赛与荣誉</h2>
      <ul class="awards">{resume.awards.map((a) => <li>{a}</li>)}</ul>
    </section>

    <footer class="resume-footer">
      <span>{resume.footer.traits.join('　·　')}</span>
      <span>更新日期：{resume.footer.updatedAt}</span>
    </footer>
  </article>
</BaseLayout>

<style>
  .resume { max-width: 56rem; margin: 0 auto; padding: var(--space-8) var(--space-6); }
  .masthead { display: flex; justify-content: space-between; gap: var(--space-6);
              padding-bottom: var(--space-4); border-bottom: 2px solid var(--color-border-strong); }
  .masthead h1 { margin: 0; font-size: var(--text-3xl); }
  .role { margin: var(--space-2) 0 0; color: var(--color-accent); font-weight: 700; }
  .contact { list-style: none; margin: 0; padding: 0; text-align: right;
             color: var(--color-text-muted); font-size: var(--text-sm); }
  .contact span { display: inline-block; width: 3.5rem; color: var(--color-text-dim); }
  .actions { margin: var(--space-6) 0; }
  .section, section { margin-top: var(--space-8); }
  h2 { font-size: var(--text-lg); letter-spacing: 0.08em; color: var(--color-text);
       padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
  .entry { margin-bottom: var(--space-6); }
  .entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-4); }
  .entry-head h3 { font-size: var(--text-base); margin: 0; }
  .entry-head span { color: var(--color-text-muted); font-weight: 400; font-size: var(--text-sm); }
  .date { flex: 0 0 auto; color: var(--color-accent); font-size: var(--text-sm); font-weight: 700; }
  ul { margin: var(--space-2) 0 0; padding-left: 1.15rem; color: var(--color-text-muted); }
  li { margin-bottom: var(--space-2); }
  .skill-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4) var(--space-8); }
  .skill h3 { font-size: var(--text-sm); color: var(--color-text); margin: 0 0 var(--space-1); }
  .skill p { margin: 0; font-size: var(--text-sm); color: var(--color-text-muted); }
  .evidence { font-size: var(--text-xs); }
  .stack { margin-top: var(--space-2); font-size: var(--text-xs); color: var(--color-text-dim); }
  .awards { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-6); }
  .awards li { color: var(--color-text-muted); font-size: var(--text-sm); }
  .resume-footer { display: flex; justify-content: space-between; gap: var(--space-4);
                   margin-top: var(--space-8); padding-top: var(--space-3);
                   border-top: 1px solid var(--color-border);
                   color: var(--color-text-dim); font-size: var(--text-xs); }
  @media (max-width: 720px) {
    .masthead { flex-direction: column; }
    .contact { text-align: left; }
    .skill-grid { grid-template-columns: 1fr; }
    .entry-head { flex-direction: column; gap: var(--space-1); }
  }
</style>
```

- [ ] **Step 2: 构建验证并提交**

```bash
npx astro build && echo OK
git add -A && git commit -m "feat(resume): 新增在线简历页与 agent 工作流证据闭环链接"
```

---

## Task 15: 打印模板（浅色 A4）

**Files:**
- Create: `src/layouts/PrintLayout.astro`
- Create: `src/pages/resume/print.astro`

**Interfaces:**
- Consumes: `resume`（Task 13）
- Produces: `/resume/print`，Puppeteer 与浏览器打印共用

- [ ] **Step 1: 写 PrintLayout.astro（浅色，A4，无导航）**

```astro
---
interface Props { title: string; }
const { title } = Astro.props;
---
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>{title}</title>
  <style>
    /* PDF 为浅色白底：HR 会打印，深色底在黑白打印机上是一片灰黑块（spec §9.1） */
    :root {
      --ink: #17211f; --body: #33413d; --muted: #66736e;
      --line: #d7dfdb; --accent: #176b58; --paper: #ffffff;
    }
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--paper); }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC",
                   "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
      font-size: 12px; line-height 1.4; color: var(--body);
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    h1 { font-size: 28px; color: var(--ink); margin: 0; }
    h2 { font-size: 13px; color: var(--ink); letter-spacing: 0.08em;
         border-bottom: 1px solid var(--line); padding-bottom: 4px; margin: 14px 0 8px; }
    h3 { font-size: 13px; color: var(--ink); margin: 0; }
    p, li { font-size: 12px; line-height: 1.4; }
    a { color: var(--ink); text-decoration: none; }
    .section { break-inside: avoid; }
    .entry { break-inside: avoid; margin-bottom: 8px; }
    .no-print { display: none; }

    /* 屏幕预览时的纸张效果（打印时由 @page 接管） */
    @media screen {
      body { background: #edf1ef; }
      .paper { width: 210mm; min-height: 297mm; margin: 20px auto;
               padding: 10mm; background: var(--paper); box-shadow: 0 2px 12px rgb(0 0 0 / 0.12); }
    }
  </style>
</head>
<body>
  <main class="paper"><slot /></main>
</body>
</html>
```

- [ ] **Step 2: 写 /resume/print**

```astro
---
import PrintLayout from '../../layouts/PrintLayout.astro';
import { resume } from '../../data/resume';
import { site } from '../../data/site';
---
<PrintLayout title={`${resume.profile.name} · 简历`}>
  <header style="display:flex;justify-content:space-between;gap:24px;padding-bottom:12px;border-bottom:2px solid var(--ink);">
    <div>
      <h1>{resume.profile.name}</h1>
      <p style="margin:4px 0 0;color:var(--accent);font-weight:700;font-size:13px;">{resume.profile.role}</p>
    </div>
    <ul style="list-style:none;margin:0;padding:0;text-align:right;color:var(--muted);font-size:12px;line-height:1.7;">
      {resume.profile.contacts.map((c) => (
        <li><span style="display:inline-block;width:38px;">{c.label}</span>{c.value}</li>
      ))}
    </ul>
  </header>

  <section class="section">
    <h2>教育背景</h2>
    {resume.education.map((e) => (
      <div class="entry">
        <div style="display:flex;justify-content:space-between;gap:14px;">
          <h3>{e.school} <span style="color:var(--muted);font-weight:400;">{e.detail}</span></h3>
          <span style="color:var(--accent);font-weight:700;white-space:nowrap;">{e.period}</span>
        </div>
        <p style="margin:2px 0 0;">{e.note}</p>
      </div>
    ))}
  </section>

  <section class="section">
    <h2>专业技能</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;">
      {resume.skills.map((s) => (
        <div class="entry">
          <h3 style="font-size:12px;">{s.title}</h3>
          <p style="margin:0;">{s.body}</p>
        </div>
      ))}
    </div>
  </section>

  <section>
    <h2>核心项目经历</h2>
    {resume.projects.map((p) => (
      <div class="entry">
        <div style="display:flex;justify-content:space-between;gap:14px;">
          <h3>{p.name} <span style="color:var(--muted);font-weight:400;font-size:12px;">· {p.subtitle}</span></h3>
          <span style="color:var(--accent);font-weight:700;white-space:nowrap;">{p.period}</span>
        </div>
        <ul style="margin:3px 0 0;padding-left:16px;">
          {p.highlights.map((h) => <li style="margin-bottom:3px;">{h}</li>)}
        </ul>
        <p style="margin:2px 0 0;font-size:11px;color:var(--muted);">{p.stack.join(' · ')}</p>
      </div>
    ))}
  </section>

  <section class="section">
    <h2>竞赛与荣誉</h2>
    <ul style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 18px;">
      {resume.awards.map((a) => <li style="font-size:12px;">· {a}</li>)}
    </ul>
  </section>

  <footer style="display:flex;justify-content:space-between;margin-top:14px;padding-top:6px;border-top:1px solid var(--line);color:var(--muted);font-size:11px;">
    <span>{resume.footer.traits.join('　·　')}</span>
    <span>更新日期：{resume.footer.updatedAt}　·　{site.url.replace('https://', '')}</span>
  </footer>
</PrintLayout>
```

- [ ] **Step 3: 构建验证并提交**

```bash
npx astro build && echo OK
git add -A && git commit -m "feat(resume): 新增浅色 A4 打印模板"
```

---

## Task 16: PDF 生成脚本与 CI 集成

**Files:**
- Modify: `scripts/generate-resume-pdf.mjs`（替换 Task 5 的占位）

**Interfaces:**
- Consumes: `dist/resume/print/index.html`
- Produces: `dist/resume.pdf`

- [ ] **Step 1: 实现 PDF 脚本**

```js
#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const PORT = 4321;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

const server = await startServer();

let browser;
try {
  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/resume/print`, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('print');

  const out = join(ROOT, 'resume.pdf');
  await page.pdf({
    path: out,
    preferCSSPageSize: true,   // 页边距由模板的 @page { size: A4; margin: 10mm } 控制
    printBackground: true,
  });

  // 失败保护：产物过小说明渲染出了问题，直接让构建失败（spec §15）
  const { size } = await stat(out);
  if (size < 10_000) throw new Error(`resume.pdf 异常过小（${size} 字节），疑似渲染失败`);
  console.log(`[pdf] 生成成功：${out}（${(size / 1024).toFixed(1)} KB）`);
} finally {
  await browser?.close();
  server.close();
}
```

- [ ] **Step 2: 本地验证 PDF**

```bash
npm run build
open dist/resume/print/index.html   # 先在浏览器确认打印预览排版正确
```

检查 `dist/resume.pdf`：中文正常、A4 分页不截断条目、**恰好一页**（若溢出到第二页，回到 Task 13 压缩 `highlights`）。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat(pdf): 实现 Puppeteer 构建期 PDF 生成与体积校验"
```

---

# Phase 4（P4）—— /projects 证据页

## Task 17: 三项目证据页

**Files:**
- Create: `src/pages/projects/index.astro`

**Interfaces:**
- Consumes: `PROJECTS`（Task 13）、`BADGES`（Task 6）、`BaseLayout`（Task 3）

- [ ] **Step 1: 写 /projects（一深两浅 + 成长弧线）**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { PROJECTS } from '../../data/projects';

const cards = PROJECTS.filter((p) => p.depth === 'card');
const deep = PROJECTS.find((p) => p.depth === 'deep')!;
---
<BaseLayout title="项目 · 唐宗昊" description="三个项目：向量检索系统、LLM 应用、以及 agent 工程化实践">
  <div class="wrap">
    <h1 class="page-title">项目</h1>

    <!-- 两个 AI 应用在前：目标岗位是 AI 应用开发，第一眼应看到最相关的证据（spec §8.2） -->
    {cards.map((p) => (
      <article class="card">
        <header>
          <h2>{p.name}</h2>
          <span class="period">{p.period}</span>
        </header>
        <p class="subtitle">{p.subtitle}</p>
        <ul class="hl">{p.highlights.map((h) => <li>{h}</li>)}</ul>
        <div class="meta">
          <ul class="metrics">
            {p.metrics.map((m) => <li><b>{m.value}</b><span>{m.label}</span></li>)}
          </ul>
          <p class="stack">{p.stack.join(' · ')}</p>
          <a class="repo" href={p.github} rel="noopener">GitHub →</a>
        </div>
      </article>
    ))}

    <!-- kaoyandaily 深度案例在后：承载 agent 工程化方法论 -->
    <article class="card deep" id="agent-workflow">
      <header>
        <h2>{deep.name}</h2>
        <span class="period">{deep.period}</span>
      </header>
      <p class="subtitle">{deep.subtitle}</p>

      <p class="arc">
        上面两个项目回答的是「我会不会做 AI 应用」，这一个回答的是「我能不能把 Agent
        变成可靠的工程能力」——它是我 agent 工程化方法<strong>成熟之后</strong>的产物。
      </p>

      <h3>Agent 工作流</h3>
      <ul class="hl">
        <li>编写 <code>AGENT.md</code> 作为面向 AI 代理的驾驶手册：只记录读代码读不出来的决策、陷阱、红线与工作流，并要求任何改动同步本文件。</li>
        <li><code>plans/</code> 排期机制（19 条：DONE 12 / TODO 6）与 <code>docs/adr/</code> 决策记录（0001–0006），让每次改动都可追溯。</li>
        <li>自定义 Skill 封装高频操作（<code>.claude/skills/manage-server/</code> 处理部署、日志、重启），另有 <code>server-butler/</code> 管理云实例。</li>
        <li><code>memory.md</code> 沉淀事故教训，并已反哺为 <code>AGENT.md</code> 中的安全红线——形成「事故 → 沉淀 → 约束下一次 Agent」的闭环。</li>
        <li>强制 10 步工作流：提需求 → 探索理解 → 复述对齐（用户确认后才动手）→ 新建分支 → 执行 → 效果确认 → commit/merge 指令 → 合并 → 同步远端 → 同步服务器。</li>
      </ul>

      <details class="agent-md">
        <summary>展开 AGENT.md 节选</summary>
        <pre><code>{`> 面向 AI 代理的驾驶手册：只记录「读代码读不出来的」决策、陷阱、红线与工作流。
> 枚举型参考（目录树/组件/端点/部署）见 ARCHITECTURE.md；领域术语见 CONTEXT.md。
> 维护规则：任何改动本文列举的事实必须同步本文件；提交前缀 docs(agent):

## Request Lifecycle（每个路由的固定模式）
1. requireAuth middleware → session check → injects req.userId
2. validate(Schema) middleware → Zod parse on req.body
3. Route handler → raw SQL via pool.query()，所有查询按 req.userId 过滤
4. transformXxx(row) → snake_case DB 列转 camelCase 响应
5. Errors → throw new AppError(status, code, message) → 由 errorHandler 统一捕获

## Data Isolation
- user_id NEVER accepted from client — always from req.session.userId
- 所有查询用 WHERE user_id = ? 模式；他人的资源返回 404（不枚举）`}</code></pre>
      </details>

      <h3>架构</h3>
      <ul class="hl">
        <li>双后端数据模式：服务器（MySQL 8）与本地（IndexedDB）并存、互不干扰，通过统一的 JSON 备份格式互通。</li>
        <li>Zod schema 位于 <code>shared/</code>，前后端共享同一份校验；9 张表（users + 8 张业务表）。</li>
      </ul>

      <h3>质量</h3>
      <ul class="hl">
        <li>Vitest 单元测试 + Playwright E2E 验证核心用户路径，并配置性能预算。</li>
        <li>针对边界场景设计用例（倒计时临界点、热力图空值）。</li>
      </ul>

      <h3>部署</h3>
      <ul class="hl">
        <li>独立部署至 Linux 云服务器，配置 Nginx 反向代理；双远端（GitHub + Gitee）同步。</li>
      </ul>

      <div class="meta">
        <ul class="metrics">
          {deep.metrics.map((m) => <li><b>{m.value}</b><span>{m.label}</span></li>)}
        </ul>
        <p class="stack">{deep.stack.join(' · ')}</p>
        <a class="repo" href={deep.github} rel="noopener">GitHub →</a>
      </div>
    </article>

    <!-- 视觉作品：与 hero 形成闭环 -->
    <article class="card">
      <h2>AI 品牌金属徽章 3D</h2>
      <p class="subtitle">你在首屏看到的那 5 个金属徽章，是用 Three.js 从品牌 logo 轮廓挤出建模的</p>
      <ul class="hl">
        <li>从品牌 logo 提取多边形轮廓，经 <code>ExtrudeGeometry</code> 挤出并倒角，配 <code>MeshPhysicalMaterial</code> 金属材质与 <code>RoomEnvironment</code> 环境反射。</li>
        <li>5 个徽章打包为一个作品条目，与首屏 hero 共用同一份轮廓数据；不支持 WebGL 的环境自动降级为同源 SVG。</li>
      </ul>
    </article>
  </div>
</BaseLayout>

<style>
  .wrap { max-width: 56rem; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-16); }
  .page-title { font-size: var(--text-2xl); margin-bottom: var(--space-8); }
  .card {
    border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    padding: var(--space-6); margin-bottom: var(--space-6);
    background: var(--color-surface-1);
  }
  .card header { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-4); }
  .card h2 { font-size: var(--text-xl); margin: 0; }
  .period { color: var(--color-accent); font-size: var(--text-sm); font-weight: 700; white-space: nowrap; }
  .subtitle { margin: var(--space-2) 0 var(--space-4); color: var(--color-text-muted); font-size: var(--text-sm); }
  .card h3 { font-size: var(--text-sm); color: var(--color-text);
             margin: var(--space-6) 0 var(--space-2); letter-spacing: 0.04em; }
  .hl { margin: 0; padding-left: 1.15rem; color: var(--color-text-muted); font-size: var(--text-sm); }
  .hl li { margin-bottom: var(--space-2); }
  .arc { padding: var(--space-3) var(--space-4); border-left: 2px solid var(--color-accent);
         background: var(--color-surface-2); border-radius: 0 var(--radius-md) var(--radius-md) 0;
         color: var(--color-text-muted); font-size: var(--text-sm); }
  .arc strong { color: var(--color-text); }
  code { font-family: var(--font-mono); font-size: 0.9em;
         background: var(--color-surface-2); padding: 0.1em 0.35em; border-radius: var(--radius-sm); }
  .agent-md { margin-top: var(--space-3); }
  .agent-md summary { cursor: pointer; font-size: var(--text-sm); color: var(--color-accent); }
  .agent-md pre { overflow-x: auto; margin-top: var(--space-3); padding: var(--space-4);
                  background: var(--color-bg); border: 1px solid var(--color-border);
                  border-radius: var(--radius-md); font-size: var(--text-xs); line-height: 1.6; }
  .agent-md pre code { background: none; padding: 0; }
  .meta { margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
  .metrics { list-style: none; display: flex; flex-wrap: wrap; gap: var(--space-6); margin: 0 0 var(--space-3); padding: 0; }
  .metrics li { display: flex; flex-direction: column; }
  .metrics b { color: var(--color-text); font-size: var(--text-base); }
  .metrics span { color: var(--color-text-dim); font-size: var(--text-xs); }
  .stack { margin: 0 0 var(--space-2); font-size: var(--text-xs); color: var(--color-text-dim); }
  .repo { font-size: var(--text-sm); }
</style>
```

- [ ] **Step 2: 构建验证并提交**

```bash
npx astro build && echo OK
git add -A && git commit -m "feat(projects): 新增三项目证据页与 agent 工作流闭环"
```

---

# Phase 5（P5）—— 博客

## Task 18: 博客 Collection 与种子文章

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/blog/pgvector-hnsw-dimension-limit.md`
- Create: `src/content/blog/prompt-structured-output-fallback.md`

**Interfaces:**
- Produces: `blog` collection（Task 19 依赖）

- [ ] **Step 1: 写 collection schema**

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

- [ ] **Step 2: 写种子文章 1（基于仓库真实技术事实，draft）**

```markdown
---
title: pgvector 的 HNSW 索引有 2000 维上限，我踩了这个坑
description: 用 ResNet-50 提特征得到 2048 维向量，建 HNSW 索引时才发现 pgvector 有维度上限。记录判断过程与取舍。
pubDate: 2026-08-29
tags: ['向量检索', 'pgvector', 'PyTorch']
draft: true
---

在做以图搜图系统时，我给图片提了两套特征：传统的 HSV 颜色直方图 + HOG（1858 维），
以及 ResNet-50 的深度特征（2048 维）。存进 PostgreSQL + pgvector 之后，
给前者建 HNSW 索引一切正常，给后者建索引时报错了。

（正文待本人补充：具体报错信息、pgvector 版本、如何定位到 2000 维上限、
以及为什么判断"数据量 <10 万时顺序扫描性能足够"而不做降维。）
```

- [ ] **Step 3: 写种子文章 2（draft）**

```markdown
---
title: 让大模型稳定输出 JSON 的四层容错
description: 大模型经常在 JSON 外面包 markdown 代码块、字段名写错、类型不一致。记录我做 AI 旅行规划助手时的容错链路设计。
pubDate: 2026-08-29
tags: ['Prompt 工程', 'LLM', 'FastAPI']
draft: true
---

做 AI 旅行规划助手时，我要让模型输出严格结构的行程 JSON。
但实测下来，模型会给你包一层 ```json 代码块、把 day_number 写成字符串、
偶尔少一两个字段。

（正文待本人补充：四层容错的具体实现顺序、每层的正则/逻辑、
以及 API Key 缺失时降级 Mock 的设计。）
```

> 两篇均为 `draft: true`，**不出现在列表、不进 RSS、不触发导航显示**（Task 19 会过滤）。
> 正文骨架与标题基于仓库真实技术事实撰写；括号中的部分明确标记"待本人补充"，
> 由本人核实、修改、补充后再把 `draft` 改为 `false`（spec §16.1）。**严禁虚构经历。**

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "docs(blog): 新增 collection schema 与两篇种子文章（draft）"
```

---

## Task 19: 博客列表、详情、标签与 RSS

**Files:**
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[slug].astro`
- Create: `src/pages/blog/tags/[tag].astro`
- Create: `src/pages/feed.xml.ts`
- Modify: `src/data/blogCount.ts`（改为真实实现）

**Interfaces:**
- Consumes: `blog` collection（Task 18）

- [ ] **Step 1: 写 blogCount.ts 真实实现**

```ts
import { getCollection } from 'astro:content';

/** 已发布（非 draft）文章数。导航用它决定是否显示博客入口（spec §6）。 */
export async function publishedPostCount(): Promise<number> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.length;
}
```

- [ ] **Step 2: 写列表页**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
const tags = [...new Set(posts.flatMap((p) => p.data.tags))];
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
---
<BaseLayout title="博客 · 唐宗昊" description="AI 应用开发与 agent 工程化的实践记录">
  <div class="wrap">
    <h1>博客</h1>
    {tags.length > 0 && (
      <ul class="tags">
        {tags.map((t) => <li><a href={`/blog/tags/${t}`}>{t}</a></li>)}
      </ul>
    )}
    {posts.length === 0 ? (
      <p class="empty">还没有发布文章。</p>
    ) : (
      <ul class="list">
        {posts.map((p) => (
          <li>
            <a href={`/blog/${p.slug}`}>{p.data.title}</a>
            <time datetime={p.data.pubDate.toISOString()}>{fmt(p.data.pubDate)}</time>
            <p>{p.data.description}</p>
          </li>
        ))}
      </ul>
    )}
  </div>
</BaseLayout>
<style>
  .wrap { max-width: 48rem; margin: 0 auto; padding: var(--space-8) var(--space-6); }
  h1 { font-size: var(--text-2xl); }
  .tags { list-style: none; display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0 0 var(--space-8); padding: 0; }
  .tags a { font-size: var(--text-xs); padding: 0.2rem 0.6rem; border: 1px solid var(--color-border);
            border-radius: var(--radius-full); color: var(--color-text-muted); }
  .tags a:hover { border-color: var(--color-accent); color: var(--color-text); text-decoration: none; }
  .list { list-style: none; margin: 0; padding: 0; }
  .list li { padding: var(--space-5) 0; border-bottom: 1px solid var(--color-border); }
  .list a { font-size: var(--text-lg); color: var(--color-text); }
  .list time { display: block; margin: var(--space-1) 0; font-size: var(--text-xs); color: var(--color-text-dim); }
  .list p { margin: var(--space-2) 0 0; font-size: var(--text-sm); color: var(--color-text-muted); }
  .empty { color: var(--color-text-dim); }
</style>
```

- [ ] **Step 3: 写详情页（TOC + Shiki）**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((p) => ({ params: { slug: p.slug }, props: { post: p } }));
}

const { post } = Astro.props;
const { Content, headings } = await post.render();
const toc = headings.filter((h) => h.depth === 2 || h.depth === 3);
---
<BaseLayout title={`${post.data.title} · 唐宗昊`} description={post.data.description}>
  <div class="wrap">
    {toc.length > 2 && (
      <aside class="toc">
        <b>目录</b>
        <ul>{toc.map((h) => <li class={`d${h.depth}`}><a href={`#${h.slug}`}>{h.text}</a></li>)}</ul>
      </aside>
    )}
    <article>
      <h1>{post.data.title}</h1>
      <p class="desc">{post.data.description}</p>
      <div class="body"><Content /></div>
    </article>
  </div>
</BaseLayout>
<style>
  .wrap { max-width: 48rem; margin: 0 auto; padding: var(--space-8) var(--space-6); }
  h1 { font-size: var(--text-2xl); }
  .desc { color: var(--color-text-muted); font-size: var(--text-sm); }
  .toc { margin-bottom: var(--space-8); padding: var(--space-4);
         border: 1px solid var(--color-border); border-radius: var(--radius-md); }
  .toc b { font-size: var(--text-xs); color: var(--color-text-dim); }
  .toc ul { list-style: none; margin: var(--space-2) 0 0; padding: 0; }
  .toc a { font-size: var(--text-sm); color: var(--color-text-muted); }
  .toc .d3 { padding-left: var(--space-4); }
  .body { color: var(--color-text-muted); line-height: 1.75; }
  .body :global(h2) { color: var(--color-text); font-size: var(--text-lg); margin-top: var(--space-8); }
  .body :global(pre) { padding: var(--space-4); border-radius: var(--radius-md); overflow-x: auto; }
  @media (min-width: 1024px) {
    .wrap { max-width: 64rem; display: grid; grid-template-columns: 1fr 12rem; gap: var(--space-12); }
    .toc { position: sticky; top: var(--space-8); align-self: start; margin: 0; }
  }
</style>
```

- [ ] **Step 4: 写标签页**

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const tags = [...new Set(posts.flatMap((p) => p.data.tags))];
  return tags.map((tag) => ({
    params: { tag },
    props: { tag, posts: posts.filter((p) => p.data.tags.includes(tag)) },
  }));
}
const { tag, posts } = Astro.props;
---
<BaseLayout title={`#${tag} · 唐宗昊`} description={`标签：${tag}`}>
  <div style="max-width:48rem;margin:0 auto;padding:var(--space-8) var(--space-6);">
    <h1 style="font-size:var(--text-2xl);">#{tag}</h1>
    <p style="color:var(--color-text-dim);">{posts.length} 篇</p>
    <ul style="list-style:none;margin:var(--space-6) 0 0;padding:0;">
      {posts.map((p) => (
        <li style="padding:var(--space-4) 0;border-bottom:1px solid var(--color-border);">
          <a href={`/blog/${p.slug}`}>{p.data.title}</a>
          <p style="margin:var(--space-1) 0 0;font-size:var(--text-sm);color:var(--color-text-muted);">{p.data.description}</p>
        </li>
      ))}
    </ul>
  </div>
</BaseLayout>
```

- [ ] **Step 5: 写 RSS**

```ts
// src/pages/feed.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

export async function GET() {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return rss({
    title: `${site.name} · 博客`,
    description: site.tagline,
    site: site.url,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.slug}/`,
      categories: p.data.tags,
    })),
  });
}
```

- [ ] **Step 6: 构建验证并提交**

```bash
npx astro build && npm test && echo OK
git add -A && git commit -m "feat(blog): 新增博客列表、详情、标签页与 RSS"
```

---

## Task 20: 全站验收

**Files:**
- 无新增，核对 spec §14

- [ ] **Step 1: 跑完整构建与测试**

```bash
npm run build && npm run check && npm test
```

预期：全部通过，无警告。

- [ ] **Step 2: 逐条核对 spec §14 验收标准**

- [ ] 构建通过且无警告；`astro check` 无类型错误
- [ ] `/`、`/resume`、`/projects` 三处量化指标完全一致（已由 `tests/data-consistency.test.ts` 保证同源）
- [ ] Hero：无控制台报错；拨动 / 抓取 / hover 三项交互均生效；徽章碰撞产生自旋；滚出视口后渲染暂停；模拟 `prefers-reduced-motion` 与禁用 WebGL 时显示 SVG 降级
- [ ] 反复甩动徽章后场景能自行回到不压文字的体面状态
- [ ] `resume.pdf`：中文正常、A4 分页不截断、**恰好一页**
- [ ] `/projects` 三个项目 + 徽章作品齐备，`#agent-workflow` 锚点可达，**无一处把前两个项目写成"练手/探索产物"**
- [ ] 博客导航在文章数 <3 时隐藏；种子文章为 draft 不出现在列表
- [ ] 移动端：hero 降级为 SVG，无横向滚动
- [ ] Lighthouse 首页 Performance ≥ 90

- [ ] **Step 3: 提交最终状态**

```bash
git add -A && git commit -m "chore: 全站验收通过"
```

---

## Self-Review 结果

**Spec 覆盖检查：**

| Spec 节 | 对应 Task |
|---|---|
| §1 定位与 hero 文案 | Task 3（`site.ts`）、Task 4、Task 12 |
| §2 技术选型 | Task 1 |
| §3 仓库与部署 | Task 5 |
| §3.1 原型归档 | Task 1 Step 1 |
| §4 目录结构 | 文件结构总览 |
| §5.1–5.6 数据模型 | Task 13、Task 18 |
| §6 页面与路由 | Task 4、14、15、17、19 |
| §7.1–7.9 Hero 3D | Task 6–12 |
| §8 `/projects` | Task 17 |
| §9 简历与 PDF | Task 14、15、16 |
| §10 视觉与 tokens | Task 2 |
| §11 无障碍 | Task 3（focus-visible）、Task 12（`aria-hidden`）、Task 2（reduced-motion） |
| §12 性能预算 | Task 12（动态 import / IO 暂停 / DPR clamp）、Task 20 验证 |
| §13 分期 | Phase 1–5 对应 P1–P5 |
| §14 验收 | Task 20 |
| §15 风险 | Task 5（字体）、Task 16（PDF 体积校验） |
| §16 内容待填 | Task 6 Step 3 注释、Task 18 说明 |

**已修正的问题：**
- Task 12 Step 3 的 `r.constrain(solver, ...)` 段长参数：`Rope` 构造时记录 `segLength`，调用改为 `r.constrain(solver, r.segLength)`，消除跨 Task 的签名漂移
- Task 5 先写 PDF 占位脚本，使 P1 的 `npm run build` 可跑通；Task 16 再替换
- Task 3 的 `blogCount` 用占位返回 0，Task 19 替换为真实实现
