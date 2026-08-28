import * as THREE from 'three';
import type { BadgeConfig } from '../../data/badges';
import { BADGE_SIZE } from './constants';
import { buildBadgeLayers } from './shapes';
import type { BadgeId } from './types';

/**
 * 每个徽章的挤出参数（沿用原型中已调好的值）。
 * 数值处于该徽章自身的坐标空间，最终随整体归一化一起缩放，
 * 因此各徽章保留了原本的相对厚度差异（如智谱较厚、DeepSeek 较薄）。
 */
const EXTRUDE: Record<BadgeId, {
  depth: number; bevel: number; layerDepth?: number; layerBevel?: number;
}> = {
  claude: { depth: 1.5, bevel: 0.2 },
  deepseek: { depth: 1.4, bevel: 0.28 },
  openai: { depth: 1.6, bevel: 0.22 },
  zhipu: { depth: 10, bevel: 0.8 },
  // opencode：卡片厚 56，图形层厚 6 并凸出卡片表面 3（原型 CARD_T/LAYER_T/PROTRUDE）
  opencode: { depth: 56, bevel: 6, layerDepth: 6, layerBevel: 1.5 },
};

const OPENCODE_PROTRUDE = 3;

export interface BadgeMesh {
  /** 已居中并归一化到 BADGE_SIZE 的徽章组 */
  group: THREE.Group;
  /** 归一化后的局部包围盒尺寸，用于生成碰撞代理 */
  size: THREE.Vector3;
}

export function createBadge(cfg: BadgeConfig): BadgeMesh {
  const spec = EXTRUDE[cfg.id];
  const layers = buildBadgeLayers(cfg.id);

  const group = new THREE.Group();

  layers.forEach((shapes, i) => {
    const isOverlay = i > 0;
    const depth = isOverlay ? spec.layerDepth! : spec.depth;
    const bevel = isOverlay ? spec.layerBevel! : spec.bevel;

    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth,
      steps: 1,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.66,
      bevelOffset: 0,
      bevelSegments: 6,
    });

    const mat = new THREE.MeshPhysicalMaterial({
      color: cfg.materials[Math.min(i, cfg.materials.length - 1)].color,
      metalness: cfg.materials[Math.min(i, cfg.materials.length - 1)].metalness,
      roughness: cfg.materials[Math.min(i, cfg.materials.length - 1)].roughness,
      clearcoat: cfg.materials[Math.min(i, cfg.materials.length - 1)].clearcoat,
      clearcoatRoughness: cfg.materials[Math.min(i, cfg.materials.length - 1)].clearcoatRoughness,
      envMapIntensity: cfg.materials[Math.min(i, cfg.materials.length - 1)].envMapIntensity,
    });

    const mesh = new THREE.Mesh(geo, mat);
    // 图形层贴在卡片正面并略微凸出
    if (isOverlay) mesh.position.z = spec.depth + OPENCODE_PROTRUDE - depth;
    group.add(mesh);
  });

  // ---- 归一化：居中 + 缩放到统一尺寸 ----
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  for (const child of group.children) child.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = BADGE_SIZE / maxDim;
  group.scale.setScalar(scale);

  return { group, size: size.clone().multiplyScalar(scale) };
}

/**
 * 由徽章包围盒生成 3~5 个球碰撞代理（spec §7.5）。
 *
 * 徽章是薄片挤出体而非圆形（智谱近方、OpenCode 正方、DeepSeek 竖长），
 * 单球代理要么"视觉上还没接触就弹开"，要么"已经穿模了还没碰上"。
 */
export function buildCollisionSpheres(
  size: THREE.Vector3,
): { offset: THREE.Vector3; radius: number }[] {
  const vertical = size.y >= size.x;
  const major = vertical ? size.y : size.x;
  const minor = vertical ? size.x : size.y;
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
