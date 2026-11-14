import { useEffect, useRef } from 'react'
import { CameraOff } from 'lucide-react'
import { useMonitoring } from '@/context/MonitoringContext'
import { drawPose } from '@/utils/poseDetection'
import { cn } from '@/utils/cn'

/**
 * Visible camera preview + skeleton overlay. The analysed video is a separate hidden element
 * (owned by the monitoring engine); this component only displays the same stream, so leaving
 * the page does not stop monitoring.
 */
export function CameraMonitor({ className, showOverlay = true }: { className?: string; showOverlay?: boolean }) {
  const m = useMonitoring()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (v.srcObject !== m.stream) v.srcObject = m.stream
    if (m.stream) void v.play().catch(() => undefined)
  }, [m.stream])

  const tone: 'safe' | 'warning' | 'alert' | 'idle' =
    m.state === 'POSSIBLE_FALL' || m.state === 'COUNTDOWN' || m.state === 'FALL_CONFIRMED' || m.state === 'ALERT_SENT'
      ? 'alert'
      : m.live.phase === 'CANDIDATE'
        ? 'warning'
        : m.state === 'MONITORING'
          ? 'safe'
          : 'idle'

  useEffect(() => {
    if (!showOverlay || !m.stream) return
    let raf = 0
    const draw = () => {
      const c = canvasRef.current
      const v = videoRef.current
      if (c && v && v.videoWidth) {
        if (c.width !== v.videoWidth) c.width = v.videoWidth
        if (c.height !== v.videoHeight) c.height = v.videoHeight
        drawPose(c, m.frameRef.current.landmarks, tone)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [m.stream, m.frameRef, showOverlay, tone])

  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-3xl bg-slate-950', className)}>
      <video ref={videoRef} muted playsInline autoPlay className={cn('h-full w-full object-cover mirror', !m.stream && 'hidden')} aria-label="Live camera preview" />
      <canvas ref={canvasRef} className={cn('pointer-events-none absolute inset-0 h-full w-full object-cover mirror', !m.stream && 'hidden')} aria-hidden />
      {!m.stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
          <CameraOff className="h-10 w-10" aria-hidden />
          <p className="text-sm">{m.state === 'INITIALIZING_CAMERA' ? 'Starting camera…' : 'Camera is off. Press “Start Monitoring”.'}</p>
        </div>
      )}
    </div>
  )
}
