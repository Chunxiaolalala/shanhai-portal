/**
 * 规格书 12 章：埋点只收三件事，用来回答「有没有人来问」。
 * 不引第三方 SDK、不上报任何个人身份信息。
 * 骨架阶段只在开发环境打到 console；接自建统计时替换 transport 即可。
 */

export type TelemetryEvent =
  | 'pavilion_click'
  | 'scroll_dwell'
  | 'cta_click'
  | 'case_open'
  | 'guide_skip'
  /** [CH14] 竖屏巡游：起点、到站、中途退出 / 降级 */
  | 'tour_start'
  | 'tour_arrive'
  | 'tour_dropoff'

type Transport = (event: TelemetryEvent, payload: Record<string, string | number>) => void

const consoleTransport: Transport = (event, payload) => {
  if (import.meta.env.DEV) {
    console.info('[telemetry]', event, payload)
  }
}

let transport: Transport = consoleTransport

export function setTelemetryTransport(next: Transport): void {
  transport = next
}

export function track(event: TelemetryEvent, payload: Record<string, string | number> = {}): void {
  transport(event, { ...payload, ts: Date.now() })
}
