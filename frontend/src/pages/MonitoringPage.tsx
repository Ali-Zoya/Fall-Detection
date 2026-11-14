import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Play, Square } from 'lucide-react'
import { Alert, Button, PageHeader } from '@/components/ui'
import { CameraMonitor } from '@/components/CameraMonitor'
import { StatusPill } from '@/components/StatusPill'
import { useMonitoring } from '@/context/MonitoringContext'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/services/api'
import { POSTURE_LABELS } from '@/utils/fallDetection'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4 border-t border-slate-200 text-[15px]">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  )
}

export function MonitoringPage() {
  const m = useMonitoring()
  const { user } = useAuth()
  const contacts = useAsync(() => api.contacts.list(), [])
  const list = contacts.data?.contacts ?? []
  const loaded = !contacts.loading && !contacts.error
  const noContacts = loaded && list.length === 0
  const noEmail = loaded && list.length > 0 && !list.some((c) => c.email)
  const canStart = m.state === 'IDLE' || (m.state === 'ERROR' && !m.hasPendingAlert())
  const running = !canStart && m.state !== 'ERROR'
  const alertBusy = m.state === 'POSSIBLE_FALL' || m.state === 'COUNTDOWN' || m.state === 'FALL_CONFIRMED'
  const location = user?.shareLocation ? (m.locationState === 'denied' ? 'On (permission denied)' : m.locationState === 'ready' ? 'On' : 'On (waiting)') : 'Off'
  const sensitivity = (user?.sensitivity ?? 'MEDIUM').toLowerCase()

  return (
    <>
      <PageHeader title="Live Monitoring" description="Your camera is analysed on this device. Video is never uploaded; only a confirmed or cancelled alert is sent to the server." action={<StatusPill state={m.state} />} />

      {noContacts && (
        <Alert tone="warning" title="You have no emergency contact" className="mb-4" action={<Link to="/contacts"><Button size="sm">Add a contact</Button></Link>}>
          You can still monitor, but a confirmed fall would not notify anyone.
        </Alert>
      )}
      {noEmail && (
        <Alert tone="warning" title="Your contacts have no email address" className="mb-4" action={<Link to="/contacts"><Button size="sm">Edit contacts</Button></Link>}>
          Alerts are sent by email. Until a contact has an email address, a confirmed fall would not notify anyone.
        </Alert>
      )}
      {m.error && <Alert tone="danger" title="Monitoring problem" className="mb-4">{m.error}</Alert>}
      {m.tabHidden && running && (
        <Alert tone="warning" title="This tab is in the background" className="mb-4">Browsers slow down hidden tabs, so detection can be delayed. Keep SafeWalk visible, or open it in its own window.</Alert>
      )}

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <CameraMonitor />
          <div className="flex flex-wrap items-center gap-5">
            {canStart ? (
              <Button size="lg" onClick={() => void m.start()} loading={m.modelLoading || m.state === 'INITIALIZING_CAMERA'}>
                <Play className="h-4 w-4 fill-current" /> Start monitoring
              </Button>
            ) : (
              <Button size="lg" variant="dark" onClick={() => void m.stop()} disabled={m.state === 'FALL_CONFIRMED'}>
                <Square className="h-3.5 w-3.5 fill-current" /> Stop monitoring
              </Button>
            )}
            <p className="min-w-0 flex-[1_1_280px] text-[13px] leading-relaxed text-slate-500">
              {m.state === 'INITIALIZING_CAMERA'
                ? 'Allow camera access if your browser asks…'
                : 'Keep your whole body in view with good lighting. SafeWalk can miss falls or raise false alarms and is not a medical device.'}
            </p>
          </div>
          {m.cameraError && <Alert tone="danger" title="Camera problem">{m.cameraError}</Alert>}
          {alertBusy && <Alert tone="danger" title="Alert in progress">See the on-screen countdown.</Alert>}
        </div>

        <div className="space-y-9">
          <section>
            <h2 className="mb-3 text-[17px] font-semibold">Live detection</h2>
            <dl>
              <Row label="Person">{m.live.personDetected ? 'Visible' : <span className="text-slate-500">Not visible</span>}</Row>
              <Row label="Posture">{running ? POSTURE_LABELS[m.live.posture] : '—'}</Row>
              <Row label="Body tilt">{running && m.live.metrics ? `${Math.round(m.live.metrics.torsoAngleDeg)}°` : '—'}</Row>
              <Row label="Phase">
                {running ? (
                  m.live.phase === 'NONE' ? <span className="text-emerald-700">Normal</span> : m.live.phase === 'CANDIDATE' ? <span className="text-amber-700">Checking…</span> : <span className="text-red-700">Possible fall</span>
                ) : '—'}
              </Row>
              <Row label="Speed">{running && m.live.fps ? `${m.live.fps} fps` : '—'}</Row>
            </dl>
          </section>
          <section>
            <div className="mb-1 flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-semibold">Alert settings</h2>
              <Link to="/settings" className="flex min-h-[44px] items-center rounded text-sm text-brand-600 hover:text-brand-700">Change</Link>
            </div>
            <dl>
              <Row label="Countdown">{user?.countdownSeconds ?? 10} s</Row>
              <Row label="Sensitivity"><span className="capitalize">{sensitivity}</span></Row>
              <Row label="Alarm sound">{user?.alertSound ? 'On' : 'Off'}</Row>
              <Row label="Location in email">{location}</Row>
            </dl>
          </section>
        </div>
      </div>
    </>
  )
}
