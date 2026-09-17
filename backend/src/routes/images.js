import { Router } from 'express'
import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'
import { asyncRoute } from '../middleware/validate.js'

export const imagesRouter = Router()

let bucket = null
function getBucket() {
  if (!bucket) {
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'dishImages',
    })
  }
  return bucket
}

/**
 * Image bytes held in memory after the first request. The whole menu's photos
 * are a few MB, and streaming each one out of GridFS costs ~300 ms of Atlas
 * round trips. Least-recently-used entries are dropped past the byte budget.
 */
const CACHE_BUDGET_BYTES = 64 * 1024 * 1024
const cache = new Map() // id -> { body, contentType }
let cachedBytes = 0

function remember(id, entry) {
  cache.set(id, entry)
  cachedBytes += entry.body.length
  for (const [key, old] of cache) {
    if (cachedBytes <= CACHE_BUDGET_BYTES) break
    cache.delete(key)
    cachedBytes -= old.body.length
  }
}

async function loadImage(id) {
  const hit = cache.get(id)
  if (hit) {
    cache.delete(id) // re-insert → most recently used
    cache.set(id, hit)
    return hit
  }
  const fileId = new mongoose.Types.ObjectId(id)
  const [file] = await getBucket().find({ _id: fileId }).toArray()
  if (!file) return null

  const chunks = []
  for await (const chunk of getBucket().openDownloadStream(fileId)) {
    chunks.push(chunk)
  }
  const entry = {
    body: Buffer.concat(chunks),
    contentType: file.contentType ?? 'image/webp',
  }
  remember(id, entry)
  return entry
}

/**
 * Serves the dish photos out of GridFS. Cache-forever is safe because
 * refetching a dish's image creates a brand new file id rather than reusing
 * one (backend/scripts/fetch-dish-images.js), so the id doubles as the ETag.
 */
imagesRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid image id.' })
      return
    }

    const etag = `"${id}"`
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.set('ETag', etag)
    if (req.get('if-none-match') === etag) {
      res.status(304).end()
      return
    }

    const image = await loadImage(id)
    if (!image) {
      res.removeHeader('Cache-Control')
      res.removeHeader('ETag')
      res.status(404).json({ error: 'Image not found.' })
      return
    }

    res.set('Content-Type', image.contentType)
    res.send(image.body)
  }),
)
