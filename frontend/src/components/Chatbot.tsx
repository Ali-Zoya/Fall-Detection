import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, MessageCircle, RotateCcw, X } from 'lucide-react'
import { useChat } from '@/context/ChatContext'
import { ChatMessage } from './ChatMessage'
import { ErrorBoundary } from './ErrorBoundary'
import { cn } from '@/utils/cn'

const CATEGORIES = [
  { id: 'help', label: 'SafeWalk Help', prompts: ['How does fall detection work?', 'How do I add an emergency contact?', 'What does the countdown do?'] },
  { id: 'emergency', label: 'Emergency Guidance', prompts: ['Someone fell and is not responding', 'What should I do after a fall?', 'Which number do I call in India?'] },
  { id: 'prevent', label: 'Safety & Prevention', prompts: ['How can I prevent falls at home?', 'Which exercises help balance?', 'Tips for a safer bathroom'] },
]

/** Floating assistant, available on every page. Camera frames are never sent to it. */
export function Chatbot() {
  const { open, setOpen, messages, sending, send, clear } = useChat()
  const [input, setInput] = useState('')
  const [cat, setCat] = useState(CATEGORIES[0].id)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, sending, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = input.trim()
    if (!t || sending) return
    setInput('')
    void send(t)
  }

  const prompts = CATEGORIES.find((c) => c.id === cat)?.prompts ?? []
  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 transition-colors'

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          }}
          aria-label="Open emergency & safety assistant"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-float transition-all duration-300 hover:scale-105 hover:shadow-glow focus:ring-4 focus:ring-brand-500/30"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
        </button>
      )}
      {open && (
        <section
          role="dialog"
          aria-label="SafeWalk assistant"
          className="fixed inset-x-3 bottom-3 z-50 flex h-[min(38rem,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-float backdrop-blur-xl animate-scale-in sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[25rem]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-brand-50/30 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-sm">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">SafeWalk Assistant</h2>
                <p className="text-[11px] text-slate-500">Instant First Aid & App Guidance</p>
              </div>
            </div>
            <div className="flex gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    clear()
                  }}
                  aria-label="Clear conversation"
                  className={iconBtn}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpen(false)
                }}
                aria-label="Close assistant"
                className={iconBtn}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>
          <div className="border-b border-amber-200/60 bg-amber-50/70 px-5 py-2 text-xs text-amber-900">
            In an emergency call <strong className="font-semibold text-red-700">112</strong> (India). This chat provides general safety guidance only.
          </div>

          <ErrorBoundary>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {messages.length === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50/70 to-white p-4">
                    <p className="text-[14px] font-medium leading-relaxed text-slate-800">
                      Hello! Ask me anything about how SafeWalk operates, or select a pre-defined question below for instant guidance:
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Categories</p>
                    <div role="tablist" aria-label="Topics" className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="tab"
                          aria-selected={cat === c.id}
                          onClick={(e) => {
                            e.preventDefault()
                            setCat(c.id)
                          }}
                          className={cn(
                            'h-8 rounded-full px-3 text-[12px] font-medium transition-all duration-200',
                            cat === c.id
                              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900',
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Pre-defined Questions</p>
                    <div className="grid gap-1.5">
                      {prompts.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            void send(p)
                          }}
                          disabled={sending}
                          className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 disabled:opacity-50"
                        >
                          <span>{p}</span>
                          <ArrowUp className="h-3.5 w-3.5 rotate-45 text-slate-400 opacity-0 transition-all group-hover:opacity-100 group-hover:text-brand-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {messages.map((m) => <ChatMessage key={m.id} msg={m} />)}
              {sending && (
                <div className="flex items-center gap-2 rounded-[20px] bg-slate-100 px-4 py-2.5 text-xs text-slate-500 animate-pulse" role="status">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-ping" />
                  Retrieving guidance…
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ErrorBoundary>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200/80 bg-slate-50/50 p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Ask a question…"
              aria-label="Your message"
              className="h-11 flex-1 rounded-full border border-slate-300/80 bg-white px-4 text-[14px] shadow-sm placeholder:text-slate-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </form>
          <p className="border-t border-slate-100 bg-white px-3 py-2 text-center text-[10px] text-slate-400">
            Privacy: Camera frames are never sent to the chatbot.
          </p>
        </section>
      )}
    </>
  )
}
