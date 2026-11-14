/**
 * Human wording for alert (notification) statuses.
 *
 * The wording is deliberately careful: "sent" means the mail server ACCEPTED the e-mail. E-mail
 * has no reliable delivery receipt, so nothing here ever claims the message was read.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export interface StatusInfo {
  label: string
  tone: Tone
  description: string
}

const OLD_SMS = 'Status of an older SMS alert, from before SafeWalk switched to email.'

const MAP: Record<string, StatusInfo> = {
  pending: { label: 'Sending…', tone: 'info', description: 'The email is being handed to the mail server.' },
  sent: { label: 'Sent', tone: 'success', description: 'The mail server accepted the email. This does not confirm that it was opened.' },
  failed: { label: 'Failed', tone: 'danger', description: 'The email could not be sent. Call your contact directly.' },
  no_contact: { label: 'No contact – nothing sent', tone: 'danger', description: 'No emergency contact with an email address was saved, so nothing was sent.' },
  not_configured: { label: 'Email not set up – nothing sent', tone: 'danger', description: 'The server has no email settings, so nothing was sent.' },
  // Statuses that only exist on alerts recorded while SafeWalk still used SMS.
  accepted: { label: 'Accepted', tone: 'neutral', description: OLD_SMS },
  scheduled: { label: 'Scheduled', tone: 'neutral', description: OLD_SMS },
  queued: { label: 'Queued', tone: 'neutral', description: OLD_SMS },
  sending: { label: 'Sending', tone: 'neutral', description: OLD_SMS },
  receiving: { label: 'Receiving', tone: 'neutral', description: OLD_SMS },
  received: { label: 'Received', tone: 'neutral', description: OLD_SMS },
  delivered: { label: 'Delivered', tone: 'success', description: OLD_SMS },
  read: { label: 'Read', tone: 'success', description: OLD_SMS },
  undelivered: { label: 'Not delivered', tone: 'danger', description: OLD_SMS },
}

export function statusInfo(status: string): StatusInfo {
  return MAP[status] ?? { label: status, tone: 'neutral', description: 'Status reported by the server.' }
}

/** True if another alert may be attempted for this event (mirrors the server rule). */
export function canResend(statuses: string[]): boolean {
  const live = ['pending', 'sent', 'accepted', 'scheduled', 'queued', 'sending', 'receiving', 'received', 'delivered', 'read']
  return !statuses.some((s) => live.includes(s))
}

export const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-900',
  danger: 'bg-red-50 text-red-800',
  info: 'bg-brand-50 text-brand-700',
  neutral: 'bg-slate-100 text-slate-700',
}
