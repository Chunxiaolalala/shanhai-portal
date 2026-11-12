/**
 * [REF V03] 开场镜头 → references/V03_kunlun_peak/kunlun-01.jpg
 * 配置源：references/reference-mapping.json → V03.consumedBy → src/three/camera/openingShot.ts
 * 状态：ready（机位参数在 src/config/scene.json → cameraAnchors.overview，改数据不改代码）
 */
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { scene as sceneConfig } from '@/core/config'

// JSON 只能推断为 number[]，这里给默认值兜底，避免配置缺项时相机落到 NaN
const [ox = 0, oy = 48, oz = 118] = sceneConfig.cameraAnchors.overview

export const OPENING_SHOT = {
  position: new THREE.Vector3(ox, oy, oz),
  target: new THREE.Vector3(0, sceneConfig.terrain.height * 0.3, 0),
  fov: 42,
} as const

export function applyOpeningShot(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
): void {
  camera.position.copy(OPENING_SHOT.position)
  camera.fov = OPENING_SHOT.fov
  camera.updateProjectionMatrix()
  controls.target.copy(OPENING_SHOT.target)
  controls.update()
}
