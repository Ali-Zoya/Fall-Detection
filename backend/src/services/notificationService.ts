import type { FallEvent, Notification, User } from '@prisma/client'
import { prisma } from '../config/prisma'
import { emailConfigured } from '../config/env'
import { EmailError, sendEmail } from './emailService'

/**
 * Statuses that mean "an alert is in flight or was accepted" → never send another one for the
 * same event. E-mail alerts only use "pending" and "sent"; the others are old SMS statuses that
 * can still exist on rows created before e-mail alerts.
 */
export const LIVE_STATUSES = [
  'pending',
  'sent',
  'accepted',
  'scheduled',
  'queued',
  'sending',
  'receiving',
  'received',
  'delivered',
  'read',
]

export interface AlertOptions {
  location?: { latitude: number; longitude: number } | null
  /** IANA time-zone of the user's browser, used to print the detection time. */
  timeZone?: string
}

function formatTime(date: Date, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat('en-IN', { ...options, timeZone, timeZoneName: 'short' }).format(date)
    } catch {
      // Fall through to UTC or default
    }
  }
  try {
    return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'Asia/Kolkata', timeZoneName: 'short' }).format(date)
  } catch {
    return date.toUTCString()
  }
}

function mapsUrl(loc: { latitude: number; longitude: number }): string {
  return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Removes characters that must never reach an e-mail header. */
function headerSafe(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim()
}

/** Plain-text alert. This is also what is stored in Notification.message. */
export function buildAlertMessage(userName: string, detectedAt: Date, opts: AlertOptions = {}): string {
  let text =
    `EMERGENCY ALERT: SafeWalk has detected a possible fall involving ${userName}. ` +
    `Please check on them immediately. Detection time: ${formatTime(detectedAt, opts.timeZone)}.`
  if (opts.location) text += ` Location: ${mapsUrl(opts.location)}`
  return text
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function emailShell(inner: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>` +
    `<body style="margin:0;padding:0;background:#F5F5F7;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:24px 12px;"><tr><td align="center">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:20px;"><tr>` +
    `<td style="padding:36px 32px;font-family:${FONT};color:#1D1D1F;">` +
    `<p style="margin:0 0 28px;font-size:16px;font-weight:600;letter-spacing:-0.02em;">SafeWalk</p>` +
    inner +
    `</td></tr></table></td></tr></table></body></html>`
  )
}

function detailRow(label: string, valueHtml: string): string {
  return (
    `<tr><td style="padding:14px 0;border-top:1px solid #E8E8ED;font-size:15px;color:#515154;">${label}</td>` +
    `<td align="right" style="padding:14px 0;border-top:1px solid #E8E8ED;font-size:15px;font-weight:500;color:#1D1D1F;">${valueHtml}</td></tr>`
  )
}

/** Subject + text + HTML of the alert e-mail sent to the emergency contact. */
export function buildAlertEmail(user: Pick<User, 'name' | 'phone'>, detectedAt: Date, opts: AlertOptions = {}) {
  const name = escapeHtml(user.name)
  const when = escapeHtml(formatTime(detectedAt, opts.timeZone))

  let text = buildAlertMessage(user.name, detectedAt, opts)
  if (user.phone) text += ` You can call ${user.name} on ${user.phone}.`
  text +=
    '\n\nSafeWalk does not contact ambulances or emergency services. If you think this is an emergency, call 112 (India) or your local emergency number.' +
    `\nYou are receiving this because ${user.name} added you as an emergency contact in SafeWalk.`

  let rows = detailRow('Detected', when)
  if (opts.location) {
    rows += detailRow('Location', `<a href="${mapsUrl(opts.location)}" style="color:#0066CC;text-decoration:none;">Open in Google Maps</a>`)
  }

  const callButton = user.phone
    ? `<p style="margin:28px 0 0;"><a href="tel:${escapeHtml(user.phone)}" style="display:block;background:#1D1D1F;color:#FFFFFF;text-decoration:none;text-align:center;font-size:16px;font-weight:500;padding:16px 24px;border-radius:999px;">Call ${name} (${escapeHtml(user.phone)})</a></p>`
    : ''

  const html = emailShell(
    `<p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#A32A23;">Emergency alert</p>` +
      `<h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;">${name} may have fallen.</h1>` +
      `<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#424245;">SafeWalk detected a possible fall and ${name} did not cancel the alert. Please check on them right away.</p>` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #E8E8ED;">${rows}</table>` +
      callButton +
      `<p style="margin:28px 0 0;font-size:12px;line-height:1.55;color:#6E6E73;">SafeWalk does not contact ambulances or emergency services. If you think this is an emergency, call 112 (India) or your local emergency number. You are receiving this because ${name} added you as an emergency contact in SafeWalk.</p>`,
  )

  return { subject: headerSafe(`Possible fall detected: please check on ${user.name}`), text, html }
}

/**
 * Sends the alert e-mail for a CONFIRMED fall event to the user's primary contact and stores
 * the outcome as a Notification row. Always creates exactly one Notification row per call.
 */
export async function sendFallAlert(event: FallEvent, user: User, opts: AlertOptions = {}): Promise<Notification> {
  // Primary contact first; otherwise the oldest contact. Contacts saved before e-mail alerts
  // existed may have no address, so prefer one that can actually be e-mailed.
  const contacts = await prisma.emergencyContact.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
  const contact = contacts.find((c) => c.email) ?? null

  const message = buildAlertMessage(user.name, event.detectedAt, opts)

  if (!contact || !contact.email) {
    return prisma.notification.create({
      data: {
        fallEventId: event.id,
        recipient: '-',
        message,
        status: 'no_contact',
        errorMessage:
          contacts.length === 0
            ? 'No emergency contact is saved, so no e-mail was sent. Add a contact on the Emergency Contacts page.'
            : 'None of your emergency contacts has an e-mail address, so no e-mail was sent. Edit a contact and add one.',
      },
    })
  }

  if (!emailConfigured) {
    return prisma.notification.create({
      data: {
        fallEventId: event.id,
        recipient: contact.email,
        message,
        status: 'not_configured',
        errorMessage: 'E-mail is not configured on the server, so no e-mail was sent.',
      },
    })
  }

  // Create the row BEFORE sending so a concurrent resend sees an in-flight notification.
  const row = await prisma.notification.create({
    data: { fallEventId: event.id, recipient: contact.email, message, status: 'pending' },
  })

  try {
    const mail = buildAlertEmail(user, event.detectedAt, opts)
    const result = await sendEmail({ to: contact.email, toName: headerSafe(contact.name), ...mail })
    return await prisma.notification.update({
      where: { id: row.id },
      data: { status: 'sent', providerMessageId: result.id, sentAt: new Date() },
    })
  } catch (e) {
    const err = e as EmailError
    console.error('[email] send failed:', err.code, err.message)
    return prisma.notification.update({
      where: { id: row.id },
      data: { status: 'failed', errorMessage: err.code ? `${err.code}: ${err.message}` : err.message },
    })
  }
}

/** True if this event already has an alert that is in flight or was accepted by the mail server. */
export async function hasLiveNotification(fallEventId: string): Promise<boolean> {
  const count = await prisma.notification.count({ where: { fallEventId, status: { in: LIVE_STATUSES } } })
  return count > 0
}

/** Sends a harmless test message to the user's own address (Settings → "Send test email"). */
export async function sendTestEmail(user: Pick<User, 'name' | 'email'>): Promise<void> {
  const name = escapeHtml(user.name)
  await sendEmail({
    to: user.email,
    toName: headerSafe(user.name),
    subject: 'SafeWalk test email',
    text:
      `Hello ${user.name},\n\nThis is a test from SafeWalk. E-mail alerts are set up correctly.\n\n` +
      'If a fall is confirmed, your primary emergency contact receives an alert like this one. Nobody was alerted by this test.',
    html: emailShell(
      `<h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;">E-mail alerts are working.</h1>` +
        `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#424245;">Hello ${name}, this is a test from SafeWalk.</p>` +
        `<p style="margin:0;font-size:16px;line-height:1.55;color:#424245;">If a fall is confirmed, your primary emergency contact receives an alert from this address. Nobody was alerted by this test.</p>`,
    ),
  })
}
