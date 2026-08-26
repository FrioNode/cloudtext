import { SMSType } from './sms-type.enum'

// The single place that knows the API speaks lowercase 'sent'/'received'
// while the stored SMS.type field holds uppercase SMSType values.
export type MessageDirection = 'sent' | 'received'

export function toStoredType(direction: MessageDirection): SMSType {
  return direction === 'sent' ? SMSType.SENT : SMSType.RECEIVED
}

export function toDirection(storedType: string): MessageDirection | undefined {
  if (storedType === SMSType.SENT) return 'sent'
  if (storedType === SMSType.RECEIVED) return 'received'
  return undefined
}

// Accepts user input case-insensitively; 'all', '', and undefined mean no
// filter; anything else is invalid and must 400 rather than silently no-op.
export function parseDirectionInput(
  value: unknown,
): { direction?: MessageDirection } | { error: string } {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'string') {
    return { error: 'direction must be a single string value' }
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === '' || normalized === 'all') return {}
  if (normalized === 'sent' || normalized === 'received') {
    return { direction: normalized }
  }
  return { error: `Invalid direction '${value}'. Valid values: all, sent, received` }
}
