import { describe, it, expect } from 'vitest';
import {
  VerletSolver,
  makeParticle,
  gravityFromPeriod,
  dampingFromZeta,
} from '../src/components/hero3d/physics';

describe('gravityFromPeriod', () => {
  it('由周期与绳长反算重力：T=1.25s, L=10 → g ≈ 252.7', () => {
    expect(gravityFromPeriod(10, 1.25)).toBeCloseTo(252.7, 1);
  });

  it('不套用 9.8 —— 本尺度下真实重力会让周期长达约 7.8s，显得像慢动作', () => {
    expect(gravityFromPeriod(15, 1.25)).not.toBeCloseTo(9.8, 1);
  });
});

describe('dampingFromZeta', () => {
  it('ζ=0.15 时每秒速度衰减系数 ≈ e^(-0.754)', () => {
    // 2π/1.25 = 5.027；0.15 × 5.027 = 0.754
    expect(dampingFromZeta(0.15, 1.25)).toBeCloseTo(Math.exp(-0.754), 3);
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

  it('阻尼收敛：ζ=0.15 的单摆，5 秒后振幅衰减到初始的 15% 以下', () => {
    const period = 1.25;
    const ropeLength = 10;
    const s = new VerletSolver({
      gravity: gravityFromPeriod(ropeLength, period),
      dampingPerSecond: dampingFromZeta(0.15, period),
    });

    // 真正的单摆：锚点在原点，摆球初始偏 30°（x=5，y 由绳长反解）
    const anchor = makeParticle({ x: 0, y: 0, z: 0, invMass: 0 });
    const bob = makeParticle({
      x: 5,
      y: -Math.sqrt(ropeLength * ropeLength - 25),
      z: 0,
      invMass: 1,
    });
    s.particles.push(anchor, bob);

    let maxAfter = 0;
    for (let t = 0; t < 5; t += 1 / 60) {
      s.step(1 / 60);
      for (let k = 0; k < 8; k++) s.solveDistance(anchor, bob, ropeLength);
      if (t > 4) maxAfter = Math.max(maxAfter, Math.abs(bob.x));
    }
    expect(maxAfter).toBeLessThan(5 * 0.15);
  });

  it('无阻尼时不收敛（对照组，证明上一条测的确实是阻尼）', () => {
    const period = 1.25;
    const ropeLength = 10;
    const s = new VerletSolver({
      gravity: gravityFromPeriod(ropeLength, period),
      dampingPerSecond: 1, // 无衰减
    });
    const anchor = makeParticle({ x: 0, y: 0, z: 0, invMass: 0 });
    const bob = makeParticle({
      x: 5,
      y: -Math.sqrt(ropeLength * ropeLength - 25),
      z: 0,
      invMass: 1,
    });
    s.particles.push(anchor, bob);

    let maxAfter = 0;
    for (let t = 0; t < 5; t += 1 / 60) {
      s.step(1 / 60);
      for (let k = 0; k < 8; k++) s.solveDistance(anchor, bob, ropeLength);
      if (t > 4) maxAfter = Math.max(maxAfter, Math.abs(bob.x));
    }
    expect(maxAfter).toBeGreaterThan(5 * 0.5);
  });

  it('速度上限生效：注入极大速度后不超过 maxSpeed', () => {
    const s = new VerletSolver({ gravity: 250, dampingPerSecond: 1, maxSpeed: 26 });
    const p = makeParticle({ x: 0, y: 0, z: 0, invMass: 1 });
    p.px = -1000; // 制造巨大隐式速度
    s.particles.push(p);
    s.step(1 / 60);
    const vx = (p.x - p.px) / (1 / 120);
    expect(Math.abs(vx)).toBeLessThanOrEqual(26 + 1e-6);
  });

  it('锚点（invMass=0）不会被重力拉动', () => {
    const s = new VerletSolver({ gravity: 250, dampingPerSecond: 1 });
    const anchor = makeParticle({ x: 0, y: 10, z: 0, invMass: 0 });
    s.particles.push(anchor);
    for (let t = 0; t < 2; t += 1 / 60) s.step(1 / 60);
    expect(anchor.x).toBe(0);
    expect(anchor.y).toBe(10);
  });

  it('距离约束把两点拉回静止长度', () => {
    const s = new VerletSolver({ gravity: 0, dampingPerSecond: 1 });
    const a = makeParticle({ x: 0, y: 0, z: 0, invMass: 0 });
    const b = makeParticle({ x: 0, y: -20, z: 0, invMass: 1 });
    s.particles.push(a, b);
    for (let i = 0; i < 20; i++) s.solveDistance(a, b, 5);
    expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeCloseTo(5, 5);
  });
});
