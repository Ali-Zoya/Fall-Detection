import { Outlet } from 'react-router-dom'
import { AppNavbar, PublicNavbar } from './Navbar'
import { Footer } from './Footer'
import { AlertBanner, EmergencyCountdown } from './EmergencyCountdown'
import { MonitoringProvider } from '@/context/MonitoringContext'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50/70">
      <PublicNavbar />
      <main id="main" className="flex-1 animate-fade-in"><Outlet /></main>
      <Footer />
    </div>
  )
}

/** Signed-in pages: grey frame with the navigation, and the page itself on a white panel. */
export function AppLayout() {
  return (
    <MonitoringProvider>
      <div className="min-h-screen bg-slate-100/70 lg:flex">
        <AppNavbar />
        <main id="main" className="min-w-0 flex-1 bg-white/90 backdrop-blur-md px-5 py-8 sm:px-8 lg:my-3 lg:mr-3 lg:rounded-3xl lg:border lg:border-slate-200/60 lg:px-11 lg:py-10 shadow-sm animate-fade-in">
          <div className="mx-auto w-full max-w-6xl">
            <AlertBanner />
            <Outlet />
          </div>
        </main>
      </div>
      <EmergencyCountdown />
    </MonitoringProvider>
  )
}
