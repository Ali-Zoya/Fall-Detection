/**
 * The SafeWalk monitoring engine.
 *
 *   camera → MediaPipe Pose Landmarker → FallDetector (custom algorithm)
 *          → possible fall → countdown → cancel  /  confirm → backend (PostgreSQL + alert e-mail)
 *
 * Monitoring states (spec 3.4):
 *   IDLE → INITIALIZING_CAMERA → DETECTING_PERSON ⇄ MONITORING
 *        → POSSIBLE_FALL → COUNTDOWN → FALL_CONFIRMED → ALERT_SENT      (or ERROR)
 *
 * This hook lives inside <MonitoringProvider> (mounted once for the whole signed-in app), so the
 * camera, the detector and a running countdown keep working when the user navigates between pages.
 *
 * Privacy: frames are analysed locally. Only the final event (time, status, evidence score,
 * optional location) is sent to the backend.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision'
import { useCamera, type CameraStatus } from './useCamera'
import { loadPoseLandmarker, disposePoseLandmarker, PoseModelError } from '@/utils/poseDetection'
import {
  FallDetector,
  configForSensitivity,
  type FallPhase,
  type Posture,
  type PoseMetrics,
  type Sensitivity,
} from '@/utils/fallDetection'
import { AlarmSound } from '@/utils/alarm'
import { api, ApiError, type CreateFallPayload } from '@/services/api'
import type { FallEvent } from '@/types'

export type MonitoringState =
  | 'IDLE'
  | 'INITIALIZING_CAMERA'
  | 'DETECTING_PERSON'
  | 'MONITORING'
  | 'POSSIBLE_FALL'
  | 'COUNTDOWN'
  | 'FALL_CONFIRMED'
  | 'ALERT_SENT'
  | 'ERROR'

export const STATE_LABELS: Record<MonitoringState, string> = {
  IDLE: 'Idle',
  INITIALIZING_CAMERA: 'Initializing Camera',
  DETECTING_PERSON: 'Detecting Person',
  MONITORING: 'Monitoring',
  POSSIBLE_FALL: 'Possible Fall Detected',
  COUNTDOWN: 'Fall Confirmation Countdown',
  FALL_CONFIRMED: 'Fall Confirmed',
  ALERT_SENT: 'Alert Sent',
  ERROR: 'Error',
}

export interface MonitoringSettings {
  countdownSeconds: number
  sensitivity: Sensitivity
  shareLocation: boolean
  alertSound: boolean
}

export interface LiveInfo {
  personDetected: boolean
  posture: Posture
  phase: FallPhase
  metrics: PoseMetrics | null
  fps: number
}

export interface AlertOutcome {
  event: FallEvent
  duplicate: boolean
}

export interface FrameSnapshot {
  landmarks: NormalizedLandmark[] | null
  ts: number
}

export interface Notifier {
  success: (m: string) => void
  error: (m: string) => void
  warning: (m: string) => void
}

interface ActiveAlert {
  id: string
  detectedAt: Date
  deadline: number
  total: number
  evidence: number | null
  /** Set the moment the alert is cancelled or confirmed. Guards against double handling. */
  finalized: boolean
}

const PERSON_CONFIRM_MS = 500 // person must be visible this long before "Monitoring"
const PERSON_LOST_MS = 1500 // person must be gone this long before back to "Detecting Person"
const UI_UPDATE_MS = 250
const SEND_RETRIES = 3

const newId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useFallDetection(settings: MonitoringSettings, notify: Notifier) {
  const [state, setStateRaw] = useState<MonitoringState>('IDLE')
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState<LiveInfo>({ personDetected: false, posture: 'NO_PERSON', phase: 'NONE', metrics: null, fps: 0 })
  const [countdown, setCountdown] = useState<{ remaining: number; total: number } | null>(null)
  const [lastAlert, setLastAlert] = useState<AlertOutcome | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [locationState, setLocationState] = useState<'off' | 'waiting' | 'ready' | 'denied'>('off')

  // ---- refs (values the frame loop needs without re-rendering) ----
  const stateRef = useRef<MonitoringState>('IDLE')
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const notifyRef = useRef(notify)
  notifyRef.current = notify

  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const detectorRef = useRef<FallDetector | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const runningRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const frameRef = useRef<FrameSnapshot>({ landmarks: null, ts: 0 })
  const lastUiRef = useRef({ t: 0, frames: 0 })
  const personSinceRef = useRef<number | null>(null)
  const lostSinceRef = useRef<number | null>(null)
  const failedFramesRef = useRef(0)

  const alertRef = useRef<ActiveAlert | null>(null)
  const countdownTimerRef = useRef<number | null>(null)
  const pendingPayloadRef = useRef<CreateFallPayload | null>(null)
  const alarmRef = useRef<AlarmSound | null>(null)
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null)
  const geoWatchRef = useRef<number | null>(null)

  const camera = useCamera(() => {
    // Camera disconnected while monitoring.
    if (runningRef.current) {
      const a = alertRef.current
      if (!a || a.finalized) {
        stopLoop()
        setError('The camera was disconnected or stopped. Reconnect it and press Start Monitoring again.')
        go('ERROR')
      }
    }
  })

  const go = useCallback((next: MonitoringState) => {
    stateRef.current = next
    setStateRaw(next)
  }, [])

  // -----------------------------------------------------------------------------------
  // Location (only when the user switched location sharing on)
  // -----------------------------------------------------------------------------------
  const stopLocation = useCallback(() => {
    if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current)
    geoWatchRef.current = null
    locationRef.current = null
    setLocationState('off')
  }, [])

  const startLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocationState('waiting')
    geoWatchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        locationRef.current = { latitude: p.coords.latitude, longitude: p.coords.longitude }
        setLocationState('ready')
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
    )
  }, [])

  // -----------------------------------------------------------------------------------
  // Alarm sound
  // -----------------------------------------------------------------------------------
  const alarm = () => (alarmRef.current ??= new AlarmSound())

  // -----------------------------------------------------------------------------------
  // Loop control
  // -----------------------------------------------------------------------------------
  function stopLoop() {
    runningRef.current = false
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  const releaseResources = useCallback(() => {
    stopLoop()
    const v = videoRef.current
    if (v) {
      v.pause()
      v.srcObject = null
      v.remove()
    }
    videoRef.current = null
    landmarkerRef.current = null
    detectorRef.current = null
    camera.stop()
    stopLocation()
    frameRef.current = { landmarks: null, ts: 0 }
    personSinceRef.current = null
    lostSinceRef.current = null
    setLive({ personDetected: false, posture: 'NO_PERSON', phase: 'NONE', metrics: null, fps: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.stop, stopLocation])

  // -----------------------------------------------------------------------------------
  // Emergency workflow: possible fall → countdown → cancel / confirm
  // -----------------------------------------------------------------------------------
  const clearCountdownTimer = () => {
    if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current)
    countdownTimerRef.current = null
  }

  const sendConfirmed = useCallback(
    async (payload: CreateFallPayload) => {
      pendingPayloadRef.current = payload
      setSendError(null)
      let lastError = 'The alert could not be sent.'
      for (let attempt = 0; attempt <= SEND_RETRIES; attempt++) {
        try {
          // Same clientEventId on every attempt → the server never sends two e-mails for one event.
          const r = await api.falls.create(payload)
          pendingPayloadRef.current = null
          setLastAlert(r)
          go('ALERT_SENT')
          return
        } catch (e) {
          lastError = e instanceof Error ? e.message : lastError
          const status = e instanceof ApiError ? e.status : 0
          const retryable = status === 0 || status >= 500 || status === 408 || status === 429
          if (!retryable) break
          if (attempt < SEND_RETRIES) await sleep(1500 * (attempt + 1))
        }
      }
      setSendError(lastError)
      go('ERROR')
    },
    [go],
  )

  const confirmAlert = useCallback(
    (a: ActiveAlert) => {
      if (a.finalized) return
      a.finalized = true
      clearCountdownTimer()
      alarm().stop()
      setCountdown(null)
      go('FALL_CONFIRMED')
      const s = settingsRef.current
      void sendConfirmed({
        clientEventId: a.id,
        detectedAt: a.detectedAt.toISOString(),
        status: 'CONFIRMED',
        confidence: a.evidence ?? undefined,
        location: s.shareLocation ? locationRef.current : null,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    },
    [go, sendConfirmed],
  )

  const beginAlert = useCallback(
    (evidence: number | null) => {
      if (alertRef.current) return
      const total = Math.min(60, Math.max(5, settingsRef.current.countdownSeconds))
      const a: ActiveAlert = {
        id: newId(),
        detectedAt: new Date(),
        deadline: Date.now() + total * 1000,
        total,
        evidence,
        finalized: false,
      }
      alertRef.current = a
      setLastAlert(null)
      setSendError(null)
      go('POSSIBLE_FALL')
      setCountdown({ remaining: total, total })
      if (settingsRef.current.alertSound) alarm().start()

      // Show "Possible Fall Detected" briefly, then the countdown state. The deadline is fixed now.
      window.setTimeout(() => {
        if (alertRef.current === a && !a.finalized && stateRef.current === 'POSSIBLE_FALL') go('COUNTDOWN')
      }, 1200)

      // Deadline-based timer: stays correct even if the browser throttles timers in a background tab.
      countdownTimerRef.current = window.setInterval(() => {
        const msLeft = a.deadline - Date.now()
        if (msLeft <= 0) confirmAlert(a)
        else setCountdown({ remaining: Math.ceil(msLeft / 1000), total })
      }, 250)
    },
    [confirmAlert, go],
  )

  const cancelAlert = useCallback(
    async (reason = 'Cancelled by user (I am safe)') => {
      const a = alertRef.current
      if (!a || a.finalized) return
      a.finalized = true // a late timer tick can no longer confirm this alert
      clearCountdownTimer()
      alarm().stop()
      setCountdown(null)
      alertRef.current = null
      detectorRef.current?.reset()
      go(runningRef.current ? 'MONITORING' : 'IDLE')

      try {
        await api.falls.create({
          clientEventId: a.id,
          detectedAt: a.detectedAt.toISOString(),
          status: 'CANCELLED',
          confidence: a.evidence ?? undefined,
          cancellationReason: reason,
        })
        notifyRef.current.success('Alert cancelled. No email was sent.')
      } catch {
        notifyRef.current.warning('Alert cancelled and no email was sent, but the cancellation could not be saved to your history.')
      }
    },
    [go],
  )

  const retrySend = useCallback(() => {
    const p = pendingPayloadRef.current
    if (!p || stateRef.current !== 'ERROR') return
    go('FALL_CONFIRMED')
    void sendConfirmed(p)
  }, [go, sendConfirmed])

  /** After an alert was sent (or failed) the user decides when detection starts again. */
  const resume = useCallback(() => {
    pendingPayloadRef.current = null
    alertRef.current = null
    setLastAlert(null)
    setSendError(null)
    setError(null)
    detectorRef.current?.reset()
    go(runningRef.current ? 'MONITORING' : 'IDLE')
  }, [go])

  // -----------------------------------------------------------------------------------
  // Per-frame processing
  // -----------------------------------------------------------------------------------
  const handleFrame = useCallback(
    (landmarks: NormalizedLandmark[] | null, ts: number) => {
      const detector = detectorRef.current
      if (!detector) return
      frameRef.current = { landmarks, ts }
      lastUiRef.current.frames++

      const r = detector.update({ timestampMs: ts, landmarks })

      // ---- presence debounce: Detecting Person ⇄ Monitoring ----
      const st = stateRef.current
      if (r.personDetected) {
        lostSinceRef.current = null
        personSinceRef.current ??= ts
        if (st === 'DETECTING_PERSON' && ts - personSinceRef.current >= PERSON_CONFIRM_MS) go('MONITORING')
      } else {
        personSinceRef.current = null
        lostSinceRef.current ??= ts
        if (st === 'MONITORING' && ts - lostSinceRef.current >= PERSON_LOST_MS) go('DETECTING_PERSON')
      }

      // ---- a possible fall starts the countdown (only while normally monitoring) ----
      if (r.newlyDetectedFall && (st === 'MONITORING' || st === 'DETECTING_PERSON') && !alertRef.current) {
        beginAlert(r.evidenceScore)
      }

      // ---- throttled UI update (not 30× per second) ----
      const u = lastUiRef.current
      if (ts - u.t >= UI_UPDATE_MS) {
        const dt = (ts - u.t) / 1000
        setLive({ personDetected: r.personDetected, posture: r.posture, phase: r.phase, metrics: r.metrics, fps: u.t ? Math.round(u.frames / dt) : 0 })
        u.t = ts
        u.frames = 0
      }
    },
    [beginAlert, go],
  )

  const tick = useCallback(() => {
    if (!runningRef.current) return
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !landmarker || video.readyState < 2 || video.paused) return
    // Process each new video frame once (the rAF loop and the background interval share this check).
    if (video.currentTime === lastVideoTimeRef.current) return
    lastVideoTimeRef.current = video.currentTime
    try {
      const result = landmarker.detectForVideo(video, performance.now())
      failedFramesRef.current = 0
      handleFrame(result.landmarks?.[0] ?? null, performance.now())
    } catch (e) {
      console.error('[pose] detection error', e)
      if (++failedFramesRef.current > 30) {
        stopLoop()
        setError('Pose detection stopped working. Reload the page and start monitoring again.')
        go('ERROR')
      }
    }
  }, [go, handleFrame])

  // -----------------------------------------------------------------------------------
  // Public controls
  // -----------------------------------------------------------------------------------
  const start = useCallback(async () => {
    if (stateRef.current !== 'IDLE' && stateRef.current !== 'ERROR') return
    if (alertRef.current || pendingPayloadRef.current) return
    setError(null)
    setLastAlert(null)
    setSendError(null)
    go('INITIALIZING_CAMERA')
    alarm().unlock() // must happen inside the click handler

    try {
      setModelLoading(true)
      // Camera first, so the permission prompt appears immediately; the model loads at the same time.
      const [stream, landmarker] = await Promise.all([camera.start(), loadPoseLandmarker()])
      landmarkerRef.current = landmarker

      // Off-screen <video> that feeds MediaPipe. (The visible preview is a second <video> on the same stream.)
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.autoplay = true
      video.setAttribute('aria-hidden', 'true')
      Object.assign(video.style, { position: 'fixed', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none', left: '0', top: '0' })
      document.body.appendChild(video)
      video.srcObject = stream
      await video.play()
      if (!video.videoWidth) await new Promise((r) => video.addEventListener('loadedmetadata', r, { once: true }))
      videoRef.current = video

      const s = settingsRef.current
      detectorRef.current = new FallDetector({
        ...configForSensitivity(s.sensitivity),
        aspectRatio: video.videoWidth / Math.max(1, video.videoHeight),
      })

      if (s.shareLocation) startLocation()

      lastVideoTimeRef.current = -1
      lastUiRef.current = { t: 0, frames: 0 }
      personSinceRef.current = null
      lostSinceRef.current = null
      failedFramesRef.current = 0
      runningRef.current = true
      go('DETECTING_PERSON')

      const loop = () => {
        if (!runningRef.current) return
        tick()
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
      // Background fallback: requestAnimationFrame is paused in hidden tabs, timers are not (but may be slowed).
      intervalRef.current = window.setInterval(tick, 200)
    } catch (e) {
      releaseResources()
      const msg =
        e instanceof PoseModelError || e instanceof Error ? e.message : 'Monitoring could not be started.'
      setError(msg)
      go('ERROR')
    } finally {
      setModelLoading(false)
    }
  }, [camera, go, releaseResources, startLocation, tick])

  const stop = useCallback(async () => {
    // Stopping during a countdown counts as cancelling it.
    if (alertRef.current && !alertRef.current.finalized) await cancelAlert('Monitoring was stopped during the countdown')
    releaseResources()
    if (stateRef.current !== 'FALL_CONFIRMED' && stateRef.current !== 'ALERT_SENT' && stateRef.current !== 'ERROR') {
      go('IDLE')
    } else if (stateRef.current === 'ALERT_SENT') {
      // keep showing the alert result; the user dismisses it with "Resume"/"Dismiss"
    }
  }, [cancelAlert, go, releaseResources])

  // Start/stop location watching when the setting changes while monitoring.
  useEffect(() => {
    if (!runningRef.current) return
    if (settings.shareLocation && geoWatchRef.current === null) startLocation()
    if (!settings.shareLocation && geoWatchRef.current !== null) stopLocation()
  }, [settings.shareLocation, startLocation, stopLocation])

  // Apply sensitivity changes immediately.
  useEffect(() => {
    // Keep the real video aspect ratio; only the thresholds change with sensitivity.
    const { aspectRatio: _ignored, ...thresholds } = configForSensitivity(settings.sensitivity)
    void _ignored
    detectorRef.current?.setConfig(thresholds)
  }, [settings.sensitivity])

  // Tab visibility (detection may slow down in a hidden tab).
  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Release everything when the provider unmounts (e.g. the user logs out).
  useEffect(
    () => () => {
      clearCountdownTimer()
      alarmRef.current?.dispose()
      releaseResources()
      void disposePoseLandmarker()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return {
    state,
    error,
    sendError,
    cameraStatus: camera.status as CameraStatus,
    cameraError: camera.error,
    stream: camera.stream,
    live,
    countdown,
    lastAlert,
    modelLoading,
    tabHidden,
    locationState,
    frameRef,
    isRunning: state !== 'IDLE' && state !== 'ERROR',
    start,
    stop,
    cancelAlert,
    retrySend,
    resume,
    /** True if a failed alert is waiting to be retried. */
    hasPendingAlert: () => pendingPayloadRef.current !== null,
  }
}

export type FallDetectionEngine = ReturnType<typeof useFallDetection>
