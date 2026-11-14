/**
 * Beeping sound for the emergency countdown, generated with the Web Audio API
 * (no audio files). Browsers only allow sound after a user gesture, so `unlock()` is
 * called when the user presses "Start Monitoring".
 */
export class AlarmSound {
  private ctx: AudioContext | null = null
  private timer: number | null = null

  unlock() {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx ??= new Ctor()
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } catch {
      /* no audio support – the visual alert still works */
    }
  }

  private beep() {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.32)
  }

  start() {
    this.stop()
    this.beep()
    this.timer = window.setInterval(() => this.beep(), 1000)
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  dispose() {
    this.stop()
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null
  }
}
