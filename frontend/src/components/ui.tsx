import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { toneClasses, type Tone } from '@/utils/notificationStatus'

// ---------------------------------------------------------------- Button
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'dark'
type Size = 'sm' | 'md' | 'lg'
const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm hover:from-brand-700 hover:to-indigo-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:shadow-none',
  dark: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow active:scale-[0.98] disabled:opacity-50',
  secondary: 'bg-white text-slate-800 border border-slate-200/90 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 active:scale-[0.98] disabled:text-slate-400',
  danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm hover:from-red-700 hover:to-rose-700 hover:shadow active:scale-[0.98] disabled:opacity-50',
  success: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 hover:shadow active:scale-[0.98] disabled:opacity-50',
  ghost: 'text-slate-700 hover:bg-slate-100/80 active:scale-[0.98] disabled:text-slate-400',
}
const sizes: Record<Size, string> = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-5 text-[15px]', lg: 'h-[52px] px-7 text-base' }

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 ease-out disabled:cursor-not-allowed', variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

// ---------------------------------------------------------------- Card
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card transition-all duration-300 ease-out hover:border-slate-300/80 hover:shadow-card-hover', className)}>
      {children}
    </div>
  )
}
export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
      <div>
        <h2 className="text-[17px] font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ---------------------------------------------------------------- Form fields
interface FieldProps {
  label: string
  error?: string
  hint?: string
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      <input
        ref={ref}
        id={fid}
        aria-invalid={!!error}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cn(
          'h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-brand-600 disabled:bg-slate-50 disabled:text-slate-500',
          error ? 'border-red-500' : 'border-slate-300',
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={`${fid}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fid}-err`} role="alert" className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
})

export function Select({ label, error, hint, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      <select id={fid} aria-invalid={!!error} className={cn('h-12 w-full rounded-xl border bg-white px-3 text-[15px] text-slate-900', error ? 'border-red-500' : 'border-slate-300')} {...rest}>
        {children}
      </select>
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export function Textarea({ label, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const fid = useId()
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      <textarea id={fid} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px]" {...rest} />
    </div>
  )
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-[15px] font-medium text-slate-900">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-emerald-600' : 'bg-slate-300')}
      >
        <span className={cn('absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- Badges and notices
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', toneClasses[tone], className)}>{children}</span>
}

const alertStyles: Record<Tone, { box: string; icon: typeof Info; iconColor: string }> = {
  success: { box: 'bg-slate-50', icon: CheckCircle2, iconColor: 'text-emerald-700' },
  warning: { box: 'bg-slate-50', icon: AlertTriangle, iconColor: 'text-amber-600' },
  danger: { box: 'bg-red-50', icon: AlertCircle, iconColor: 'text-red-700' },
  info: { box: 'bg-slate-50', icon: Info, iconColor: 'text-slate-500' },
  neutral: { box: 'bg-slate-50', icon: Info, iconColor: 'text-slate-500' },
}
export function Alert({ tone = 'info', title, children, action, className }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  const s = alertStyles[tone]
  const Icon = s.icon
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-2xl p-4 text-sm leading-relaxed text-slate-700', s.box, className)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', s.iconColor)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-slate-900">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {label}
    </div>
  )
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-3.5 text-slate-600">{icon}</div>
      <h3 className="text-[17px] font-semibold text-slate-900">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-slate-600">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-slate-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ---------------------------------------------------------------- Modal
export function Modal({ open, onClose, title, children, footer, dismissable = true }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; dismissable?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose, dismissable])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={dismissable ? onClose : undefined} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-float animate-fade-in">
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {dismissable && (
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 pb-5 pt-1">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onClose }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px] leading-relaxed text-slate-600">{message}</div>
    </Modal>
  )
}
