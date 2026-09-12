import mongoose from 'mongoose'
import { config } from './config.js'

let memoryServer                                          = null

/**
 * Connects to MongoDB.
 *
 * With no MONGODB_URI set, an in-memory MongoDB is spun up so the prototype runs
 * with zero setup. Switching to Atlas is a single env var — the Mongoose models
 * and every query are identical either way (CLAUDE.md §10a).
 */
export async function connectDb()                {
  let uri = config.mongoUri

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const mem = await MongoMemoryServer.create()
    memoryServer = mem
    uri = mem.getUri('healthy-eats')
    console.log('[db] no MONGODB_URI — started in-memory MongoDB')
  }

  await mongoose.connect(uri)
  console.log(`[db] connected (${memoryServer ? 'in-memory' : 'remote'})`)
}

export async function disconnectDb()                {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
}
