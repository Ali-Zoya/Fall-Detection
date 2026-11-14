/**
 * Thin typed wrapper around fetch for the SafeWalk backend.
 * The JWT is kept in localStorage and sent as "Authorization: Bearer <token>".
 * (Trade-off: localStorage tokens can be read by injected scripts; this app renders no
 * untrusted HTML, and the token expires. A cookie-based session is a possible hardening step.)
 */
import type {
  ChatReply,
  Contact,
  FallEvent,
  FallStatus,
  Notification,
  Paged,
  Sensitivity,
  User,
} from '@/types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '')
const TOKEN_KEY = 'safewalk_token'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ---- token handling ----
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable (private mode) – the session then lasts until reload */
  }
}

let onUnauthorized: (() => void) | null = null
/** AuthContext registers a callback that signs the user out when the server says the token is invalid. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  /** Do not treat a 401 as "session expired" (used by login). */
  skipUnauthorizedHandler?: boolean
  timeoutMs?: number
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(BASE_URL + path)
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== '') url.searchParams.set(k, String(v))

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000)

  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
  } catch (e) {
    const timedOut = (e as Error).name === 'AbortError'
    throw new ApiError(
      0,
      timedOut
        ? 'The server took too long to answer. Please try again.'
        : 'Cannot reach the SafeWalk server. Check your internet connection and that the backend is running.',
      'NETWORK',
    )
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 204) return undefined as T

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string; fieldErrors?: Record<string, string> } } | null)?.error
    if (res.status === 401 && !opts.skipUnauthorizedHandler) onUnauthorized?.()
    throw new ApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.code, err?.fieldErrors)
  }
  return data as T
}

// ---------------------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------------------

export interface ProfileUpdate {
  name?: string
  phone?: string
  countdownSeconds?: number
  shareLocation?: boolean
  sensitivity?: Sensitivity
  alertSound?: boolean
}

export interface ContactInput {
  name: string
  email: string
  /** Empty string or null = no phone number. */
  phone?: string | null
  relationship: string
  isPrimary?: boolean
}

export interface CreateFallPayload {
  clientEventId: string
  detectedAt: string
  status: FallStatus
  confidence?: number
  cancellationReason?: string
  location?: { latitude: number; longitude: number } | null
  timeZone?: string
}

export const api = {
  health: () => request<{ status: string; database: string; emailConfigured: boolean; aiConfigured: boolean }>('/health'),

  auth: {
    register: (b: { name: string; email: string; phone: string; password: string }) =>
      request<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: b, skipUnauthorizedHandler: true }),
    login: (b: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: b, skipUnauthorizedHandler: true }),
    me: () => request<{ user: User }>('/api/auth/me'),
    updateProfile: (b: ProfileUpdate) => request<{ user: User }>('/api/auth/profile', { method: 'PUT', body: b }),
  },

  contacts: {
    list: () => request<{ contacts: Contact[] }>('/api/contacts'),
    create: (b: ContactInput) =>
      request<{ contact: Contact }>('/api/contacts', { method: 'POST', body: b }),
    update: (id: string, b: ContactInput) =>
      request<{ contact: Contact }>(`/api/contacts/${id}`, { method: 'PUT', body: b }),
    remove: (id: string) => request<void>(`/api/contacts/${id}`, { method: 'DELETE' }),
  },

  falls: {
    create: (b: CreateFallPayload) =>
      request<{ event: FallEvent; duplicate: boolean }>('/api/falls', { method: 'POST', body: b }),
    list: (q: { status?: FallStatus; from?: string; to?: string; page?: number; pageSize?: number } = {}) =>
      request<Paged<FallEvent>>('/api/falls', { query: q }),
    get: (id: string) => request<{ event: FallEvent }>(`/api/falls/${id}`),
    resend: (id: string) => request<{ event: FallEvent }>(`/api/falls/${id}/resend`, { method: 'POST' }),
  },

  notifications: {
    list: (q: { page?: number; pageSize?: number } = {}) =>
      request<Paged<Notification>>('/api/notifications', { query: { page: q.page, pageSize: q.pageSize } }),
    /** Sends a test e-mail to the signed-in user's own address. */
    sendTest: () => request<{ ok: boolean; recipient: string }>('/api/notifications/test', { method: 'POST', timeoutMs: 45_000 }),
  },

  chat: {
    status: () => request<{ aiConfigured: boolean; suggestions: string[] }>('/api/chat/status'),
    send: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
      request<ChatReply>('/api/chat', { method: 'POST', body: { messages }, skipUnauthorizedHandler: true, timeoutMs: 45_000 }),
  },
}
