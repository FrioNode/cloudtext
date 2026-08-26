import { resolveBatchStatus } from './sms-queue.processor'

describe('resolveBatchStatus', () => {
  it('keeps a paced batch in processing while waves are still queued', () => {
    expect(
      resolveBatchStatus({ recipientCount: 2000, successCount: 50, failureCount: 0 }),
    ).toBe('processing')
  })

  it('stays in processing while draining even if some pushes failed', () => {
    expect(
      resolveBatchStatus({ recipientCount: 2000, successCount: 45, failureCount: 5 }),
    ).toBe('processing')
  })

  it('completes once every recipient was pushed without failures', () => {
    expect(
      resolveBatchStatus({ recipientCount: 100, successCount: 100, failureCount: 0 }),
    ).toBe('completed')
  })

  it('fails when every push failed', () => {
    expect(
      resolveBatchStatus({ recipientCount: 100, successCount: 0, failureCount: 100 }),
    ).toBe('failed')
  })

  it('is partial_success when finished with mixed results', () => {
    expect(
      resolveBatchStatus({ recipientCount: 100, successCount: 90, failureCount: 10 }),
    ).toBe('partial_success')
  })
})
