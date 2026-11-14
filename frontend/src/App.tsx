import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/context/ToastContext'
import { AuthProvider } from '@/context/AuthContext'
import { ChatProvider } from '@/context/ChatContext'
import { AppLayout, PublicLayout } from '@/components/layouts'
import { GuestRoute, ProtectedRoute } from '@/components/ProtectedRoute'
import { Chatbot } from '@/components/Chatbot'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage, RegisterPage } from '@/pages/AuthPages'
import { DashboardPage } from '@/pages/DashboardPage'
import { MonitoringPage } from '@/pages/MonitoringPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { FallHistoryPage } from '@/pages/FallHistoryPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TestLabPage } from '@/pages/TestLabPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ChatProvider>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route element={<GuestRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/monitoring" element={<MonitoringPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/history" element={<FallHistoryPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/test-lab" element={<TestLabPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Chatbot />
          </ChatProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
