import { describe, expect, it } from 'vitest'
import { queryKeys } from './query-keys'

describe('queryKeys.webhookNotifications', () => {
  it('includes start and end so date filter changes produce a new cache entry', () => {
    const base = {
      eventType: '',
      status: '',
      deviceId: '',
      webhookSubscriptionId: '',
      page: 1,
      limit: 10,
    }

    const withoutDates = queryKeys.webhookNotifications(base)
    const withStart = queryKeys.webhookNotifications({
      ...base,
      start: '2026-08-01T00:00:00.000Z',
    })
    const withRange = queryKeys.webhookNotifications({
      ...base,
      start: '2026-08-01T00:00:00.000Z',
      end: '2026-08-02T00:00:00.000Z',
    })
    const differentStart = queryKeys.webhookNotifications({
      ...base,
      start: '2026-07-01T00:00:00.000Z',
      end: '2026-08-02T00:00:00.000Z',
    })

    expect(withoutDates).not.toEqual(withStart)
    expect(withStart).not.toEqual(withRange)
    expect(withRange).not.toEqual(differentStart)

    // Guard against dropping date params from the key shape again.
    expect(withRange).toEqual([
      'webhook-notification',
      '',
      1,
      10,
      '',
      '',
      '',
      '2026-08-01T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
    ])
  })
})
