import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from './ui'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner label="Checking your session…" />
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <Outlet />
}

/** Login / register pages: signed-in users go straight to the dashboard. */
export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner label="Checking your session…" />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
