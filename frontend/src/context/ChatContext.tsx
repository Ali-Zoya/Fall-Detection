import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '@/services/api'
import type { ChatMessageData } from '@/types'

interface ChatState {
  open: boolean
  setOpen: (v: boolean) => void
  messages: ChatMessageData[]
  sending: boolean
  send: (text: string) => Promise<void>
  clear: () => void
}

const ChatContext = createContext<ChatState | null>(null)
const MAX_CONTEXT_TURNS = 8
let counter = 0
const mid = () => `m${Date.now()}-${counter++}`

/** Chat state lives above the router so the conversation survives page changes. Nothing is stored on the server. */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [sending, setSending] = useState(false)
  const messagesRef = useRef<ChatMessageData[]>([])
  messagesRef.current = messages
  const busy = useRef(false)

  const send = useCallback(async (text: string) => {
    const content = text.trim()
    if (!content || busy.current) return
    busy.current = true
    setSending(true)
    const userMsg: ChatMessageData = { id: mid(), role: 'user', content }
    setMessages((m) => [...m, userMsg])
    const history = [...messagesRef.current, userMsg]
      .filter((m) => !m.isError)
      .slice(-MAX_CONTEXT_TURNS)
      .map((m) => ({ role: m.role, content: m.content }))
    try {
      const r = await api.chat.send(history)
      setMessages((m) => [
        ...m,
        { id: mid(), role: 'assistant', content: r.reply, emergency: r.emergency, sources: r.sources, notice: r.notice, mode: r.mode },
      ])
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: mid(),
          role: 'assistant',
          isError: true,
          content: `${e instanceof Error ? e.message : 'The assistant is unavailable.'}\n\nIf this is an emergency, call **112** now (India).`,
        },
      ])
    } finally {
      busy.current = false
      setSending(false)
    }
  }, [])

  const clear = useCallback(() => setMessages([]), [])
  const value = useMemo(() => ({ open, setOpen, messages, sending, send, clear }), [open, messages, sending, send, clear])
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatState {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>')
  return ctx
}
