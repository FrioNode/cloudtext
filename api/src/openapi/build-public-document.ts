import { NestFactory } from '@nestjs/core'
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from '../app.module'
import {
  API_KEY_SECURITY_SCHEME,
  API_TAGS,
  applyApiConventions,
  buildSwaggerConfig,
} from './swagger-config'
import { PUBLIC_OPERATION_KEYS, toOperationKey } from './public-operations'

const PUBLIC_TITLE = 'textbee API'
const PUBLIC_DESCRIPTION =
  'Send and receive SMS through an Android phone you own. Authenticate every request with an API key from your textbee dashboard, sent as the x-api-key header.'
const PUBLIC_SERVER_URL = 'https://cloudtextapi.frionode.online'
const PUBLIC_TAG_NAMES = ['gateway', 'webhooks']

const HTTP_METHODS = ['get', 'post', 'patch', 'put', 'delete'] as const

/**
 * Generates the spec published at cloudtext.frionode.online/openapi.json.
 *
 * Preview mode builds the module graph and reads the controller decorators
 * without instantiating a single provider, so this runs with no Mongo, no
 * Redis, and no env file. The document is filtered to the public allowlist
 * afterwards; the runtime Swagger UI keeps serving everything.
 */
export async function createPublicOpenApiDocument(): Promise<OpenAPIObject> {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
    abortOnError: false,
  })

  try {
    applyApiConventions(app)

    const document = SwaggerModule.createDocument(
      app,
      buildSwaggerConfig({
        title: PUBLIC_TITLE,
        description: PUBLIC_DESCRIPTION,
        servers: [PUBLIC_SERVER_URL],
      }),
    )

    keepOnlyPublicOperations(document)
    assertNoDeprecatedOperations(document)
    keepOnlyApiKeySecurity(document)
    keepOnlyPublicTags(document)
    pruneUnreferencedSchemas(document)

    return document
  } finally {
    await app.close()
  }
}

export function serializeDocument(document: OpenAPIObject): string {
  return `${JSON.stringify(document, null, 2)}\n`
}

function keepOnlyPublicOperations(document: OpenAPIObject): void {
  const wanted = new Set(PUBLIC_OPERATION_KEYS)
  const found = new Set<string>()

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (!pathItem[method]) continue

      const key = toOperationKey(method, path)
      if (wanted.has(key)) {
        found.add(key)
      } else {
        delete pathItem[method]
      }
    }

    if (!HTTP_METHODS.some((method) => pathItem[method])) {
      delete document.paths[path]
    }
  }

  const missing = PUBLIC_OPERATION_KEYS.filter((key) => !found.has(key))
  if (missing.length > 0) {
    throw new Error(
      `Allowlisted operations are not in the generated document, so a route was renamed or removed: ${missing.join(
        ', ',
      )}. Fix the route or update src/openapi/public-operations.ts.`,
    )
  }
}

function assertNoDeprecatedOperations(document: OpenAPIObject): void {
  const deprecated = eachOperation(document)
    .filter(([, operation]) => operation.deprecated === true)
    .map(([key]) => key)

  if (deprecated.length > 0) {
    throw new Error(
      `The public spec must not promote deprecated operations: ${deprecated.join(
        ', ',
      )}.`,
    )
  }
}

/**
 * Bearer auth is the dashboard session flow, which no public consumer can
 * obtain. A single scheme also imports cleanly into GPT Actions and Postman.
 */
function keepOnlyApiKeySecurity(document: OpenAPIObject): void {
  const schemes = document.components?.securitySchemes ?? {}
  for (const name of Object.keys(schemes)) {
    if (name !== API_KEY_SECURITY_SCHEME) delete schemes[name]
  }

  for (const [, operation] of eachOperation(document)) {
    if (!operation.security) continue
    operation.security = operation.security.filter((requirement) =>
      Object.keys(requirement).includes(API_KEY_SECURITY_SCHEME),
    )
  }
}

function keepOnlyPublicTags(document: OpenAPIObject): void {
  document.tags = API_TAGS.filter((tag) =>
    PUBLIC_TAG_NAMES.includes(tag.name),
  ).map((tag) => ({ ...tag }))
}

/** Drops schemas only the removed operations referenced. */
function pruneUnreferencedSchemas(document: OpenAPIObject): void {
  const schemas = document.components?.schemas
  if (!schemas) return

  const reachable = new Set<string>()
  const queue = collectSchemaRefs(document.paths)

  while (queue.length > 0) {
    const name = queue.pop()
    if (!name || reachable.has(name) || !schemas[name]) continue
    reachable.add(name)
    queue.push(...collectSchemaRefs(schemas[name]))
  }

  for (const name of Object.keys(schemas)) {
    if (!reachable.has(name)) delete schemas[name]
  }
}

function collectSchemaRefs(value: unknown): string[] {
  const refs: string[] = []

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') return

    for (const [key, child] of Object.entries(node)) {
      if (key === '$ref' && typeof child === 'string') {
        const name = child.split('/').pop()
        if (name) refs.push(name)
        continue
      }
      walk(child)
    }
  }

  walk(value)
  return refs
}

function eachOperation(document: OpenAPIObject): Array<[string, any]> {
  const entries: Array<[string, any]> = []

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (operation) entries.push([toOperationKey(method, path), operation])
    }
  }

  return entries
}
