import { Prisma, type FallStatus, type User } from '@prisma/client'
import { prisma } from '../config/prisma'
import { hasLiveNotification, sendFallAlert, type AlertOptions } from './notificationService'
import { conflict, notFound } from '../utils/errors'

export interface CreateFallInput {
  clientEventId: string
  detectedAt: Date
  status: FallStatus
  confidence?: number
  cancellationReason?: string
  location?: { latitude: number; longitude: number } | null
  timeZone?: string
}

const withNotifications = { notifications: { orderBy: { createdAt: 'desc' as const } } }

/**
 * Stores a fall event reported by the browser and, for CONFIRMED events, triggers the alert e-mail.
 *
 * Duplicate protection: (userId, clientEventId) is UNIQUE in the database. If the browser
 * retries the same request (network glitch, double click) the existing event is returned and
 * NO second e-mail is sent – even when two identical requests arrive at the same moment, because
 * only the request that wins the INSERT continues to the e-mail step.
 */
export async function recordFallEvent(user: User, input: CreateFallInput) {
  const existing = await prisma.fallEvent.findUnique({
    where: { userId_clientEventId: { userId: user.id, clientEventId: input.clientEventId } },
    include: withNotifications,
  })
  if (existing) return { event: existing, duplicate: true }

  let created
  try {
    created = await prisma.fallEvent.create({
      data: {
        userId: user.id,
        clientEventId: input.clientEventId,
        detectedAt: input.detectedAt,
        status: input.status,
        confidence: input.confidence,
        cancellationReason: input.status === 'CANCELLED' ? (input.cancellationReason ?? 'Cancelled by user') : null,
      },
    })
  } catch (e) {
    // Lost the race against an identical concurrent request → return what the winner stored.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const winner = await prisma.fallEvent.findUniqueOrThrow({
        where: { userId_clientEventId: { userId: user.id, clientEventId: input.clientEventId } },
        include: withNotifications,
      })
      return { event: winner, duplicate: true }
    }
    throw e
  }

  if (created.status === 'CONFIRMED') {
    const opts: AlertOptions = { timeZone: input.timeZone }
    // Location is only used if the user switched location sharing on in Settings.
    if (user.shareLocation && input.location) opts.location = input.location
    await sendFallAlert(created, user, opts)
  }

  const event = await prisma.fallEvent.findUniqueOrThrow({ where: { id: created.id }, include: withNotifications })
  return { event, duplicate: false }
}

/** Retry the alert e-mail of a CONFIRMED event whose earlier attempt failed or never happened. */
export async function resendAlert(user: User, fallEventId: string) {
  const event = await prisma.fallEvent.findFirst({ where: { id: fallEventId, userId: user.id } })
  if (!event) throw notFound('Fall event not found')
  if (event.status !== 'CONFIRMED') throw conflict('Only confirmed fall events can trigger an alert')
  if (await hasLiveNotification(event.id)) {
    throw conflict('An alert for this event was already sent or is still being sent')
  }
  await sendFallAlert(event, user, {})
  return prisma.fallEvent.findUniqueOrThrow({ where: { id: event.id }, include: withNotifications })
}
