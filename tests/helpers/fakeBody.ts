import * as THREE from 'three';
import { BadgeBody } from '../../src/components/hero3d/badgeBody';
import { makeParticle } from '../../src/components/hero3d/physics';

export function makeFakeBody(
  pos: { x: number; y: number; z: number },
  spheres: { offset: { x: number; y: number; z: number }; radius: number }[],
): BadgeBody {
  const particle = makeParticle({ ...pos, invMass: 1 });
  return new BadgeBody(
    particle,
    new THREE.Group(),
    spheres.map((s) => ({
      offset: new THREE.Vector3(s.offset.x, s.offset.y, s.offset.z),
      radius: s.radius,
    })),
  );
}
