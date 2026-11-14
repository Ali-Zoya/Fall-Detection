import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { History, Video } from 'lucide-react'
import { Alert, Badge, Button, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { StatusPill } from '@/components/StatusPill'
import { useAuth } from '@/context/AuthContext'
import { useMonitoring } from '@/context/MonitoringContext'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/services/api'
import { statusInfo } from '@/utils/notificationStatus'

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function Stat({ label, children, accent = 'blue' }: { label: string; children: ReactNode; accent?: 'blue' | 'indigo' | 'emerald' | 'amber' }) {
  const accents = {
    blue: 'border-brand-200/60 bg-gradient-to-br from-brand-50/70 via-white to-white text-brand-900',
    indigo: 'border-indigo-200/60 bg-gradient-to-br from-indigo-50/70 via-white to-white text-indigo-900',
    emerald: 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 via-white to-white text-emerald-900',
    amber: 'border-amber-200/60 bg-gradient-to-br from-amber-50/70 via-white to-white text-amber-900',
  }
  return (
    <div className={`group rounded-[22px] border p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 ${accents[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-3 flex min-h-[40px] items-center text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums">{children}</div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const m = useMonitoring()
  const contacts = useAsync(() => api.contacts.list(), [])
  const falls = useAsync(() => api.falls.list({ page: 1, pageSize: 5 }), [])
  const confirmed = useAsync(() => api.falls.list({ status: 'CONFIRMED', page: 1, pageSize: 1 }), [])

  const list = contacts.data?.contacts ?? []
  const nContacts = list.length
  const noEmail = !contacts.loading && nContacts > 0 && !list.some((c) => c.email)
  const loadingAny = contacts.loading || falls.loading

  return (
    <>
      <PageHeader title={`Hello, ${user?.name.split(' ')[0] ?? 'there'}`} description="Here is your SafeWalk overview." action={<Link to="/monitoring"><Button><Video className="h-4 w-4" /> {m.isRunning ? 'Open Monitoring' : 'Start Monitoring'}</Button></Link>} />

      {!contacts.loading && !contacts.error && nContacts === 0 && (
        <Alert tone="warning" title="Add an emergency contact" className="mb-6" action={<Link to="/contacts"><Button size="sm">Add contact</Button></Link>}>
          Without a contact, SafeWalk cannot notify anyone if a fall is confirmed.
        </Alert>
      )}
      {noEmail && (
        <Alert tone="warning" title="Your contacts have no email address" className="mb-6" action={<Link to="/contacts"><Button size="sm">Edit contacts</Button></Link>}>
          SafeWalk now sends alerts by email. Add an email address to your primary contact, otherwise nobody is notified.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Monitoring" accent="blue"><StatusPill state={m.state} /></Stat>
        <Stat label="Emergency contacts" accent="indigo">{contacts.loading ? '…' : nContacts}</Stat>
        <Stat label="Confirmed falls" accent="amber">{confirmed.loading ? '…' : confirmed.data?.total ?? '—'}</Stat>
        <Stat label="Countdown" accent="emerald">{user?.countdownSeconds}<span className="ml-1 text-[19px] font-semibold text-slate-600">s</span></Stat>
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-semibold">Recent fall events</h2>
          <Link to="/history" className="flex min-h-[44px] items-center rounded text-sm text-brand-600 hover:text-brand-700">View all</Link>
        </div>
        {loadingAny ? <Spinner /> : falls.error ? (
          <Alert tone="danger" title="Could not load events" action={<Button size="sm" variant="secondary" onClick={() => void falls.reload()}>Try again</Button>}>{falls.error}</Alert>
        ) : (falls.data?.items.length ?? 0) === 0 ? (
          <div className="border-t border-slate-200"><EmptyState icon={<History className="h-6 w-6" />} title="No fall events yet">Events appear here when a possible fall is confirmed or cancelled.</EmptyState></div>
        ) : (
          <ul>
            {falls.data!.items.map((f) => {
              const latest = f.notifications[0] ? statusInfo(f.notifications[0].status) : null
              return (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-4 text-[15px]">
                  <span className="font-medium">{fmt(f.detectedAt)}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone={f.status === 'CONFIRMED' ? 'danger' : 'success'}>{f.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled – safe'}</Badge>
                    {f.status === 'CONFIRMED' && latest && <Badge tone={latest.tone}>Email: {latest.label}</Badge>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
