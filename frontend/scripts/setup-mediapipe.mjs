/**
 * Prepares the MediaPipe files that the browser needs. Runs automatically after `npm install`
 * and can be run manually with `npm run setup:mediapipe`.
 *
 *  1. Copies the WebAssembly runtime from node_modules/@mediapipe/tasks-vision/wasm
 *     to public/wasm (so the app does not depend on a CDN).
 *  2. Downloads the official Pose Landmarker (lite) model to
 *     public/models/pose_landmarker_lite.task if it is not there yet.
 *
 * It never fails the install: if something cannot be done it prints what to do instead.
 */
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Official Google-hosted model (MediaPipe Pose Landmarker, "lite", float16).
// Model card / docs: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
const MODEL_PATH = resolve(root, 'public/models/pose_landmarker_lite.task')

// ---- 1. WASM runtime ----
const wasmSrc = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm')
const wasmDest = resolve(root, 'public/wasm')
if (existsSync(wasmSrc)) {
  mkdirSync(wasmDest, { recursive: true })
  cpSync(wasmSrc, wasmDest, { recursive: true })
  console.log('[setup] MediaPipe WASM runtime copied to public/wasm')
} else {
  console.warn('[setup] @mediapipe/tasks-vision is not installed yet – run `npm install` first.')
}

// ---- 2. Model file ----
const MIN_BYTES = 1_000_000 // the real file is several MB
const hasModel = existsSync(MODEL_PATH) && statSync(MODEL_PATH).size > MIN_BYTES

if (hasModel) {
  console.log('[setup] Pose model already present: public/models/pose_landmarker_lite.task')
} else {
  try {
    console.log('[setup] Downloading Pose Landmarker (lite) model from Google …')
    const res = await fetch(MODEL_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < MIN_BYTES) throw new Error(`unexpectedly small download (${buf.length} bytes)`)
    mkdirSync(dirname(MODEL_PATH), { recursive: true })
    writeFileSync(MODEL_PATH, buf)
    console.log(`[setup] Model saved (${(buf.length / 1e6).toFixed(1)} MB)`)
  } catch (e) {
    console.warn(`\n[setup] Could not download the pose model automatically: ${e.message}`)
    console.warn('        Download it manually and save it as frontend/public/models/pose_landmarker_lite.task :')
    console.warn(`        ${MODEL_URL}`)
    console.warn('        (PowerShell:  Invoke-WebRequest -Uri "<url above>" -OutFile "public\\models\\pose_landmarker_lite.task")\n')
  }
}
