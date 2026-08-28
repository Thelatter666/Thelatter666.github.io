import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CAMERA_FOV, CAMERA_PITCH, ANCHOR_ABOVE_VIEW } from './constants';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  container: HTMLElement;
}

/** 可视高度（世界单位，在 z=0 平面上） */
function visibleHeight(camera: THREE.PerspectiveCamera): number {
  return 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
}

/** 锚点平面的 Y：视口顶部再往上 ANCHOR_ABOVE_VIEW，让绳索"出画"垂入（spec §7.2） */
export function computeAnchorY(camera: THREE.PerspectiveCamera): number {
  return visibleHeight(camera) / 2 + ANCHOR_ABOVE_VIEW;
}

/** 徽章带的水平半宽（世界单位），供锚点横向分布使用 */
export function computeHalfWidth(camera: THREE.PerspectiveCamera, container: HTMLElement): number {
  const vh = visibleHeight(camera);
  return (vh * (container.clientWidth / container.clientHeight)) / 2;
}

export function createScene(container: HTMLElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // 悬挂场景没有地面，原型的 ShadowMaterial 地面在此无意义，不启用阴影（spec §7.1）
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    container.clientWidth / container.clientHeight,
    0.1,
    200,
  );
  // 相机略低并仰视，使宽而矮的空间显得更高（spec §7.2）
  camera.position.set(0, -2, 42);
  camera.lookAt(0, CAMERA_PITCH * 20, 0);

  // 环境贴图：金属反射的关键
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // 主光：暖白，来自右上前方
  const key = new THREE.DirectionalLight(0xfff1e6, 2.2);
  key.position.set(12, 20, 14);
  scene.add(key);

  // 边缘光：陶土铜，勾出金属轮廓（与整站 accent 同源）
  const rim = new THREE.DirectionalLight(0xd97757, 1.6);
  rim.position.set(-16, 6, -12);
  scene.add(rim);

  // 补光：冷色，避免背面死黑
  const fill = new THREE.DirectionalLight(0x8899cc, 0.6);
  fill.position.set(0, -6, 18);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0xffe4d4, 0.25));

  return { renderer, scene, camera, container };
}

export function resizeScene(ctx: SceneContext): void {
  const { renderer, camera, container } = ctx;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}
