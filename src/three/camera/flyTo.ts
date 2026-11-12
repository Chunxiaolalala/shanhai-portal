/**
 * 规格书 05 章：点击殿阁 → CatmullRom 曲线飞行 1.2–1.8s 缓动 → 门框遮罩 → 卷轴展开。
 * 任意时刻可中断：新的 to() 直接从当前相机位置重建曲线，不等上一段飞完。
 *
 * 机位不写死在每座殿上：由殿阁位置 + 山心向外方向 + 抬高量推导（scene.json → cameraApproach），
 * 所以加一座殿只改 pavilions.json，不需要补相机锚点。
 */
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { pavilions, scene } from '@/core/config'
import { prefersReducedMotion } from '@/core/journey'

interface ActiveFlight {
  curve: THREE.CatmullRomCurve3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  startedAt: number
  duration: number
}

export interface FlightController {
  to: (id: string | null) => void
  cancel: () => void
  update: () => void
  get flying(): boolean
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function createFlight(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  heightAt: (x: number, z: number) => number,
  home: { position: THREE.Vector3; target: THREE.Vector3 },
): FlightController {
  const approach = scene.cameraApproach
  const [minDuration = 1200] = scene.flight.durationMs
  const originalDamping = controls.enableDamping
  let active: ActiveFlight | null = null

  function lookFor(id: string): THREE.Vector3 {
    const pavilion = pavilions.find((item) => item.id === id)
    if (pavilion === undefined) return home.target.clone()
    const [x = 0, , z = 0] = pavilion.position
    return new THREE.Vector3(x, heightAt(x, z) + approach.lookLift, z)
  }

  function cameraFor(id: string): THREE.Vector3 {
    const pavilion = pavilions.find((item) => item.id === id)
    if (pavilion === undefined) return home.position.clone()
    const [x = 0, , z = 0] = pavilion.position
    const outward = new THREE.Vector3(x, 0, z)
    if (outward.lengthSq() < 1) outward.set(0, 0, 1)
    outward.normalize()
    return lookFor(id)
      .addScaledVector(outward, approach.outward)
      .add(new THREE.Vector3(0, approach.lift, 0))
  }

  function finish(): void {
    active = null
    controls.enabled = true
    controls.enableDamping = originalDamping
    controls.update()
  }

  function cancel(): void {
    if (active === null) return
    finish()
  }

  function to(id: string | null): void {
    const endPosition = id === null ? home.position.clone() : cameraFor(id)
    const endTarget = id === null ? home.target.clone() : lookFor(id)

    if (prefersReducedMotion()) {
      cancel()
      camera.position.copy(endPosition)
      controls.target.copy(endTarget)
      controls.update()
      return
    }

    // 从当前位置起飞，因此连续点击不会跳帧
    const start = camera.position.clone()
    const mid = start.clone().lerp(endPosition, 0.5)
    mid.y += Math.max(5, start.distanceTo(endPosition) * 0.12)

    active = {
      curve: new THREE.CatmullRomCurve3([start, mid, endPosition]),
      fromTarget: controls.target.clone(),
      toTarget: endTarget,
      startedAt: performance.now(),
      duration: minDuration,
    }
    // 飞行期间关掉 OrbitControls，否则它的阻尼会用 spherical 覆写我们写进 camera.position 的值
    controls.enableDamping = false
    controls.enabled = false
  }

  function update(): void {
    if (active === null) return
    const flight = active
    const t = Math.min(1, (performance.now() - flight.startedAt) / flight.duration)
    const eased = easeInOutCubic(t)
    camera.position.copy(flight.curve.getPoint(eased))
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased)
    camera.lookAt(controls.target)
    if (t >= 1) finish()
  }

  return {
    to,
    cancel,
    update,
    get flying(): boolean { return active !== null },
  }
}
