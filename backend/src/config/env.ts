import 'dotenv/config'
import { z } from 'zod'

/**
 * Reads and validates environment variables once, at start-up.
 * Required: DATABASE_URL, JWT_SECRET.
 * Optional integrations (e-mail, AI provider) never stop the server from starting – the
 * features that depend on them report "not configured" instead.
 */

// Treat empty strings ("SMTP_PASS=") as "not set".
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ''))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required' }),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET is required' })
    .min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DEFAULT_COUNTRY_CODE: z
    .string()
    .regex(/^\+[1-9]\d{0,3}$/, 'DEFAULT_COUNTRY_CODE must look like +91')
    .default('+91'),
  // E-mail alerts. Either SMTP (any mailbox, e.g. Gmail with an app password) ...
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // ... or Brevo's HTTPS API (needed on hosts that block SMTP ports, such as Render's free plan).
  BREVO_API_KEY: z.string().optional(),
  // Sender address. Defaults to SMTP_USER for SMTP; required for Brevo (must be a verified sender).
  EMAIL_FROM: z.string().email('EMAIL_FROM must be an e-mail address').optional(),
  EMAIL_FROM_NAME: z.string().default('SafeWalk Alerts'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_API_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
})

const parsed = schema.safeParse(raw)
if (!parsed.success) {
  console.error('\n[SafeWalk] Invalid environment configuration (see backend/.env.example):')
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}

export const env = parsed.data

/** Allowed browser origins for CORS. */
export const allowedOrigins = env.FRONTEND_URL.split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)

/**
 * Which e-mail transport is used for fall alerts. Brevo wins when both are configured, because
 * it works over HTTPS and is therefore not affected by hosts that block SMTP ports.
 */
export const emailProvider: 'brevo' | 'smtp' | null =
  env.BREVO_API_KEY && env.EMAIL_FROM
    ? 'brevo'
    : env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
      ? 'smtp'
      : null

export const emailConfigured = emailProvider !== null

/** Address alerts are sent from. */
export const emailFrom = env.EMAIL_FROM ?? env.SMTP_USER ?? ''

export const aiConfigured = Boolean(env.AI_API_KEY && env.AI_MODEL)

export const isProduction = env.NODE_ENV === 'production'
