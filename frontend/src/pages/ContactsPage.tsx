import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { Alert, Badge, Button, ConfirmDialog, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { ContactForm, type ContactValues } from '@/components/ContactForm'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { api } from '@/services/api'
import type { Contact } from '@/types'

export function ContactsPage() {
  const toast = useToast()
  const welcome = (useLocation().state as { welcome?: boolean } | null)?.welcome
  const { data, loading, error, reload } = useAsync(() => api.contacts.list(), [])
  const [editing, setEditing] = useState<Contact | null>(null)
  const [formKey, setFormKey] = useState(0) // bumping it gives a fresh, empty form
  const [deleting, setDeleting] = useState<Contact | null>(null)
  const [delBusy, setDelBusy] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const contacts = data?.contacts ?? []

  const focusForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    formRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }
  const startAdd = () => {
    setEditing(null)
    setFormKey((k) => k + 1)
    window.setTimeout(focusForm, 0)
  }
  const startEdit = (c: Contact) => {
    setEditing(c)
    window.setTimeout(focusForm, 0)
  }
  const save = async (v: ContactValues) => {
    if (editing) await api.contacts.update(editing.id, v)
    else await api.contacts.create(v)
    toast.success(editing ? 'Contact updated.' : 'Contact added.')
    setEditing(null)
    setFormKey((k) => k + 1)
    await reload()
  }
  const remove = async () => {
    if (!deleting) return
    setDelBusy(true)
    try {
      await api.contacts.remove(deleting.id)
      toast.success('Contact deleted.')
      if (editing?.id === deleting.id) setEditing(null)
      setDeleting(null)
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the contact.')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Emergency Contacts" description="Your primary contact receives an email if a fall is confirmed." action={<Button onClick={startAdd}><Plus className="h-4 w-4" /> Add contact</Button>} />
      {welcome && contacts.length === 0 && <Alert tone="success" title="Welcome to SafeWalk!" className="mb-6">Add at least one emergency contact to finish setting up.</Alert>}

      <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading && !data ? <Spinner /> : error ? (
            <Alert tone="danger" title="Could not load contacts" action={<Button size="sm" variant="secondary" onClick={() => void reload()}>Try again</Button>}>{error}</Alert>
          ) : contacts.length === 0 ? (
            <div className="rounded-[22px] bg-slate-50">
              <EmptyState icon={<Users className="h-6 w-6" />} title="No emergency contacts yet">
                Add a family member, friend or neighbour who should be told if you fall.
              </EmptyState>
            </div>
          ) : (
            <ul className="border-b border-slate-200">
              {contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-3.5">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-[15px] font-semibold" aria-hidden>{(c.name.trim()[0] ?? '?').toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-slate-900">{c.name}{c.isPrimary && <Badge tone="info">Primary</Badge>}</p>
                      <p className="mt-0.5 break-words text-sm text-slate-600">
                        {c.email ?? <span className="font-medium text-red-700">No email address – cannot be alerted</span>} · {c.relationship}{c.phone ? ` · ${c.phone}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(c)} aria-label={`Edit ${c.name}`} className="h-11 rounded-full px-3 text-sm text-brand-600 hover:bg-slate-50">Edit</button>
                    <button onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`} className="h-11 rounded-full px-3 text-sm text-red-700 hover:bg-red-50">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">Alerts go to the primary contact only. Ask them to check their spam folder the first time and mark SafeWalk as safe.</p>
        </div>

        <div ref={formRef} className="rounded-[22px] bg-slate-50 p-6">
          <h2 className="mb-[18px] text-[17px] font-semibold">{editing ? `Edit ${editing.name}` : 'Add emergency contact'}</h2>
          <ContactForm key={editing?.id ?? `new-${formKey}`} initial={editing} onSubmit={save} onCancel={editing ? () => setEditing(null) : undefined} />
        </div>
      </div>

      <ConfirmDialog open={!!deleting} danger title="Delete contact?" confirmLabel="Delete" loading={delBusy} onConfirm={() => void remove()} onClose={() => setDeleting(null)}
        message={<>{deleting?.name} will no longer receive fall alerts.{deleting?.isPrimary ? ' Another contact will be made primary if one exists.' : ''}</>} />
    </>
  )
}
