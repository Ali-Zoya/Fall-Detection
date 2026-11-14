import nodemailer, { type Transporter } from 'nodemailer'
import { env, emailFrom, emailProvider } from '../config/env'

/**
 * Sends e-mail through one of two transports, chosen by the environment (see config/env.ts):
 *
 *   - "smtp"  – any SMTP mailbox via Nodemailer (e.g. Gmail with an app password). Good for
 *               running locally.
 *   - "brevo" – Brevo's transactional e-mail API over HTTPS. Needed on hosts that block the
 *               SMTP ports (Render's free plan does).
 *
 * Credentials come ONLY from environment variables and never leave the server.
 *
 * IMPORTANT: a successful send means the mail server ACCEPTED the message. E-mail has no
 * reliable delivery receipt, so this never proves that the message was read.
 */

export class EmailError extends Error {
  constructor(
    message: string,
    public code?: number | string,
  ) {
    super(message)
    this.name = 'EmailError'
  }
}

export interface EmailMessage {
  to: string
  toName?: string
  subject: string
  text: string
  html: string
}

export interface EmailResult {
  /** Message id reported by the mail server, if any. */
  id: string | null
}

const TIMEOUT_MS = 20_000

let transporter: Transporter | null = null
function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 465 = implicit TLS; 587 upgrades with STARTTLS
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  })
  return transporter
}

async function sendViaSmtp(msg: EmailMessage): Promise<EmailResult> {
  try {
    const info = await getTransporter().sendMail({
      from: { name: env.EMAIL_FROM_NAME, address: emailFrom },
      to: msg.toName ? { name: msg.toName, address: msg.to } : msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    })
    // The server can accept the connection but refuse the recipient.
    if (info.rejected && info.rejected.length > 0) {
      throw new EmailError(`The mail server rejected the recipient ${msg.to}`)
    }
    return { id: info.messageId ?? null }
  } catch (e: unknown) {
    if (e instanceof EmailError) throw e
    const err = e as { code?: string; responseCode?: number; message?: string }
    throw new EmailError(err.message || 'The mail server refused the message', err.responseCode ?? err.code)
  }
}

async function sendViaBrevo(msg: EmailMessage): Promise<EmailResult> {
  let res: Response
  try {
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: emailFrom, name: env.EMAIL_FROM_NAME },
        to: [msg.toName ? { email: msg.to, name: msg.toName } : { email: msg.to }],
        subject: msg.subject,
        textContent: msg.text,
        htmlContent: msg.html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    throw new EmailError(err.name === 'TimeoutError' ? 'Brevo did not answer in time' : `Could not reach Brevo: ${err.message ?? 'network error'}`)
  }

  const data = (await res.json().catch(() => null)) as { messageId?: string; message?: string; code?: string } | null
  if (!res.ok) {
    throw new EmailError(data?.message || `Brevo refused the message (HTTP ${res.status})`, data?.code ?? res.status)
  }
  return { id: data?.messageId ?? null }
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  if (emailProvider === 'brevo') return sendViaBrevo(msg)
  if (emailProvider === 'smtp') return sendViaSmtp(msg)
  throw new EmailError('E-mail is not configured')
}
