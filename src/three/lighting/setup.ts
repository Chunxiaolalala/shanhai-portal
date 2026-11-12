/**
 * [REF V01] 光照基调 → references/V01_moodboard/mood-master.png
 * 配置源：references/reference-mapping.json → V01.consumedBy → src/three/lighting/setup.ts
 * 状态：ready（母版为柔和漫射光、无硬阴影、低饱和暖米底）
 *
 * 刻意不投阴影：规格书 02 章要「平面化插画质感」，硬阴影会把低多边形折面拉成塑料渲染感。
 */
import * as THREE from 'three'

export const LIGHTING = {
  keyColor: 0xf8f3e2,
  // 强度已按无头浏览器实测标定：原 1.05/0.85 在 SwiftShader 与真实雾叠加后山体偏暗沉
  keyIntensity: 1.2,
  fillColor: 0xd7dac6,
  fillIntensity: 0.58,
  ambientColor: 0xf0e5ca,
  ambientIntensity: 1.0,
} as const

export function createLights(): THREE.Light[] {
  const ambient = new THREE.AmbientLight(LIGHTING.ambientColor, LIGHTING.ambientIntensity)

  const key = new THREE.DirectionalLight(LIGHTING.keyColor, LIGHTING.keyIntensity)
  key.position.set(40, 80, 60)

  const fill = new THREE.DirectionalLight(LIGHTING.fillColor, LIGHTING.fillIntensity)
  fill.position.set(-50, 30, -40)

  // 实测：开场机位看到的山坡恰好背对 key/fill，整座山发暗。
  // 加一盏相机侧柔光把朝向访客的坡面提亮；仍是无高光 Lambert，不会变塑料。
  const cameraFill = new THREE.DirectionalLight(0xf8f3e2, 0.62)
  cameraFill.position.set(0, 34, 120)

  return [ambient, key, fill, cameraFill]
}
