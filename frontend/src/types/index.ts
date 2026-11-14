import type { Sensitivity } from '@/utils/fallDetection'

export type { Sensitivity }

export interface User {
  id: string
  name: string
  email: string
  phone: string
  countdownSeconds: number
  shareLocation: boolean
  sensitivity: Sensitivity
  alertSound: boolean
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  name: string
  /** Address fall alerts are e-mailed to. Null only for contacts saved before e-mail alerts existed. */
  email: string | null
  /** Optional, so you can call the contact yourself. */
  phone: string | null
  relationship: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export type FallStatus = 'CONFIRMED' | 'CANCELLED'

export interface Notification {
  id: string
  fallEventId: string
  recipient: string
  message: string
  /** pending | sent | failed | no_contact | not_configured (older rows may hold SMS statuses) */
  status: string
  providerMessageId: string | null
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
  fallEvent?: { id: string; detectedAt: string; status: FallStatus }
}

export interface FallEvent {
  id: string
  clientEventId: string
  detectedAt: string
  status: FallStatus
  confidence: number | null
  cancellationReason: string | null
  createdAt: string
  notifications: Notification[]
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface SourceRef {
  name: string
  url?: string
}

export interface ChatReply {
  reply: string
  mode: 'ai' | 'fallback'
  emergency: boolean
  sources: SourceRef[]
  notice?: string
}

export interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  emergency?: boolean
  sources?: SourceRef[]
  notice?: string
  mode?: 'ai' | 'fallback'
  isError?: boolean
}
