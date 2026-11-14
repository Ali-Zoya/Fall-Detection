import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { asyncHandler } from '../utils/asyncHandler'
import { notFound, unauthorized } from '../utils/errors'
import { recordFallEvent, resendAlert } from '../services/fallService'

export const createFallSchema = z.object({
  clientEventId: z.string().trim().min(8).max(64),
  detectedAt: z.coerce.date().refine((d) => d.getTime() < Date.now() + 5 * 60_000, 'detectedAt is in the future'),
  status: z.enum(['CONFIRMED', 'CANCELLED']),
  confidence: z.number().min(0).max(1).optional(),
  cancellationReason: z.string().trim().max(200).optional(),
  location: z
    .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
    .nullable()
    .optional(),
  timeZone: z.string().max(64).optional(),
})

const listQuery = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

async function currentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw unauthorized('Account no longer exists')
  return user
}

/** POST /api/falls – report a CONFIRMED fall (sends the alert e-mail) or a CANCELLED false alarm. */
export const createFall = asyncHandler(async (req, res) => {
  const user = await currentUser(req.userId!)
  const input = req.body as z.infer<typeof createFallSchema>
  const { event, duplicate } = await recordFallEvent(user, input)
  // 201 = created now, 200 = this clientEventId was already stored (nothing was sent again).
  res.status(duplicate ? 200 : 201).json({ event, duplicate })
})

/** GET /api/falls – the signed-in user's events, newest first. */
export const listFalls = asyncHandler(async (req, res) => {
  const q = listQuery.parse(req.query)
  const where: Prisma.FallEventWhereInput = {
    userId: req.userId!,
    ...(q.status ? { status: q.status } : {}),
    ...(q.from || q.to ? { detectedAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
  }
  const [total, items] = await Promise.all([
    prisma.fallEvent.count({ where }),
    prisma.fallEvent.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { notifications: { orderBy: { createdAt: 'desc' } } },
    }),
  ])
  res.json({ items, total, page: q.page, pageSize: q.pageSize })
})

/** GET /api/falls/:id */
export const getFall = asyncHandler(async (req, res) => {
  const event = await prisma.fallEvent.findFirst({
    where: { id: String(req.params.id), userId: req.userId! },
    include: { notifications: { orderBy: { createdAt: 'desc' } } },
  })
  if (!event) throw notFound('Fall event not found')
  res.json({ event })
})

/** POST /api/falls/:id/resend – only if no alert e-mail for this event is in flight or was already sent. */
export const resendFall = asyncHandler(async (req, res) => {
  const user = await currentUser(req.userId!)
  const event = await resendAlert(user, String(req.params.id))
  res.json({ event })
})
