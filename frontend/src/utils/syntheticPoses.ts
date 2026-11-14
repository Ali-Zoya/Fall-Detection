/**
 * Synthetic pose sequences for testing the fall-detection algorithm WITHOUT a camera.
 *
 * A tiny stick-figure model (all lengths in "torso lengths", TL) is converted to the same
 * 33-landmark layout MediaPipe produces. Used by:
 *   - scripts/fall-selftest.ts   (automated checks, `npm run test:fall`)
 *   - the Detection Test Lab page (manual / visual checks)
 *
 * Nothing here is ever sent to the backend and it never creates real fall events.
 */
import type { Landmark, PoseFrame } from './fallDetection.ts'

export interface PoseParams {
  /** Hip centre X in torso lengths, 0 = centre of the frame. */
  hx: number
  /** Hip height above the floor in torso lengths (standing ≈ 2, lying ≈ 0.15). */
  hy: number
  /** Torso tilt from vertical in degrees (0 upright, 90 horizontal, positive = to the right). */
  theta: number
  /** Thigh angles from "straight down" in degrees (positive = swings to the right). */
  phiL: number
  phiR: number
  /** Shin angles from "straight down" in degrees. */
  psiL: number
  psiR: number
  /** Optional camera scale: image height covered by one torso length (default 0.2). */
  scale?: number
  /** Optional floor line in the image (0 top … 1 bottom, default 0.95). */
  groundY?: number
}

const STAND: PoseParams = { hx: 0, hy: 2, theta: 0, phiL: 0, phiR: 0, psiL: 0, psiR: 0 }
const SIT: PoseParams = { hx: 0, hy: 1, theta: 6, phiL: 90, phiR: 90, psiL: 0, psiR: 0 }
const LIE: PoseParams = { hx: 0.8, hy: 0.15, theta: 90, phiL: -90, phiR: -90, psiL: -90, psiR: -90 }
const BEND: PoseParams = { hx: 0, hy: 1.7, theta: 75, phiL: 10, phiR: 10, psiL: 0, psiR: 0 }

const rad = (d: number) => (d * Math.PI) / 180

/** Small deterministic random generator so test runs are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface BuildOptions {
  aspect: number
  noise: number
  rng: () => number
}

/** Stick figure → 33 MediaPipe-style landmarks. */
export function buildLandmarks(p: PoseParams, opt: BuildOptions): Landmark[] {
  const scale = p.scale ?? 0.2
  const ground = p.groundY ?? 0.95
  type P = { x: number; h: number } // x right, h = height above floor (both in TL)

  const toImg = (pt: P): Landmark => ({
    x: 0.5 + (pt.x * scale) / opt.aspect + (opt.rng() - 0.5) * 2 * opt.noise,
    y: ground - pt.h * scale + (opt.rng() - 0.5) * 2 * opt.noise,
    z: 0,
    visibility: 0.99,
  })

  const th = rad(p.theta)
  const up: P = { x: Math.sin(th), h: Math.cos(th) } // torso direction (hip → shoulders)
  const side: P = { x: Math.cos(th), h: -Math.sin(th) } // perpendicular, "to the right"
  const hip: P = { x: p.hx, h: p.hy }
  const add = (a: P, b: P, k: number): P => ({ x: a.x + b.x * k, h: a.h + b.h * k })

  const shoulderMid = add(hip, up, 1.0)
  const lShoulder = add(shoulderMid, side, -0.4)
  const rShoulder = add(shoulderMid, side, 0.4)
  const lHip = add(hip, side, -0.25)
  const rHip = add(hip, side, 0.25)
  const nose = add(shoulderMid, up, 0.45)

  const leg = (hipPt: P, phi: number, psi: number) => {
    const knee = add(hipPt, { x: Math.sin(rad(phi)), h: -Math.cos(rad(phi)) }, 1.0)
    const ankle = add(knee, { x: Math.sin(rad(psi)), h: -Math.cos(rad(psi)) }, 1.0)
    return { knee, ankle }
  }
  const L = leg(lHip, p.phiL, p.psiL)
  const R = leg(rHip, p.phiR, p.psiR)
  const down: P = { x: -up.x, h: -up.h }

  const pts: P[] = new Array(33)
  for (let i = 0; i <= 10; i++) pts[i] = nose // face points
  pts[11] = lShoulder
  pts[12] = rShoulder
  pts[13] = add(lShoulder, down, 0.5) // elbows
  pts[14] = add(rShoulder, down, 0.5)
  pts[15] = add(lShoulder, down, 1.0) // wrists
  pts[16] = add(rShoulder, down, 1.0)
  for (let i = 17; i <= 22; i++) pts[i] = i % 2 ? add(rShoulder, down, 1.1) : add(lShoulder, down, 1.1)
  pts[23] = lHip
  pts[24] = rHip
  pts[25] = L.knee
  pts[26] = R.knee
  pts[27] = L.ankle
  pts[28] = R.ankle
  pts[29] = L.ankle
  pts[30] = R.ankle
  pts[31] = L.ankle
  pts[32] = R.ankle
  return pts.map(toImg)
}

// ---------------------------------------------------------------------------------------
// Sequence helpers
// ---------------------------------------------------------------------------------------

type Ease = 'linear' | 'in' | 'smooth'
export interface Keyframe {
  /** Time (ms) at which this pose is reached. */
  t: number
  pose: PoseParams
  /** Easing of the segment that ENDS at this keyframe. */
  ease?: Ease
}

function easeFn(e: Ease, u: number): number {
  if (e === 'in') return u * u // accelerating – like gravity
  if (e === 'smooth') return u * u * (3 - 2 * u)
  return u
}

function mix(a: PoseParams, b: PoseParams, u: number): PoseParams {
  const m = (x: number, y: number) => x + (y - x) * u
  return {
    hx: m(a.hx, b.hx),
    hy: m(a.hy, b.hy),
    theta: m(a.theta, b.theta),
    phiL: m(a.phiL, b.phiL),
    phiR: m(a.phiR, b.phiR),
    psiL: m(a.psiL, b.psiL),
    psiR: m(a.psiR, b.psiR),
    scale: m(a.scale ?? 0.2, b.scale ?? 0.2),
    groundY: m(a.groundY ?? 0.95, b.groundY ?? 0.95),
  }
}

export type ParamFn = (tMs: number) => PoseParams

export function keyframes(kfs: Keyframe[]): ParamFn {
  return (t) => {
    if (t <= kfs[0].t) return kfs[0].pose
    for (let i = 1; i < kfs.length; i++) {
      if (t <= kfs[i].t) {
        const u = (t - kfs[i - 1].t) / (kfs[i].t - kfs[i - 1].t)
        return mix(kfs[i - 1].pose, kfs[i].pose, easeFn(kfs[i].ease ?? 'linear', u))
      }
    }
    return kfs[kfs.length - 1].pose
  }
}

export interface RenderOptions {
  fps?: number
  aspect?: number
  noise?: number
  seed?: number
}

export function renderSequence(fn: ParamFn, durationMs: number, opts: RenderOptions = {}): PoseFrame[] {
  const fps = opts.fps ?? 30
  const aspect = opts.aspect ?? 4 / 3
  const rng = mulberry32(opts.seed ?? 1)
  const frames: PoseFrame[] = []
  const step = 1000 / fps
  for (let t = 0; t <= durationMs; t += step) {
    frames.push({
      timestampMs: Math.round(t * 1000) / 1000 + 10_000, // offset so t=0 is not special
      landmarks: buildLandmarks(fn(t), { aspect, noise: opts.noise ?? 0.003, rng }),
    })
  }
  return frames
}

// ---------------------------------------------------------------------------------------
// Preset scenarios
// ---------------------------------------------------------------------------------------

export interface Scenario {
  id: string
  label: string
  description: string
  /** What the detector should do with this sequence. */
  expectFall: boolean
  durationMs: number
  fn: ParamFn
  /** Optional post-processing (e.g. removing frames to simulate "no person"). */
  postProcess?: (frames: PoseFrame[]) => PoseFrame[]
}

const walk: ParamFn = (t) => {
  const s = Math.sin((2 * Math.PI * t) / 1000) // ~1 step cycle per second
  return {
    ...STAND,
    hx: -3 + (t / 1000) * 1.3, // ~1.3 torso-lengths per second sideways
    hy: 2 + 0.04 * Math.abs(s),
    phiL: 25 * s,
    phiR: -25 * s,
    psiL: -10 * Math.max(0, -s),
    psiR: -10 * Math.max(0, s),
  }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'standing',
    label: 'Standing still',
    description: 'Person stands in front of the camera for 5 s (with landmark jitter).',
    expectFall: false,
    durationMs: 5000,
    fn: keyframes([{ t: 0, pose: STAND }]),
  },
  {
    id: 'walking',
    label: 'Walking across the frame',
    description: 'Upright person walks sideways for 5 s.',
    expectFall: false,
    durationMs: 5000,
    fn: walk,
  },
  {
    id: 'sit-slow',
    label: 'Sitting down normally',
    description: 'Stands, then sits over 1.5 s and stays seated.',
    expectFall: false,
    durationMs: 7000,
    fn: keyframes([
      { t: 0, pose: STAND },
      { t: 2500, pose: STAND },
      { t: 4000, pose: SIT, ease: 'smooth' },
      { t: 7000, pose: SIT },
    ]),
  },
  {
    id: 'sit-fast',
    label: 'Dropping into a chair quickly',
    description: 'Fast sit-down (0.5 s). Hips drop quickly but the torso stays upright.',
    expectFall: false,
    durationMs: 7000,
    fn: keyframes([
      { t: 0, pose: STAND },
      { t: 2500, pose: STAND },
      { t: 3000, pose: SIT, ease: 'in' },
      { t: 7000, pose: SIT },
    ]),
  },
  {
    id: 'bend',
    label: 'Bending to pick something up',
    description: 'Torso tilts to 75° for ~3 s, hips barely move down.',
    expectFall: false,
    durationMs: 9000,
    fn: keyframes([
      { t: 0, pose: STAND },
      { t: 2500, pose: STAND },
      { t: 3500, pose: BEND, ease: 'smooth' },
      { t: 6500, pose: BEND },
      { t: 7800, pose: STAND, ease: 'smooth' },
      { t: 9000, pose: STAND },
    ]),
  },
  {
    id: 'lie-slow',
    label: 'Lying down on purpose (slow)',
    description: 'Controlled lowering to the floor over 4 s, then lying still.',
    expectFall: false,
    durationMs: 12000,
    fn: keyframes([
      { t: 0, pose: STAND },
      { t: 2000, pose: STAND },
      { t: 6000, pose: LIE, ease: 'smooth' },
      { t: 12000, pose: LIE },
    ]),
  },
  {
    id: 'approach',
    label: 'Walking towards the camera',
    description: 'Person gets closer, so hips move down in the image and the body grows. Torso stays upright.',
    expectFall: false,
    durationMs: 5000,
    fn: keyframes([
      { t: 0, pose: { ...STAND, scale: 0.12, groundY: 0.72 } },
      { t: 5000, pose: { ...STAND, scale: 0.2, groundY: 0.98 } },
    ]),
  },
  {
    id: 'fall',
    label: 'Sudden fall, stays down',
    description: 'Stands, collapses in 0.6 s and lies still for 4 s. Should raise a possible fall.',
    expectFall: true,
    durationMs: 7000,
    fn: keyframes([
      { t: 0, pose: STAND },
      { t: 2000, pose: STAND },
      { t: 2600, pose: LIE, ease: 'in' },
      { t: 7000, pose: LIE },
    ]),
  },
  {
    id: 'fall-forward-bent',
    label: 'Sudden fall, ends curled up',
    description: 'Collapses in 0.7 s into a tilted (80°) posture and stays there.',
    expectFall: true,
    durationMs: 7000,
    fn: keyframes([
      { t: 0, pose: STAND },
      { t: 2000, pose: STAND },
      { t: 2700, pose: { hx: 0.7, hy: 0.4, theta: 80, phiL: -70, phiR: -60, psiL: -100, psiR: -90 }, ease: 'in' },
      { t: 7000, pose: { hx: 0.7, hy: 0.4, theta: 80, phiL: -70, phiR: -60, psiL: -100, psiR: -90 } },
    ]),
  },
  {
    id: 'fall-recovers',
    label: 'Stumble and quick recovery',
    description: 'Falls, but is back on their feet within ~1.5 s. Should NOT raise a possible fall.',
    expectFall: false,
    durationMs: 8000,
    fn: keyframes([
      { t: 0, pose: STAND },
      { t: 2000, pose: STAND },
      { t: 2500, pose: LIE, ease: 'in' },
      { t: 3100, pose: LIE },
      { t: 4100, pose: STAND, ease: 'linear' },
      { t: 8000, pose: STAND },
    ]),
  },
  {
    id: 'no-person',
    label: 'Person leaves the frame',
    description: 'Person stands, then no landmarks are available. Must not crash or raise anything.',
    expectFall: false,
    durationMs: 6000,
    fn: keyframes([{ t: 0, pose: STAND }]),
    postProcess: (frames) =>
      frames.map((f, i) => (i > frames.length / 2 ? { timestampMs: f.timestampMs, landmarks: null } : f)),
  },
]

export function buildScenarioFrames(s: Scenario, opts: RenderOptions = {}): PoseFrame[] {
  const frames = renderSequence(s.fn, s.durationMs, opts)
  return s.postProcess ? s.postProcess(frames) : frames
}
