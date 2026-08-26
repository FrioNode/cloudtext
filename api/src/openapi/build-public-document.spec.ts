import { readFileSync } from 'fs'
import { join } from 'path'
import { OpenAPIObject } from '@nestjs/swagger'
import {
  createPublicOpenApiDocument,
  serializeDocument,
} from './build-public-document'
import { PUBLIC_OPERATION_KEYS, toOperationKey } from './public-operations'
import { API_KEY_SECURITY_SCHEME } from './swagger-config'
import { SMSType } from '../gateway/sms-type.enum'

const COMMITTED_SPEC_PATH = join(__dirname, '..', '..', 'openapi.json')
const REGENERATE_HINT = 'Run `pnpm run export:openapi` and commit openapi.json.'

// Preview mode means no Mongo, no Redis, and no env file, but building the
// module graph still takes longer than the default jest timeout.
jest.setTimeout(60_000)

describe('public openapi document', () => {
  let document: OpenAPIObject
  let operations: Array<[string, any]>

  beforeAll(async () => {
    document = await createPublicOpenApiDocument()
    operations = Object.entries(document.paths).flatMap(([path, pathItem]) =>
      Object.entries(pathItem).map(
        ([method, operation]) =>
          [toOperationKey(method, path), operation] as [string, any],
      ),
    )
  })

  it('exposes exactly the allowlisted operations', () => {
    expect(operations.map(([key]) => key).sort()).toEqual(
      [...PUBLIC_OPERATION_KEYS].sort(),
    )
  })

  it('promotes no deprecated operation', () => {
    const deprecated = operations
      .filter(([, operation]) => operation.deprecated)
      .map(([key]) => key)

    expect(deprecated).toEqual([])
  })

  it('offers the api key as the only way to authenticate', () => {
    expect(Object.keys(document.components.securitySchemes)).toEqual([
      API_KEY_SECURITY_SCHEME,
    ])
  })

  it('gives every operation a summary', () => {
    const unsummarized = operations
      .filter(([, operation]) => !operation.summary?.trim())
      .map(([key]) => key)

    expect(unsummarized).toEqual([])
  })

  it('gives every request body a schema with fields', () => {
    const schemas = document.components.schemas ?? {}

    const empty = operations
      .filter(([, operation]) => operation.requestBody)
      .filter(([, operation]) => {
        const schema =
          operation.requestBody.content?.['application/json']?.schema ?? {}
        const name = schema.$ref?.split('/').pop()
        const resolved = name ? schemas[name] : schema
        return Object.keys(resolved?.['properties'] ?? {}).length === 0
      })
      .map(([key]) => key)

    expect(empty).toEqual([])
  })

  // The wire format is uppercase and the query filter that selects it is
  // lowercase, so a hand-written enum here drifts silently and teaches every
  // consumer a comparison that never matches.
  it('documents the message direction with the values the API really sends', () => {
    expect(
      document.components.schemas['RetrieveSMSDTO']['properties'].type.enum,
    ).toEqual(Object.values(SMSType))
  })

  // A mismatch means a decorator changed without the spec being regenerated.
  it(`matches the committed openapi.json. ${REGENERATE_HINT}`, () => {
    expect(serializeDocument(document)).toEqual(
      readFileSync(COMMITTED_SPEC_PATH, 'utf8'),
    )
  })
})
