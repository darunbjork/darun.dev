import { buildApp } from "../src/app.js"
import { createIngestService } from "../src/modules/rag/ingest.service.js"

async function main(): Promise<void> {
  const app = await buildApp()
  await app.ready()

  try {
    const ingest = createIngestService(app)
    const results = await ingest.ingestAll()
    console.log(JSON.stringify(results, null, 2))
  } finally {
    await app.close()
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })