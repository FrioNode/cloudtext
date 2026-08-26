import { planDispatchWaves, resolveSendDelaySeconds } from './dispatch-pacing'

describe('planDispatchWaves', () => {
  it('returns a single wave at the base delay when the batch fits the window', () => {
    const plan = planDispatchWaves(50, { waveSize: 50, sendDelaySeconds: 5 })

    expect(plan.waves).toEqual([{ start: 0, end: 50, delayMs: 0 }])
    expect(plan.projectedCompletionMs).toBe(50 * 5000)
  })

  it('splits 2000 messages at 5s into 40 waves spaced 250s apart', () => {
    const plan = planDispatchWaves(2000, { waveSize: 50, sendDelaySeconds: 5 })

    expect(plan.waves).toHaveLength(40)
    expect(plan.waves[0]).toEqual({ start: 0, end: 50, delayMs: 0 })
    expect(plan.waves[1].delayMs).toBe(250_000)
    expect(plan.waves[39]).toEqual({
      start: 1950,
      end: 2000,
      delayMs: 39 * 250_000,
    })
    expect(plan.projectedCompletionMs).toBe(40 * 250_000)
  })

  it('covers every message exactly once, including a short final wave', () => {
    const plan = planDispatchWaves(51, { waveSize: 50, sendDelaySeconds: 5 })

    expect(plan.waves).toEqual([
      { start: 0, end: 50, delayMs: 0 },
      { start: 50, end: 51, delayMs: 250_000 },
    ])
    expect(plan.projectedCompletionMs).toBe(250_000 + 5000)

    const seen = new Set<number>()
    for (const wave of plan.waves) {
      for (let i = wave.start; i < wave.end; i++) {
        expect(seen.has(i)).toBe(false)
        seen.add(i)
      }
    }
    expect(seen.size).toBe(51)
  })

  it('adds a scheduled base delay to every wave instead of replacing it', () => {
    const plan = planDispatchWaves(120, {
      waveSize: 50,
      sendDelaySeconds: 5,
      baseDelayMs: 60_000,
    })

    expect(plan.waves.map((w) => w.delayMs)).toEqual([
      60_000,
      310_000,
      560_000,
    ])
  })

  it.each([undefined, 0, -3, NaN])(
    'falls back to the default 5s send delay for %p',
    (sendDelaySeconds) => {
      const plan = planDispatchWaves(100, { waveSize: 50, sendDelaySeconds })

      expect(plan.sendDelaySeconds).toBe(5)
      expect(plan.waves[1].delayMs).toBe(250_000)
    },
  )

  it('uses the device delay when it is set', () => {
    const plan = planDispatchWaves(100, { waveSize: 50, sendDelaySeconds: 10 })

    expect(plan.waves[1].delayMs).toBe(500_000)
  })

  it('treats a wave size below 1 as 1', () => {
    const plan = planDispatchWaves(3, { waveSize: 0, sendDelaySeconds: 5 })

    expect(plan.waves.map((w) => [w.start, w.end, w.delayMs])).toEqual([
      [0, 1, 0],
      [1, 2, 5000],
      [2, 3, 10_000],
    ])
  })

  it('returns no waves for an empty batch', () => {
    const plan = planDispatchWaves(0, { waveSize: 50, sendDelaySeconds: 5 })

    expect(plan.waves).toEqual([])
    expect(plan.projectedCompletionMs).toBe(0)
  })
})

describe('resolveSendDelaySeconds', () => {
  it('keeps positive values and defaults everything else', () => {
    expect(resolveSendDelaySeconds(7)).toBe(7)
    expect(resolveSendDelaySeconds(0)).toBe(5)
    expect(resolveSendDelaySeconds(undefined)).toBe(5)
    expect(resolveSendDelaySeconds(-1)).toBe(5)
  })
})
