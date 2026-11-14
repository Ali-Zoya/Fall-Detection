import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Mail, ShieldCheck } from 'lucide-react'
import { useMonitoring } from '@/context/MonitoringContext'
import { Alert, Badge, Button } from './ui'
import { statusInfo } from '@/utils/notificationStatus'
import type { FallEvent } from '@/types'

/** Full-screen overlay while a possible fall is being confirmed. Mounted once in AppLayout. */
export function EmergencyCountdown() {
  const m = useMonitoring()
  const active = m.state === 'POSSIBLE_FALL' || m.state === 'COUNTDOWN'
  if (!active || !m.countdown) return null
  const { remaining, total } = m.countdown
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100))
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-desc">
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 text-center shadow-float animate-fade-in">
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-red-600/40 animate-pulse-ring" aria-hidden />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-700 text-white">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </span>
        </div>
        <h2 id="cd-title" className="text-[28px] font-bold leading-tight tracking-[-0.03em]">Possible fall detected</h2>
        <p id="cd-desc" className="mt-2 text-[15px] leading-relaxed text-slate-600">
          If you are OK, cancel now. Otherwise an email is sent to your emergency contact when the countdown ends.
        </p>
        <div className="my-7" aria-live="polite">
          <p className="text-[88px] font-bold leading-none tracking-[-0.04em] tabular-nums text-slate-900">{remaining}</p>
          <p className="mt-2 text-[13px] text-slate-500">seconds until the alert is sent</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={remaining}>
            <div className="h-full rounded-full bg-red-700 transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Button variant="success" size="lg" className="w-full" onClick={() => void m.cancelAlert()} autoFocus>
          <ShieldCheck className="h-5 w-5" /> I’m Safe – Cancel Alert
        </Button>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">Need an ambulance? Call <strong className="font-semibold text-slate-900">112</strong> yourself – SafeWalk cannot call emergency services.</p>
      </div>
    </div>
  )
}

export function AlertResultCard({ event, duplicate }: { event: FallEvent; duplicate?: boolean }) {
  const ns = event.notifications
  return (
    <div className="space-y-3">
      {duplicate && <p className="text-sm text-slate-600">This alert had already been recorded, so no second email was sent.</p>}
      {ns.length === 0 && <Alert tone="danger" title="No email was sent">No alert record exists for this event. Call your contact or 112 directly.</Alert>}
      {ns.length > 0 && (
        <ul className="rounded-2xl bg-white px-4 ring-1 ring-slate-200">
          {ns.map((n, i) => {
            const s = statusInfo(n.status)
            return (
              <li key={n.id} className={`flex flex-wrap items-center justify-between gap-2 py-3 text-sm ${i > 0 ? 'border-t border-slate-200' : ''}`}>
                <span className="flex min-w-0 items-center gap-2 font-medium text-slate-900"><Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /><span className="break-all">{n.recipient === '-' ? 'No recipient' : n.recipient}</span></span>
                <Badge tone={s.tone}>{s.label}</Badge>
                <span className="basis-full text-xs leading-relaxed text-slate-600">{n.errorMessage ?? s.description}</span>
              </li>
            )
          })}
        </ul>
      )}
      <Link to="/notifications" className="inline-flex min-h-[44px] items-center gap-1 rounded text-sm text-brand-600 hover:text-brand-700">
        View all alerts <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}

/** Banner shown on every signed-in page after an alert was sent or failed. */
export function AlertBanner() {
  const m = useMonitoring()
  if (m.state === 'FALL_CONFIRMED') {
    return <Alert tone="warning" title="Sending alert…" className="mb-6">Contacting the SafeWalk server. Do not close this tab.</Alert>
  }
  if (m.state === 'ALERT_SENT' && m.lastAlert) {
    return (
      <Alert tone="danger" title="Fall alert recorded" className="mb-6" action={<Button size="sm" variant="dark" onClick={m.resume}>Dismiss and resume monitoring</Button>}>
        <div className="mt-2"><AlertResultCard event={m.lastAlert.event} duplicate={m.lastAlert.duplicate} /></div>
        <p className="text-xs leading-relaxed">“Sent” does not mean the email was read. If you still need help, call 112 or your contact directly.</p>
      </Alert>
    )
  }
  if (m.state === 'ERROR' && m.sendError) {
    return (
      <Alert tone="danger" title="The fall alert could NOT be sent" className="mb-6" action={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="danger" onClick={m.retrySend}>Retry sending</Button>
          <Button size="sm" variant="secondary" onClick={m.resume}>Dismiss</Button>
        </div>
      }>
        {m.sendError} Call your emergency contact or 112 directly.
      </Alert>
    )
  }
  return null
}
