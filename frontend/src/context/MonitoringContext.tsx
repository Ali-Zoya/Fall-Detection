import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useFallDetection, type FallDetectionEngine, type MonitoringSettings } from '@/hooks/useFallDetection'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const MonitoringContext = createContext<FallDetectionEngine | null>(null)

/**
 * Mounted once around all signed-in pages, so monitoring (camera, detector, countdown)
 * keeps running when the user navigates between pages.
 */
export function MonitoringProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()
  const settings = useMemo<MonitoringSettings>(
    () => ({
      countdownSeconds: user?.countdownSeconds ?? 10,
      sensitivity: user?.sensitivity ?? 'MEDIUM',
      shareLocation: user?.shareLocation ?? false,
      alertSound: user?.alertSound ?? true,
    }),
    [user?.countdownSeconds, user?.sensitivity, user?.shareLocation, user?.alertSound],
  )
  const engine = useFallDetection(settings, toast)
  return <MonitoringContext.Provider value={engine}>{children}</MonitoringContext.Provider>
}

export function useMonitoring(): FallDetectionEngine {
  const ctx = useContext(MonitoringContext)
  if (!ctx) throw new Error('useMonitoring must be used inside <MonitoringProvider>')
  return ctx
}
