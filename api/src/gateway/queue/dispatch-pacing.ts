import { DEFAULT_SMS_SEND_DELAY_SECONDS } from '../schemas/device.schema'

export const DEFAULT_BULK_DISPATCH_WINDOW = 50
export const DEFAULT_BULK_DISPATCH_MAX_SPREAD_HOURS = 72

export interface DispatchWave {
  // [start, end) index range into the message list
  start: number
  end: number
  delayMs: number
}

export interface DispatchPlan {
  waves: DispatchWave[]
  sendDelaySeconds: number
  // Time from now until the device is expected to finish the last wave
  projectedCompletionMs: number
}

export function resolveSendDelaySeconds(sendDelaySeconds?: number): number {
  const value = Number(sendDelaySeconds)
  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_SMS_SEND_DELAY_SECONDS
}

// Releases messages in waves spaced by the time the device needs to send the
// previous wave, so in-flight pushes never pile up beyond one wave.
export function planDispatchWaves(
  messageCount: number,
  opts: {
    waveSize: number
    sendDelaySeconds?: number
    baseDelayMs?: number
  },
): DispatchPlan {
  const waveSize = Math.max(1, Math.floor(Number(opts.waveSize) || 1))
  const sendDelaySeconds = resolveSendDelaySeconds(opts.sendDelaySeconds)
  const baseDelayMs = Math.max(0, Number(opts.baseDelayMs) || 0)
  const waveSpacingMs = waveSize * sendDelaySeconds * 1000

  const waves: DispatchWave[] = []
  for (let start = 0, i = 0; start < messageCount; start += waveSize, i++) {
    waves.push({
      start,
      end: Math.min(start + waveSize, messageCount),
      delayMs: baseDelayMs + i * waveSpacingMs,
    })
  }

  const last = waves[waves.length - 1]
  const projectedCompletionMs = last
    ? last.delayMs + (last.end - last.start) * sendDelaySeconds * 1000
    : baseDelayMs

  return { waves, sendDelaySeconds, projectedCompletionMs }
}
