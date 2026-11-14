import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FlaskConical, Play, XCircle } from 'lucide-react'
import { Alert, Badge, Button, Card, CardHeader, PageHeader } from '@/components/ui'
import { DEFAULT_CONFIG, FallDetector, POSTURE_LABELS, configForSensitivity, type Posture } from '@/utils/fallDetection'
import { SCENARIOS, buildScenarioFrames } from '@/utils/syntheticPoses'
import { drawPose } from '@/utils/poseDetection'
import { useAuth } from '@/context/AuthContext'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

interface RunResult {
  id: string
  fallDetected: boolean
  fallAtSec: number | null
  evidence: number | null
}

/**
 * Test mode: feeds scripted pose sequences (not camera video) through the SAME FallDetector used for live monitoring.
 * It never touches the camera, the database or the mail server – nothing is saved and no e-mail is sent.
 */
export function TestLabPage() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(SCENARIOS[0].id)
  const [running, setRunning] = useState(false)
  const [posture, setPosture] = useState<Posture>('NO_PERSON')
  const [phase, setPhase] = useState('NONE')
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<Record<string, RunResult>>({})
  const [simCountdown, setSimCountdown] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stopRef = useRef(false)
  const timers = useRef<number[]>([])
  const scenario = SCENARIOS.find((s) => s.id === selected)!

  useEffect(
    () => () => {
      stopRef.current = true
      timers.current.forEach(clearTimeout)
    },
    [],
  )

  const run = async () => {
    setRunning(true)
    stopRef.current = false
    setSimCountdown(null)
    const frames = buildScenarioFrames(scenario)
    const det = new FallDetector(configForSensitivity(user?.sensitivity ?? 'MEDIUM', DEFAULT_CONFIG))
    const t0 = frames[0].timestampMs
    const wallStart = performance.now()
    let fallAt: number | null = null
    let evidence: number | null = null
    let i = 0
    await new Promise<void>((resolve) => {
      const step = () => {
        if (stopRef.current) return resolve()
        const elapsed = performance.now() - wallStart
        while (i < frames.length && frames[i].timestampMs - t0 <= elapsed) {
          const f = frames[i++]
          const r = det.update(f)
          setPosture(r.posture)
          setPhase(r.phase)
          if (r.newlyDetectedFall && fallAt === null) {
            fallAt = (f.timestampMs - t0) / 1000
            evidence = r.evidenceScore
          }
          if (canvasRef.current) {
            const c = canvasRef.current
            c.width = 400
            c.height = 300
            drawPose(c, f.landmarks as NormalizedLandmark[] | null, r.phase === 'POSSIBLE_FALL' ? 'alert' : r.phase === 'CANDIDATE' ? 'warning' : 'safe')
          }
        }
        setProgress(Math.min(1, i / frames.length))
        if (i >= frames.length) return resolve()
        timers.current.push(window.setTimeout(step, 16))
      }
      step()
    })
    setResults((p) => ({ ...p, [scenario.id]: { id: scenario.id, fallDetected: fallAt !== null, fallAtSec: fallAt, evidence } }))
    setRunning(false)
    if (fallAt !== null && !stopRef.current) {
      // Simulated countdown – display only. No API call is made here.
      const total = user?.countdownSeconds ?? 10
      let left = total
      setSimCountdown(left)
      const iv = window.setInterval(() => {
        left -= 1
        if (left <= 0) {
          clearInterval(iv)
          setSimCountdown(0)
        } else setSimCountdown(left)
      }, 1000)
      timers.current.push(iv)
    }
  }

  const res = results[scenario.id]
  return (
    <>
      <PageHeader title="Test Lab" description="Try the fall-detection algorithm with scripted pose sequences – no camera needed." />
      <Alert tone="info" title="Nothing is saved or sent" className="mb-6">
        These runs use the real detection algorithm on simulated skeletons. No fall event is stored and no email is sent. A passing test here does not prove the live camera pipeline works – use Live Monitoring to try that.
      </Alert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Scenarios" />
          <ul className="divide-y divide-slate-100">
            {SCENARIOS.map((s) => {
              const r = results[s.id]
              const ok = r ? r.fallDetected === s.expectFall : null
              return (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-slate-50">
                    <input type="radio" name="scenario" className="mt-1" checked={selected === s.id} onChange={() => !running && setSelected(s.id)} disabled={running} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-slate-900">{s.label}</span>
                      <span className="block text-xs text-slate-600">{s.description}</span>
                      <span className="mt-1 block text-xs text-slate-500">Expected: {s.expectFall ? 'fall detected' : 'no fall'}</span>
                    </span>
                    {ok === true && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="As expected" />}
                    {ok === false && <XCircle className="h-5 w-5 text-red-600" aria-label="Unexpected result" />}
                  </label>
                </li>
              )
            })}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Simulated skeleton" action={<Button onClick={() => void run()} loading={running}><Play className="h-4 w-4" /> Run scenario</Button>} />
            <div className="p-5">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-950">
                <canvas ref={canvasRef} width={400} height={300} className="h-full w-full" aria-label="Simulated skeleton" />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600 transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="info">Posture: {POSTURE_LABELS[posture]}</Badge>
                <Badge tone={phase === 'POSSIBLE_FALL' ? 'danger' : phase === 'CANDIDATE' ? 'warning' : 'success'}>Phase: {phase === 'NONE' ? 'Normal' : phase === 'CANDIDATE' ? 'Checking' : 'Possible fall'}</Badge>
              </div>
            </div>
          </Card>
          {res && (
            <Alert tone={res.fallDetected === scenario.expectFall ? 'success' : 'danger'} title={res.fallDetected === scenario.expectFall ? 'Result matches the expectation' : 'Result differs from the expectation'}>
              {res.fallDetected ? `Possible fall raised after ${res.fallAtSec?.toFixed(1)} s (evidence score ${res.evidence !== null ? Math.round(res.evidence * 100) : '—'}%).` : 'No fall was raised.'}
            </Alert>
          )}
          {simCountdown !== null && (
            <Card className="p-5 text-center">
              <FlaskConical className="mx-auto h-6 w-6 text-slate-400" aria-hidden />
              <p className="mt-1 text-sm text-slate-600">Simulated countdown (test mode)</p>
              <p className="text-5xl font-bold tabular-nums">{simCountdown}</p>
              <p className="mt-1 text-xs text-slate-500">{simCountdown === 0 ? 'In real monitoring, the email would be sent now. Here: nothing was sent.' : 'In real monitoring you could press “I’m Safe” now.'}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
