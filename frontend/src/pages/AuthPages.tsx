import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { LogoMark } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/services/api'

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-[28px] bg-white p-7 sm:p-10">
          <LogoMark className="h-11 w-11" />
          <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-[-0.03em]">{title}</h1>
          <p className="mt-1.5 text-[15px] text-slate-600">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid e-mail address.'
    if (!password) errs.password = 'Enter your password.'
    setFields(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setFields(err.fieldErrors)
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell title="Welcome back" subtitle="Log in to your SafeWalk account." footer={<>New to SafeWalk? <Link to="/register" className="text-brand-600 hover:text-brand-700">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{error}</p>}
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} />
        <Button type="submit" className="w-full" size="lg" loading={busy}>Log in</Button>
      </form>
    </Shell>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [v, setV] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs: Record<string, string> = {}
    if (v.name.trim().length < 2) errs.name = 'Enter your name (at least 2 characters).'
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errs.email = 'Enter a valid e-mail address.'
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(v.phone.trim())) errs.phone = 'Enter a valid phone number, e.g. +91 98765 43210.'
    if (v.password.length < 8) errs.password = 'Use at least 8 characters.'
    else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) errs.password = 'Include at least one letter and one number.'
    if (v.confirm !== v.password) errs.confirm = 'Passwords do not match.'
    setFields(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await register({ name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), password: v.password })
      navigate('/contacts', { replace: true, state: { welcome: true } })
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setFields(err.fieldErrors)
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell title="Create your account" subtitle="Takes a minute. Next you’ll add an emergency contact." footer={<>Already registered? <Link to="/login" className="text-brand-600 hover:text-brand-700">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{error}</p>}
        <Input label="Full name" autoComplete="name" value={v.name} onChange={set('name')} error={fields.name} />
        <Input label="Email" type="email" autoComplete="email" value={v.email} onChange={set('email')} error={fields.email} />
        <Input label="Your phone number" type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} error={fields.phone} hint="With country code, e.g. +91… It is included in the alert email so your contact can call you." />
        <Input label="Password" type="password" autoComplete="new-password" value={v.password} onChange={set('password')} error={fields.password} hint="At least 8 characters, with a letter and a number." />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={v.confirm} onChange={set('confirm')} error={fields.confirm} />
        <Button type="submit" className="w-full" size="lg" loading={busy}>Create account</Button>
      </form>
    </Shell>
  )
}
