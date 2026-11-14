import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus =
  | 'idle' // not started
  | 'requesting' // waiting for the browser permission prompt / device
  | 'active' // stream is live
  | 'denied' // user (or policy) blocked the camera
  | 'unavailable' // no camera / unsupported browser
  | 'insecure' // page is not https / localhost
  | 'busy' // camera used by another app
  | 'error' // anything else

export class CameraError extends Error {
  constructor(
    message: string,
    public status: Exclude<CameraStatus, 'idle' | 'requesting' | 'active'>,
  ) {
    super(message)
    this.name = 'CameraError'
  }
}

/** Translates getUserMedia failures into a status and instructions a non-technical person can follow. */
function toCameraError(e: unknown): CameraError {
  const name = (e as DOMException | undefined)?.name
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return new CameraError(
        'Camera access was blocked. Click the camera / lock icon in the address bar, set Camera to "Allow", reload the page and press Start Monitoring again.',
        'denied',
      )
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new CameraError('No camera was found. Connect a webcam (or enable the built-in one) and try again.', 'unavailable')
    case 'NotReadableError':
    case 'TrackStartError':
      return new CameraError(
        'The camera is being used by another program. Close other apps or browser tabs that use the camera (Zoom, Teams, …) and try again.',
        'busy',
      )
    case 'OverconstrainedError':
      return new CameraError('The camera does not support the requested settings. Try another camera.', 'error')
    case 'SecurityError':
      return new CameraError('The browser blocked camera access for security reasons. Use https:// or http://localhost.', 'insecure')
    default:
      return new CameraError(`The camera could not be started${name ? ` (${name})` : ''}. Check the camera and try again.`, 'error')
  }
}

/** Opens the webcam. Throws CameraError with a user-friendly message. */
export async function openCamera(): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new CameraError('Camera access needs a secure page. Open SafeWalk via https:// or http://localhost.', 'insecure')
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('This browser does not support camera access. Try a recent version of Chrome, Edge or Firefox.', 'unavailable')
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    if (!devices.some((d) => d.kind === 'videoinput')) {
      throw new CameraError('No camera was found. Connect a webcam (or enable the built-in one) and try again.', 'unavailable')
    }
  } catch (e) {
    if (e instanceof CameraError) throw e
    // enumerateDevices failing is not fatal – getUserMedia will report the real problem.
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    })
  } catch (e) {
    throw toCameraError(e)
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

/**
 * React hook around openCamera(). The camera is only opened when start() is called (never
 * automatically) and is released by stop() or when the component using the hook unmounts.
 */
export function useCamera(onLost?: () => void) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onLostRef = useRef(onLost)
  onLostRef.current = onLost

  const stop = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null
    setStream(null)
    setStatus('idle')
  }, [])

  const start = useCallback(async (): Promise<MediaStream> => {
    stopStream(streamRef.current)
    setStatus('requesting')
    setError(null)
    try {
      const s = await openCamera()
      streamRef.current = s
      // Camera unplugged / revoked while running.
      s.getVideoTracks().forEach((t) =>
        t.addEventListener('ended', () => {
          if (streamRef.current !== s) return
          streamRef.current = null
          setStream(null)
          setStatus('error')
          setError('The camera was disconnected or stopped. Reconnect it and press Start Monitoring again.')
          onLostRef.current?.()
        }),
      )
      setStream(s)
      setStatus('active')
      return s
    } catch (e) {
      const err = e instanceof CameraError ? e : new CameraError('The camera could not be started.', 'error')
      setStatus(err.status)
      setError(err.message)
      throw err
    }
  }, [])

  // Release the camera when the component unmounts.
  useEffect(() => () => stopStream(streamRef.current), [])

  return { stream, status, error, start, stop }
}
