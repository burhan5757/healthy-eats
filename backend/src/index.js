import http from 'node:http'
import express from 'express'
import mongoose from 'mongoose'
import compression from 'compression'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { config } from './config.js'
import { connectDb, disconnectDb } from './db.js'
import { readAuth, ROLE_HEADER } from './middleware/auth.js'
import { CSRF_HEADER, csrfGuard } from './middleware/csrf.js'
import { authRouter } from './routes/auth.js'
import { menuRouter } from './routes/menu.js'
import { ordersRouter } from './routes/orders.js'
import { imagesRouter } from './routes/images.js'
import { driversRouter } from './routes/drivers.js'
import { otpRouter } from './routes/otp.js'
import { closeRealtime, initRealtime } from './realtime.js'
import { seed } from './seed.js'
import { orderingStatus } from './routes/orders.js'

const app = express()

// Hops of reverse proxy / load balancer in front of us, so req.ip is the
// visitor's real address for rate limiting (CLAUDE.md §18).
app.set('trust proxy', config.trustProxy)

app.use(
  helmet({
    // The frontend lives on another origin and loads /api/images/:id.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', CSRF_HEADER, ROLE_HEADER],
  }),
)
app.use(compression())
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use('/api', csrfGuard)
app.use(readAuth)

// Healthy only while the database is connected, so the host (and the e2e
// runner) never routes traffic to an instance that can't serve it.
app.get('/api/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1
  res.status(dbUp ? 200 : 503).json({ ok: dbUp })
})
app.get('/api/ordering-status', (_req, res) => res.json(orderingStatus()))
app.use('/api/auth', authRouter)
app.use('/api/menu', menuRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/images', imagesRouter)
app.use('/api/drivers', driversRouter)
app.use('/api/otp', otpRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }))

// Error handler — must keep all four params for Express to recognise it.
app.use((err, _req, res, _next) => {
  if (err instanceof mongoose.Error.VersionError) {
    res
      .status(409)
      .json({ error: 'This order just changed. Refresh and try again.' })
    return
  }
  console.error('[error]', err)
  res.status(500).json({ error: 'Something went wrong on our end.' })
})

async function start() {
  await connectDb()
  await seed()

  const server = http.createServer(app)
  initRealtime(server)

  server.listen(config.port, () => {
    console.log(`[server] http://localhost:${config.port}`)
  })

  // Railway sends SIGTERM on every deploy: finish in-flight requests, then
  // close the database, instead of dropping orders mid-write.
  let stopping = false
  const shutdown = async (signal) => {
    if (stopping) return
    stopping = true
    console.log(`[server] ${signal} received, shutting down`)
    const force = setTimeout(() => process.exit(1), 10_000)
    force.unref()
    try {
      await closeRealtime()
      await new Promise((resolve) => server.close(resolve))
      await disconnectDb()
      process.exit(0)
    } catch (err) {
      console.error('[server] shutdown failed', err)
      process.exit(1)
    }
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start().catch((err) => {
  console.error('[server] failed to start', err)
  process.exit(1)
})
