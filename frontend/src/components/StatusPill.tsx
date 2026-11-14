import { STATE_LABELS, type MonitoringState } from '@/hooks/useFallDetection'
import type { Tone } from '@/utils/notificationStatus'
import { Badge } from './ui'

const TONE: Record<MonitoringState, Tone> = {
  IDLE: 'neutral',
  INITIALIZING_CAMERA: 'info',
  DETECTING_PERSON: 'warning',
  MONITORING: 'success',
  POSSIBLE_FALL: 'danger',
  COUNTDOWN: 'danger',
  FALL_CONFIRMED: 'danger',
  ALERT_SENT: 'warning',
  ERROR: 'danger',
}

export function StatusPill({ state }: { state: MonitoringState }) {
  return (
    <Badge tone={TONE[state]} className="h-9 gap-2 px-4 text-sm">
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {STATE_LABELS[state]}
    </Badge>
  )
}
