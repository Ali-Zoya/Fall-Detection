import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler, type ProfileUpdate } from '@/services/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  /** True while the stored token is being checked on first load. */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>
  logout: () => void
  updateProfile: (data: ProfileUpdate) => Promise<User>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null)

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  // A 401 from any API call means the token expired / is invalid → sign out.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Restore the session from the stored token.
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    api.auth
      .me()
      .then((r) => !cancelled && setUser(r.user))
      .catch(() => undefined) // a 401 already triggered logout(); other errors leave the user signed out
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.auth.login({ email, password })
    setToken(r.token)
    setUser(r.user)
  }, [])

  const register = useCallback(async (data: { name: string; email: string; phone: string; password: string }) => {
    const r = await api.auth.register(data)
    setToken(r.token)
    setUser(r.user)
  }, [])

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    const r = await api.auth.updateProfile(data)
    setUser(r.user)
    return r.user
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout, updateProfile }), [user, loading, login, register, logout, updateProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
