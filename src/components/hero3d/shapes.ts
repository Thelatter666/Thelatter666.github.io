import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { BADGE_SHAPES } from '../../data/badgeShapes';
import type { BadgeId } from './types';

/**
 * 由 5 个徽章各自的几何定义构造 THREE.Shape。
 *
 * 原型用了三种不同的定义方式，这里原样沿用而不强行统一 ——
 * 统一会丢失镂空（智谱的 "Z" 字斜带、OpenCode 的门框）与曲线细节。
 *
 * 返回值是「层 → Shape[]」：单形态徽章 1 层，opencode 3 层。
 */

/** 纯直线段的 SVG path（如 zhipu、opencode）→ 子路径点数组 */
function parsePolylineSubpaths(path: string): THREE.Vector2[][] {
  const subs: THREE.Vector2[][] = [];
  for (const seg of path.split(/(?=M)/)) {
    const cmd = seg.trim();
    if (!cmd) continue;
    const nums = (cmd.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    // 跳过命令字母：M x y (L x y)*
    const pts: THREE.Vector2[] = [];
    for (let i = 1; i + 1 < nums.length; i += 2) {
      pts.push(new THREE.Vector2(nums[i], nums[i + 1]));
    }
    if (pts.length >= 3) subs.push(pts);
  }
  return subs;
}

/**
 * SVG 坐标（Y 向下）→ 数学坐标（Y 向上），并修正绕行方向。
 *
 * 翻转 Y 会反转绕行；ExtrudeGeometry 要求外轮廓 CCW、洞 CW，故统一校正。
 */
function flipShape(s: THREE.Shape): THREE.Shape {
  const flip = (pts: THREE.Vector2[]) => pts.map((p) => new THREE.Vector2(p.x, -p.y));
  const { shape: outerPts, holes: holePts } = s.extractPoints(12);

  const outer = flip(outerPts);
  if (THREE.ShapeUtils.isClockWise(outer)) outer.reverse();

  const out = new THREE.Shape(outer);
  for (const h of holePts) {
    const pts = flip(h);
    if (!THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    out.holes.push(new THREE.Path(pts));
  }
  return out;
}

/** 子路径 → 单个 Shape：第一个为外轮廓，其余为洞 */
function shapeFromSubpaths(subs: THREE.Vector2[][]): THREE.Shape {
  const outer = subs[0].slice();
  if (THREE.ShapeUtils.isClockWise(outer)) outer.reverse();
  const s = new THREE.Shape(outer);
  for (const h of subs.slice(1)) {
    const pts = h.slice();
    if (!THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    s.holes.push(new THREE.Path(pts));
  }
  return s;
}

/** 含曲线的 SVG path（deepseek / openai）→ Shape[]，镂空由 SVGLoader 依绕行判定 */
function svgShapes(path: string, viewBox: { x: number; y: number; w: number; h: number }): THREE.Shape[] {
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}">` +
    `<path d="${path}"/></svg>`;
  const data = new SVGLoader().parse(markup);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p)).map(flipShape);
}

/**
 * 构造某徽章的全部层。
 * @returns 层数组，每层是 Shape[]（通常 1 个 Shape，洞已挂在 Shape 上）
 */
export function buildBadgeLayers(id: BadgeId): THREE.Shape[][] {
  const d = BADGE_SHAPES[id];

  if (id === 'claude') {
    if (!d.contour) throw new Error('claude 缺少 contour 数据');
    const pts = d.contour.map(([x, y]) => new THREE.Vector2(x, y));
    return [[shapeFromSubpaths([pts])]];
  }

  if (id === 'zhipu') {
    // 外轮廓 1 个 + 镂空斜带 3 个，共同读作 "Z"
    if (!d.path) throw new Error('zhipu 缺少 path 数据');
    return [[shapeFromSubpaths(parsePolylineSubpaths(d.path))]];
  }

  if (id === 'opencode') {
    // 3 层：卡片 / 白色门框（挖洞）/ 灰色方块
    if (!d.layers) throw new Error('opencode 缺少 layers 数据');
    return d.layers.map((p) => [shapeFromSubpaths(parsePolylineSubpaths(p))]);
  }

  // deepseek / openai
  if (!d.path) throw new Error(`${id} 缺少 path 数据`);
  return [svgShapes(d.path, d.viewBox)];
}
