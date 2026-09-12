import http from 'node:http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { connectDb } from './db.js'
import { readAuth } from './middleware/auth.js'
import { authRouter } from './routes/auth.js'
import { menuRouter } from './routes/menu.js'
import { ordersRouter } from './routes/orders.js'
import { initRealtime } from './realtime.js'
import { seed } from './seed.js'

const app = express()

app.use(cors({ origin: config.clientOrigin, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(readAuth)

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/menu', menuRouter)
app.use('/api/orders', ordersRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }))

// Error handler — must keep all four params for Express to recognise it.
app.use(
  (
    err       ,
    _req                 ,
    res                  ,
    _next                      ,
  ) => {
    console.error('[error]', err)
    res.status(500).json({ error: 'Something went wrong on our end.' })
  },
)

async function start() {
  await connectDb()
  await seed()

  const server = http.createServer(app)
  initRealtime(server)

  server.listen(config.port, () => {
    console.log(`[server] http://localhost:${config.port}`)
  })
}

start().catch((err) => {
  console.error('[server] failed to start', err)
  process.exit(1)
})
