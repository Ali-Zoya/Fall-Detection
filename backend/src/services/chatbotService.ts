import { aiConfigured, env } from '../config/env'
import {
  APP_FACTS,
  EMERGENCY_NUMBER_NOTE,
  SUGGESTED_TOPICS,
  searchKnowledgeBase,
  type KbEntry,
  type SourceRef,
} from './knowledgeBase'
import { HttpError } from '../utils/errors'
import { EMERGENCY_BANNER, isCriticalEmergency } from './emergencyDetector'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export type ChatMode = 'ai' | 'fallback'

export interface ChatReply {
  reply: string
  mode: ChatMode
  /** True when the question looks like a life-threatening emergency (UI shows a "Call 112" banner). */
  emergency: boolean
  sources: SourceRef[]
  /** Explains why the answer comes from the built-in knowledge base (shown to the user). */
  notice?: string
}

// ---------------------------------------------------------------------------------------
// 2. Prompt for the LLM
// ---------------------------------------------------------------------------------------

function systemPrompt(reference: KbEntry[], critical: boolean): string {
  const refs = reference.length
    ? reference.map((e) => `### ${e.title}\n${e.content}`).join('\n\n')
    : '(no specific reference entry matched this question)'

  return `You are "SafeWalk Assistant", the in-app helper of SafeWalk, an AI-powered fall detection and emergency response prototype. You have three jobs: (1) SafeWalk Help – explain and troubleshoot the app; (2) Emergency Guidance – calm, step-by-step first-aid and emergency information; (3) Safety & Prevention – fall prevention, home safety and emergency preparedness.

HARD RULES
- Be accurate and concise. Use short numbered steps or bullets. Plain language for non-technical, often older, readers.
- For SAFEWALK questions, use ONLY the facts in APP FACTS below. Never invent features, screens, settings, database details, e-mail statuses or actions. If something is not listed, say SafeWalk does not do it or that you are not sure.
- For FIRST-AID / EMERGENCY / PREVENTION questions, base your answer on the REFERENCE MATERIAL below. You may rephrase and simplify, but do not add medical instructions that are not supported by it. If the material does not cover the question, give only very general safe advice and recommend a doctor, a pharmacist or emergency services.
- ${EMERGENCY_NUMBER_NOTE} Never invent other phone numbers.
- If someone describes a possible life-threatening situation (unconscious, not breathing normally, severe bleeding, choking, chest pain, stroke signs, seizure, serious head/neck/back/hip injury, serious fall), START with "Call 112 now", then give 3-6 short, relevant steps. Do not ask several questions first. Tell them to follow the emergency dispatcher's instructions.
- You may ask at most ONE short follow-up question (for example "Is the person breathing normally?") and only when the situation is not clearly critical, and never instead of giving safety advice.
- Do NOT diagnose injuries or illnesses. Do NOT recommend, name or dose medicines. Do NOT tell anyone to give food, water or medicine to an unconscious person. Do NOT advise moving someone with a suspected neck, spine or serious hip injury unless they are in immediate danger. Do NOT encourage an injured person to stand up straight after a serious fall.
- Explain CPR only as basic first-aid information and always say to call emergency services first.
- Never say or imply that you, or SafeWalk, called emergency services, sent an e-mail or SMS, changed a setting, or saw the user's data or camera. You cannot do any of that.
- Never claim SafeWalk is medically validated, 100% accurate, or works in the background with the browser closed.
- You never replace emergency services, doctors or trained first responders; say so when relevant.
- Do not add citations or links yourself; the app attaches sources.
- If a request is unrelated to SafeWalk, safety, first aid, falls or home safety, politely say you can only help with those topics.
- Reply in the user's language when you can; default English.
${critical ? '\nTHIS MESSAGE LOOKS LIKE A POSSIBLE EMERGENCY. Be brief and put the emergency steps first.\n' : ''}
APP FACTS
${APP_FACTS}

REFERENCE MATERIAL (curated; paraphrased from NHS, WHO, American Red Cross and the Government of India's 112 service)
${refs}`
}

// ---------------------------------------------------------------------------------------
// 3. Calling the configured LLM provider (OpenAI-compatible /chat/completions)
// ---------------------------------------------------------------------------------------

async function callLlm(messages: { role: string; content: string }[]): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  const url = env.AI_API_BASE_URL.replace(/\/$/, '') + '/chat/completions'

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_API_KEY}` },
      body: JSON.stringify({ model: env.AI_MODEL, messages, temperature: 0.2, max_tokens: 700 }),
    })
  } catch (e) {
    const aborted = (e as Error).name === 'AbortError'
    throw new HttpError(504, aborted ? 'The AI model took too long to answer' : 'Could not reach the AI provider', 'AI_UNREACHABLE')
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 429) throw new HttpError(429, 'The AI provider is rate-limiting requests right now', 'AI_RATE_LIMITED')
  if (res.status === 401 || res.status === 403) {
    // Do not reveal details; the operator must check AI_API_KEY.
    console.error('[chat] AI provider rejected the API key / permissions (HTTP', res.status, ')')
    throw new HttpError(502, 'The AI provider rejected the server credentials', 'AI_AUTH')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[chat] AI provider error', res.status, body.slice(0, 300))
    throw new HttpError(502, 'The AI provider returned an error', 'AI_ERROR')
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new HttpError(502, 'The AI provider returned an empty answer', 'AI_EMPTY')
  return text
}

// ---------------------------------------------------------------------------------------
// 4. Public API
// ---------------------------------------------------------------------------------------

function uniqueSources(entries: KbEntry[]): SourceRef[] {
  const seen = new Set<string>()
  const out: SourceRef[] = []
  for (const e of entries) {
    for (const s of e.sources) {
      if (!seen.has(s.name)) {
        seen.add(s.name)
        out.push(s)
      }
    }
  }
  return out
}

function knowledgeBaseAnswer(question: string, matches: KbEntry[], critical: boolean): ChatReply {
  const top = matches.slice(0, critical ? 2 : 1)
  if (top.length === 0) {
    const reply =
      critical
        ? EMERGENCY_BANNER
        : "I couldn't find a built-in answer for that. I can help with:\n" +
          '- **Using SafeWalk** (monitoring, camera, contacts, e-mail alerts)\n' +
          '- **Emergency guidance and first aid** (falls, bleeding, unconsciousness, breathing problems…)\n' +
          '- **Fall prevention and home safety**\n\n' +
          'Try one of these: ' +
          SUGGESTED_TOPICS.map((t) => `"${t}"`).join(', ')
    return { reply, mode: 'fallback', emergency: critical, sources: [] }
  }
  const body = top.map((e) => `**${e.title}**\n${e.content}`).join('\n\n')
  return {
    reply: (critical ? EMERGENCY_BANNER + '\n\n' : '') + body,
    mode: 'fallback',
    emergency: critical,
    sources: uniqueSources(top),
  }
}

export async function answerChat(history: ChatTurn[]): Promise<ChatReply> {
  const lastUser = [...history].reverse().find((m) => m.role === 'user')
  const question = lastUser?.content ?? ''
  const critical = isCriticalEmergency(question)

  // Retrieval uses the last user message plus the one before it, so follow-ups like
  // "and what if he is not breathing?" still find the right entry.
  const recentUserText = history
    .filter((m) => m.role === 'user')
    .slice(-2)
    .map((m) => m.content)
    .join(' ')
  const matches = searchKnowledgeBase(question, 3).map((m) => m.entry)
  const contextMatches = matches.length ? matches : searchKnowledgeBase(recentUserText, 3).map((m) => m.entry)

  if (!aiConfigured) {
    return knowledgeBaseAnswer(question, contextMatches, critical)
  }

  try {
    const llmMessages = [
      { role: 'system', content: systemPrompt(contextMatches, critical) },
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    ]
    const text = await callLlm(llmMessages)
    // The emergency banner is added by us, not by the model, so it can never be forgotten.
    return {
      reply: critical && !/\b112\b/.test(text) ? `${EMERGENCY_BANNER}\n\n${text}` : text,
      mode: 'ai',
      emergency: critical,
      sources: uniqueSources(contextMatches.filter((e) => e.category !== 'app')),
    }
  } catch {
    return knowledgeBaseAnswer(question, contextMatches, critical)
  }
}
