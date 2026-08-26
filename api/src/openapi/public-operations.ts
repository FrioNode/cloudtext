export type HttpMethod = 'get' | 'post' | 'patch' | 'delete' | 'put'

export interface PublicOperation {
  method: HttpMethod
  /** Controller path as written in the code, without the /api/v1 prefix. */
  path: string
}

/**
 * The only operations the published spec exposes. An allowlist rather than a
 * tag filter, so a new endpoint stays private until someone adds it here.
 *
 * Deliberately absent: the device app contract (pairing, heartbeat,
 * receive-sms, sms-status), every deprecated alias, and everything the
 * dashboard owns (auth, billing, support, device writes).
 */
export const PUBLIC_OPERATIONS: readonly PublicOperation[] = [
  { method: 'post', path: '/gateway/send-sms' },
  { method: 'post', path: '/gateway/send-bulk-sms' },
  { method: 'get', path: '/gateway/devices' },
  { method: 'get', path: '/gateway/devices/:id' },
  { method: 'get', path: '/gateway/messages' },
  { method: 'get', path: '/gateway/devices/:id/sms/:smsId' },
  { method: 'get', path: '/gateway/devices/:id/sms-batch/:smsBatchId' },
  { method: 'get', path: '/gateway/stats' },
  { method: 'get', path: '/webhooks' },
  { method: 'post', path: '/webhooks' },
  { method: 'get', path: '/webhooks/:webhookId' },
  { method: 'patch', path: '/webhooks/:webhookId' },
  { method: 'delete', path: '/webhooks/:webhookId' },
  { method: 'get', path: '/webhooks/notifications' },
]

export const API_PATH_PREFIX = '/api/v1'

/** Turns `/gateway/devices/:id` into the `/api/v1/gateway/devices/{id}` the document uses. */
export function toDocumentPath(path: string): string {
  const withBraces = path.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
  return `${API_PATH_PREFIX}${withBraces}`
}

export function toOperationKey(method: string, documentPath: string): string {
  return `${method.toLowerCase()} ${documentPath}`
}

export const PUBLIC_OPERATION_KEYS: readonly string[] = PUBLIC_OPERATIONS.map(
  (operation) => toOperationKey(operation.method, toDocumentPath(operation.path)),
)
