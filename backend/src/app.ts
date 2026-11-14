import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { allowedOrigins, aiConfigured, emailConfigured } from './config/env'
import { prisma } from './config/prisma'
import { api } from './routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { asyncHandler } from './utils/asyncHandler'

export const app = express()

// Render / Vercel / most hosts put a proxy in front of the app; needed for correct client IPs (rate limiting).
app.set('trust proxy', 1)

app.use(helmet())
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / non-browser tools (no Origin header) and the configured front-end(s).
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true)
      cb(new Error(`Origin ${origin} is not allowed by CORS`))
    },
    credentials: false, // JWT is sent in the Authorization header, not in cookies
  }),
)
app.use(express.json({ limit: '100kb' }))

// ---- Health check (used by Render and for quick diagnostics; exposes no secrets) ----
const health = asyncHandler(async (_req, res) => {
  let database: 'ok' | 'unreachable' = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    database = 'unreachable'
  }
  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'degraded',
    database,
    emailConfigured,
    aiConfigured,
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  })
})
app.get('/health', health)
app.get('/api/health', health)

app.use('/api', api)

app.use(notFoundHandler)
app.use(errorHandler)
