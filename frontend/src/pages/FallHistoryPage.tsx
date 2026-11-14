import { useState } from 'react'
import { ChevronDown, ChevronUp, History, RefreshCw } from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Select, Spinner } from '@/components/ui'
import { AlertResultCard } from '@/components/EmergencyCountdown'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { api } from '@/services/api'
import { canResend, statusInfo } from '@/utils/notificationStatus'
import type { FallEvent, FallStatus } from '@/types'

const PAGE = 10
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })

export function FallHistoryPage() {
  const toast = useToast()
  const [status, setStatus] = useState<'' | FallStatus>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data, loading, error, reload } = useAsync(
    () =>
      api.falls.list({
        status: status || undefined,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        page,
        pageSize: PAGE,
      }),
    [status, from, to, page],
  )
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1

  const resend = async (f: FallEvent) => {
    setBusyId(f.id)
    try {
      await api.falls.resend(f.id)
      toast.success('The alert email was sent again. Check its status in Alerts.')
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not resend the alert.')
    } finally {
      setBusyId(null)
    }
  }
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1) }

  return (
    <>
      <PageHeader title="Fall History" description="Every confirmed or cancelled alert, newest first." />
      <div className="mb-8 rounded-[22px] bg-slate-50 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Outcome" value={status} onChange={(e) => reset(setStatus)(e.target.value as '' | FallStatus)}>
            <option value="">All</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled (I was safe)</option>
          </Select>
          <div><label className="mb-1.5 block text-[13px] font-medium text-slate-700" htmlFor="from">From</label><input id="from" type="date" value={from} max={to || undefined} onChange={(e) => reset(setFrom)(e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[15px]" /></div>
          <div><label className="mb-1.5 block text-[13px] font-medium text-slate-700" htmlFor="to">To</label><input id="to" type="date" value={to} min={from || undefined} onChange={(e) => reset(setTo)(e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[15px]" /></div>
        </div>
      </div>

      <Card>
        {loading ? <Spinner /> : error ? (
          <div className="p-5"><Alert tone="danger" title="Could not load history" action={<Button size="sm" variant="secondary" onClick={() => void reload()}>Try again</Button>}>{error}</Alert></div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={<History className="h-6 w-6" />} title="No events found">{status || from || to ? 'Try changing the filters.' : 'Fall events will be listed here.'}</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.items.map((f) => {
              const expanded = open === f.id
              const confirmed = f.status === 'CONFIRMED'
              const resendable = confirmed && canResend(f.notifications.map((n) => n.status))
              return (
                <li key={f.id}>
                  <button className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-slate-50" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : f.id)}>
                    <span>
                      <span className="block text-[15px] font-medium text-slate-900">{fmt(f.detectedAt)}</span>
                      <span className="mt-1.5 flex flex-wrap gap-2">
                        <Badge tone={confirmed ? 'danger' : 'success'}>{confirmed ? 'Confirmed fall' : 'Cancelled – I was safe'}</Badge>
                        {confirmed && f.notifications.map((n) => <Badge key={n.id} tone={statusInfo(n.status).tone}>Email: {statusInfo(n.status).label}</Badge>)}
                      </span>
                    </span>
                    {expanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </button>
                  {expanded && (
                    <div className="space-y-3 bg-slate-50 px-6 pb-5 pt-3 text-sm">
                      {f.confidence !== null && <p className="text-slate-600">Detection evidence score: <strong>{Math.round(f.confidence * 100)}%</strong> <span className="text-xs">(a heuristic, not a probability)</span></p>}
                      {f.cancellationReason && <p className="text-slate-600">Reason: {f.cancellationReason}</p>}
                      {confirmed && <AlertResultCard event={f} />}
                      {resendable && (
                        <Button size="sm" variant="danger" loading={busyId === f.id} onClick={() => void resend(f)}><RefreshCw className="h-4 w-4" /> Resend alert</Button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {data && data.total > PAGE && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm">
            <span className="text-slate-600">Page {page} of {pages} · {data.total} events</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
