import { useState, type FormEvent } from 'react'
import { Button, Input, Toggle } from './ui'
import { ApiError } from '@/services/api'
import type { Contact } from '@/types'

export interface ContactValues {
  name: string
  email: string
  /** Empty string = no phone number. */
  phone: string
  relationship: string
  isPrimary: boolean
}

const EMAIL_RE = /^\S+@\S+\.\S+$/
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/

export function ContactForm({ initial, onSubmit, onCancel }: { initial?: Contact | null; onSubmit: (v: ContactValues) => Promise<void>; onCancel?: () => void }) {
  const [v, setV] = useState<ContactValues>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    relationship: initial?.relationship ?? '',
    isPrimary: initial?.isPrimary ?? false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (v.name.trim().length < 2) errs.name = 'Enter the contact’s name.'
    if (!EMAIL_RE.test(v.email.trim())) errs.email = 'Enter a valid email address, e.g. name@example.com.'
    if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) errs.phone = 'Enter a valid phone number, e.g. +91 98765 43210, or leave it empty.'
    if (!v.relationship.trim()) errs.relationship = 'Enter the relationship (e.g. Son, Neighbour).'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setFormError(null)
    try {
      await onSubmit({ ...v, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), relationship: v.relationship.trim() })
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors)
      setFormError(err instanceof Error ? err.message : 'Could not save the contact.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-[18px]" noValidate>
      {formError && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{formError}</p>}
      <Input label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errors.name} autoComplete="off" />
      <Input label="Email address" type="email" inputMode="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={errors.email} hint="Alerts are sent to this address." autoComplete="off" />
      <Input label="Relationship" value={v.relationship} onChange={(e) => setV({ ...v, relationship: e.target.value })} error={errors.relationship} />
      <Input label="Phone number (optional)" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} error={errors.phone} hint="Only shown to you, so you can call them. Include the country code, e.g. +91…" autoComplete="off" />
      <Toggle checked={v.isPrimary} onChange={(x) => setV({ ...v, isPrimary: x })} label="Primary contact" description="The primary contact receives the alert email." />
      <div className="flex gap-2.5 pt-1">
        {onCancel && <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>Cancel</Button>}
        <Button type="submit" className="flex-1" loading={busy}>{initial ? 'Save changes' : 'Add contact'}</Button>
      </div>
    </form>
  )
}
