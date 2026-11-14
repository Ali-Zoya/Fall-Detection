import { Fragment, type ReactNode } from 'react'
import { AlertTriangle, ExternalLink, Info } from 'lucide-react'
import type { ChatMessageData } from '@/types'
import { cn } from '@/utils/cn'

/** Tiny, safe markdown subset: **bold**, "- " bullet lists, paragraphs. Everything is rendered as React text (no HTML injection). */
function inline(text?: string): ReactNode[] {
  if (!text) return []
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

function Markdown({ text }: { text?: string }) {
  if (!text) return null
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) {
      const items = list
      blocks.push(
        <ul key={`l${blocks.length}`} className="ml-4 list-disc space-y-0.5">
          {items.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ul>,
      )
      list = []
    }
  }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const m = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(line)
    if (m) list.push(m[1])
    else {
      flush()
      if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>)
    }
  }
  flush()
  return <div className="space-y-2">{blocks}</div>
}

function safeUrl(u?: string): string | undefined {
  if (!u) return undefined
  const trimmed = u.trim()
  if (!trimmed || trimmed === '#' || trimmed === '/') return undefined
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed
    }
  } catch {
    return undefined
  }
  return undefined
}

export function ChatMessage({ msg }: { msg: ChatMessageData }) {
  if (!msg) return null
  const mine = msg.role === 'user'
  return (
    <div className={cn('flex animate-fade-in', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-[20px] px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all',
          mine
            ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white'
            : msg.isError
              ? 'border border-red-200 bg-red-50/90 text-red-900'
              : 'border border-slate-200/70 bg-white text-slate-800',
        )}
      >
        {msg.emergency && !mine && (
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-3 py-2 text-white shadow-sm" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden />
            <span className="font-semibold text-xs leading-normal">Potential life-threatening situation. Call 112 immediately (India) or your local emergency dispatch.</span>
          </div>
        )}
        <Markdown text={msg.content} />
        {msg.sources && msg.sources.length > 0 && !mine && (
          <div className="mt-2.5 border-t border-slate-100 pt-2 text-xs text-slate-600">
            <p className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Sources</p>
            <ul className="mt-1 space-y-1">
              {msg.sources.map((s, i) => {
                const url = safeUrl(s?.url)
                const name = s?.name ?? 'Reference'
                return (
                  <li key={i}>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        {name} <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {name}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
