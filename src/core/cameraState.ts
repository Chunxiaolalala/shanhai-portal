/**
 * 规格书 05 章镜头状态机：OVERVIEW → FOCUS → APPROACH → TRANSITION → SCROLL → BACK
 * 飞行走 CatmullRom 曲线、1.2–1.8s 缓动，任意时刻可中断；
 * ESC / 返回回到「来路」而不是回到起点，所以这里单独记 previous。
 */
import type { CameraState } from '@/types/contract'

const ALLOWED: Record<CameraState, readonly CameraState[]> = {
  OVERVIEW: ['FOCUS'],
  FOCUS: ['OVERVIEW', 'APPROACH'],
  APPROACH: ['FOCUS', 'TRANSITION', 'OVERVIEW'],
  TRANSITION: ['SCROLL', 'FOCUS'],
  SCROLL: ['BACK', 'FOCUS'],
  BACK: ['OVERVIEW', 'FOCUS'],
}

type Listener = (state: CameraState, previous: CameraState) => void

export class CameraStateMachine {
  private current: CameraState = 'OVERVIEW'
  private previous: CameraState = 'OVERVIEW'
  private listeners = new Set<Listener>()

  get state(): CameraState {
    return this.current
  }

  get cameFrom(): CameraState {
    return this.previous
  }

  can(next: CameraState): boolean {
    return ALLOWED[this.current].includes(next)
  }

  go(next: CameraState): boolean {
    if (next === this.current) return true
    if (!this.can(next)) return false
    this.previous = this.current
    this.current = next
    for (const listener of this.listeners) listener(next, this.previous)
    return true
  }

  /**
   * 回到来路。调用方明确给出目标（OVERVIEW 或上一座殿的 FOCUS），
   * 这里不再拿 previous 猜——previous 在连续 go() 后会被覆写，猜必错。
   */
  back(target: CameraState = 'OVERVIEW'): CameraState {
    this.go('BACK')
    this.go(target)
    return this.current
  }

  /** 飞行中途被 ESC / 新点击打断时，直接归位；不经过中间态以免被 ALLOWED 拒绝 */
  reset(): void {
    this.previous = this.current
    this.current = 'OVERVIEW'
    for (const listener of this.listeners) listener('OVERVIEW', this.previous)
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
