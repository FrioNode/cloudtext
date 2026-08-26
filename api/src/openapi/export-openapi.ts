import { writeFileSync } from 'fs'
import { join } from 'path'
import {
  createPublicOpenApiDocument,
  serializeDocument,
} from './build-public-document'

// api/openapi.json, whether this runs from src via ts-node or from dist.
const OUTPUT_PATH = join(__dirname, '..', '..', 'openapi.json')

async function exportOpenApi(): Promise<void> {
  const document = await createPublicOpenApiDocument()
  writeFileSync(OUTPUT_PATH, serializeDocument(document))

  const operationCount = Object.values(document.paths).reduce(
    (total, pathItem) => total + Object.keys(pathItem).length,
    0,
  )
  console.log(`Wrote ${operationCount} operations to ${OUTPUT_PATH}`)
}

exportOpenApi()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
