/**
 * [REF V02][REF V03] 昆仑主峰：three.js 程序化生成，不需要多视角参考图。
 * 配置源：references/reference-mapping.json → V03.consumedBy → src/three/terrain/mainPeak.ts
 * V03（references/V03_kunlun_peak/kunlun-01.jpg）只作氛围与笔意参考，不反推几何。
 *
 * 规格书 11.0：高度函数 / 噪声 / 自定义 geometry 一定义，360° 天然成立，
 * 没有需要靠图补的「背面」。转一圈的截图是验收产物，不是输入。
 *
 * 低多边形折面 + 顶点色 + flatShading，刻意避开 PBR 高光（拒绝塑料感）。
 */
import * as THREE from 'three'
import { scene as sceneConfig } from '@/core/config'
import { ridgeInfluence } from './ridgeSpline'
import { waterDepression } from './waterSpline'

// [REF V01] 色阶取自母版实测：青碧 #8EACA2 / 浅青 #AEC0B1 / 月白 #F8F3E2。
// 旧值低海拔用 #6e8f84，无头浏览器实测整座山发灰发暗，已整体提亮一档。
const COLOR_LOW = new THREE.Color('#8eaca2')
const COLOR_MID = new THREE.Color('#aec0b1')
const COLOR_HIGH = new THREE.Color('#d7dac6')
const COLOR_SNOW = new THREE.Color('#f8f3e2')

function hash2(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.0001) * 43758.5453123
  return value - Math.floor(value)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = smoothstep(x - xi)
  const v = smoothstep(y - yi)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

/** 4 层 fBm，确定性：同一 seed 每次构建出同一座山 */
function fbm(x: number, y: number, seed: number): number {
  let sum = 0
  let amplitude = 0.5
  let frequency = 1
  for (let octave = 0; octave < 4; octave += 1) {
    sum += amplitude * valueNoise(x * frequency, y * frequency, seed + octave * 17)
    frequency *= 2
    amplitude *= 0.5
  }
  return sum
}

export function createHeightField() {
  const { seed, segments, radius, height } = sceneConfig.terrain

  /** 副峰：山海经四副峰（不周 / 招摇 / 丹穴 / 青要），固定摆位，可旋转校验 */
  const subPeaks: readonly (readonly [number, number, number, number])[] = [
    [-0.62, -0.44, 0.28, 0.5],
    [0.66, -0.36, 0.24, 0.46],
    [-0.5, 0.55, 0.2, 0.38],
    [0.54, 0.52, 0.18, 0.34],
  ]

  function heightAt(x: number, z: number): number {
    const nx = x / radius
    const nz = z / radius
    const radial = Math.max(0, 1 - (nx * nx + nz * nz))
    const falloff = Math.pow(radial, 1.6)

    const noise = fbm(x * 0.045, z * 0.045, seed)
    const ridge = ridgeInfluence(x, z, radius)
    const water = waterDepression(x, z, radius)

    let sub = 0
    for (const [px, pz, size, weight] of subPeaks) {
      const distance = Math.hypot(nx - px, nz - pz)
      sub += weight * Math.max(0, 1 - distance / size)
    }

    const base = height * falloff * (0.32 + 0.68 * noise)
    const lifted = base * (1 + 0.34 * ridge + sub * 0.55)
    // 水脉处压低，形成弱水环带；边缘归零，避免地形边界出现直墙
    return Math.max(0, lifted * (1 - water * 0.55)) * Math.min(1, radial * 4)
  }

  function build(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments)
    geometry.rotateX(-Math.PI / 2)

    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    const colors = new Float32Array(position.count * 3)
    const color = new THREE.Color()

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const z = position.getZ(i)
      const h = heightAt(x, z)
      position.setY(i, h)

      const t = Math.min(1, h / height)
      if (t < 0.34) {
        color.copy(COLOR_LOW).lerp(COLOR_MID, t / 0.34)
      } else if (t < 0.7) {
        color.copy(COLOR_MID).lerp(COLOR_HIGH, (t - 0.34) / 0.36)
      } else {
        color.copy(COLOR_HIGH).lerp(COLOR_SNOW, (t - 0.7) / 0.3)
      }
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    position.needsUpdate = true
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = 'kunlun-main-peak'
    return mesh
  }

  return { build, heightAt }
}
