import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { Particle, VerletSolver } from './physics';
import { makeParticle } from './physics';
import { ROPE_SEGMENTS, ROPE_WIDTH_PX } from './constants';

/**
 * 一条绳索 = 一串 Verlet 质点链。
 *
 * 用多段而非单段距离约束：单段永远绷成直线，看起来像钢丝；
 * 多段才有垂坠弧度，且徽章甩动时绳子会晚半拍跟上 —— 这个滞后就是真实感的来源。
 */
export class Rope {
  readonly nodes: Particle[] = [];
  readonly line: Line2;
  /** 段长，约束求解需要，挂在实例上避免调用方重复计算 */
  readonly segLength: number;
  private scene: THREE.Scene;
  private material: LineMaterial;
  private positions: Float32Array;

  constructor(scene: THREE.Scene, anchor: THREE.Vector3, segmentLength: number, endMass: number) {
    this.scene = scene;
    this.segLength = segmentLength;

    for (let i = 0; i < ROPE_SEGMENTS; i++) {
      this.nodes.push(makeParticle({
        x: anchor.x,
        y: anchor.y - i * segmentLength,
        z: anchor.z,
        invMass: i === 0 ? 0 : 1,   // 首节点为锚点，不参与积分
      }));
    }
    // 末端节点承载徽章，质量更大（影响碰撞冲量分配）
    this.nodes[this.nodes.length - 1].invMass = 1 / endMass;

    this.positions = new Float32Array(ROPE_SEGMENTS * 3);
    const geo = new LineGeometry();
    geo.setPositions(Array.from(this.positions));

    this.material = new LineMaterial({
      color: 0xb9a08f,
      linewidth: ROPE_WIDTH_PX,   // THREE.Line 的 linewidth 多数平台被忽略，必须用 Line2
      transparent: true,
      opacity: 0.55,
    });
    this.material.resolution.set(window.innerWidth, window.innerHeight);

    this.line = new Line2(geo, this.material);
    scene.add(this.line);
  }

  /** 绳索末端节点 —— 徽章挂在这里 */
  get end(): Particle {
    return this.nodes[this.nodes.length - 1];
  }

  /** 距离约束求解。迭代次数越多绳索越"硬"。 */
  constrain(solver: VerletSolver, iterations = 6): void {
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < this.nodes.length - 1; i++) {
        solver.solveDistance(this.nodes[i], this.nodes[i + 1], this.segLength);
      }
    }
  }

  syncGeometry(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const p = this.nodes[i];
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
    }
    this.line.geometry.setPositions(Array.from(this.positions));
  }

  onResize(): void {
    this.material.resolution.set(window.innerWidth, window.innerHeight);
  }

  dispose(): void {
    this.scene.remove(this.line);
    this.line.geometry.dispose();
    this.material.dispose();
  }
}
