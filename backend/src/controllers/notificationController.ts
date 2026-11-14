import { z } from 'zod'
import { prisma } from '../config/prisma'
import { asyncHandler } from '../utils/asyncHandler'
import { HttpError, unauthorized } from '../utils/errors'
import { emailConfigured } from '../config/env'
import { EmailError } from '../services/emailService'
import { sendTestEmail } from '../services/notificationService'

const query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

/** GET /api/notifications – alert e-mail history of the signed-in user, newest first. */
export const listNotifications = asyncHandler(async (req, res) => {
  const q = query.parse(req.query)

  const where = { fallEvent: { userId: req.userId! } }
  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { fallEvent: { select: { id: true, detectedAt: true, status: true } } },
    }),
  ])
  res.json({ items: rows, total, page: q.page, pageSize: q.pageSize })
})

/**
 * POST /api/notifications/test – sends a test message to the signed-in user's OWN address, so
 * the e-mail set-up can be checked without triggering a fall alert. Nothing is stored.
 */
export const sendTest = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user) throw unauthorized('Account no longer exists')
  if (!emailConfigured) {
    throw new HttpError(503, 'E-mail is not configured on the server, so nothing was sent. Add the e-mail settings to backend/.env and restart.', 'EMAIL_NOT_CONFIGURED')
  }
  try {
    await sendTestEmail(user)
  } catch (e) {
    const err = e as EmailError
    console.error('[email] test send failed:', err.code, err.message)
    throw new HttpError(502, `The mail server did not accept the test e-mail: ${err.message}`, 'EMAIL_FAILED')
  }
  res.json({ ok: true, recipient: user.email })
})
