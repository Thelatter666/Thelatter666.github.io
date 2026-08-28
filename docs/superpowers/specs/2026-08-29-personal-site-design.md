# 个人博客 / 简历网站 —— 设计文档

- 日期：2026-08-29
- 作者：唐宗昊（Thelatter666）
- 状态：**已完成 brainstorming + grilling，共识已确认**，待进入实现计划
- 变更记录：v2（grilling 后）—— 项目由 1 个增至 3 个；重写 §5.3 / §8 / §13 / §15 / §16

---

## 1. 背景与目标

**目标岗位方向**：AI 应用开发（实习）
**核心目的**：辅助求职。受众依次是 HR（转发/存档）、技术面试官（深挖细节）、同行（社区认同）。
**核心差异化主张**：不是"我会用 AI 工具"（人人都会写），而是两条腿——

1. **做过真的 AI 应用**：`ai-image-search-system`（向量检索 / 多模态）、`ai_travel`（LLM 集成 / Prompt 工程）
2. **有一套可审计、被版本控制的 agent 工程化工作流**：`AGENT.md`、`plans/`、`docs/adr/`、自定义 Skill、`memory.md` 事故沉淀构成闭环证据链

第 2 条是绝大多数候选人拿不出来的东西，应作为差异化核心；第 1 条是岗位的准入门槛，用于支撑"AI 应用开发"这个主张的真实性。两者缺一不可。

**一句话定位（hero 主标题）**：

> **AI 应用开发 · 让 Agent 从玩具变成工程**

结构为"前半给 HR 认岗位，后半给技术面试官留钩子"。不并列"前端 / 全栈 / AI 应用"三个抬头 —— HR 8 秒只能记住一件事，前端与全栈作为支撑能力下沉到技能区。

### 1.1 非目标（本期不做）

- 亮色主题切换（仅深色）
- 博客站内搜索、评论、分页、自动生成 OG 图
- 多语言
- 亮色版本的在线简历页（PDF 为浅色，见 §9）

---

## 2. 技术选型

| 项 | 选择 | 理由 |
|---|---|---|
| 框架 | **Astro 5**，`output: 'static'` | 纯静态，Content Collections 管理 Markdown |
| 语言 | **TypeScript** | 简历数据需要类型约束 |
| 样式 | **原生 CSS + CSS 自定义属性（design tokens）** | 单深色主题，Tailwind 的配置负担换不来收益 |
| 3D | **three（npm）**，在 island 内动态 `import()` | 由 Vite 分包；不使用 CDN importmap |
| 代码高亮 | Astro 内置 **Shiki** | 零额外配置 |
| 集成 | `@astrojs/sitemap`、`@astrojs/rss` | 仅此两个 |
| 字体 | **系统字体栈**，不加载中文 web font | 中文字子集动辄数 MB，性价比极低 |
| PDF | **Puppeteer**（构建期 headless Chrome） | 见 §9 |

---

## 3. 仓库与部署

- **本地**：在现有工作区 `/Users/happy/Desktop/hy4-个人简历` **原地建站**，不新建目录。
- **远端仓库名**：`Thelatter666.github.io`（GitHub 特殊命名）。
  - 产物 URL：`https://thelatter666.github.io`
  - Astro 配置：`site: 'https://thelatter666.github.io'`，**不设 `base`**（默认 `/`）。
  - 代价：一个账号只能有一个此类仓库，主站理应占用。
- **流水线**（`.github/workflows/deploy.yml`）：
  1. `actions/checkout` → `actions/setup-node`（Node 20，带 `npm ci` 缓存）
  2. `sudo apt-get install -y fonts-noto-cjk && fc-cache -fv`（**必须**，否则 PDF 中文全是豆腐块）
  3. 缓存 `~/.cache/puppeteer`
  4. `npm run build`（内含 PDF 生成，见 §9）
  5. `actions/upload-pages-artifact` → `actions/deploy-pages`
- **分支**：`main` 触发构建。日常开发走 `feat/*` 分支 + `--no-ff` 合并（沿用既有 Git 规范）。

### 3.1 既有徽章 demo 的处置

5 个 `*-badge-3d.html` 是原型，**轮廓数组是唯一需要保留的资产**：

- 将 5 份轮廓数组（Claude 269 点、DeepSeek、OpenAI、OpenCode、Zhipu）提取到 `src/data/badges/`，转为 TypeScript 模块并归一化（中心原点、最大半径 10）。
- 原 HTML 连同 `*.png` / `*-traced.svg` 素材移入 `legacy/badge-demos/` 留档，不参与构建。
- `opencode-traced.svg`、`zhipu-traced.svg` 证明轮廓本就源自 SVG trace，故**同一份轮廓数组可在构建期生成 2D SVG**（§7.8 降级路径），3D 与 2D 共用单一数据源，不维护两套素材。

---

## 4. 目录结构

```
/
├── .github/workflows/deploy.yml
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── legacy/badge-demos/            # 原型留档，不参与构建
├── scripts/generate-resume-pdf.mjs
├── public/
│   ├── resume.pdf                 # CI 生成，不入库
│   └── og-cover.png               # 站点级静态 OG 图
└── src/
    ├── data/
    │   ├── site.ts                # site / nav / 联系方式
    │   ├── resume.ts              # ★ 简历唯一权威数据源
    │   ├── badges.ts              # 5 个徽章配置
    │   └── projects.ts            # 项目指标（与 resume.ts 共享）
    ├── content/
    │   ├── config.ts              # Collections schema
    │   └── blog/*.md
    ├── components/
    │   ├── hero3d/                # Three.js island，见 §7
    │   │   ├── Hero3D.astro
    │   │   ├── scene.ts
    │   │   ├── badge.ts
    │   │   ├── physics.ts
    │   │   ├── rope.ts
    │   │   ├── badgeBody.ts
    │   │   ├── collision.ts
    │   │   ├── interaction.ts
    │   │   └── fallback.ts
    │   └── ui/                    # 通用 UI 组件
    ├── layouts/
    │   ├── BaseLayout.astro       # 深色，含导航/页脚
    │   └── PrintLayout.astro      # 浅色，A4 打印
    ├── pages/
    │   ├── index.astro
    │   ├── resume/index.astro
    │   ├── resume/print.astro
    │   ├── projects/index.astro
    │   ├── blog/index.astro
    │   ├── blog/[slug].astro
    │   ├── blog/tags/[tag].astro
    │   ├── feed.xml.ts
    │   └── 404.astro
    └── styles/
        ├── tokens.css
        └── global.css
```

---

## 5. 数据模型

### 5.1 唯一权威源原则

**`src/data/resume.ts` 是简历数据的唯一权威源。** `/resume`、`/resume/print`、`/projects` 三处全部从该文件读取。

此原则直接针对已发现的问题：简历写"7 个页面"、`README.md` 写"11 个"、仓库实际 12 个——三处数字互相矛盾。集中到单一数据源后，此类不一致在结构上不可能发生。

### 5.2 `site.ts`

```ts
export const site = {
  url: 'https://thelatter666.github.io',
  name: '唐宗昊',
  role: 'AI 应用开发',
  github: 'https://github.com/Thelatter666',
  email: '17872117576@163.com',
  phone: '17872117576',
  nav: [
    { label: '首页', href: '/' },
    { label: '简历', href: '/resume' },
    { label: '项目', href: '/projects' },
    { label: '博客', href: '/blog' },
  ],
};
```

### 5.3 `resume.ts` 结构

```ts
export interface Resume {
  profile: { name: string; role: string; contacts: Contact[] };
  education: EducationEntry[];
  skills: SkillEntry[];          // 5 条，见下方「技能区调整」
  projects: ProjectEntry[];      // 3 条，import 自 projects.ts
  awards: string[];
  footer: { traits: string[]; updatedAt: string };
}
```

**注意：已删除原简历的 `campus`（校园经历 · 创新创业委员）字段。** 对 AI 应用开发岗该条目信息量接近零，删掉为两个 AI 项目腾出空间。

### 5.3.1 技能区调整（5 条，一增一删）

| 动作 | 条目 | 内容 |
|---|---|---|
| 保留 | AI Agent 工程化 | `AGENT.md` / Skill 封装 / MCP |
| 保留 | Agent 辅助全栈生态 | React 18 + TS / Express + MySQL 8 |
| 保留 | 测试与工程化协同 | Vitest / Playwright / Git 语义化提交 |
| 保留 | 部署与运维 | Linux 云服务器 / Nginx 反向代理 |
| **新增** | **AI 应用技术栈** | Python / FastAPI / **PyTorch（ResNet-50、YOLOv8）** / **pgvector 向量检索** / LLM API 集成与 Prompt 工程 |
| **删除** | ~~Linux 开发环境~~ | 与"部署与运维"重复，且对目标岗位无区分度 |

新增此条是**强制项**而非优化项：两个新增项目均为 Python 技术栈，若技能栏一条 Python 都没有，面试官会直接质疑项目真实性。"pgvector 向量检索"是本条最有价值的部分，直接命中 AI 应用岗关键词。

### 5.3.2 已核实的数字修正

内容以现有 `简历2.html` 为准转录，并应用以下修正：

| 字段 | 原值 | 修正值 | 依据 |
|---|---|---|---|
| kaoyandaily 页面数 | 7 | **12**（9 个业务页 + landing/login/register） | `client/src/App.tsx` 的 `pageLoaders` 实测 |
| kaoyandaily 提交数 | 123 | **187**（截至 2026-08-29） | `git rev-list --count HEAD` |
| kaoyandaily 路由模块数 | — | 11（`server/src/routes/`，其中 6 个业务 CRUD） | 实测；简历"6 个 CRUD 接口"站得住 |
| kaoyandaily 测试规模 | 未写 | 待实跑 `npx vitest run` 后填入 | `AGENT.md` 快照为 15 文件 / 126 tests，其自身声明"勿依赖快照" |

同时 `kaoyandaily/README.md` 中的"11 个页面"需一并改为 12。

### 5.3.3 三个项目的要点配额（控制在简历一页内）

| 项目 | 要点条数 | 说明 |
|---|---|---|
| `ai-image-search-system` | 2 条 | 讲技术决策（双检索管线取舍、pgvector HNSW 维度限制） |
| `ai_travel` | 2 条 | 讲 Prompt 工程与结构化输出容错 |
| `kaoyandaily` | **2 条**（原 3 条压缩） | 保留 agent 工作流与质量保障，架构细节移到网站深挖 |

### 5.4 `badges.ts`

```ts
export interface BadgeConfig {
  id: 'claude' | 'deepseek' | 'openai' | 'opencode' | 'zhipu';
  brand: string;            // tooltip 标题
  note: string;             // tooltip 一句话说明，见 §14 内容待填
  contour: Vec2[];          // 归一化轮廓
  material: {
    color: number; metalness: number; roughness: number;
    clearcoat: number; clearcoatRoughness: number; envMapIntensity: number;
  };
  mass: number;             // 影响碰撞冲量分配
  ropeLength: number;       // 错落配置，见 §7.2
  anchorXRatio: number;     // 锚点横向位置（0~1）
}
```

材质参数照搬 5 个原型中已调好的值（如 Claude 陶土铜 `#d98f6c` / metalness 1.0 / roughness 0.26 / clearcoat 0.6）。

### 5.5 `projects.ts` 与 `resume.ts` 的关系

`projects.ts` 是**项目指标与链接的唯一存放处**；`resume.ts` 的 `projects` 字段**直接 import 自 `projects.ts`**，不做二次录入。`/projects` 页面同样从 `projects.ts` 读取数字。

即：同一份数字 → 三处消费（在线简历、PDF、项目页），物理上只有一个来源。叙述性长文不进数据文件，直接写在 `/projects` 页面中。

```ts
export interface ProjectEntry {
  id: 'ai-image-search' | 'ai-travel' | 'kaoyandaily';
  name: string;
  subtitle: string;            // 一句话定位
  period: string;
  stack: string[];             // 技术栈标签
  metrics: { label: string; value: string }[];  // 可量化指标
  github?: string;             // 仓库链接
  demo?: string;               // 在线 demo，无则不填
  highlights: string[];        // 简历用要点（配额见 §5.3.3）
  depth: 'card' | 'deep';      // /projects 上的呈现形态，见 §8
}
```

三个条目的 `depth`：`ai-image-search` = `card`、`ai-travel` = `card`、`kaoyandaily` = `deep`。

### 5.6 博客 Collection schema

```ts
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
```

---

## 6. 页面与路由

| 路由 | 内容 |
|---|---|
| `/` | Hero 3D（§7）+ 项目摘要 + 最新 3 篇博客 + CTA |
| `/resume` | 在线简历（深色）+ **下载 PDF** 主按钮 |
| `/resume/print` | 打印模板（浅色 A4），无导航无交互，供 Puppeteer 与浏览器打印共用 |
| `/projects` | 2 个 AI 项目卡片 + kaoyandaily 深度案例 + 徽章作品，见 §8 |
| `/blog` | 文章列表 + 标签云。**文章数 <3 时导航不显示该入口**（避免"开了博客没写"的负面信号） |
| `/blog/[slug]` | 详情：Shiki 高亮 + TOC |
| `/blog/tags/[tag]` | 标签归档 |
| `/feed.xml` | RSS |
| `/404` | 404 页 |

**导航**：首页 / 简历 / 项目 / 博客。

---

## 7. Hero 3D 系统

5 个品牌金属徽章由天花板垂下的绳索悬挂，在重力下自然下垂如吊坠。

### 7.1 模块划分

| 模块 | 职责 |
|---|---|
| `scene.ts` | `WebGLRenderer({ antialias: true, alpha: true })`；ACESFilmic tone mapping；`PMREMGenerator` + `RoomEnvironment` 生成环境贴图（金属反射的关键）；3 盏灯（key / rim / fill）。**不启用 `shadowMap`** —— 悬挂场景没有地面，原型的 `ShadowMaterial` 地面在此无意义，砍掉是白捡的性能。 |
| `badge.ts` | 轮廓 → `THREE.Shape` → `ExtrudeGeometry`（`bevelEnabled: true`，参数沿用原型）→ `MeshPhysicalMaterial`。同时从轮廓包围盒生成碰撞代理与 2D SVG。 |
| `physics.ts` | 固定步长 Verlet 求解器，见 §7.3 |
| `rope.ts` | 每徽章 10 段 Verlet 链；用 `Line2` + `LineMaterial` 渲染（`THREE.Line` 的 `linewidth` 在多数平台被忽略，只有 Line2 能控制到 1.5~2px） |
| `badgeBody.ts` | 徽章刚体近似，见 §7.4 |
| `collision.ts` | 球代理碰撞，见 §7.5 |
| `interaction.ts` | 拨动 / 抓取 / hover，见 §7.6 |
| `fallback.ts` | 降级路径，见 §7.8 |

### 7.2 构图（宽而矮的空间）

- **徽章带占 hero 上 55%，文字带占下 45%。**
- **锚点位于视口上方之外**，绳索从画面外垂入 —— 观感绳长由画框决定而非布局，等于白赚一段高度，且天然暗示"从更高处垂下"。
- **相机仰视 2~4°**（再多会看到徽章底面）。
- **绳长交替而非随机**（短-长-中-长-短），形成节奏；并用绳长补偿徽章自身高度差（DeepSeek 竖高、OpenCode 偏宽），使底边大致齐平。
- **文本安全区**：下部 45% 区域为矩形安全区。锚点布局 + 绳长 + 摆幅上限共同保证徽章中心在几何上无法进入该区域，使"不压字"成为被保证的性质，而非调参碰运气的结果。

### 7.3 物理（`physics.ts`）

- **固定时间步长**：`dt = 1/120` + accumulator 累积。**必须**，否则 120Hz 屏幕上摆动速度会翻倍。
- **重力**：不套用 9.8。先定目标周期 `T`（建议 1.0~1.5s，短绳配宽矮空间）与绳长 `L`，反算 `g = 4π²L / T²`。
- **阻尼比 ζ ≈ 0.15 起调**：每周期振幅衰减至 28%，约 2~3 摆收敛。用户明确要求"摆几下就停，永远晃动显得廉价"。
- **idle 风**：连续极低幅低频噪声（防死寂）+ 偶发稍大阵风（制造生命感）叠加。**每个徽章的噪声相位与周期必须错开**，否则 5 个牌子同步摆动会非常机械。
- **速度上限**：防止能量注入导致徽章甩飞。

### 7.4 徽章刚体（`badgeBody.ts`）

徽章 = 绳链**末端质点** + **朝向四元数** + **角速度** + **标量转动惯量**。

单纯的质点只会平移不会自转，撞击时没有"叮当乱晃"。加入朝向自由度后，碰撞冲量作用于接触点 `r` 产生力矩 `τ = r × J`，约 40 行代码换取核心观感。

**软回正力矩**（本方案的关键设计）：目标姿态由两个方向正交化构造——

- **up = 绳索方向**（真实吊坠沿绳垂下；绳摆时牌子自然跟着倾，这个细节是真实感的主要来源）
- **forward = 朝向相机**（保证品牌 logo 始终可读）

以较小权重 slerp 逼近，并施加角阻尼。

于是：平时规规矩矩面朝观众 → 被撞飞时旋转几下 → 被温柔拽回。**既有"叮当乱晃"的效果，又不会让 HR 看到一个侧面朝外、logo 不可读的牌子。**

### 7.5 碰撞（`collision.ts`）

- 徽章是薄片挤出体而非圆形（Claude 是带尖角星芒、DeepSeek 是 24:41 竖长、OpenCode 是卡片），**单球代理要么过早起跳、要么已经穿模**。
- 每徽章使用 **3~5 个球代理**：沿轮廓包围盒主轴排布，半径取次轴半宽，从 bbox 自动生成，可在 `badges.ts` 中按徽章覆盖。
- 只检测**跨徽章**球对：5 徽章 × 5 球 = 25 球，约 250 次测试/步，开销可忽略。
- 冲量按质量加权，作用于接触点以产生力矩（§7.4）。
- **不做绳索与徽章、绳索与绳索的碰撞**（YAGNI）。

### 7.6 交互（`interaction.ts`）

| 交互 | 实现 | 约束 |
|---|---|---|
| **拨动** | 鼠标位置投影到徽章所在深度平面，对半径内的徽章施加**偏心冲量**（偏离质心以带出自旋），按距离衰减 | 冲量必须有上限 |
| **抓取甩动** | `Raycaster` 命中徽章 → 临界阻尼弹簧跟随鼠标 → 松手保留 Verlet 隐式速度飞出并撞向邻伴 | **仅 `pointerType === 'mouse'`**；触屏拖拽会与页面滚动冲突，移动端不启用抓取。弹簧需限幅，否则会注入无限能量 |
| **hover** | 倾斜朝向鼠标 **限幅 10~15°**、视觉 mesh 缩放 1.06（碰撞代理不变）、**HTML 叠层 tooltip**（将徽章世界坐标投影到屏幕定位） | 不做 3D 文字（中文渲染与清晰度都更差）；不做"完全转头盯鼠标"，那会让 logo 不可读 |

抓取是碰撞名场面的**唯一触发手段**，属于必需项而非可选项。

### 7.7 软边界

求职站点不能停在"徽章甩成一团、压住标题"的构图。超出安全范围时施加额外阻尼，保证**任何交互之后场景一定能自行回到体面的状态**。

### 7.8 降级路径

按优先级依次判定，命中则渲染构建期生成的静态 SVG（与 3D 同源的轮廓数组）：

1. `prefers-reduced-motion: reduce`
2. 无 WebGL 上下文
3. 视口宽度低于阈值

### 7.9 性能

- Hero3D 是 **Astro 组件，不能加 `client:*` 指令**（那只作用于框架组件，本项目不引入任何框架）。three 的分包靠**组件内动态 `import('./mount')`** 实现：入口脚本约 0.8 KB gzip，three 全部落在约 154 KB gzip 的懒加载 chunk 中，**其他页面完全不加载**。效果与 island 等同。
- 降级层默认可见，脚本成功挂载 3D 后才隐藏 —— 兼顾 three 加载期间的占位与"禁用 JS 时 hero 不空白"。
- `IntersectionObserver`：hero 滚出视口即暂停渲染循环。
- `devicePixelRatio` 上限 2。
- 不启用阴影贴图（§7.1）。

---

## 8. `/projects` —— 一深两浅 + 成长弧线

### 8.1 为什么是这个结构

三个项目的**可讲述资产类型不同**，不能用同一种模板：

| 项目 | 过程证据 | 岗位相关性 | 可讲多深 |
|---|---|---|---|
| `ai-image-search-system` | 1 commit | **高**（向量检索） | 中 —— 技术决策扎实，但无开发过程 |
| `ai_travel` | 2 commits | **高**（LLM 应用） | 中 —— 同上 |
| `kaoyandaily` | 187 commits + `AGENT.md` + ADR + plans | 中（工程化，非 AI 应用） | **深** |

统一用"深度案例"会让前两个暴露"没有过程"；统一用"浅卡片"则浪费了 kaoyandaily 的过程资产。因此：**AI 项目讲技术（它们有的），kaoyandaily 讲过程（它有的）。**

### 8.2 页面结构（单页，按此顺序）

**1. `ai-image-search-system` — AI 图像检索系统**（中等篇幅卡片）
- 双检索管线对比：传统特征（HSV 94-d + HOG 1764-d = 1858-d）vs 深度学习（ResNet-50 2048-d），各自的适用场景
- **pgvector + HNSW 索引**，以及 HNSW 2000 维上限导致 `deep_vector`(2048-d) 走顺序扫描、数据量 <10 万时性能足够的取舍判断
- YOLOv8 目标检测、108 个 pytest 全绿、Docker Compose

**2. `ai_travel` — AI 旅行规划助手**（中等篇幅卡片）
- System Prompt 工程：节奏控制 / 文风引导 / 纯 JSON 输出铁律
- 结构化输出容错链：markdown 代码块提取 → JSON 正则 → 类型规范化 → 字段补全
- 降级设计：API Key 缺失时自动降级 Mock

**3. `kaoyandaily` — 考研学习一体化管理平台**（切面式深度案例，锚点 `#agent-workflow`）
- 开头一句话点明"这是我 agent 工程化方法**成熟后**的产物"，承接前两项，形成成长弧线
- **Agent 工作流**（整站核心说服力所在）
  - `AGENT.md` 节选（可折叠），展示驾驶手册级别的约束密度
  - `plans/` 排期机制、`docs/adr/` 决策记录、design spec 流程
  - 自定义 Skill（`.claude/skills/manage-server/`）、`server-butler/`
  - `memory.md` 事故沉淀 → 反哺为 AGENT.md 安全红线的闭环
  - 强制 10 步工作流（含"复述对齐""用户确认后才动手""绝不擅自 commit"）
- **架构** — 双后端数据模式（MySQL + IndexedDB 并存互通）、Zod 前后端共享校验、9 张表
- **质量** — Vitest / Playwright E2E、边界用例设计、性能预算
- **部署** — Nginx 反向代理、双远端同步、独立运维

**4. 视觉作品：AI 品牌金属徽章 3D**（1 条，与 hero 呼应）
- 5 个徽章 demo **打包成 1 个作品条目**，不拆成 5 条（同质内容会淹没列表）
- 与 hero 形成闭环：访客在首屏看到徽章，滚到底部发现"这玩意儿是他自己做的"

### 8.3 内容红线

- 前两个项目**只讲技术决策，不讲开发过程** —— 它们没有过程可讲，硬编会露馅
- **禁止**在简历或网站上将前两个项目描述为"早期探索的练手产物"。它们有 108 个测试、Docker、向量索引调优，是完整项目
- 排序采用"AI 应用在前"：目标岗位是 AI 应用开发，访客第一眼应看到最相关的证据

### 8.4 闭环设计

`/resume` 的"专业技能 → AI Agent 工程化"一条链向 `/projects#agent-workflow`，形成"主张 → 证据"跳转。

---

## 9. 简历页与 PDF 流水线

### 9.1 深浅分离（已确认）

- **网页 `/resume`：深色**，与整站视觉一致。
- **PDF `/resume/print`：浅色白底。**
  理由：HR 会**打印**简历，深色底在黑白打印机上是一片灰黑块，彩色打印也费墨；深色简历在传统招聘流程中观感偏冒险。深色留给网站（那是作品），PDF 走专业稳妥路线。
- 两者**共用 `resume.ts`，使用不同模板与样式表**（`BaseLayout` vs `PrintLayout`）。

### 9.2 生成流程

`scripts/generate-resume-pdf.mjs`，在 `astro build` 之后、部署之前执行：

1. 对 `dist/` 起本地静态服务
2. Puppeteer 打开 `/resume/print`
3. `page.pdf({ path: 'dist/resume.pdf', preferCSSPageSize: true, printBackground: true })`
   - 页边距由打印模板的 `@page { size: A4; margin: 10mm }` 控制
4. 关闭服务

`resume.pdf` 只落到 `dist/`，**不回写 git**，避免构建产物污染仓库。

### 9.3 CI 依赖

- `puppeteer`（devDependency），缓存 `~/.cache/puppeteer`
- `sudo apt-get install -y fonts-noto-cjk && fc-cache -fv` —— **缺此步 PDF 中文全是豆腐块**，是本方案唯一的真坑

### 9.4 兜底

保留 `@media print` 样式，用户直接 Ctrl+P 也能得到干净简历。主按钮下载预生成的 PDF。

---

## 10. 视觉与设计系统

- 深色科技风，与徽章的深色金属质感同源。
- accent 取自徽章材质色：陶土铜 `#D97757` 系、钛银 `#c9ccd4`、枪色 `#4a5468`。
- `tokens.css` 定义颜色 / 间距 / 字号 / 圆角 / 阴影层级，组件一律引用 `var(--*)`，禁止硬编码。
- 中文字体栈：`-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif`。
- 所有动效支持 `prefers-reduced-motion`。

### 10.1 tokens 的生成方式

P1 第 2 步加载 **`ui-ux-pro-max`** skill 产出 `tokens.css` 的候选值。**它的定位是"候选生成器"，不是权威。**

采用其产出中的：深色色阶（surface 层级、边框、文本层级、状态色，含对比度校验）、字号阶梯、间距阶梯、圆角与阴影层级。

明确拒绝其产出中的：

| 能力 | 拒绝理由 |
|---|---|
| 74 组字体配对 | 已定系统字体栈（§2），不加载 web font |
| 25 种图表 / 17 组 GSAP 预设 | 站点无图表，不引 GSAP |
| 79 种风格预设的**整体风格走向** | 最大风险是把站点推向"通用深色 SaaS 模板"，会与徽章的拉丝金属质感打架 |

**硬性约束**：视觉身份必须**从徽章派生**（暖陶土铜 accent + 冷色底 + 高光反射），不得从预设派生。生成后逐条按此约束过滤。

---

## 11. 无障碍与语义

- 语义化 HTML，`/resume` 使用 `<main>` + 正确的标题层级。
- 3D canvas 标记 `aria-hidden="true"`，另提供文本形式的品牌清单供读屏器访问。
- hero 的一句话介绍为真实文本（非图片、非 canvas 内容），保证可被选中与索引。
- 交互控件具备可见焦点样式；键盘可达。

---

## 12. 性能预算

| 指标 | 目标 |
|---|---|
| 非首页 JS | 接近 0（Astro 零 JS 默认） |
| 首页首屏 JS（不含 three） | < 30 KB gzip |
| three 分包（懒加载，仅首页） | < 200 KB gzip |
| 首屏 LCP | < 2.5s（4G 模拟） |
| 构建产物总体积 | < 3 MB |

---

## 13. 交付分期

按"求职转化率"排序，先拿门面（hero）与可投递成品（PDF），博客最后。

| 阶段 | 内容 | 产出 |
|---|---|---|
| **P1** | 项目骨架、design tokens（**步骤 2 加载 `ui-ux-pro-max` 产出 `tokens.css`**，见 §10）、布局与导航、`site.ts`、部署流水线跑通 | 空站可访问，GitHub Pages 上线 |
| **P2** | 轮廓提取、Hero 3D 全系统（物理/绳索/碰撞/交互/降级） | hero 可用，含降级路径 |
| **P3** | `resume.ts` / `projects.ts` 数据转录（**3 个项目 + 技能区一增一删**）、`/resume`、`/resume/print`、PDF 流水线 | 可下载 PDF 简历 |
| **P4** | `/projects`：2 个 AI 项目卡片 + kaoyandaily 深度案例 + 徽章作品（§8） | 三项目证据页 + 成长弧线 |
| **P5** | 博客：列表 / 详情 / 标签 / TOC / RSS + **2 篇种子文章（draft）** | 博客上线 |

顺序说明：曾提议"P1 先出静态 SVG hero、3D 后加"以降低风险，**已被否决** —— Hero 3D 是本站点最大特色，按上表原顺序推进。§7.8 的降级路径仍然必须实现，只是不作为先行交付物。

---

## 14. 验收标准

- `npm run build` 通过且无警告；`astro check` 无类型错误。
- 三个数字页面（`/`、`/resume`、`/projects`）显示的量化指标**完全一致**。
- Hero：无控制台报错；拨动 / 抓取 / hover 三项交互均生效；徽章互相碰撞产生自旋；滚出视口后渲染确实暂停；降级路径（模拟 `prefers-reduced-motion` 与禁用 WebGL）可正常显示 SVG。
- 反复甩动徽章后，场景能自行回到不压文字的体面状态。
- CI 产出的 `resume.pdf`：中文正常显示、A4 分页不截断条目、页边距正确、可打印预览。
- **简历装得下一页**：3 个项目（各 2 条要点）+ 5 条技能 + 教育 + 奖项 + 页脚，PDF 不溢出到第二页。
- `/projects`：2 个 AI 项目卡片 + kaoyandaily 深度案例（含 `#agent-workflow` 锚点）+ 徽章作品，成长弧线措辞到位，且**无一处将前两个项目描述为"练手/探索产物"**。
- 博客导航：文章数 <3 时入口隐藏；种子文章为 `draft` 不出现在列表。
- 移动端：hero 降级为 SVG，页面无横向滚动。
- Lighthouse 首页 Performance ≥ 90。

---

## 15. 风险与开放项

| 项 | 说明 | 处置 |
|---|---|---|
| 简历数字过期 | 页面数 / 提交数 / 测试数会随时间变化 | 集中在 `resume.ts`，注释标注核对日期；实现时实跑一次 |
| `39.96.2.15` 裸 IP | 简历"网站"字段原为 `http://39.96.2.15`，裸 IP + HTTP 是减分项 | 网站字段改为 `https://thelatter666.github.io`；kaoyandaily 仅保留 GitHub 链接 |
| 无完整 RAG 应用 | 简历页脚写"持续学习 RAG"，但有向量检索项目（pgvector + HNSW）**部分覆盖** | 本期不解决，不构成硬伤 |
| Puppeteer CI 稳定性 | Chrome 下载与沙箱环境偶发问题 | CI 中加 `--no-sandbox`；失败时构建报错而非静默产出坏 PDF |
| 仓库数量限制 | `Thelatter666.github.io` 占用了账号唯一的根路径仓库 | 已接受；未来其他项目的 Pages 走子路径 |

### 15.1 站点外的残余风险（本期不处理，登记备查）

以下四项**不在本 spec 范围内**，但会直接影响求职结果，已与本人沟通过：

| 项 | 说明 | 状态 |
|---|---|---|
| GitHub 项目描述歧义 | `kaoyandaka4` 描述含"第四次构建"与"api是滕涛的"，易被误读 | **本人承诺重写全部项目介绍以消除歧义**；"第四次构建"→"v4" 已确认 |
| 提交历史缺失 | `ai-image-search-system` 1 commit、`ai_travel` 2 commits | 本地确无历史可补，不补；靠技术深度而非过程证明 |
| GitHub 显示名为 `thelatter` | 非真实姓名，0 followers | 未处理，本人自决 |
| ~~"api是滕涛的" 诚信冲突~~ | 经核实指借用朋友的 DeepSeek API 账号余额，**非后端代写**，与"独立全栈开发"无实质冲突 | **已排除** |

---

## 16. 内容待填清单

### 16.1 已解决（grilling 后确定）

1. ~~hero 一句话介绍~~ → **已定：「AI 应用开发 · 让 Agent 从玩具变成工程」**（§1）
2. ~~种子文章~~ → P5 由实现方基于仓库**真实技术事实**撰写 2 篇（pgvector HNSW 维度限制、Prompt 结构化输出容错），标 `draft: true` 不发布，本人核实修改后再上线。**不得虚构经历。**

### 16.2 仍需本人提供（事实性陈述，不可代拟）

1. **5 个徽章的 tooltip 说明**（`badges.ts` 的 `note` 字段）
   - 格式建议：`品牌 · 用途`，如 `Claude Code · 主力 agent 编码`
   - **已有证据的**：Claude（`AGENT.md`、`.claude/skills/manage-server/`、`mywf` skill）、DeepSeek（`ai_travel` 明确使用 DeepSeek-V4；`kaoyandaka4` 描述亦提及）
   - **无证据的**：OpenAI / OpenCode / 智谱 —— 使用事实性兜底描述（品牌名 + 品类，如 `OpenAI · GPT 系列`），**严禁编造使用场景**
   - 不阻塞 P2（兜底值可直接用），本人随时可覆盖
2. **kaoyandaily 的在线 demo 访问地址**（若仍可访问；不可访问则只放 GitHub 链接）
3. **kaoyandaily 实跑测试数**（`npx vitest run` 结果，用于替换 `AGENT.md` 的过期快照）

第 1 项有兜底、第 2~3 项不阻塞 P1~P3。

### 16.3 本人承诺的站点外动作

- 重写 GitHub 全部项目介绍以消除歧义（含"第四次构建"→"v4"）
- 将 `kaoyandaily/README.md` 的"11 个页面"改为 12
