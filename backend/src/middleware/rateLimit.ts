import rateLimit from 'express-rate-limit'

const tooMany = (message: string) => ({ error: { message, code: 'RATE_LIMITED' } })

/** Brute-force protection for login / registration. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Too many attempts. Please wait a few minutes and try again.'),
})

/** Keeps the (paid) AI provider from being hammered. */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('You are sending messages too quickly. Please wait a moment.'),
})

/** The "Send test email" button: a handful per hour is plenty. */
export const testEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Too many test e-mails. Please try again later.'),
})
