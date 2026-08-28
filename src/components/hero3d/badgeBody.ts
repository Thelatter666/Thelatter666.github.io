import * as THREE from 'three';
import type { Particle } from './physics';
import {
  BADGE_INERTIA, ORIENT_RESTITUTION, ANGULAR_DAMPING, HOVER_TILT_MAX, HOVER_SCALE, FIXED_DT,
} from './constants';

export interface CollisionSphere {
  offset: THREE.Vector3;
  radius: number;
}

/**
 * 徽章刚体近似 = 绳索末端质点 + 朝向四元数 + 角速度 + 标量转动惯量。
 *
 * 若徽章只是 Verlet 质点，被撞时只会平移不会自转，完全没有"叮当乱晃"。
 * 引入朝向自由度后，碰撞冲量作用于接触点即可产生力矩 τ = r × J（spec §7.4）。
 */
export class BadgeBody {
  readonly quaternion = new THREE.Quaternion();
  readonly angularVelocity = new THREE.Vector3();
  /** hover 时的附加倾斜方向（单位向量） */
  readonly hoverTilt = new THREE.Vector3();
  /** hover 强度 0~1，驱动倾斜与缩放 */
  hoverAmount = 0;

  private inertia = BADGE_INERTIA;
  private tmpM = new THREE.Matrix4();
  private tmpE = new THREE.Euler();
  // 两个临时四元数：syncMesh 里目标姿态与 hover 倾斜要同时存在，共用一个会自乘
  private tmpQ = new THREE.Quaternion();
  private tmpQ2 = new THREE.Quaternion();

  constructor(
    readonly particle: Particle,
    readonly mesh: THREE.Group,
    readonly collisionSpheres: CollisionSphere[],
  ) {}

  get position(): THREE.Vector3 {
    return new THREE.Vector3(this.particle.x, this.particle.y, this.particle.z);
  }

  get mass(): number {
    return 1 / this.particle.invMass;
  }

  /** 世界空间中的碰撞球心 */
  worldSpheres(): { center: THREE.Vector3; radius: number }[] {
    return this.collisionSpheres.map((s) => ({
      center: s.offset.clone().applyQuaternion(this.quaternion).add(this.position),
      radius: s.radius,
    }));
  }

  /**
   * 在指定世界坐标点施加冲量 → 线速度 + 角速度。
   * 作用点偏离质心才会产生力矩，这也是"拨动"要用偏心冲量的原因。
   */
  applyImpulseAt(impulse: THREE.Vector3, worldPoint: THREE.Vector3): void {
    const p = this.particle;
    if (p.invMass === 0) return;
    p.px -= impulse.x * p.invMass * FIXED_DT;
    p.py -= impulse.y * p.invMass * FIXED_DT;
    p.pz -= impulse.z * p.invMass * FIXED_DT;

    const r = worldPoint.clone().sub(this.position);
    const torque = r.cross(impulse);
    this.angularVelocity.addScaledVector(torque, 1 / this.inertia);
  }

  /**
   * 软回正：目标姿态由 up = 绳索方向、forward = 朝向相机 构造（spec §7.4）。
   *
   * up 沿绳 —— 真实吊坠就是沿绳垂下的，绳摆时牌子会自然跟着倾，这是真实感的主要来源；
   * forward 朝相机 —— 保证品牌 logo 始终可读，不会停在侧面朝外。
   */
  update(dt: number, ropeDir: THREE.Vector3, cameraPos: THREE.Vector3): void {
    const up = ropeDir.clone().normalize();
    const toCam = cameraPos.clone().sub(this.position).normalize();

    // 把 toCam 投影到与 up 垂直的平面，再正交化出完整基
    const forward = toCam.clone().addScaledVector(up, -toCam.dot(up));
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const trueForward = new THREE.Vector3().crossVectors(up, right).normalize();

    this.tmpM.makeBasis(right, up, trueForward);
    const target = this.tmpQ.setFromRotationMatrix(this.tmpM);

    // 指数趋近，保证与帧率无关
    this.quaternion.slerp(target, 1 - Math.exp(-ORIENT_RESTITUTION * dt));

    // 角速度积分 + 角阻尼
    this.tmpE.set(
      this.angularVelocity.x * dt,
      this.angularVelocity.y * dt,
      this.angularVelocity.z * dt,
    );
    this.quaternion.multiply(this.tmpQ.setFromEuler(this.tmpE));
    this.quaternion.normalize();
    this.angularVelocity.multiplyScalar(Math.pow(ANGULAR_DAMPING, dt));
  }

  /** 把位置、朝向与 hover 效果写入 mesh */
  syncMesh(): void {
    this.mesh.position.set(this.particle.x, this.particle.y, this.particle.z);

    const q = this.tmpQ.copy(this.quaternion);
    if (this.hoverAmount > 0) {
      this.tmpE.set(
        this.hoverTilt.x * HOVER_TILT_MAX * this.hoverAmount,
        this.hoverTilt.y * HOVER_TILT_MAX * this.hoverAmount,
        0,
      );
      q.multiply(this.tmpQ2.setFromEuler(this.tmpE));
    }
    this.mesh.quaternion.copy(q);
    this.mesh.scale.setScalar(1 + (HOVER_SCALE - 1) * this.hoverAmount);
  }
}
