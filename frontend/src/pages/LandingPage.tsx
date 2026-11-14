import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, ChevronRight, ExternalLink, Mail, MessageSquare, Phone } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useChat } from '@/context/ChatContext'
import { AntigravityHeroBackground } from '@/components/AntigravityHeroBackground'

const REPORT_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSf9b2_F5FtsgVT5x-iZfQQwWt8ye7bEaH9tiw0Mqxf_UQBO_A/viewform?usp=header'

// India figures. Sources: Longitudinal Ageing Study in India (LASI) Wave 1, 2017-18 (31,477 adults
// aged 60+: 12.9% fell once and 9.8% fell two or more times in the past two years), and the
// World Health Organization falls fact sheet.
const stats = [
  ['1 in 5', 'About one in five Indians aged 60 and over fell at least once in the past two years.'],
  ['1 in 10', 'About one in ten Indians aged 60 and over fell two or more times in that period.'],
  ['60%', 'Of the world’s deaths from falls, about 60% happen in the South-East Asia and Western Pacific regions, which include India.'],
]
const steps = [
  { title: 'The camera sees you', text: 'A pose model runs inside your browser. Video never leaves your device.' },
  { title: 'Posture is analysed', text: 'Body angle and how fast your hips drop tell a fall from sitting or bending.' },
  { title: 'You get a countdown', text: 'Press “I’m Safe” to cancel. Nobody is contacted.' },
  { title: 'Your contact gets an email', text: 'If you don’t cancel, your emergency contact is emailed, and you see whether it was sent.' },
]
const assurances = [
  ['Private by design.', 'Camera frames are analysed on your device and never uploaded.'],
  ['Your contacts only.', 'Only people you add receive an alert.'],
  ['Honest status.', 'You see whether the email was sent or failed, never a guess.'],
]
const precautions = [
  { title: 'Home safety', text: 'Remove tripping hazards, improve lighting, install grab bars and handrails.' },
  { title: 'Vision care', text: 'Regular eye exams, good lighting, and wearing prescribed glasses.' },
  { title: 'Exercise and balance', text: 'Strength training, balance exercises, tai chi and regular activity.' },
  { title: 'Medication review', text: 'Review medicines regularly with a doctor or pharmacist to spot fall risks.' },
]
const checklist = [
  'Talk with your doctor about fall risks',
  'Check your home for hazards',
  'Get your eyes checked every year',
  'Stay active with strength and balance exercises',
  'Review medications with a pharmacist or doctor',
  'Use assistive devices when recommended',
  'Wear supportive, non-slip footwear',
  'Sleep well and eat a balanced diet',
]

const h2 = 'text-[clamp(1.875rem,3.4vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.03em]'

/** Decorative preview of the monitoring view showing walking, fall detection, and alert badge popup. */
function HeroVisual() {
  return (
    <div className="flex flex-col items-end" aria-hidden>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)]">
        <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/80 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          AI Live Monitoring
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/10 via-transparent to-transparent pointer-events-none" />

        {/* Floor line & room grid */}
        <div className="absolute bottom-12 inset-x-8 h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
        <div className="absolute bottom-8 inset-x-14 h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />

        {/* Dynamic Pose Figure: Walks -> Falls -> Triggers Alert */}
        <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Animated posture group */}
          <g className="animate-walk-fall">
            {/* Torso & Head */}
            <circle cx="0" cy="-60" r="11" fill="#fff" filter="url(#glow)" />
            <path d="M0 -48 L0 18" strokeWidth="4" strokeLinecap="round" className="animate-posture-stroke" />

            {/* Arms */}
            <path d="M0 -34 L-20 -10 L-26 12" strokeWidth="3" strokeLinecap="round" className="animate-posture-stroke" />
            <path d="M0 -34 L20 -12 L24 10" strokeWidth="3" strokeLinecap="round" className="animate-posture-stroke" />

            {/* Left Leg (Swinging during walk) */}
            <g className="animate-leg-left">
              <path d="M0 18 L-14 48 L-10 82" strokeWidth="3.5" strokeLinecap="round" className="animate-posture-stroke" />
              <circle cx="-14" cy="48" r="4" className="animate-posture-fill" />
              <circle cx="-10" cy="82" r="3.5" className="animate-posture-fill" />
            </g>

            {/* Right Leg (Swinging opposite) */}
            <g className="animate-leg-right">
              <path d="M0 18 L14 48 L16 82" strokeWidth="3.5" strokeLinecap="round" className="animate-posture-stroke" />
              <circle cx="14" cy="48" r="4" className="animate-posture-fill" />
              <circle cx="16" cy="82" r="3.5" className="animate-posture-fill" />
            </g>

            {/* Key joint dots */}
            <circle cx="0" cy="-34" r="4" className="animate-posture-fill" />
            <circle cx="-20" cy="-10" r="3.5" className="animate-posture-fill" />
            <circle cx="20" cy="-12" r="3.5" className="animate-posture-fill" />
            <circle cx="0" cy="18" r="4" className="animate-posture-fill" />
          </g>
        </svg>
      </div>

      {/* Pop-up Alert Badge coordinated with the fall */}
      <div className="relative -mt-11 mr-6 flex w-[min(340px,86%)] items-center gap-3.5 rounded-[22px] border border-slate-200/80 bg-white/95 px-5 py-4 shadow-float backdrop-blur-lg animate-alert-pop transition-transform duration-300">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-sm">
          <Mail className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">Emergency Alert Emailed</span>
          <span className="block text-[12px] text-slate-500">To your primary contact</span>
        </span>
      </div>
    </div>
  )
}

export function LandingPage() {
  const { user } = useAuth()
  const { setOpen } = useChat()
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <>
      {/* Hero with dynamic antigravity-inspired animated background */}
      <section className="relative overflow-hidden bg-slate-50 min-h-[640px]">
        {/* Antigravity floating geometric particle & constellation canvas */}
        <AntigravityHeroBackground />

        {/* Ambient gradient lighting and cyber dot mesh */}
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-brand-400/20 to-transparent blur-[140px] animate-orb-1"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-1/4 h-[650px] w-[650px] rounded-full bg-gradient-to-br from-blue-400/15 via-teal-300/15 to-emerald-400/15 blur-[150px] animate-orb-2"
          aria-hidden
        />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-16 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-medium text-slate-600">Fall detection that runs on your device</p>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.035em] text-balance">If you fall, the right people hear about it.</h1>
            <p className="max-w-[30em] text-[19px] leading-normal text-slate-700">SafeWalk watches for falls through your camera, gives you a moment to say you’re fine, and otherwise emails the people you trust.</p>
            <div className="flex flex-wrap items-center gap-6 pt-2">
              {user ? <Link to="/monitoring"><Button size="lg">Go to Monitoring</Button></Link> : <Link to="/register"><Button size="lg">Get started</Button></Link>}
              <a href="#how-it-works" className="flex min-h-[44px] items-center gap-1 rounded text-[17px] text-brand-600 hover:text-brand-700">How it works <ChevronRight className="h-4 w-4" aria-hidden /></a>
            </div>
            <p className="max-w-[38em] text-xs leading-relaxed text-slate-500">SafeWalk is a software project, not a medical device, and cannot call ambulances. It can miss falls or raise false alarms.</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Why */}
      <section id="why" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div className="max-w-2xl">
          <h2 className={h2}>After a fall, minutes matter.</h2>
          <p className="mt-3 text-[17px] text-slate-600">Every minute on the floor increases the risk of complications.</p>
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {stats.map(([n, t]) => (
            <div key={n} className="border-t border-slate-300 pt-6">
              <p className="text-[56px] font-bold leading-none tracking-[-0.04em]">{n}</p>
              <p className="mt-2.5 text-[15px] leading-normal text-slate-600">{t}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-slate-500">Figures: Longitudinal Ageing Study in India (LASI) Wave 1, 2017–18, and the World Health Organization falls fact sheet.</p>
      </section>

      {/* How */}
      <section id="how-it-works" className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-brand-50/20 to-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col items-start gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
              The Architecture
            </span>
            <h2 className={h2}>How SafeWalk works</h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="group rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-card-hover">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-[13px] font-bold text-slate-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-[19px] font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {assurances.map(([t, d]) => (
              <p key={t} className="text-[15px] leading-normal text-slate-600"><strong className="font-semibold text-slate-900">{t}</strong> {d}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Prevention */}
      <section id="prevention" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div className="max-w-2xl">
          <h2 className={h2}>Preventing falls</h2>
          <p className="mt-3 text-[17px] text-slate-600">Practical habits that lower the risk of falling. This is general information; talk to a doctor about your own situation.</p>
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {precautions.map((p) => (
            <div key={p.title} className="border-t border-slate-300 pt-6">
              <h3 className="text-[19px] font-semibold">{p.title}</h3>
              <p className="mt-2.5 text-[15px] leading-normal text-slate-600">{p.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 rounded-[28px] bg-slate-50 p-8 sm:p-10">
          <h3 className="text-[19px] font-semibold">Fall-prevention checklist</h3>
          <ul className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {checklist.map((c) => <li key={c} className="flex items-start gap-3 text-[15px] text-slate-700"><CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-700" aria-hidden />{c}</li>)}
          </ul>
        </div>
      </section>

      {/* Emergency */}
      <section id="emergency" className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-[28px] border border-slate-300 p-8 sm:p-12 lg:p-16">
          <div className="min-w-0 flex-[1_1_420px]">
            <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.03em]">In an emergency, call 112.</h2>
            <p className="mt-3 max-w-[34em] text-[17px] leading-normal text-slate-600">If someone is unconscious, not breathing, bleeding heavily or may be seriously injured, call India’s emergency number immediately. SafeWalk only emails your own contacts. It does <strong className="font-semibold text-slate-900">not</strong> contact ambulances or emergency services.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="tel:112"><Button variant="danger" size="lg"><Phone className="h-5 w-5" /> Call 112</Button></a>
            <Button variant="secondary" size="lg" onClick={() => setOpen(true)}><MessageSquare className="h-5 w-5" /> Ask the assistant</Button>
            <a href={REPORT_FORM} target="_blank" rel="noopener noreferrer"><Button variant="secondary" size="lg">Share feedback <ExternalLink className="h-4 w-4" /></Button></a>
          </div>
        </div>
      </section>

      {!user && (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
            <h2 className={h2}>Set up SafeWalk in minutes</h2>
            <p className="mt-3 text-[17px] text-slate-600">Create an account, add an emergency contact, and start monitoring.</p>
            <Link to="/register" className="mt-8 inline-block"><Button size="lg">Create your account</Button></Link>
          </div>
        </section>
      )}
    </>
  )
}
