import * as THREE from 'three';
import { BADGES } from '../../data/badges';
import { createScene, resizeScene, computeAnchorY, computeHalfWidth } from './scene';
import { VerletSolver, gravityFromPeriod, dampingFromZeta } from './physics';
import { Rope } from './rope';
import { createBadge, buildCollisionSpheres } from './badge';
import { BadgeBody } from './badgeBody';
import { resolveCollisions } from './collision';
import { screenToWorld, applySwipe, applyGrab } from './interaction';
import {
  PERIOD_S, ZETA, ROPE_SEGMENTS, MOBILE_BREAKPOINT,
  IDLE_NOISE_AMP, IDLE_GUST_AMP, IDLE_GUST_INTERVAL_S,
} from './constants';

interface Hanging {
  rope: Rope;
  body: BadgeBody;
  gustTimer: number;
  phase: number;
}

export function mountHero(rootEl: Element): () => void {
  const canvasHost = rootEl.querySelector('[data-hero-canvas]') as HTMLElement | null;
  if (!canvasHost) throw new Error('未找到 [data-hero-canvas] 容器');

  const ctx = createScene(canvasHost);
  const { scene, camera, renderer, container } = ctx;

  const averageRope =
    BADGES.reduce((s, b) => s + b.ropeLength, 0) / BADGES.length;
  const solver = new VerletSolver({
    gravity: gravityFromPeriod(averageRope, PERIOD_S),
    dampingPerSecond: dampingFromZeta(ZETA, PERIOD_S),
  });

  let hanging: Hanging[] = [];

  function layout(): void {
    for (const h of hanging) h.rope.dispose();
    for (const h of hanging) scene.remove(h.body.mesh);
    hanging = [];
    solver.particles.length = 0;

    const halfWidth = computeHalfWidth(camera, container);
    const anchorY = computeAnchorY(camera);
    const usable = halfWidth * 0.92;   // 两侧留白，避免徽章贴边

    BADGES.forEach((cfg, i) => {
      const anchor = new THREE.Vector3(
        -usable + 2 * usable * cfg.anchorXRatio,
        anchorY,
        0,
      );
      const segLength = cfg.ropeLength / (ROPE_SEGMENTS - 1);
      const rope = new Rope(scene, anchor, segLength, cfg.mass);
      solver.particles.push(...rope.nodes);

      const { group, size } = createBadge(cfg);
      scene.add(group);

      const body = new BadgeBody(rope.end, group, buildCollisionSpheres(size));

      hanging.push({
        rope,
        body,
        // 阵风相位错开：5 个牌子同步摆动会显得非常机械（spec §7.3）
        gustTimer: IDLE_GUST_INTERVAL_S[0] + Math.random() * 4 + i * 0.7,
        phase: i * 1.7,
      });
    });
  }

  layout();

  // ---------------- 交互状态 ----------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);   // NDC，初始在画面外
  const lastPointer = new THREE.Vector2(-10, -10);
  const pointerDelta = new THREE.Vector2();
  const grabTarget = new THREE.Vector3();
  let grabbed: BadgeBody | null = null;
  let hovered: BadgeBody | null = null;
  let pointerInside = false;

  const toNdc = (e: PointerEvent | MouseEvent): THREE.Vector2 => {
    const r = container.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -(((e.clientY - r.top) / r.height) * 2 - 1),
    );
  };

  const onPointerMove = (e: PointerEvent) => {
    pointerInside = true;
    const next = toNdc(e);
    // 两帧之间可能有多次 move；delta 取「上一帧位置 → 当前位置」的总位移
    pointerDelta.copy(next).sub(lastPointer);
    pointer.copy(next);
  };

  const onPointerLeave = () => {
    pointerInside = false;
    pointer.set(-10, -10);
    lastPointer.set(-10, -10);
    hovered = null;
    grabbed = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    // 仅在鼠标上启用抓取：触屏拖拽会与页面滚动冲突（spec §7.6）
    if (e.pointerType !== 'mouse') return;
    const ndc = toNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(hanging.map((h) => h.body.mesh), true);
    if (!hits.length) return;
    const hit = hits[0].object;
    const found = hanging.find((h) => {
      let o: THREE.Object3D | null = hit;
      while (o) { if (o === h.body.mesh) return true; o = o.parent; }
      return false;
    });
    if (!found) return;
    grabbed = found.body;
    grabTarget.copy(screenToWorld(ndc.x, ndc.y, camera));
  };

  const onPointerUp = () => { grabbed = null; };

  const onResize = () => {
    resizeScene(ctx);
    for (const h of hanging) h.rope.onResize();
    layout();
  };

  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerleave', onPointerLeave);
  container.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('resize', onResize);

  // 滚出视口即暂停渲染（spec §7.9）
  let visible = true;
  const io = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; });
  io.observe(container);

  /** 命中的可能是子 Mesh，向上回溯到所属徽章 */
  const matchBody = (obj: THREE.Object3D): BadgeBody | null => {
    let o: THREE.Object3D | null = obj;
    while (o) {
      const found = hanging.find((h) => h.body.mesh === o);
      if (found) return found.body;
      o = o.parent;
    }
    return null;
  };

  // ---------------- 渲染循环 ----------------
  const clock = new THREE.Clock();
  const ropeDir = new THREE.Vector3();
  let raf = 0;
  let time = 0;

  const tick = (): void => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    time += dt;

    // 抓取目标随鼠标更新
    if (grabbed) grabTarget.copy(screenToWorld(pointer.x, pointer.y, camera));

    // 拨动：仅未抓取时生效
    if (!grabbed && pointerInside && pointerDelta.lengthSq() > 1e-8) {
      applySwipe(screenToWorld(pointer.x, pointer.y, camera), pointerDelta, hanging.map((h) => h.body));
    }
    lastPointer.copy(pointer);
    pointerDelta.set(0, 0);

    // idle 风：连续低频噪声（防死寂）+ 偶发阵风（制造生命感），各徽章相位错开
    for (const h of hanging) {
      const noise =
        Math.sin(time * 0.7 + h.phase) * 0.6 +
        Math.sin(time * 0.31 + h.phase * 2.3) * 0.4;
      solver.addForce(h.body.particle, noise * IDLE_NOISE_AMP, 0, 0);

      h.gustTimer -= dt;
      if (h.gustTimer <= 0) {
        const [lo, hi] = IDLE_GUST_INTERVAL_S;
        h.gustTimer = lo + Math.random() * (hi - lo);
        solver.addForce(h.body.particle, (Math.random() - 0.5) * 2 * IDLE_GUST_AMP, 0, 0);
      }
    }

    if (grabbed) applyGrab(grabbed, grabTarget, solver);

    solver.step(dt);
    for (const h of hanging) h.rope.constrain(solver);
    resolveCollisions(hanging.map((h) => h.body));

    // hover 检测：每帧一次，避免 pointermove 高频射线检测
    if (pointerInside && !grabbed) {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hanging.map((h) => h.body.mesh), true);
      hovered = hits.length ? matchBody(hits[0].object) : null;
    } else if (grabbed) {
      hovered = grabbed;
    } else {
      hovered = null;
    }

    for (const h of hanging) {
      const nodes = h.rope.nodes;
      const prev = nodes[nodes.length - 2];
      // up 沿绳：绳摆时牌子自然跟着倾（真实吊坠行为）
      ropeDir.set(
        h.body.particle.x - prev.x,
        h.body.particle.y - prev.y,
        h.body.particle.z - prev.z,
      );
      h.body.update(dt, ropeDir, camera.position);
      const want = h.body === hovered ? 1 : 0;
      h.body.hoverAmount += (want - h.body.hoverAmount) * Math.min(1, dt * 8);
      if (h.body === hovered) h.body.hoverTilt.set(pointer.x, pointer.y, 0).normalize();
      h.body.syncMesh();
    }
    for (const h of hanging) h.rope.syncGeometry();

    renderer.render(scene, camera);
  };

  tick();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerleave', onPointerLeave);
    container.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
    for (const h of hanging) h.rope.dispose();
    renderer.dispose();
  };
}

/** 供 Hero3D.astro 判断是否进入降级路径 */
export function shouldFallback(): boolean {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.innerWidth < MOBILE_BREAKPOINT;
  let hasWebGL = false;
  try {
    const c = document.createElement('canvas');
    hasWebGL = !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    hasWebGL = false;
  }
  return reduced || narrow || !hasWebGL;
}
