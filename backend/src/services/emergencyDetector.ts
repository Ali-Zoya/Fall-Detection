/**
 * Deterministic emergency detection for the SafeWalk Assistant.
 *
 * NOT delegated to the LLM: the "Call 112 now" advice must appear even if the model is slow,
 * unavailable or mistaken. The patterns err on the side of showing the banner.
 */

const CRITICAL_PATTERNS: RegExp[] = [
  /\bunconscious\b/,
  /\bunresponsive\b/,
  /\bnot breathing\b/,
  /\bstopped breathing\b/,
  /\b(isn'?t|is not|not|won'?t|wont) (be )?(breathing|waking|responding|moving)/,
  /\bgasping\b/,
  /\b(can'?t|cannot|can not|struggling to|trouble|difficulty|hard to) breathe?\b/,
  /\b(difficulty|trouble) breathing\b/,
  /\bshort(ness)? of breath\b/,
  /\bcardiac arrest\b|\bheart attack\b|\bchest pain\b/,
  /\bchoking\b|\bchoked\b/,
  /\bseizure\b|\bconvuls/,
  /\bstroke\b/,
  /\b(severe|heavy|serious|profuse) (bleeding|blood loss)\b|\bbleeding (heavily|badly|a lot)\b|\bbleeding (won'?t|will not) stop\b|\bwon'?t stop bleeding\b/,
  /\bhead injury\b|\bhead trauma\b|\b(hit|banged|bumped|knocked) (his|her|their|my|the) head\b/,
  /\bfell down (the )?stairs\b|\bfall(en)? down (the )?stairs\b|\bfalls down (the )?stairs\b|\bdown the stairs\b/,
  /\b(broken|fractured) (hip|neck|back|spine|pelvis)\b|\bsuspected fracture\b/,
  /\bcannot get up\b|\bcan'?t get up\b|\bunable to get up\b|\bcannot stand\b/,
  /\bsevere pain\b|\bunbearable pain\b/,
  /\bbecomes? unconscious\b|\bpassed out\b/,
]

export function isCriticalEmergency(text: string): boolean {
  const t = text.toLowerCase()
  return CRITICAL_PATTERNS.some((p) => p.test(t))
}

export const EMERGENCY_BANNER =
  "🚨 **This could be a life-threatening emergency. Call 112 now** (India's national emergency number) or your local emergency number, and follow the dispatcher's instructions. " +
  'Do not wait for this chat. SafeWalk cannot call emergency services for you.'
