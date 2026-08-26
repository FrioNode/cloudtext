import { HttpException } from '@nestjs/common'
import { Types } from 'mongoose'
import { encodeCursor, decodeCursor } from './cursor'
import { toDirection, toStoredType } from './message-direction'
import { parseMessageQuery } from './message-query'
import { SMSType } from './sms-type.enum'

// HttpException with an { error } body keeps a generic .message, so pattern
// assertions must look at the response payload, not the message.
function expect400(fn: () => unknown, pattern: RegExp) {
  let caught: unknown
  try {
    fn()
  } catch (e) {
    caught = e
  }
  expect(caught).toBeInstanceOf(HttpException)
  const response = (caught as HttpException).getResponse() as { error?: string }
  expect((caught as HttpException).getStatus()).toBe(400)
  expect(response.error).toMatch(pattern)
}

describe('message-direction', () => {
  it('round-trips both directions against the stored enum', () => {
    expect(toStoredType('sent')).toBe(SMSType.SENT)
    expect(toStoredType('received')).toBe(SMSType.RECEIVED)
    expect(toDirection(SMSType.SENT)).toBe('sent')
    expect(toDirection(SMSType.RECEIVED)).toBe('received')
    expect(toDirection('garbage')).toBeUndefined()
  })
})

describe('cursor', () => {
  it('round-trips with millisecond-exact createdAt and same _id', () => {
    const createdAt = new Date('2026-08-09T12:34:56.789Z')
    const id = new Types.ObjectId()
    const decoded = decodeCursor(encodeCursor(createdAt, id))
    expect(decoded.createdAt.getTime()).toBe(createdAt.getTime())
    expect(decoded.id.equals(id)).toBe(true)
  })

  it.each([
    ['not base64 json', 'zzzz'],
    ['valid base64, wrong shape', Buffer.from('{"x":1}').toString('base64url')],
    ['bad ObjectId', Buffer.from('{"t":"2026-01-01T00:00:00Z","i":"nope"}').toString('base64url')],
    ['bad date', Buffer.from('{"t":"not-a-date","i":"661b93a7f0ba4a140b120a50"}').toString('base64url')],
    ['empty string', ''],
    ['oversized', 'a'.repeat(300)],
  ])('rejects %s with a 400', (_label, raw) => {
    expect(() => decodeCursor(raw)).toThrow(HttpException)
  })
})

describe('parseMessageQuery', () => {
  const idA = new Types.ObjectId().toHexString()
  const idB = new Types.ObjectId().toHexString()

  describe('deviceIds', () => {
    it('accepts comma-separated and repeated forms identically', () => {
      const comma = parseMessageQuery({ deviceIds: `${idA},${idB}` })
      const repeated = parseMessageQuery({ deviceIds: [idA, idB] })
      expect(comma.deviceIds?.map(String)).toEqual([idA, idB])
      expect(repeated.deviceIds?.map(String)).toEqual([idA, idB])
    })

    it('dedupes and trims', () => {
      const parsed = parseMessageQuery({ deviceIds: ` ${idA} , ${idA},${idB}` })
      expect(parsed.deviceIds?.map(String)).toEqual([idA, idB])
    })

    it('treats empty as absent, not match-nothing', () => {
      expect(parseMessageQuery({ deviceIds: '' }).deviceIds).toBeUndefined()
      expect(parseMessageQuery({ deviceIds: ',,' }).deviceIds).toBeUndefined()
      expect(parseMessageQuery({}).deviceIds).toBeUndefined()
    })

    it('400s on a malformed id, naming it', () => {
      expect400(() => parseMessageQuery({ deviceIds: `${idA},banana` }), /banana/)
    })

    it('400s above 100 ids', () => {
      const many = Array.from({ length: 101 }, () => new Types.ObjectId().toHexString()).join(',')
      expect400(() => parseMessageQuery({ deviceIds: many }), /Maximum is 100/)
    })
  })

  describe('smsBatchId', () => {
    it('parses a valid id and treats empty as absent', () => {
      const batchId = new Types.ObjectId().toHexString()
      expect(parseMessageQuery({ smsBatchId: batchId }).smsBatchId?.toString()).toBe(batchId)
      expect(parseMessageQuery({ smsBatchId: '' }).smsBatchId).toBeUndefined()
      expect(parseMessageQuery({}).smsBatchId).toBeUndefined()
    })

    it('400s on a malformed id, naming it', () => {
      expect400(() => parseMessageQuery({ smsBatchId: 'not-an-id' }), /not-an-id/)
    })

    it('400s (not 500s) on a repeated key', () => {
      const batchId = new Types.ObjectId().toHexString()
      expect(() => parseMessageQuery({ smsBatchId: [batchId, batchId] })).toThrow(HttpException)
    })
  })

  describe('direction and the deprecated type alias', () => {
    it('is case-insensitive', () => {
      for (const v of ['sent', 'SENT', 'Sent']) {
        expect(parseMessageQuery({ direction: v }).direction).toBe('sent')
      }
    })

    it('treats all, empty, and absent as no filter', () => {
      expect(parseMessageQuery({ direction: 'all' }).direction).toBeUndefined()
      expect(parseMessageQuery({ direction: '' }).direction).toBeUndefined()
      expect(parseMessageQuery({}).direction).toBeUndefined()
    })

    it('400s on unknown values instead of silently not filtering', () => {
      expect400(() => parseMessageQuery({ direction: 'inbound' }), /Valid values/)
    })

    it('honors the deprecated type alias', () => {
      expect(parseMessageQuery({ type: 'received' }).direction).toBe('received')
    })

    it('accepts agreeing direction+type, 400s on conflict', () => {
      expect(parseMessageQuery({ direction: 'sent', type: 'sent' }).direction).toBe('sent')
      expect400(() => parseMessageQuery({ direction: 'sent', type: 'received' }), /conflicts/)
    })

    it('400s (not 500s) on repeated keys', () => {
      expect(() => parseMessageQuery({ direction: ['sent', 'received'] })).toThrow(HttpException)
      expect(() => parseMessageQuery({ search: ['a', 'b'] })).toThrow(HttpException)
    })
  })

  describe('from/to timezone handling', () => {
    it('accepts explicit UTC and offset forms as the same instant', () => {
      const z = parseMessageQuery({ from: '2026-08-01T00:00:00Z' })
      const offset = parseMessageQuery({ from: '2026-08-01T03:00:00+03:00' })
      expect(z.from!.getTime()).toBe(offset.from!.getTime())
    })

    it('reads date-only as UTC midnight regardless of process TZ', () => {
      const parsed = parseMessageQuery({ from: '2026-08-01' })
      expect(parsed.from!.toISOString()).toBe('2026-08-01T00:00:00.000Z')
    })

    it('rejects naive datetimes with a 400', () => {
      expect400(() => parseMessageQuery({ from: '2026-08-01T00:00:00' }), /timezone/)
      expect400(() => parseMessageQuery({ to: '2026-08-01 10:30' }), /timezone/)
    })

    it('rejects garbage dates', () => {
      expect(() => parseMessageQuery({ from: 'yesterday' })).toThrow(HttpException)
    })

    it('400s when from is not earlier than to', () => {
      expect400(() => parseMessageQuery({ from: '2026-08-02', to: '2026-08-01' }), /earlier/)
      expect400(() => parseMessageQuery({ from: '2026-08-01', to: '2026-08-01' }), /earlier/)
    })
  })

  describe('order, status, cursor', () => {
    it('defaults to desc and accepts asc', () => {
      expect(parseMessageQuery({}).order).toBe('desc')
      expect(parseMessageQuery({ order: 'ASC' }).order).toBe('asc')
      expect400(() => parseMessageQuery({ order: 'up' }), /Valid values/)
    })

    it('validates status against the enum', () => {
      expect(parseMessageQuery({ status: 'failed' }).status).toBe('failed')
      expect400(() => parseMessageQuery({ status: 'exploded' }), /Valid values/)
    })

    it('decodes a valid cursor and rejects cursor+page', () => {
      const raw = encodeCursor(new Date(), new Types.ObjectId())
      expect(parseMessageQuery({ cursor: raw }).cursor).toBeDefined()
      expect400(() => parseMessageQuery({ cursor: raw, page: '2' }), /mutually exclusive/)
    })
  })
})
