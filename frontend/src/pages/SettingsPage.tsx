import { useEffect, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Alert, Button, Card, CardHeader, Input, PageHeader, Select, Toggle } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useMonitoring } from '@/context/MonitoringContext'
import { ApiError, api } from '@/services/api'
import type { Sensitivity } from '@/types'

type Perm = PermissionState | 'unsupported'
function usePermission(name: 'camera' | 'geolocation'): Perm {
  const [s, setS] = useState<Perm>('unsupported')
  useEffect(() => {
    let status: PermissionStatus | null = null
    const onChange = () => status && setS(status.state)
    navigator.permissions
      ?.query({ name: name as PermissionName })
      .then((p) => {
        status = p
        setS(p.state)
        p.addEventListener('change', onChange)
      })
      .catch(() => setS('unsupported'))
    return () => status?.removeEventListener('change', onChange)
  }, [name])
  return s
}
const permText: Record<Perm, string> = { granted: 'Allowed', denied: 'Blocked – change it in your browser’s site settings', prompt: 'Not asked yet', unsupported: 'Unknown (browser does not report it)' }

export function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const m = useMonitoring()
  const cam = usePermission('camera')
  const geo = usePermission('geolocation')
  const [v, setV] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    countdownSeconds: String(user?.countdownSeconds ?? 10),
    sensitivity: (user?.sensitivity ?? 'MEDIUM') as Sensitivity,
    alertSound: user?.alertSound ?? true,
    shareLocation: user?.shareLocation ?? false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  const sendTest = async () => {
    setTesting(true)
    try {
      const r = await api.notifications.sendTest()
      toast.success(`Test email sent to ${r.recipient}. Check your inbox and spam folder.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The test email could not be sent.')
    } finally {
      setTesting(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const secs = Number(v.countdownSeconds)
    if (v.name.trim().length < 2) errs.name = 'Enter your name.'
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(v.phone.trim())) errs.phone = 'Enter a valid phone number.'
    if (!Number.isInteger(secs) || secs < 5 || secs > 60) errs.countdownSeconds = 'Enter a whole number from 5 to 60.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await updateProfile({ name: v.name.trim(), phone: v.phone.trim(), countdownSeconds: secs, sensitivity: v.sensitivity, alertSound: v.alertSound, shareLocation: v.shareLocation })
      toast.success('Settings saved.')
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors)
      toast.error(err instanceof Error ? err.message : 'Could not save settings.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Profile, alert behaviour and permissions." />
      <form onSubmit={submit} className="space-y-6" noValidate>
        <Card>
          <CardHeader title="Profile" />
          <div className="grid gap-5 p-6 sm:grid-cols-2">
            <Input label="Full name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errors.name} />
            <Input label="Phone number" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} error={errors.phone} hint="Included in the alert email so your contact can call you." />
            <Input label="Email" value={user?.email ?? ''} disabled hint="Email cannot be changed." />
          </div>
        </Card>

        <Card>
          <CardHeader title="Fall alert" description="How SafeWalk reacts to a possible fall." />
          <div className="space-y-6 p-6">
            <Input label="Confirmation countdown (seconds)" type="number" inputMode="numeric" min={5} max={60} value={v.countdownSeconds} onChange={(e) => setV({ ...v, countdownSeconds: e.target.value })} error={errors.countdownSeconds} hint="Time you have to press “I’m Safe” before the email is sent. 5–60, default 10." className="max-w-xs" />
            <Select label="Detection sensitivity" value={v.sensitivity} onChange={(e) => setV({ ...v, sensitivity: e.target.value as Sensitivity })} className="max-w-xs" hint="High catches more falls but gives more false alarms.">
              <option value="LOW">Low – fewer false alarms</option>
              <option value="MEDIUM">Medium (recommended)</option>
              <option value="HIGH">High – catches more falls</option>
            </Select>
            <Toggle checked={v.alertSound} onChange={(x) => setV({ ...v, alertSound: x })} label="Alarm sound during countdown" description="A beeping sound so you notice the countdown." />
            <Toggle checked={v.shareLocation} onChange={(x) => setV({ ...v, shareLocation: x })} label="Include my location in the email" description="Off by default. Your browser will ask for permission when monitoring starts." />
            {m.isRunning && <Alert tone="info">Changes apply to monitoring that is already running, except the countdown length, which applies to the next alert.</Alert>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Permissions" description="Managed by your browser, not by SafeWalk." />
          <dl className="px-6 text-[15px]">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3.5"><dt className="text-slate-600">Camera</dt><dd className="font-medium">{permText[cam]}</dd></div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 py-3.5"><dt className="text-slate-600">Location</dt><dd className="font-medium">{permText[geo]}</dd></div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Email alerts" description="Check that SafeWalk can send email before you rely on it." />
          <div className="flex flex-wrap items-center justify-between gap-4 p-6">
            <p className="min-w-0 flex-[1_1_280px] text-sm leading-relaxed text-slate-600">Sends a test message to your own address ({user?.email}). Your emergency contact is not emailed.</p>
            <Button variant="secondary" onClick={() => void sendTest()} loading={testing}><Send className="h-4 w-4" /> Send test email</Button>
          </div>
        </Card>

        <div className="flex justify-end"><Button type="submit" size="lg" loading={busy}>Save settings</Button></div>
      </form>
    </>
  )
}
