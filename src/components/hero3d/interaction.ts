import * as THREE from 'three';
import type { BadgeBody } from './badgeBody';
import type { VerletSolver } from './physics';
import {
  SWIPE_RADIUS, SWIPE_IMPULSE_MAX, GRAB_STIFFNESS, GRAB_DAMPING, GRAB_FORCE_MAX, FIXED_DT,
} from './constants';

/** 徽章所在的深度平面。鼠标射线与它求交，得到世界坐标。 */
const PLANE_Z = 0;

/** 屏幕归一化坐标（NDC）→ 世界坐标（投影到 z = PLANE_Z 平面） */
export function screenToWorld(nx: number, ny: number, camera: THREE.PerspectiveCamera): THREE.Vector3 {
  const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize();
  if (Math.abs(dir.z) < 1e-6) return new THREE.Vector3(0, 0, PLANE_Z);
  const t = (PLANE_Z - camera.position.z) / dir.z;
  return camera.position.clone().addScaledVector(dir, t);
}

/**
 * 拨动：鼠标划过时对附近徽章施加**偏心**冲量。
 *
 * 正心冲量只会让徽章平移；偏离质心才产生力矩，才有"被手背扫过"的味道（spec §7.6）。
 */
export function applySwipe(
  world: THREE.Vector3,
  pointerDelta: THREE.Vector2,
  bodies: BadgeBody[],
): void {
  for (const b of bodies) {
    const toBadge = b.position.clone().sub(world);
    const dist = toBadge.length();
    if (dist > SWIPE_RADIUS) continue;

    const falloff = 1 - dist / SWIPE_RADIUS;
    const impulse = new THREE.Vector3(pointerDelta.x, pointerDelta.y, 0)
      .multiplyScalar(falloff * SWIPE_IMPULSE_MAX);
    if (impulse.length() > SWIPE_IMPULSE_MAX) impulse.setLength(SWIPE_IMPULSE_MAX);
    if (impulse.lengthSq() < 1e-8) continue;

    // 作用点取朝向鼠标一侧的球面点，制造力矩
    const r = toBadge.lengthSq() > 1e-6
      ? toBadge.clone().normalize().multiplyScalar(1.5)
      : new THREE.Vector3(1, 0, 0);
    b.applyImpulseAt(impulse, b.position.clone().add(r));
  }
}

/**
 * 抓取：临界阻尼弹簧跟随鼠标。
 *
 * 弹簧力必须限幅 —— 否则会注入无限能量把徽章甩飞（spec §7.6）。
 */
export function applyGrab(body: BadgeBody, target: THREE.Vector3, solver: VerletSolver): void {
  const p = body.particle;
  const v = new THREE.Vector3(
    (p.x - p.px) / FIXED_DT,
    (p.y - p.py) / FIXED_DT,
    (p.z - p.pz) / FIXED_DT,
  );
  const f = target.clone().sub(body.position)
    .multiplyScalar(GRAB_STIFFNESS)
    .addScaledVector(v, -GRAB_DAMPING);
  if (f.length() > GRAB_FORCE_MAX) f.setLength(GRAB_FORCE_MAX);
  solver.addForce(p, f.x, f.y, f.z);
}
