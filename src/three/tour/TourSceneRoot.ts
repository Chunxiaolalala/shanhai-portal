/**
 * [CH14.3/14.4/14.6] M1 真 WebGL2 地面第一人称巡游。
 *
 * 复用桌面的程序化地形、殿阁占位、雾与灯光，但换成贴地相机：
 * - fov 72° / 眼高 1.6m，只做地面行走 + yaw/pitch 环顾（±35°），不做飞行跳跃；
 * - 沿 pavilions.order 做二次贝塞尔插值，进度直接读 tour.tourWalk，与 M0 共源；
 * - 单指拖拽转头、摇杆调行进 / 侧看、点殿阁可直接跳到那一境；
 * - 连续 3s 低于 24fps 自动降 M0（只换渲染层，进度与已看列表不丢）。
 *
 * 角色仍是 2D 立绘叠层（PortraitBackdrop），这里不建任何 3D 小师妹。
 * M02 未拍板前默认不启用；?mode=m1 或 tour.json → performance.m1Default 可开。
 */
import * as THREE from 'three'
import type { RendererAdapter } from '@/core/RendererAdapter'
import { pavilions, scene as sceneConfig, tour } from '@/core/config'
import {
  degradeToM0,
  openNow,
  setLook,
  tourIndex,
  tourJoystick,
  tourLook,
  tourWalk,
} from '@/core/tour'
import { FOG } from '@/three/materials/fog'
import { createLights } from '@/three/lighting/setup'
import { createHeightField } from '@/three/terrain/mainPeak'
import { createPavilionMarkers } from '@/three/buildings/pavilionMarker'

const DEG = Math.PI / 180

export function createTourSceneRoot(container: HTMLElement): RendererAdapter {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tour.performance.maxDpr))
  renderer.setSize(container.clientWidth, container.clientHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.style.touchAction = 'none'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(FOG.color)
  scene.fog = new THREE.FogExp2(FOG.color, FOG.density)

  const aspect = container.clientWidth / Math.max(1, container.clientHeight)
  const camera = new THREE.PerspectiveCamera(tour.camera.fov, aspect, 0.1, 800)

  for (const light of createLights()) scene.add(light)
  const heightField = createHeightField()
  const peak = heightField.build()
  scene.add(peak)
  const markers = createPavilionMarkers(heightField.heightAt)
  scene.add(markers.group)

  /** 第 index 境的殿阁本体（marker 也按 heightAt 摆） */
  function pavilionWorld(index: number): THREE.Vector3 {
    const p = pavilions[Math.max(0, Math.min(index, pavilions.length - 1))]
    const [x = 0, , z = 0] = p.position
    return new THREE.Vector3(x, heightField.heightAt(x, z) + 3.2, z)
  }

  /**
   * 站定机位：由山心向外退一段再停，绝不落在殿阁几何内部。
   * 否则第一人称贴地会看到 marker 的柱子糊在镜头上（低多边形占位尤其明显）。
   */
  function stopPoint(index: number): THREE.Vector3 {
    const base = pavilionWorld(index)
    const length = Math.hypot(base.x, base.z) || 1
    const out = sceneConfig.cameraApproach.outward * 0.46
    const px = base.x + (base.x / length) * out
    const pz = base.z + (base.z / length) * out
    return new THREE.Vector3(px, heightField.heightAt(px, pz) + tour.camera.eyeHeight, pz)
  }

  /** 山门外的入场点：从总览方向往山里走第一步 */
  function gatePoint(): THREE.Vector3 {
    const [x = 0, , z = 46] = pavilions[0]?.position ?? []
    return new THREE.Vector3(x, heightField.heightAt(x, z + 20) + tour.camera.eyeHeight, z + 20)
  }

  function pathNow(): { curve: THREE.QuadraticBezierCurve3; from: THREE.Vector3; to: THREE.Vector3 } {
    const to = stopPoint(tourIndex.value)
    const from = tourIndex.value === 0 ? gatePoint() : stopPoint(tourIndex.value - 1)
    const delta = to.clone().sub(from)
    // 侧向绕一点，避免直线穿过主峰
    const side = new THREE.Vector3(-delta.z, 0, delta.x).normalize()
      .multiplyScalar(delta.length() * 0.14)
    const mid = from.clone().lerp(to, 0.5).add(side)
    mid.y = (from.y + to.y) * 0.5 + 2.2
    return { curve: new THREE.QuadraticBezierCurve3(from, mid, to), from, to }
  }

  const lookTarget = new THREE.Vector3()
  const upAxis = new THREE.Vector3(0, 1, 0)

  function applyCamera(): void {
    const { curve, from, to } = pathNow()
    const t = THREE.MathUtils.smoothstep(tourWalk.value, 0, 1)
    camera.position.copy(curve.getPoint(t))

    const forward = to.clone().sub(from).normalize()
    // 快到站时视线从「看路」平滑转成「看殿阁」，到站正对殿门而不是穿过去
    const toPavilion = pavilionWorld(tourIndex.value).sub(camera.position).normalize()
    const blend = THREE.MathUtils.smoothstep(t, 0.5, 1)
    const viewDir = forward.clone().lerp(toPavilion, blend).normalize()

    const yaw = tourLook.value.x * tour.camera.yawRange * DEG
      + tourJoystick.value.x * 0.16
    const pitch = tourLook.value.y * tour.camera.pitchLimit * DEG

    lookTarget.copy(viewDir).multiplyScalar(12)
      .applyAxisAngle(upAxis, -yaw)
      .add(camera.position)
    lookTarget.y += Math.tan(pitch) * 12
    camera.lookAt(lookTarget)
  }

  // ---------------------------------------------------------------- 单指环顾 + 点殿阁
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let dragging = false
  let moved = 0
  let startX = 0
  let startY = 0
  let lookX = 0
  let lookY = 0

  function pick(event: PointerEvent): string | null {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const id = raycaster.intersectObjects(markers.clickables, false)[0]?.object.userData.pavilionId
    return typeof id === 'string' ? id : null
  }

  function onDown(event: PointerEvent): void {
    dragging = true
    moved = 0
    startX = event.clientX
    startY = event.clientY
    lookX = tourLook.value.x
    lookY = tourLook.value.y
    renderer.domElement.setPointerCapture(event.pointerId)
  }

  function onMove(event: PointerEvent): void {
    if (!dragging) return
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    moved = Math.max(moved, Math.hypot(dx, dy))
    const rect = renderer.domElement.getBoundingClientRect()
    setLook(
      lookX - dx / (rect.width * 0.5),
      lookY - dy / (rect.height * 0.5),
    )
  }

  function onUp(event: PointerEvent): void {
    if (!dragging) return
    dragging = false
    if (moved > 6) return
    const id = pick(event)
    if (id === null) return
    const index = pavilions.findIndex((item) => item.id === id)
    if (index < 0) return
    // 点中殿阁 = 直接跳到那一境并展开卷轴，顺序仍由 order 决定
    tourIndex.value = index
    tourWalk.value = 1
    openNow()
  }

  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointermove', onMove)
  renderer.domElement.addEventListener('pointerup', onUp)
  renderer.domElement.addEventListener('pointercancel', onUp)

  // ---------------------------------------------------------------- 尺寸 / 帧率 / 循环
  const observer = new ResizeObserver(() => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width === 0 || height === 0) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  })
  observer.observe(container)

  let frameId: number | null = null
  let frames = 0
  let windowStart = 0
  let lowMs = 0
  let degraded = false

  function tick(now: number): void {
    frameId = requestAnimationFrame(tick)

    // 松手后视线缓回正前方，继续跟小师妹走
    if (!dragging && (tourLook.value.x !== 0 || tourLook.value.y !== 0)) {
      const nextX = tourLook.value.x * 0.9
      const nextY = tourLook.value.y * 0.9
      setLook(Math.abs(nextX) < 0.002 ? 0 : nextX, Math.abs(nextY) < 0.002 ? 0 : nextY)
    }
    applyCamera()
    renderer.render(scene, camera)

    // 连续 sampleMs 低于 minFps 才降级，避免首帧编译 shader 的抖动误判
    frames += 1
    if (windowStart === 0) windowStart = now
    const span = now - windowStart
    if (span >= 1000) {
      const fps = (frames * 1000) / span
      lowMs = fps < tour.performance.minFps ? lowMs + span : 0
      frames = 0
      windowStart = now
      if (!degraded && lowMs >= tour.performance.sampleMs) {
        degraded = true
        degradeToM0()
      }
    }
  }

  function pause(): void {
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
    windowStart = 0
    frames = 0
  }

  function resume(): void {
    if (frameId === null) frameId = requestAnimationFrame(tick)
  }

  function dispose(): void {
    pause()
    observer.disconnect()
    renderer.domElement.removeEventListener('pointerdown', onDown)
    renderer.domElement.removeEventListener('pointermove', onMove)
    renderer.domElement.removeEventListener('pointerup', onUp)
    renderer.domElement.removeEventListener('pointercancel', onUp)
    markers.dispose()
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) material.dispose()
    })
    renderer.dispose()
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement)
    }
  }

  resume()
  return { backend: 'webgl2', pause, resume, dispose }
}
