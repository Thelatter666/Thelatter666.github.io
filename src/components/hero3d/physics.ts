import { FIXED_DT, MAX_SUBSTEPS, MAX_SPEED } from './constants';

export interface Particle {
  x: number; y: number; z: number;
  /** 上一帧位置 —— Verlet 的隐式速度来源 */
  px: number; py: number; pz: number;
  /** 质量倒数；0 表示固定（锚点） */
  invMass: number;
}

export function makeParticle(
  o: Partial<Particle> & { x: number; y: number; z: number },
): Particle {
  return { px: o.x, py: o.y, pz: o.z, invMass: 1, ...o };
}

/**
 * 由目标摆动周期与绳长反算重力：g = 4π²L / T²。
 *
 * 刻意不套用 9.8 —— 本场景的坐标尺度下，真实重力会让周期长达约 7.8 秒，
 * 大摆幅时像慢动作。先定"好看的周期"再反算 g（spec §7.3）。
 */
export function gravityFromPeriod(ropeLength: number, periodS: number): number {
  return (4 * Math.PI * Math.PI * ropeLength) / (periodS * periodS);
}

/** 由阻尼比 ζ 与周期换算「每秒速度衰减系数」：e^(-ζω)，ω = 2π/T。 */
export function dampingFromZeta(zeta: number, periodS: number): number {
  return Math.exp(-zeta * ((2 * Math.PI) / periodS));
}

export interface SolverOptions {
  gravity: number;
  dampingPerSecond: number;
  maxSpeed?: number;
}

/**
 * 固定步长 Verlet 求解器。
 *
 * 固定步长是必需的：Verlet 的隐式速度与步长耦合，
 * 若直接用真实帧 dt，120Hz 屏上的摆动速度会是 60Hz 的两倍（spec §7.3）。
 */
export class VerletSolver {
  particles: Particle[] = [];
  gravity: number;
  private dampingPerSecond: number;
  private maxSpeed: number;
  private acc = 0;
  /** 外力累积器（idle 风、抓取），每步清零 */
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

  /** 传入真实帧 dt，内部按 FIXED_DT 累积，保证帧率无关。 */
  step(dtReal: number): void {
    this.acc += Math.min(dtReal, 0.1);
    let n = 0;
    while (this.acc >= FIXED_DT && n < MAX_SUBSTEPS) {
      this.integrate();
      this.acc -= FIXED_DT;
      n++;
    }
    // 追不上就丢弃积压，避免切回标签页时出现"追帧雪崩"
    if (n === MAX_SUBSTEPS) this.acc = 0;
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

      // 速度上限：限制单步位移，防止能量注入把物体甩飞
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

  /** 位置式距离约束（绳索段、抓取共用）。stiffness < 1 可用于软化。 */
  solveDistance(a: Particle, b: Particle, rest: number, stiffness = 1): void {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    const wSum = a.invMass + b.invMass;
    if (wSum === 0) return;
    const diff = ((d - rest) / d) * stiffness;
    const kx = dx * diff, ky = dy * diff, kz = dz * diff;
    const wa = a.invMass / wSum, wb = b.invMass / wSum;
    a.x += kx * wa; a.y += ky * wa; a.z += kz * wa;
    b.x -= kx * wb; b.y -= ky * wb; b.z -= kz * wb;
  }

  velocityOf(p: Particle): { x: number; y: number; z: number } {
    return {
      x: (p.x - p.px) / FIXED_DT,
      y: (p.y - p.py) / FIXED_DT,
      z: (p.z - p.pz) / FIXED_DT,
    };
  }

  /** 直接施加冲量（拨动、碰撞用）。 */
  applyImpulse(p: Particle, ix: number, iy: number, iz: number): void {
    if (p.invMass === 0) return;
    p.px -= ix * p.invMass * FIXED_DT;
    p.py -= iy * p.invMass * FIXED_DT;
    p.pz -= iz * p.invMass * FIXED_DT;
  }
}
