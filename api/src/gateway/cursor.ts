import { HttpException, HttpStatus } from '@nestjs/common'
import { Types } from 'mongoose'

// Keyset pagination cursor: position after the last returned message.
// base64url of { t: createdAt ISO, i: _id hex }. Opaque to clients.
export interface MessageCursor {
  createdAt: Date
  id: Types.ObjectId
}

export function encodeCursor(createdAt: Date, id: Types.ObjectId): string {
  const payload = JSON.stringify({ t: createdAt.toISOString(), i: id.toHexString() })
  return Buffer.from(payload, 'utf8').toString('base64url')
}

export function decodeCursor(raw: unknown): MessageCursor {
  const fail = (): never => {
    throw new HttpException(
      { error: 'Invalid cursor. Pass a nextCursor value from a previous response.' },
      HttpStatus.BAD_REQUEST,
    )
  }
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) fail()
  let parsed: any
  try {
    parsed = JSON.parse(Buffer.from(raw as string, 'base64url').toString('utf8'))
  } catch {
    fail()
  }
  if (typeof parsed?.t !== 'string' || typeof parsed?.i !== 'string') fail()
  const createdAt = new Date(parsed.t)
  if (Number.isNaN(createdAt.getTime())) fail()
  if (!Types.ObjectId.isValid(parsed.i)) fail()
  return { createdAt, id: new Types.ObjectId(parsed.i) }
}
