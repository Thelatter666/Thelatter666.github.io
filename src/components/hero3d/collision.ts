import * as THREE from 'three';
import type { BadgeBody } from './badgeBody';
import { RESTITUTION, FIXED_DT } from './constants';

function velocityOf(p: { x: number; y: number; z: number; px: number; py: number; pz: number }) {
  return new THREE.Vector3((p.x - p.px) / FIXED_DT, (p.y - p.py) / FIXED_DT, (p.z - p.pz) / FIXED_DT);
}

/**
 * 跨徽章球代理碰撞（spec §7.5）。
 *
 * 只检测跨徽章的球对：同徽章内部不测，绳索与徽章也不测（YAGNI）。
 * 5 徽章 × ≤5 球，跨徽章 10 组 × 25 对 = 250 次测试/步，开销可忽略。
 *
 * 每对徽章的球体集合在检测到时重新计算 —— 上一对的求解会移动质点，
 * 复用旧坐标会让响应滞后并产生抖动。
 */
export function resolveCollisions(bodies: BadgeBody[], restitution = RESTITUTION): void {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const A = bodies[i];
      const B = bodies[j];
      const spheresA = A.worldSpheres();
      const spheresB = B.worldSpheres();

      for (const sa of spheresA) {
        for (const sb of spheresB) {
          const d = sb.center.clone().sub(sa.center);
          const dist = d.length();
          const minDist = sa.radius + sb.radius;
          if (dist >= minDist || dist < 1e-6) continue;

          const wA = A.particle.invMass;
          const wB = B.particle.invMass;
          const wSum = wA + wB;
          if (wSum === 0) continue;

          const n = d.divideScalar(dist);          // 碰撞法线，A → B

          // 相对速度必须在位置修正之前取。
          // Verlet 的速度是隐式的（x - px）：位置修正只改 x 不动 px，
          // 等于凭空造出分离速度。若先修正再取速度，vn 会变成正值，
          // 冲量被整体跳过 —— 碰撞将永远不产生反弹与自旋。
          const rel = velocityOf(B.particle).sub(velocityOf(A.particle));
          const vn = rel.dot(n);
          if (vn > 0) continue;                    // 已经在分离，不施加冲量

          // 位置修正：推开重叠，防止抖动
          const penetration = minDist - dist;
          A.particle.x -= n.x * penetration * (wA / wSum);
          A.particle.y -= n.y * penetration * (wA / wSum);
          A.particle.z -= n.z * penetration * (wA / wSum);
          B.particle.x += n.x * penetration * (wB / wSum);
          B.particle.y += n.y * penetration * (wB / wSum);
          B.particle.z += n.z * penetration * (wB / wSum);

          const jImpulse = (-(1 + restitution) * vn) / wSum;
          const impulse = n.clone().multiplyScalar(jImpulse);

          // 冲量作用于接触点 → 线速度 + 力矩（偏心才转）
          const contact = sa.center.clone().addScaledVector(n, sa.radius);
          A.applyImpulseAt(impulse.clone().negate(), contact);
          B.applyImpulseAt(impulse, contact);
        }
      }
    }
  }
}
