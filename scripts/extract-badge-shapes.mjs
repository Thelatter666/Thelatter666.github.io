#!/usr/bin/env node
/**
 * 从 legacy/badge-demos/*.html 提取 5 个徽章的几何数据，
 * 生成 src/data/badgeShapes.ts。
 *
 * 原型的几何定义方式并不统一，本脚本原样保留各自的表达形式，
 * 由 src/components/hero3d/shapes.ts 分别构造 —— 这样能正确处理
 * 镂空（zhipu / opencode）与曲线（deepseek / openai），保真度最高。
 *
 * 用法：node scripts/extract-badge-shapes.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'legacy', 'badge-demos');
const OUT = join(ROOT, 'src', 'data', 'badgeShapes.ts');

const read = (name) => readFile(join(LEGACY, name), 'utf8');

/** 提取 const NAME = "..." + "..." 形式的（可跨行拼接的）字符串字面量 */
function extractStringLiteral(src, name) {
  const decl = src.match(new RegExp(`const\\s+${name}\\s*=\\s*([\\s\\S]*?);\\s*\\n`));
  if (!decl) throw new Error(`未找到 const ${name}`);
  const parts = [...decl[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  if (!parts.length) throw new Error(`${name} 中未找到字符串片段`);
  return parts.join('');
}

/** 提取 const NAME = [ [x,y], ... ]; 形式的点数组 */
function extractContour(src, name) {
  const decl = src.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\n\\];`));
  if (!decl) throw new Error(`未找到 const ${name}`);
  const pts = [...decl[1].matchAll(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g)]
    .map((m) => [Number(m[1]), Number(m[2])]);
  if (!pts.length) throw new Error(`${name} 中未解析出点`);
  return pts;
}

/** 点数组（Y 向上数学坐标）→ SVG path（Y 向下） */
function contourToPath(pts) {
  const to = ([x, y]) => `${round(x)} ${round(-y)}`;
  return `M ${pts.map(to).join(' L ')} Z`;
}

/** 矩形（SVG 坐标，Y 向下）→ path 子路径；reverse 用于把内框变成洞（反向绕行） */
function rectToPath(x0, y0, x1, y1, reverse = false) {
  const p = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  if (reverse) p.reverse();
  return `M ${p.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L ')} Z`;
}

const round = (n) => Number(n.toFixed(3));

/**
 * 各徽章的权威 viewBox。
 *
 * 含 c/a 曲线的路径无法用"扫描全部数字"得到 bbox —— 控制点与圆弧半径
 * 会把范围撑大（实测 deepseek 被算成 30.5、openai 被算成 33.7，真实均为 24）。
 * 因此这里一律采用原型中显式声明的值：
 *   openai  —— openai-badge-3d.html:88  `<svg ... viewBox="0 0 24 24">`
 *   zhipu   —— zhipu-badge-3d.html:132 `<svg ... viewBox="0 0 77 80">`
 *   deepseek—— deepseek-badge-3d.html:54 标注来自 simple-icons（CC0），标准 24×24
 *   opencode—— opencode-badge-3d.html:117-127 矩形定义于 512×512
 *   claude  —— 由点数组精确计算（无曲线，见 bboxOfContour）
 */
const VIEWBOX = {
  deepseek: { x: 0, y: 0, w: 24, h: 24 },
  openai: { x: 0, y: 0, w: 24, h: 24 },
  zhipu: { x: 0, y: 0, w: 77, h: 80 },
  opencode: { x: 0, y: 0, w: 512, h: 512 },
};

function bboxOfContour(pts) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: round(minX), y: round(-maxY), w: round(maxX - minX), h: round(maxY - minY) };
}

const fmtPts = (pts, indent) =>
  pts.map((p) => `${indent}[${p[0]}, ${p[1]}]`).join(',\n');

const main = async () => {
  const claudeSrc = await read('claude-badge-3d.html');
  const deepseekSrc = await read('deepseek-badge-3d.html');
  const openaiSrc = await read('openai-badge-3d.html');
  const zhipuSrc = await read('zhipu-badge-3d.html');

  // ---- claude：269 点点数组（Y 向上） ----
  const claudeContour = extractContour(claudeSrc, 'CONTOUR');

  // ---- deepseek / openai：SVG path（含曲线，需 SVGLoader 解析） ----
  const deepseekPath = extractStringLiteral(deepseekSrc, 'SVG_PATH');
  const openaiPath = extractStringLiteral(openaiSrc, 'SVG_PATH');

  // ---- zhipu：SVG path，全直线段，可解析为多边形子路径（外轮廓 + 3 个洞） ----
  const zhipuPath = extractStringLiteral(zhipuSrc, 'ZHIPU_PATH');

  // ---- opencode：512 尺度矩形（原文件 L117-127）----
  const opencodeCard = rectToPath(0, 0, 512, 512);
  const opencodeFrame = `${rectToPath(128, 96, 384, 416)} ${rectToPath(192, 160, 320, 352, true)}`;
  const opencodeBlock = rectToPath(192, 224, 320, 352);

  const body = `// 由 scripts/extract-badge-shapes.mjs 从 legacy/badge-demos/*.html 自动生成。
// 请勿手工编辑 —— 修改原型后重新运行该脚本。
//
// 各徽章的几何定义方式沿用原型，不做统一化，以保留曲线与镂空：
//   claude    —— 点数组（Y 向上数学坐标）
//   deepseek  —— SVG path，含 c/a 曲线，4 个 subpath（外轮廓 + 3 洞）
//   openai    —— SVG path，含 a/c 曲线，viewBox 0 0 24 24
//   zhipu     —— SVG path，全直线段，viewBox 0 0 77 80（外轮廓 + 3 洞）
//   opencode  —— 512 尺度矩形，3 层：卡片 / 白色门框（挖洞）/ 灰色方块

export type Vec2 = readonly [number, number];

/** 降级渲染用的 viewBox（bbox 为保守超集，仅用于 SVG，3D 侧用几何体精确 bbox） */
export interface BadgeShapeData {
  /** 点数组形态的轮廓（claude） */
  contour?: Vec2[];
  /** SVG path 形态（deepseek / openai / zhipu / opencode） */
  path?: string;
  /** opencode 的 3 层：0=卡片 1=门框 2=方块 */
  layers?: string[];
  /** 该徽章在 3D 中的各层（与 layers 一一对应；单形态徽章时为 [path]） */
  viewBox: { x: number; y: number; w: number; h: number };
}

/**
 * 显式标注为 Record<string, BadgeShapeData>。
 * 不能用 as-const + satisfies —— 那样按 id 索引会得到各条目的字面量联合类型，
 * contour / path / layers 只存在于部分成员上，访问会报 ts(2339)。
 */
export const BADGE_SHAPES: Record<string, BadgeShapeData> = {
  claude: {
    contour: [
${fmtPts(claudeContour, '      ')},
    ] as Vec2[],
    viewBox: ${JSON.stringify(bboxOfContour(claudeContour))},
  },

  deepseek: {
    path:
      '${deepseekPath}',
    viewBox: ${JSON.stringify(VIEWBOX.deepseek)},
  },

  openai: {
    path:
      '${openaiPath}',
    viewBox: ${JSON.stringify(VIEWBOX.openai)},
  },

  zhipu: {
    path:
      '${zhipuPath}',
    viewBox: ${JSON.stringify(VIEWBOX.zhipu)},
  },

  opencode: {
    layers: [
      '${opencodeCard}',
      '${opencodeFrame}',
      '${opencodeBlock}',
    ],
    viewBox: ${JSON.stringify(VIEWBOX.opencode)},
  },
};
`;

  await writeFile(OUT, body, 'utf8');

  const vb = (d) => `${d.x} ${d.y} ${d.w} ${d.h}`;
  console.log('已生成 src/data/badgeShapes.ts');
  console.log('  claude   点数 =', claudeContour.length, ' viewBox =', vb(bboxOfContour(claudeContour)));
  console.log('  deepseek 长度 =', deepseekPath.length, ' viewBox =', vb(VIEWBOX.deepseek));
  console.log('  openai   长度 =', openaiPath.length, ' viewBox =', vb(VIEWBOX.openai));
  console.log('  zhipu    长度 =', zhipuPath.length, ' viewBox =', vb(VIEWBOX.zhipu));
  console.log('  opencode 3 层  viewBox =', vb(VIEWBOX.opencode));
};

main().catch((e) => { console.error('提取失败：', e.message); process.exit(1); });
