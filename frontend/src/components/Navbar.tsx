import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FlaskConical, History, LayoutDashboard, LogOut, Mail, Menu, Settings, Users, Video, X } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './ui'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

const appLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/monitoring', label: 'Monitoring', icon: Video },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/history', label: 'Fall History', icon: History },
  { to: '/notifications', label: 'Alerts', icon: Mail },
  { to: '/test-lab', label: 'Test Lab', icon: FlaskConical },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const publicLinks = [
  { href: '/#why', label: 'Why it matters' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#prevention', label: 'Prevention' },
  { href: '/#emergency', label: 'Emergency' },
]

export function PublicNavbar() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-slate-700 md:flex" aria-label="Main">
          {publicLinks.map((l) => (
            <a key={l.href} href={l.href} className="rounded py-2 hover:text-slate-900">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link to="/dashboard"><Button variant="dark">Open dashboard</Button></Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost">Log in</Button></Link>
              <Link to="/register"><Button variant="dark">Get started</Button></Link>
            </>
          )}
        </div>
        <button className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="space-y-1 border-t border-slate-200 bg-white px-5 py-4 md:hidden" onClick={() => setOpen(false)}>
          {publicLinks.map((l) => (
            <a key={l.href} href={l.href} className="flex min-h-[44px] items-center rounded-xl px-3 text-[15px] text-slate-700 hover:bg-slate-50">{l.label}</a>
          ))}
          <div className="flex gap-2 pt-3">
            {user ? (
              <Link to="/dashboard" className="flex-1"><Button variant="dark" className="w-full">Open dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login" className="flex-1"><Button variant="secondary" className="w-full">Log in</Button></Link>
                <Link to="/register" className="flex-1"><Button variant="dark" className="w-full">Get started</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm transition-colors',
    isActive ? 'bg-white font-semibold text-slate-900 shadow-card' : 'font-medium text-slate-700 hover:bg-slate-200/60',
  )

function NavLinks() {
  return (
    <>
      {appLinks.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={linkCls}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          {label}
        </NavLink>
      ))}
    </>
  )
}

/**
 * Navigation for signed-in pages: a fixed sidebar on large screens, and a top bar with a
 * drop-down menu on phones and tablets.
 */
export function AppNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const doLogout = () => {
    logout()
    navigate('/', { replace: true })
  }
  const initial = (user?.name.trim()[0] ?? '?').toUpperCase()

  return (
    <>
      {/* Large screens: sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-7 px-4 py-6 lg:flex">
        <Logo to="/dashboard" className="min-h-[44px] px-3" />
        <nav className="flex flex-col gap-0.5" aria-label="App">
          <NavLinks />
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[13px] font-semibold text-white" aria-hidden>{initial}</span>
            <span className="truncate text-sm font-medium text-slate-900" title={user?.email}>{user?.name}</span>
          </div>
          <button onClick={doLogout} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-2 text-[13px] text-slate-600 hover:text-slate-900">
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </button>
        </div>
      </aside>

      {/* Phones and tablets: top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo to="/dashboard" />
          <button className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-200/60" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-0.5 border-t border-slate-200 px-4 py-3" aria-label="App" onClick={() => setOpen(false)}>
            <NavLinks />
            <button onClick={doLogout} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-200/60">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden /> Log out
            </button>
          </nav>
        )}
      </header>
    </>
  )
}
