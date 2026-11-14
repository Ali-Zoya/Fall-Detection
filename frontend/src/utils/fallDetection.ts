/**
 * SafeWalk custom fall-detection algorithm.
 *
 * Input : MediaPipe Pose landmarks (33 points, normalised 0..1, y grows DOWNWARDS).
 * Output: a per-frame posture label plus a "fall phase" (NONE → CANDIDATE → POSSIBLE_FALL).
 *
 * This file is deliberately framework-free (no React, no MediaPipe import) so it can be
 * unit-tested with recorded / synthetic landmark sequences (see scripts/fall-selftest.ts
 * and the "Detection Test Lab" page).
 *
 * HOW IT WORKS (all indicators are computed from landmarks only):
 *
 *  1. Torso angle      angle between the hip→shoulder vector and the vertical axis.
 *                      0° = upright, 90° = horizontal.
 *  2. Sudden drop      how far the hips moved DOWN inside a short window, measured in
 *                      "torso lengths" so the result does not depend on camera distance.
 *  3. Downward speed   the fastest downward hip speed in the window (torso lengths / s).
 *  4. Angle increase   how much the torso tilted over inside the same window.
 *  5. Persistence      after a sudden drop + tilt, the body must STAY near-horizontal for
 *                      `persistenceMs`. If the person gets back up first, nothing is raised.
 *  6. Temporal history a ring buffer of recent measurements is kept so (2)-(4) are
 *                      computed across frames and not from a single noisy frame.
 *
 * A horizontal posture ALONE never triggers anything: somebody lying down slowly (low speed)
 * or sitting down quickly (torso stays upright) does not satisfy all conditions.
 *
 * This is a heuristic prototype. It is NOT a medically validated device.
 */

export interface Landmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

/** MediaPipe Pose landmark indices that this algorithm uses. */
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
} as const

export type Sensitivity = 'LOW' | 'MEDIUM' | 'HIGH'

export type Posture = 'NO_PERSON' | 'STANDING' | 'WALKING' | 'SITTING' | 'BENDING' | 'LYING' | 'UNKNOWN'

/** NONE → a sudden fall-like movement was seen (CANDIDATE) → it persisted (POSSIBLE_FALL). */
export type FallPhase = 'NONE' | 'CANDIDATE' | 'POSSIBLE_FALL'

export interface FallDetectionConfig {
  /** Ignore landmarks with lower visibility than this (0..1). */
  minVisibility: number
  /** Video width / height. Needed so angles are computed in a square coordinate system. */
  aspectRatio: number
  /** Ignore torsos shorter than this (normalised image height) – the person is too far/small. */
  minTorsoLength: number
  /** If two frames are further apart than this, the history is discarded. */
  maxFrameGapMs: number
  /** How much history is kept. */
  historyMs: number

  // ----- trigger (sudden fall movement) -----
  /** Time window in which the sudden movement is measured. */
  dropWindowMs: number
  /** Minimum hip descent inside the window, in torso lengths. */
  dropThreshold: number
  /** Minimum peak downward hip speed, in torso lengths per second. */
  velocityThreshold: number
  /** Time span used to compute one velocity sample (smooths landmark jitter). */
  velocitySpanMs: number
  /** Minimum increase of the torso angle inside the window (degrees). */
  angleIncreaseThreshold: number
  /** Torso must be at least this tilted (degrees) when the trigger fires. */
  candidateMinAngle: number

  // ----- confirmation (persistence) -----
  /** Torso angle (deg) considered "near horizontal". */
  horizontalAngle: number
  /** Bounding box height/width at or below this also counts as horizontal (if tilted ≥ candidateMinAngle). */
  horizontalAspect: number
  /** The fallen posture must be kept this long to become a POSSIBLE_FALL. */
  persistenceMs: number
  /** Brief non-horizontal glitches shorter than this do not reset the persistence timer. */
  horizontalToleranceMs: number
  /** Give up on a candidate after this long. */
  confirmWindowMs: number
  /** Torso below this angle (deg) for `recoveryMs` means the person got up → candidate dismissed. */
  recoveryAngle: number
  recoveryMs: number
  /** How long a candidate survives while the person is not visible. */
  lostGraceMs: number
  /** After reset() no new candidate is raised for this long. */
  cooldownMs: number

  // ----- posture classification -----
  /** Torso angle below this (deg) is "upright". */
  uprightAngle: number
  /** Thigh vertical ratio (1 = vertical, 0 = horizontal) below this means sitting. */
  sittingThighRatio: number
  /** Horizontal hip speed (torso lengths / s) above this means walking. */
  walkingSpeed: number
}

export const DEFAULT_CONFIG: FallDetectionConfig = {
  minVisibility: 0.5,
  aspectRatio: 4 / 3,
  minTorsoLength: 0.04,
  maxFrameGapMs: 1000,
  historyMs: 4000,

  dropWindowMs: 1000,
  dropThreshold: 0.7,
  velocityThreshold: 1.5,
  velocitySpanMs: 200,
  angleIncreaseThreshold: 35,
  candidateMinAngle: 45,

  horizontalAngle: 60,
  horizontalAspect: 0.8,
  persistenceMs: 1500,
  horizontalToleranceMs: 300,
  confirmWindowMs: 5000,
  recoveryAngle: 40,
  recoveryMs: 600,
  lostGraceMs: 1000,
  cooldownMs: 2000,

  uprightAngle: 30,
  sittingThighRatio: 0.5,
  walkingSpeed: 0.6,
}

/** LOW = fewer alerts (stricter thresholds). HIGH = more alerts (looser thresholds). */
export function configForSensitivity(
  sensitivity: Sensitivity,
  base: FallDetectionConfig = DEFAULT_CONFIG,
): FallDetectionConfig {
  if (sensitivity === 'LOW') {
    return {
      ...base,
      dropThreshold: base.dropThreshold * 1.25,
      velocityThreshold: base.velocityThreshold * 1.25,
      angleIncreaseThreshold: base.angleIncreaseThreshold * 1.15,
      persistenceMs: base.persistenceMs * 1.3,
    }
  }
  if (sensitivity === 'HIGH') {
    return {
      ...base,
      dropThreshold: base.dropThreshold * 0.8,
      velocityThreshold: base.velocityThreshold * 0.8,
      angleIncreaseThreshold: base.angleIncreaseThreshold * 0.85,
      persistenceMs: Math.max(1000, base.persistenceMs * 0.75),
    }
  }
  return { ...base }
}

export interface PoseFrame {
  /** Monotonic time in milliseconds (e.g. performance.now()). */
  timestampMs: number
  /** 33 landmarks, or null if no person was found in this frame. */
  landmarks: Landmark[] | null
}

export interface PoseMetrics {
  torsoAngleDeg: number
  torsoLength: number
  hipX: number
  hipY: number
  /** Bounding-box height / width (< 1 means wider than tall). */
  bboxAspect: number
  /** 1 = thigh vertical, 0 = horizontal, null if knees not visible. */
  thighVerticalRatio: number | null
  /** Sideways hip speed in torso lengths per second. */
  hipHorizontalSpeed: number
  /** Hip descent inside the window, in torso lengths. */
  dropNorm: number
  /** Fastest downward hip speed inside the window (torso lengths / s). */
  peakDownVelocity: number
  /** Torso tilt increase inside the window (degrees). */
  angleIncrease: number
  /** How long the body has been continuously near-horizontal during a candidate (ms). */
  horizontalForMs: number
}

export interface DetectionResult {
  timestampMs: number
  personDetected: boolean
  posture: Posture
  phase: FallPhase
  /** True exactly once: on the frame where a POSSIBLE_FALL is first raised. */
  newlyDetectedFall: boolean
  /** Heuristic 0..1 evidence score (NOT a probability). Only set for a POSSIBLE_FALL. */
  evidenceScore: number | null
  /** Human-readable explanation of why the fall was raised / dismissed. */
  reasons: string[]
  metrics: PoseMetrics | null
}

// ---------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------

interface Sample {
  t: number
  hipX: number
  hipY: number
  torsoLen: number
  angle: number
  bboxAspect: number
  thighVert: number | null
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const usable = (l: Landmark | undefined, min: number): l is Landmark =>
  !!l && (l.visibility ?? 1) >= min && Number.isFinite(l.x) && Number.isFinite(l.y)

function mid(points: Landmark[]): { x: number; y: number } | null {
  if (points.length === 0) return null
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  }
}

/** Turns one set of landmarks into a Sample (or null if shoulders/hips are not visible). */
export function measure(landmarks: Landmark[], t: number, cfg: FallDetectionConfig): Sample | null {
  const min = cfg.minVisibility
  const shoulders = [landmarks[LM.L_SHOULDER], landmarks[LM.R_SHOULDER]].filter((l) => usable(l, min)) as Landmark[]
  const hips = [landmarks[LM.L_HIP], landmarks[LM.R_HIP]].filter((l) => usable(l, min)) as Landmark[]
  const s = mid(shoulders)
  const h = mid(hips)
  if (!s || !h) return null

  // Vector from hip to shoulder in a square coordinate system (x scaled by the aspect ratio).
  const vx = (s.x - h.x) * cfg.aspectRatio
  const vy = s.y - h.y // negative when the shoulders are above the hips
  const len = Math.hypot(vx, vy)
  if (len < cfg.minTorsoLength) return null

  // Angle from the vertical "up" axis: cos(angle) = -vy / len.
  // upright → 0°, horizontal → 90°, upside-down → 180°.
  const angle = (Math.acos(clamp(-vy / len, -1, 1)) * 180) / Math.PI

  // Bounding box of every visible landmark (in the same square coordinate system).
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const l of landmarks) {
    if (!usable(l, min)) continue
    minX = Math.min(minX, l.x)
    maxX = Math.max(maxX, l.x)
    minY = Math.min(minY, l.y)
    maxY = Math.max(maxY, l.y)
  }
  const bw = Math.max((maxX - minX) * cfg.aspectRatio, 1e-6)
  const bh = Math.max(maxY - minY, 1e-6)

  // Thigh orientation: 1 = pointing straight down (standing), ~0 = horizontal (sitting).
  const knees = [landmarks[LM.L_KNEE], landmarks[LM.R_KNEE]].filter((l) => usable(l, min)) as Landmark[]
  const k = mid(knees)
  let thighVert: number | null = null
  if (k) {
    const tx = (k.x - h.x) * cfg.aspectRatio
    const ty = k.y - h.y
    const thighLen = Math.hypot(tx, ty)
    // Very short thighs = leg pointing at the camera → orientation unreliable.
    if (thighLen >= 0.3 * len) thighVert = ty / thighLen
  }

  return { t, hipX: h.x, hipY: h.y, torsoLen: len, angle, bboxAspect: bh / bw, thighVert }
}

// ---------------------------------------------------------------------------------------
// The detector
// ---------------------------------------------------------------------------------------

interface Candidate {
  t0: number
  dropNorm: number
  peakVel: number
  angleIncrease: number
  angleAtTrigger: number
  horizontalSince: number | null
  notHorizontalSince: number | null
  upSince: number | null
}

export class FallDetector {
  private cfg: FallDetectionConfig
  private history: Sample[] = []
  private candidate: Candidate | null = null
  private locked = false
  private lastT: number | null = null
  private lostSince: number | null = null
  private suppressUntil = -Infinity
  private lastReasons: string[] = []

  constructor(config: Partial<FallDetectionConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...config }
  }

  getConfig(): FallDetectionConfig {
    return { ...this.cfg }
  }

  setConfig(config: Partial<FallDetectionConfig>): void {
    this.cfg = { ...this.cfg, ...config }
  }

  /** Call after the user cancelled / acknowledged an alert so detection can start fresh. */
  reset(): void {
    this.history = []
    this.candidate = null
    this.locked = false
    this.lostSince = null
    this.suppressUntil = (this.lastT ?? 0) + this.cfg.cooldownMs
    this.lastReasons = []
  }

  update(frame: PoseFrame): DetectionResult {
    const cfg = this.cfg
    const t = frame.timestampMs

    // Large time gap (tab was hidden, camera stalled) → old measurements are meaningless.
    if (this.lastT !== null && t - this.lastT > cfg.maxFrameGapMs) {
      this.history = []
      if (this.candidate && !this.locked) {
        this.candidate = null
        this.lastReasons = ['Candidate dropped: video frames were interrupted']
      }
    }
    this.lastT = t

    const sample = frame.landmarks ? measure(frame.landmarks, t, cfg) : null

    // ---- No person visible ----
    if (!sample) {
      if (this.lostSince === null) this.lostSince = t
      if (this.candidate && !this.locked && t - this.lostSince > cfg.lostGraceMs) {
        this.candidate = null
        this.lastReasons = ['Candidate dropped: person left the camera view']
      }
      return this.result(t, false, 'NO_PERSON', null, false, null)
    }
    this.lostSince = null

    // ---- Maintain history ----
    this.history.push(sample)
    const oldest = t - cfg.historyMs
    while (this.history.length > 1 && this.history[0].t < oldest) this.history.shift()

    const metrics = this.computeMetrics(sample)
    const posture = this.classify(metrics)
    const horizontal = this.isHorizontal(sample)

    let newlyDetected = false
    let evidence: number | null = null

    if (this.locked) {
      // Already raised; wait for reset().
      return this.result(t, true, posture, metrics, false, null)
    }

    if (!this.candidate) {
      // ---- Look for the sudden-movement trigger ----
      if (
        t >= this.suppressUntil &&
        metrics.dropNorm >= cfg.dropThreshold &&
        metrics.peakDownVelocity >= cfg.velocityThreshold &&
        metrics.angleIncrease >= cfg.angleIncreaseThreshold &&
        sample.angle >= cfg.candidateMinAngle
      ) {
        this.candidate = {
          t0: t,
          dropNorm: metrics.dropNorm,
          peakVel: metrics.peakDownVelocity,
          angleIncrease: metrics.angleIncrease,
          angleAtTrigger: sample.angle,
          horizontalSince: horizontal ? t : null,
          notHorizontalSince: null,
          upSince: null,
        }
        this.lastReasons = [
          `Sudden movement: hips dropped ${metrics.dropNorm.toFixed(1)} torso-lengths, ` +
            `peak speed ${metrics.peakDownVelocity.toFixed(1)}/s, torso tilted +${Math.round(metrics.angleIncrease)}°`,
        ]
      }
    } else {
      // ---- Confirm that the fallen posture persists ----
      const c = this.candidate
      if (horizontal) {
        c.notHorizontalSince = null
        if (c.horizontalSince === null) c.horizontalSince = t
      } else {
        if (c.notHorizontalSince === null) c.notHorizontalSince = t
        if (t - c.notHorizontalSince > cfg.horizontalToleranceMs) c.horizontalSince = null
      }

      // Person standing up again?
      if (sample.angle < cfg.recoveryAngle) {
        if (c.upSince === null) c.upSince = t
      } else {
        c.upSince = null
      }

      const horizontalFor = c.horizontalSince !== null ? t - c.horizontalSince : 0
      metrics.horizontalForMs = horizontalFor

      if (c.upSince !== null && t - c.upSince >= cfg.recoveryMs) {
        this.candidate = null
        this.lastReasons = ['Candidate dismissed: person got back up']
      } else if (horizontalFor >= cfg.persistenceMs) {
        // POSSIBLE FALL
        const dropScore = clamp(c.dropNorm / (cfg.dropThreshold * 2), 0, 1)
        const velScore = clamp(c.peakVel / (cfg.velocityThreshold * 2), 0, 1)
        const angleScore = clamp((sample.angle - cfg.candidateMinAngle) / (90 - cfg.candidateMinAngle), 0, 1)
        const persistScore = clamp(horizontalFor / (cfg.persistenceMs * 1.5), 0, 1)
        evidence = Math.round((0.25 * dropScore + 0.25 * velScore + 0.2 * angleScore + 0.3 * persistScore) * 100) / 100
        this.lastReasons = [
          ...this.lastReasons,
          `Torso ${Math.round(sample.angle)}° from vertical, horizontal posture held for ${(horizontalFor / 1000).toFixed(1)} s`,
        ]
        this.locked = true
        newlyDetected = true
      } else if (t - c.t0 > cfg.confirmWindowMs) {
        this.candidate = null
        this.lastReasons = ['Candidate dismissed: fallen posture did not persist']
      }
    }

    return this.result(t, true, posture, metrics, newlyDetected, evidence)
  }

  // ---- internals -------------------------------------------------------------------

  private result(
    t: number,
    personDetected: boolean,
    posture: Posture,
    metrics: PoseMetrics | null,
    newlyDetectedFall: boolean,
    evidenceScore: number | null,
  ): DetectionResult {
    const phase: FallPhase = this.locked ? 'POSSIBLE_FALL' : this.candidate ? 'CANDIDATE' : 'NONE'
    return {
      timestampMs: t,
      personDetected,
      posture,
      phase,
      newlyDetectedFall,
      evidenceScore,
      reasons: [...this.lastReasons],
      metrics,
    }
  }

  private isHorizontal(s: Sample): boolean {
    const cfg = this.cfg
    return s.angle >= cfg.horizontalAngle || (s.bboxAspect <= cfg.horizontalAspect && s.angle >= cfg.candidateMinAngle)
  }

  private computeMetrics(cur: Sample): PoseMetrics {
    const cfg = this.cfg
    const h = this.history
    const now = cur.t

    // Reference torso length: the largest in the last 2 s. (During a fall the torso can look
    // shorter because of foreshortening, so using the current value would inflate the numbers.)
    let torsoRef = cur.torsoLen
    for (const s of h) if (now - s.t <= 2000 && s.torsoLen > torsoRef) torsoRef = s.torsoLen

    // Samples inside the sudden-movement window.
    const win = h.filter((s) => now - s.t <= cfg.dropWindowMs)

    // (2) Hip descent: current hip Y minus the highest hip position in the window.
    let minHipY = cur.hipY
    let minAngle = cur.angle
    for (const s of win) {
      if (s.hipY < minHipY) minHipY = s.hipY
      if (s.angle < minAngle) minAngle = s.angle
    }
    const dropNorm = (cur.hipY - minHipY) / torsoRef

    // (3) Peak downward speed, measured over `velocitySpanMs` spans to suppress jitter.
    let peakVel = 0
    for (const s of win) {
      // latest earlier sample that is at least velocitySpanMs older than `s`
      let prev: Sample | null = null
      for (let i = h.length - 1; i >= 0; i--) {
        if (s.t - h[i].t >= cfg.velocitySpanMs) {
          prev = h[i]
          break
        }
      }
      if (!prev) continue
      const v = (s.hipY - prev.hipY) / torsoRef / ((s.t - prev.t) / 1000)
      if (v > peakVel) peakVel = v
    }

    // (1)+(4) Torso tilt increase in the window.
    const angleIncrease = cur.angle - minAngle

    // Sideways speed over ~1 s (used to tell walking from standing).
    let hipHorizontalSpeed = 0
    for (let i = 0; i < h.length; i++) {
      if (now - h[i].t <= 1000 && now - h[i].t >= 500) {
        hipHorizontalSpeed =
          (Math.abs(cur.hipX - h[i].hipX) * cfg.aspectRatio) / torsoRef / ((now - h[i].t) / 1000)
        break
      }
    }

    return {
      torsoAngleDeg: cur.angle,
      torsoLength: cur.torsoLen,
      hipX: cur.hipX,
      hipY: cur.hipY,
      bboxAspect: cur.bboxAspect,
      thighVerticalRatio: cur.thighVert,
      hipHorizontalSpeed,
      dropNorm,
      peakDownVelocity: peakVel,
      angleIncrease,
      horizontalForMs: this.candidate?.horizontalSince != null ? now - this.candidate.horizontalSince : 0,
    }
  }

  private classify(m: PoseMetrics): Posture {
    const cfg = this.cfg
    if (
      m.torsoAngleDeg >= cfg.horizontalAngle ||
      (m.bboxAspect <= cfg.horizontalAspect && m.torsoAngleDeg >= cfg.candidateMinAngle)
    ) {
      return 'LYING'
    }
    if (m.torsoAngleDeg >= cfg.uprightAngle) return 'BENDING'
    // Torso is upright from here on.
    if (m.thighVerticalRatio !== null && m.thighVerticalRatio < cfg.sittingThighRatio) return 'SITTING'
    if (m.hipHorizontalSpeed >= cfg.walkingSpeed) return 'WALKING'
    return 'STANDING'
  }
}

export const POSTURE_LABELS: Record<Posture, string> = {
  NO_PERSON: 'No person',
  STANDING: 'Standing',
  WALKING: 'Walking',
  SITTING: 'Sitting',
  BENDING: 'Bending',
  LYING: 'Lying / horizontal',
  UNKNOWN: 'Unknown',
}
