import { describe, it, expect } from 'vitest';
import { resolveCollisions } from '../src/components/hero3d/collision';
import { makeFakeBody } from './helpers/fakeBody';

const single = (radius: number) => [{ offset: { x: 0, y: 0, z: 0 }, radius }];

describe('resolveCollisions', () => {
  it('两徽章重叠时产生分离：A 被推向 -x，B 被推向 +x', () => {
    const a = makeFakeBody({ x: 0, y: 0, z: 0 }, single(3));
    const b = makeFakeBody({ x: 4, y: 0, z: 0 }, single(3));
    resolveCollisions([a, b]);
    expect(a.particle.x).toBeLessThan(0);
    expect(b.particle.x).toBeGreaterThan(4);
  });

  it('不重叠时不产生任何位移', () => {
    const a = makeFakeBody({ x: 0, y: 0, z: 0 }, single(3));
    const b = makeFakeBody({ x: 20, y: 0, z: 0 }, single(3));
    const before = { ax: a.particle.x, bx: b.particle.x };
    resolveCollisions([a, b]);
    expect(a.particle.x).toBe(before.ax);
    expect(b.particle.x).toBe(before.bx);
  });

  it('正心碰撞不产生角速度（力矩 τ = r × J，r 与 J 平行）', () => {
    const a = makeFakeBody({ x: 0, y: 0, z: 0 }, single(3));
    const b = makeFakeBody({ x: 5, y: 0, z: 0 }, single(3));
    b.particle.px = b.particle.x + 0.5;   // B 朝 -x 运动，正面撞上 A
    resolveCollisions([a, b]);
    expect(a.angularVelocity.length()).toBeCloseTo(0, 10);
  });

  it('偏心碰撞产生角速度 —— 这正是「叮当乱晃」的来源', () => {
    // A 的碰撞代理分布在上下两侧，B 只撞到 A 的上方那颗 → 作用点偏离质心
    const a = makeFakeBody({ x: 0, y: 0, z: 0 }, [
      { offset: { x: 0, y: 3, z: 0 }, radius: 3 },
      { offset: { x: 0, y: -3, z: 0 }, radius: 3 },
    ]);
    const b = makeFakeBody({ x: 5, y: 4, z: 0 }, single(3));
    b.particle.px = b.particle.x + 0.5;
    resolveCollisions([a, b]);
    expect(a.angularVelocity.length()).toBeGreaterThan(0);
  });

  it('质量不同时，轻的被推得更多', () => {
    const heavy = makeFakeBody({ x: 0, y: 0, z: 0 }, single(3));
    const light = makeFakeBody({ x: 4, y: 0, z: 0 }, single(3));
    heavy.particle.invMass = 1 / 5;   // 质量 5
    light.particle.invMass = 1;       // 质量 1
    resolveCollisions([heavy, light]);
    expect(Math.abs(light.particle.x - 4)).toBeGreaterThan(Math.abs(heavy.particle.x));
  });
});
