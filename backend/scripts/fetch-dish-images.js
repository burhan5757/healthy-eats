#!/usr/bin/env node
/**
 * Fetches a free, category-matched stock photo for every dish that doesn't
 * have an image yet, and stores it in GridFS (bucket `dishImages`) in the
 * same Atlas database as everything else — no shared disk needed, which
 * matters because frontend/backend are hosted as separate services
 * (CLAUDE.md §2b).
 *
 * Uses the Pexels API — free, no billing account, generous rate limit
 * (200 req/hour). These are real photos of similar dishes, not photos of
 * THIS kitchen's actual plates (dish.imageSource = 'stock', not 'photo').
 * Runs offline, never at request time. Real kitchen photography
 * (imageSource: 'photo') is NEVER overwritten, with or without --force.
 *
 * Get a free key at https://www.pexels.com/api/ and set PEXELS_API_KEY in
 * backend/.env.
 *
 * Usage:
 *   npm run images:fetch -- --yes                   # every dish with no image yet
 *   npm run images:fetch -- --only slug1,slug2 --yes
 *   npm run images:fetch -- --force --yes            # refetch every stock/none dish
 *   npm run images:fetch                             # dry run — prints what would happen
 */
import 'dotenv/config'
import path from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'
import sharp from 'sharp'
import { connectDb, disconnectDb } from '../src/db.js'
import { Dish } from '../src/models/Dish.js'
import { buildDishImageQuery } from './lib/dish-image-query.js'

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search'
const RESULTS_PER_QUERY = 8
const CONCURRENCY = 2
const MAX_SEARCH_RETRIES = 4

function parseArgs(argv) {
  const args = { only: null, force: false, yes: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--force') args.force = true
    else if (a === '--yes') args.yes = true
    else if (a === '--only') {
      args.only = (argv[++i] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (a.startsWith('--only=')) {
      args.only = a
        .slice('--only='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return args
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// One Pexels search per distinct query, cached; results are handed out
// round-robin so dishes sharing a query (e.g. every plain salad) don't all
// get the exact same photo.
const searchCache = new Map()
const nextIndex = new Map()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function search(query, attempt = 1) {
  if (!searchCache.has(query)) {
    // No orientation filter — it shrinks the candidate pool sharply and
    // measurably worsens relevance (e.g. "indian flatbread" degrades to
    // random pizza photos). sharp() already crops to a square afterward.
    const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=${RESULTS_PER_QUERY}`
    const res = await fetch(url, {
      headers: { Authorization: process.env.PEXELS_API_KEY },
    })
    if (res.status === 429 && attempt <= MAX_SEARCH_RETRIES) {
      await sleep(2 ** attempt * 1000)
      return search(query, attempt + 1)
    }
    if (!res.ok) {
      throw new Error(`Pexels search failed (${res.status}) for "${query}"`)
    }
    const body = await res.json()
    searchCache.set(query, body.photos ?? [])
  }
  return searchCache.get(query)
}

async function fetchOne(bucket, dish) {
  const query = buildDishImageQuery(dish)
  const photos = await search(query)
  if (photos.length === 0) throw new Error(`no Pexels results for "${query}"`)

  const start = nextIndex.get(query) ?? 0
  nextIndex.set(query, start + 1)

  // A candidate's CDN URL can occasionally 4xx (removed/expired asset) — fall
  // through to the next candidate for this query rather than failing the dish.
  let photo, original, lastErr
  for (let offset = 0; offset < photos.length; offset++) {
    const candidate = photos[(start + offset) % photos.length]
    try {
      const imgRes = await fetch(candidate.src.large)
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
      original = Buffer.from(await imgRes.arrayBuffer())
      photo = candidate
      break
    } catch (err) {
      lastErr = err
    }
  }
  if (!photo) {
    throw new Error(
      `could not download any candidate for "${query}": ${lastErr?.message}`,
    )
  }

  const webp = await sharp(original)
    .resize(800, 800, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer()

  const previousFileId = dish.imageSource === 'stock' ? dish.imageFileId : null
  const fileId = new mongoose.Types.ObjectId()

  await new Promise((resolve, reject) => {
    const upload = bucket.openUploadStreamWithId(
      fileId,
      `${dish.slug}.webp`,
      {
        contentType: 'image/webp',
        metadata: {
          slug: dish.slug,
          query,
          source: 'pexels',
          pexelsPhotoId: photo.id,
          pexelsUrl: photo.url,
          photographer: photo.photographer,
          fetchedAt: new Date(),
        },
      },
    )
    upload.end(webp, (err) => (err ? reject(err) : resolve()))
  })

  dish.image = `/api/images/${fileId}`
  dish.imageSource = 'stock'
  dish.imageFileId = fileId
  await dish.save()

  if (previousFileId) {
    await bucket.delete(previousFileId).catch(() => {})
  }

  return { query, photographer: photo.photographer }
}

function writeContactSheet(results) {
  const dir = path.resolve(import.meta.dirname, '../scratch')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'dish-images.html')

  const rows = results
    .map(
      ({ dish, query, photographer }) => `
    <figure style="display:inline-block;margin:10px;width:200px;text-align:center">
      <img src="http://localhost:4000${dish.image}" width="200" height="200"
           style="object-fit:cover;border-radius:8px" />
      <figcaption style="font:12px sans-serif;margin-top:4px">
        <strong>${escapeHtml(dish.name)}</strong><br>
        <span style="color:#888">"${escapeHtml(query)}" — ${escapeHtml(photographer)}</span>
      </figcaption>
    </figure>`,
    )
    .join('')

  writeFileSync(
    file,
    `<!doctype html><html><body style="background:#f2f0e9">${rows}</body></html>`,
  )
  console.log(`\nContact sheet: ${file}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!process.env.PEXELS_API_KEY) {
    console.error(
      'PEXELS_API_KEY is not set. Get a free key at https://www.pexels.com/api/ ' +
        'and add it to backend/.env.',
    )
    process.exit(1)
  }

  await connectDb()

  const filter = {}
  if (args.only) filter.slug = { $in: args.only }
  // Real kitchen photography is permanent, with or without --force.
  filter.imageSource = args.force || args.only ? { $ne: 'photo' } : 'none'

  const dishes = await Dish.find(filter).sort({ sortOrder: 1 })

  if (dishes.length === 0) {
    console.log('Nothing to fetch.')
    await disconnectDb()
    return
  }

  console.log(`About to fetch ${dishes.length} stock photo(s) from Pexels:`)
  for (const d of dishes) console.log(`  - ${d.slug}`)

  if (!args.yes) {
    console.log('\nDry run — rerun with --yes to actually fetch (free, no billing).')
    await disconnectDb()
    return
  }

  const bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'dishImages',
  })

  const results = []
  let cursor = 0
  async function worker() {
    while (cursor < dishes.length) {
      const dish = dishes[cursor++]
      try {
        const { query, photographer } = await fetchOne(bucket, dish)
        results.push({ dish, query, photographer })
        console.log(`  ✓ ${dish.slug} ← "${query}"`)
      } catch (err) {
        console.error(`  ✗ ${dish.slug}: ${err.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  if (results.length > 0) writeContactSheet(results)

  await disconnectDb()
  console.log(`\nDone. ${results.length}/${dishes.length} fetched.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
