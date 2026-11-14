/**
 * Automated check of the fall-detection algorithm using synthetic pose sequences.
 * No camera, no browser, no backend, no SMS.
 *
 *   npm run test:fall
 *
 * Exits with code 1 if any scenario behaves differently from what its `expectFall` says.
 */
import { FallDetector, DEFAULT_CONFIG, configForSensitivity } from '../src/utils/fallDetection.ts'
import type { Posture, Sensitivity } from '../src/utils/fallDetection.ts'
import { SCENARIOS, buildScenarioFrames } from '../src/utils/syntheticPoses.ts'

interface Outcome {
  fallAtMs: number | null
  postures: Set<Posture>
  maxPhase: string
  evidence: number | null
}

function run(scenarioId: string, sensitivity: Sensitivity = 'MEDIUM'): Outcome {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!
  const frames = buildScenarioFrames(scenario)
  const detector = new FallDetector(configForSensitivity(sensitivity, DEFAULT_CONFIG))
  const t0 = frames[0].timestampMs
  const out: Outcome = { fallAtMs: null, postures: new Set(), maxPhase: 'NONE', evidence: null }
  for (const f of frames) {
    const r = detector.update(f)
    out.postures.add(r.posture)
    if (r.phase === 'CANDIDATE' && out.maxPhase === 'NONE') out.maxPhase = 'CANDIDATE'
    if (r.newlyDetectedFall) {
      out.fallAtMs = Math.round(f.timestampMs - t0)
      out.maxPhase = 'POSSIBLE_FALL'
      out.evidence = r.evidenceScore
    }
  }
  return out
}

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
  if (!ok) failures++
}

console.log('--- Scenario results (MEDIUM sensitivity) ---')
for (const s of SCENARIOS) {
  const o = run(s.id)
  const raised = o.fallAtMs !== null
  check(
    s.label,
    raised === s.expectFall,
    `expected ${s.expectFall ? 'POSSIBLE FALL' : 'no alert'}, got ${raised ? `possible fall at ${o.fallAtMs} ms (evidence ${o.evidence})` : 'no alert'}` +
      `, postures seen: ${[...o.postures].join(',')}`,
  )
}

console.log('\n--- Posture classification spot checks ---')
check('standing is classified STANDING', run('standing').postures.has('STANDING'))
check('walking is classified WALKING', run('walking').postures.has('WALKING'))
check('sitting is classified SITTING', run('sit-slow').postures.has('SITTING'))
check('bending is classified BENDING', run('bend').postures.has('BENDING'))
check('slow lying is classified LYING but raises no alert', run('lie-slow').postures.has('LYING') && run('lie-slow').fallAtMs === null)
check('missing person is classified NO_PERSON', run('no-person').postures.has('NO_PERSON'))

console.log('\n--- Timing ---')
const fall = run('fall')
// The collapse starts at 2000 ms; persistence is 1500 ms, so an alert is expected a bit after 3.5 s.
check(
  'fall is raised between 3.5 s and 5 s',
  fall.fallAtMs !== null && fall.fallAtMs >= 3500 && fall.fallAtMs <= 5000,
  `at ${fall.fallAtMs} ms`,
)

console.log('\n--- Sensitivity presets ---')
check('LOW sensitivity still detects the clear fall', run('fall', 'LOW').fallAtMs !== null)
check('HIGH sensitivity still ignores a quick sit-down', run('sit-fast', 'HIGH').fallAtMs === null)
check('HIGH sensitivity still ignores slow lying', run('lie-slow', 'HIGH').fallAtMs === null)

console.log('\n--- Reset behaviour ---')
{
  const scenario = SCENARIOS.find((s) => s.id === 'fall')!
  const frames = buildScenarioFrames(scenario)
  const d = new FallDetector()
  let raised = 0
  let resetDone = false
  for (const f of frames) {
    const r = d.update(f)
    if (r.newlyDetectedFall) {
      raised++
      if (!resetDone) {
        d.reset() // user pressed "I'm safe"
        resetDone = true
      }
    }
  }
  check('after reset() the same lying person does not immediately raise a second alert', raised === 1, `alerts raised: ${raised}`)
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
