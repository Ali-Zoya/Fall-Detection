/**
 * MediaPipe Pose Landmarker (@mediapipe/tasks-vision) loading and drawing helpers.
 *
 * Everything runs locally in the browser:
 *   - the WASM runtime is served from /wasm  (copied from node_modules by scripts/setup-mediapipe.mjs)
 *   - the model is served from /models/pose_landmarker_lite.task
 * No camera frame is ever sent to a server.
 */
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

const base = import.meta.env.BASE_URL
export const MODEL_URL = `${base}models/pose_landmarker_lite.task`
export const WASM_URL = `${base}wasm`

export class PoseModelError extends Error {
  constructor(
    message: string,
    public kind: 'model_missing' | 'wasm_missing' | 'init_failed',
  ) {
    super(message)
    this.name = 'PoseModelError'
  }
}

/**
 * A missing file on a single-page-app host usually returns index.html with status 200,
 * so we also check that the response is not HTML.
 */
async function assertAsset(url: string, kind: 'model_missing' | 'wasm_missing', message: string) {
  let res: Response
  try {
    res = await fetch(url, { method: 'HEAD' })
  } catch {
    throw new PoseModelError(message, kind)
  }
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || type.includes('text/html')) throw new PoseModelError(message, kind)
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null

/** Creates (once) and returns the Pose Landmarker. Tries the GPU first, then falls back to CPU. */
export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      await assertAsset(
        MODEL_URL,
        'model_missing',
        'The pose model file is missing. Save pose_landmarker_lite.task in frontend/public/models/ (run "npm run setup:mediapipe" in the frontend folder).',
      )
      await assertAsset(
        `${WASM_URL}/vision_wasm_internal.wasm`,
        'wasm_missing',
        'The MediaPipe runtime files are missing from frontend/public/wasm. Run "npm run setup:mediapipe" in the frontend folder.',
      )
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
        const create = (delegate: 'GPU' | 'CPU') =>
          PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })
        try {
          return await create('GPU')
        } catch {
          return await create('CPU')
        }
      } catch (e) {
        throw new PoseModelError(`The pose model could not be started: ${(e as Error).message}`, 'init_failed')
      }
    })().catch((e) => {
      landmarkerPromise = null // allow a retry
      throw e
    })
  }
  return landmarkerPromise
}

/** Frees the model's memory (call when the app is closed). */
export async function disposePoseLandmarker() {
  if (!landmarkerPromise) return
  const p = landmarkerPromise
  landmarkerPromise = null
  try {
    ;(await p).close()
  } catch {
    /* already gone */
  }
}

export type OverlayTone = 'safe' | 'warning' | 'alert' | 'idle'
const TONES: Record<OverlayTone, { line: string; dot: string }> = {
  safe: { line: '#10b981', dot: '#ffffff' },
  warning: { line: '#f59e0b', dot: '#ffffff' },
  alert: { line: '#ef4444', dot: '#ffffff' },
  idle: { line: '#94a3b8', dot: '#ffffff' },
}

const utilsCache = new WeakMap<CanvasRenderingContext2D, DrawingUtils>()

/** Draws the skeleton (landmarks + connections) onto the overlay canvas. */
export function drawPose(
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[] | null,
  tone: OverlayTone,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!landmarks) return
  let utils = utilsCache.get(ctx)
  if (!utils) {
    utils = new DrawingUtils(ctx)
    utilsCache.set(ctx, utils)
  }
  const c = TONES[tone]
  utils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: c.line, lineWidth: 4 })
  utils.drawLandmarks(landmarks, { color: c.line, fillColor: c.dot, radius: 3 })
}
