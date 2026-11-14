import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            SafeWalk uses your camera and AI pose estimation to watch for possible falls and emails the emergency contact you choose.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm">
          <div>
            <p className="font-semibold text-slate-900">Product</p>
            <ul className="mt-3 space-y-2.5 text-slate-600">
              <li><Link className="hover:text-slate-900" to="/#how-it-works">How it works</Link></li>
              <li><Link className="hover:text-slate-900" to="/register">Create account</Link></li>
              <li><Link className="hover:text-slate-900" to="/login">Log in</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-900">In an emergency</p>
            <p className="mt-3 leading-relaxed text-slate-600">
              Call <strong className="font-semibold text-slate-900">112</strong> (India). SafeWalk does not contact ambulances or emergency services.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-6 text-xs leading-relaxed text-slate-500 sm:px-8">
          <p className="max-w-3xl">
            SafeWalk is a software project and is not a medical device. It can miss falls or raise false alarms. Do not rely on it as your only safety measure.
          </p>
          <p>© {new Date().getFullYear()} SafeWalk</p>
        </div>
      </div>
    </footer>
  )
}
