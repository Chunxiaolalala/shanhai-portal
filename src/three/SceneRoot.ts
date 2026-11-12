/**
 * 3D 场景装配层：Three.js / WebGL2 兜底路径。
 *
 * 已接：程序化主峰 + 8 座可点击殿阁占位 + 射线命中 + CatmullRom 镜头飞行
 *      + 屏幕锚点投影（给 HTML 标签 / 罗盘 / 小师妹）+ 烛龙昼夜 + pause/resume。
 * 未接（按规格书保持探测不启用）：WebGPU / WGSL 云雾、实例化流光、GPU 视锥剔除。
 * 已接：Lux3D 导出的殿阁 glb（pavilions.json 的 model 字段，经 loadPavilionModel 异步替换占位几何）。
 * 未接（等参考图）：2D 骨骼动画资产。
 *
 * 规格书 04 章：两条渲染路径共用同一份 scene.json；07 章：iframe 打开时暂停本渲染循环。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { RenderBackend, RendererAdapter } from '@/core/RendererAdapter'
import {
  openPavilion,
  registerFlightHandler,
  setAnchors,
  timeOfDay,
  type ScreenAnchor,
  type TimeOfDay,
} from '@/core/journey'
import { pavilions } from '@/core/config'
import { FOG } from '@/three/materials/fog'
import { createLights, LIGHTING } from '@/three/lighting/setup'
import { applyOpeningShot, OPENING_SHOT } from '@/three/camera/openingShot'
import { createFlight } from '@/three/camera/flyTo'
import { createHeightField } from '@/three/terrain/mainPeak'
import { createPavilionMarkers } from '@/three/buildings/pavilionMarker'

const NIGHT_FOG = 0x46545c
const NIGHT_AMBIENT = 0.48

export function createSceneRoot(
  container: HTMLElement,
  backend: RenderBackend,
): RendererAdapter {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(FOG.color)
  scene.fog = new THREE.FogExp2(FOG.color, FOG.density)

  const aspect = container.clientWidth / Math.max(1, container.clientHeight)
  const camera = new THREE.PerspectiveCamera(OPENING_SHOT.fov, aspect, 0.1, 800)

  const controls = new OrbitControls(camera, renderer.domElement)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  controls.enableDamping = !reducedMotion
  controls.dampingFactor = 0.06
  controls.minDistance = 30
  controls.maxDistance = 260
  controls.maxPolarAngle = Math.PI * 0.49
  applyOpeningShot(camera, controls)

  const lights = createLights()
  for (const light of lights) scene.add(light)
  const ambient = lights.find((light): light is THREE.AmbientLight =>
    light instanceof THREE.AmbientLight)
  const baseIntensity = lights.map((light) => light.intensity)

  const heightField = createHeightField()
  const peak = heightField.build()
  scene.add(peak)

  const markers = createPavilionMarkers(heightField.heightAt)
  scene.add(markers.group)

  const flight = createFlight(camera, controls, heightField.heightAt, {
    position: OPENING_SHOT.position.clone(),
    target: OPENING_SHOT.target.clone(),
  })
  const unregisterFlight = registerFlightHandler((id) => flight.to(id))

  // ---------------------------------------------------------------- 射线点击
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let downX = 0
  let downY = 0
  let hovered: string | null = null

  function pick(event: PointerEvent): string | null {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(markers.clickables, false)
    const id = hits[0]?.object.userData.pavilionId
    return typeof id === 'string' ? id : null
  }

  function onPointerDown(event: PointerEvent): void {
    downX = event.clientX
    downY = event.clientY
    // 任意时刻可中断飞行：用户一按下就交还镜头控制权
    flight.cancel()
  }

  function onPointerUp(event: PointerEvent): void {
    // 拖拽旋转不算点击，避免转个镜头就误开卷轴
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return
    const id = pick(event)
    if (id !== null) openPavilion(id, '3d')
  }

  function onPointerMove(event: PointerEvent): void {
    const id = pick(event)
    if (id === hovered) return
    hovered = id
    markers.setHighlight(id)
    renderer.domElement.setAttribute('aria-label', id === null
      ? '三维山海，拖拽旋转、滚轮缩放'
      : `点击进入 ${pavilions.find((item) => item.id === id)?.name ?? '殿阁'}`)
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointermove', onPointerMove)

  // ---------------------------------------------------------------- 昼夜（烛龙）
  let lastTime: TimeOfDay = 'day'
  function applyTimeOfDay(): void {
    const now = timeOfDay.value
    if (now === lastTime) return
    lastTime = now
    const night = now === 'night'
    const color = night ? NIGHT_FOG : FOG.color
    ;(scene.background as THREE.Color).setHex(color)
    ;(scene.fog as THREE.FogExp2).color.setHex(color)
    if (ambient !== undefined) ambient.intensity = night ? NIGHT_AMBIENT : LIGHTING.ambientIntensity
    lights.forEach((light, index) => {
      if (!(light instanceof THREE.DirectionalLight)) return
      light.intensity = night ? baseIntensity[index] * 0.55 : baseIntensity[index]
    })
  }

  // ---------------------------------------------------------------- 屏幕锚点
  const worldPoint = new THREE.Vector3()
  let lastAnchorAt = 0
  function projectAnchors(now: number): void {
    if (now - lastAnchorAt < 180) return
    lastAnchorAt = now
    const width = container.clientWidth
    const height = container.clientHeight
    const next: Record<string, ScreenAnchor> = {}
    for (const pavilion of pavilions) {
      const node = markers.nodes.get(pavilion.id)
      if (node === undefined) continue
      node.localToWorld(worldPoint.set(0, 8, 0))
      worldPoint.project(camera)
      const x = (worldPoint.x * 0.5 + 0.5) * width
      const y = (-worldPoint.y * 0.5 + 0.5) * height
      next[pavilion.id] = {
        x,
        y,
        visible: worldPoint.z > -1 && worldPoint.z < 1
          && x > -40 && x < width + 40 && y > -40 && y < height + 40,
      }
    }
    setAnchors(next)
  }

  // ---------------------------------------------------------------- 尺寸 / 循环
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

  function tick(now: number): void {
    frameId = requestAnimationFrame(tick)
    if (flight.flying) flight.update()
    else controls.update()
    applyTimeOfDay()
    projectAnchors(now)
    renderer.render(scene, camera)
  }

  function pause(): void {
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
  }

  function resume(): void {
    if (frameId === null) frameId = requestAnimationFrame(tick)
  }

  function dispose(): void {
    pause()
    unregisterFlight()
    flight.cancel()
    observer.disconnect()
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    controls.dispose()
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
  return { backend, pause, resume, dispose }
}
