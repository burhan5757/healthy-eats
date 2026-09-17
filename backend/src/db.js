import mongoose from 'mongoose'
import { config } from './config.js'

let memoryServer = null

/**
 * Connects to MongoDB.
 *
 * With no MONGODB_URI set, an in-memory MongoDB is spun up so the prototype runs
 * with zero setup. Switching to Atlas is a single env var — the Mongoose models
 * and every query are identical either way (CLAUDE.md §10a).
 */
export async function connectDb() {
  let uri = config.mongoUri

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const mem = await MongoMemoryServer.create()
    memoryServer = mem
    uri = mem.getUri('healthy-eats')
    console.log('[db] no MONGODB_URI — started in-memory MongoDB')
  }

  // A remote cluster can be briefly unreachable (a DNS blip on the SRV lookup,
  // Wi-Fi reconnecting). Retry with backoff rather than exiting on the first try.
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { dbName: config.mongoDb })
      break
    } catch (err) {
      if (memoryServer || attempt >= 8) throw err
      const waitMs = Math.min(30_000, 1000 * 2 ** (attempt - 1))
      console.warn(
        `[db] connection failed (${err.code ?? err.message}); retrying in ${waitMs / 1000}s`,
      )
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }
  console.log(
    `[db] connected (${memoryServer ? 'in-memory' : 'remote'}, db=${config.mongoDb})`,
  )
}

export async function disconnectDb() {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
}
