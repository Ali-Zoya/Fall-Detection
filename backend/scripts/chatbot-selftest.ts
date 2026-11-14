/**
 * Offline check of the chatbot's deterministic parts (no AI key, no network, no database):
 *   - emergency detection  (decides whether the "Call 112 now" banner is forced)
 *   - knowledge-base retrieval (decides which curated entry grounds / backs up the answer)
 *
 *   npm run test:chat
 *
 * This does NOT test the quality of LLM-written answers – that needs a real AI_API_KEY.
 */
import { isCriticalEmergency } from '../src/services/emergencyDetector.ts'
import { searchKnowledgeBase } from '../src/services/knowledgeBase.ts'

interface Case {
  q: string
  /** Acceptable top knowledge-base entries. */
  expect: string[]
  critical: boolean
}

const cases: Case[] = [
  { q: 'What is SafeWalk?', expect: ['app-what-is'], critical: false },
  { q: 'How does fall detection work?', expect: ['app-how-detection'], critical: false },
  { q: 'How do I start monitoring?', expect: ['app-start-monitoring'], critical: false },
  { q: 'Why is my camera not working?', expect: ['app-camera-trouble'], critical: false },
  { q: 'Why is my body not being detected?', expect: ['app-not-detected'], critical: false },
  { q: 'How do I add an emergency contact?', expect: ['app-contacts'], critical: false },
  { q: 'What happens when a fall is detected?', expect: ['app-fall-flow'], critical: false },
  { q: 'How can I cancel a false alarm?', expect: ['app-fall-flow'], critical: false },
  { q: 'Why did my emergency email fail?', expect: ['app-email-failed'], critical: false },
  { q: 'Does SafeWalk work when my browser is closed?', expect: ['app-browser-closed'], critical: false },
  { q: 'What should I do if someone falls?', expect: ['em-someone-falls'], critical: false },
  { q: 'What should I do if an elderly person falls and cannot get up?', expect: ['em-elderly-cannot-get-up'], critical: true },
  { q: 'What should I do if someone becomes unconscious?', expect: ['em-unconscious'], critical: true },
  { q: 'What should I do if someone has a head injury?', expect: ['em-head-injury'], critical: true },
  { q: 'How can I prevent falls at home?', expect: ['prev-reduce-risk', 'home-elderly-safer'], critical: false },
  { q: 'How can I make a bathroom safer?', expect: ['home-bathroom'], critical: false },
  { q: 'What exercises can help improve balance?', expect: ['prev-exercise'], critical: false },
  { q: 'What should I keep in an emergency first-aid kit?', expect: ['prep-contacts-kit'], critical: false },
  { q: 'What should elderly people living alone do to stay safe?', expect: ['prep-living-alone'], critical: false },
  { q: 'What should I do if someone is not breathing normally?', expect: ['em-not-breathing'], critical: true },
  // extra emergency phrasings that MUST show the banner
  { q: 'My father is choking and cannot speak', expect: ['fa-choking'], critical: true },
  { q: 'she is bleeding heavily after the fall', expect: ['fa-bleeding'], critical: true },
  { q: 'He fell down the stairs', expect: ['em-stairs'], critical: true },
  { q: 'someone is unresponsive and not breathing', expect: ['em-unconscious', 'em-not-breathing'], critical: true },
  { q: 'I have chest pain', expect: ['em-severe-pain'], critical: true },
  // ordinary questions that must NOT force the banner
  { q: 'How do I make my home safer for elderly people?', expect: ['home-elderly-safer'], critical: false },
  { q: 'How do I configure the countdown?', expect: ['app-countdown-config'], critical: false },
  { q: 'Why are grab bars and handrails useful?', expect: ['home-bathroom', 'home-stairs-lighting'], critical: false },
]

let failures = 0
for (const c of cases) {
  const hits = searchKnowledgeBase(c.q, 3)
  const top = hits[0]?.entry.id ?? '(none)'
  const crit = isCriticalEmergency(c.q)
  const okTop = c.expect.includes(top)
  const okCrit = crit === c.critical
  const ok = okTop && okCrit
  if (!ok) failures++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  "${c.q}"  → top=${top} (score ${hits[0]?.score ?? 0}) critical=${crit}` +
      (ok ? '' : `   [expected ${c.expect.join('|')}, critical=${c.critical}]`),
  )
}
console.log(failures === 0 ? `\nAll ${cases.length} checks passed.` : `\n${failures} of ${cases.length} checks FAILED.`)
process.exit(failures === 0 ? 0 : 1)
