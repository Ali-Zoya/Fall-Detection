import { useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import { Alert, Badge, Button, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/services/api'
import { statusInfo } from '@/utils/notificationStatus'

const PAGE = 15
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useAsync(() => api.notifications.list({ page, pageSize: PAGE }), [page])
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1
  return (
    <>
      <PageHeader title="Alerts" description="Every alert email SafeWalk tried to send, newest first." action={<Button variant="secondary" onClick={() => void reload()} loading={loading}><RefreshCw className="h-4 w-4" /> Refresh</Button>} />
      {loading && !data ? <Spinner /> : error ? (
        <Alert tone="danger" title="Could not load alerts" action={<Button size="sm" variant="secondary" onClick={() => void reload()}>Try again</Button>}>{error}</Alert>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-[22px] bg-slate-50"><EmptyState icon={<Mail className="h-6 w-6" />} title="No alerts yet">Alert emails are listed here after a fall is confirmed.</EmptyState></div>
      ) : (
        <ul className="border-b border-slate-200">
          {data.items.map((n) => {
            const s = statusInfo(n.status)
            return (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-200 py-4">
                <div className="min-w-0">
                  <p className="break-words text-[15px] font-medium text-slate-900">{n.recipient === '-' ? 'No recipient' : n.recipient}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{fmt(n.sentAt ?? n.createdAt)} · {n.errorMessage ?? s.description}</p>
                </div>
                <Badge tone={s.tone}>{s.label}</Badge>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-4 text-xs leading-relaxed text-slate-500">“Sent” means the mail server accepted the email. It does not confirm that it was opened, so call your contact if you still need help.</p>
      {data && data.total > PAGE && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-slate-600">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  )
}
