import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

/** SafeWalk mark: a walking figure (a dot and two strokes) on a blue tile. Same drawing as public/favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8 shrink-0', className)} role="img" aria-label="SafeWalk logo">
      <rect width="64" height="64" rx="14.5" fill="#0066CC" />
      <circle cx="37" cy="14.5" r="5.5" fill="#fff" />
      <path d="M34 27 21 50M34 27l12 23" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ to = '/', className, light }: { to?: string; className?: string; light?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label="SafeWalk home">
      <LogoMark />
      <span className={cn('text-[17px] font-semibold tracking-tight', light ? 'text-white' : 'text-slate-900')}>SafeWalk</span>
    </Link>
  )
}
