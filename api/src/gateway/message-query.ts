import { HttpException, HttpStatus } from '@nestjs/common'
import { Types } from 'mongoose'
import {
  MessageDirection,
  parseDirectionInput,
} from './message-direction'
import { decodeCursor, MessageCursor } from './cursor'

export const MESSAGE_STATUSES = [
  'pending',
  'dispatched',
  'sent',
  'delivered',
  'failed',
  'unknown',
  'received',
] as const
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

const MAX_DEVICE_IDS = 100

// Date-only resolves to UTC midnight; a datetime must carry Z or an explicit
// offset. A naive datetime parses as server-local time, which shifts silently
// if the process TZ ever changes, so it is rejected outright.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const DATETIME_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})$/i

export interface ParsedMessageQuery {
  deviceIds?: Types.ObjectId[]
  smsBatchId?: Types.ObjectId
  direction?: MessageDirection
  status?: MessageStatus
  search?: string
  from?: Date
  to?: Date
  order: 'desc' | 'asc'
  cursor?: MessageCursor
}

function badRequest(error: string): never {
  throw new HttpException({ error }, HttpStatus.BAD_REQUEST)
}

// Repeated keys arrive from qs as arrays; a single param must not be one.
function asSingleString(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (Array.isArray(value)) {
    badRequest(`Pass ${name} once, not multiple times`)
  }
  if (typeof value !== 'string') badRequest(`${name} must be a string`)
  return value as string
}

function parseDeviceIds(value: unknown): Types.ObjectId[] | undefined {
  if (value === undefined || value === null) return undefined
  // Accept both ?deviceIds=a,b and repeated ?deviceIds=a&deviceIds=b
  const parts: string[] = (Array.isArray(value) ? value : [value])
    .flatMap((v) => {
      if (typeof v !== 'string') badRequest('deviceIds must be a comma-separated list of device ids')
      return (v as string).split(',')
    })
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const unique = [...new Set(parts)]
  if (unique.length === 0) return undefined
  if (unique.length > MAX_DEVICE_IDS) {
    badRequest(`Too many deviceIds: ${unique.length}. Maximum is ${MAX_DEVICE_IDS}`)
  }
  return unique.map((id) => {
    if (!Types.ObjectId.isValid(id)) badRequest(`Invalid device id '${id}'`)
    return new Types.ObjectId(id)
  })
}

function parseBoundary(value: unknown, name: 'from' | 'to'): Date | undefined {
  const raw = asSingleString(value, name)
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  if (!DATE_ONLY.test(trimmed) && !DATETIME_WITH_OFFSET.test(trimmed)) {
    badRequest(
      `Invalid ${name} '${raw}'. Use ISO-8601 with an explicit timezone ` +
        `(2026-08-01T00:00:00Z or 2026-08-01T00:00:00+03:00) or a date (2026-08-01, read as UTC midnight)`,
    )
  }
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) badRequest(`Invalid ${name} '${raw}'`)
  return date
}

function parseDirection(query: Record<string, unknown>): MessageDirection | undefined {
  const directionRaw = asSingleString(query.direction, 'direction')
  const typeRaw = asSingleString(query.type, 'type')

  const direction = parseDirectionInput(directionRaw)
  if ('error' in direction) badRequest(direction.error)
  const type = parseDirectionInput(typeRaw)
  if ('error' in type) {
    badRequest(`Invalid type '${typeRaw}'. Valid values: all, sent, received (type is deprecated, prefer direction)`)
  }

  if (direction.direction && type.direction && direction.direction !== type.direction) {
    badRequest(
      `direction=${direction.direction} conflicts with type=${type.direction}. ` +
        `Drop the deprecated type parameter`,
    )
  }
  return direction.direction ?? type.direction
}

export function parseMessageQuery(query: Record<string, unknown>): ParsedMessageQuery {
  const deviceIds = parseDeviceIds(query.deviceIds)
  const direction = parseDirection(query)

  const smsBatchIdRaw = asSingleString(query.smsBatchId, 'smsBatchId')
  let smsBatchId: Types.ObjectId | undefined
  if (smsBatchIdRaw !== undefined && smsBatchIdRaw.trim() !== '') {
    const trimmed = smsBatchIdRaw.trim()
    if (!Types.ObjectId.isValid(trimmed)) {
      badRequest(`Invalid smsBatchId '${smsBatchIdRaw}'`)
    }
    smsBatchId = new Types.ObjectId(trimmed)
  }

  const statusRaw = asSingleString(query.status, 'status')
  let status: MessageStatus | undefined
  if (statusRaw !== undefined && statusRaw.trim() !== '') {
    const normalized = statusRaw.trim().toLowerCase()
    if (!MESSAGE_STATUSES.includes(normalized as MessageStatus)) {
      badRequest(`Invalid status '${statusRaw}'. Valid values: ${MESSAGE_STATUSES.join(', ')}`)
    }
    status = normalized as MessageStatus
  }

  const searchRaw = asSingleString(query.search, 'search')
  const search = searchRaw?.trim() || undefined

  const from = parseBoundary(query.from, 'from')
  const to = parseBoundary(query.to, 'to')
  if (from && to && from.getTime() >= to.getTime()) {
    badRequest('from must be earlier than to (to is exclusive)')
  }

  const orderRaw = asSingleString(query.order, 'order')
  let order: 'desc' | 'asc' = 'desc'
  if (orderRaw !== undefined && orderRaw.trim() !== '') {
    const normalized = orderRaw.trim().toLowerCase()
    if (normalized !== 'desc' && normalized !== 'asc') {
      badRequest(`Invalid order '${orderRaw}'. Valid values: desc, asc`)
    }
    order = normalized
  }

  const cursorRaw = asSingleString(query.cursor, 'cursor')
  let cursor: MessageCursor | undefined
  if (cursorRaw !== undefined && cursorRaw.trim() !== '') {
    if (query.page !== undefined) {
      badRequest('cursor and page are mutually exclusive. Follow nextCursor without a page parameter')
    }
    cursor = decodeCursor(cursorRaw.trim())
  }

  return { deviceIds, smsBatchId, direction, status, search, from, to, order, cursor }
}
