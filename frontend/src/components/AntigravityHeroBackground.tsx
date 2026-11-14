import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  hue: number // for dynamic Google/Antigravity tones (blue, purple, cyan)
  pulseSpeed: number
  angle: number
  angularSpeed: number
  isShape?: 'cube' | 'circle'
}

export function AntigravityHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth ?? window.innerWidth)
    let height = (canvas.height = canvas.parentElement?.clientHeight ?? window.innerHeight)

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 160,
    }

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth
      height = canvas.height = canvas.parentElement.clientHeight
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    window.addEventListener('resize', handleResize)
    const parent = canvas.parentElement
    parent?.addEventListener('mousemove', handleMouseMove)
    parent?.addEventListener('mouseleave', handleMouseLeave)

    // Generate antigravity particles + floating isometric micro-cubes
    const particleCount = Math.floor(Math.min(width * 0.08, 90))
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.25 - Math.random() * 0.4, // Upward floating antigravity drift
        size: Math.random() * 3 + 1.8,
        opacity: Math.random() * 0.55 + 0.25,
        hue: Math.random() > 0.4 ? 220 + Math.random() * 30 : 160 + Math.random() * 40, // Indigo/Blue/Teal palette
        pulseSpeed: 0.02 + Math.random() * 0.03,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.02,
        isShape: i % 4 === 0 ? 'cube' : 'circle',
      })
    }

    // Function to draw an isometric floating micro-cube
    const drawCube = (x: number, y: number, s: number, angle: number, alpha: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.75})`
      ctx.lineWidth = 1
      ctx.fillStyle = `rgba(224, 231, 255, ${alpha * 0.2})`

      // 3D wireframe box
      const hs = s * 1.5
      ctx.strokeRect(-hs, -hs, hs * 2, hs * 2)
      ctx.fillRect(-hs, -hs, hs * 2, hs * 2)

      // Inner diagonal edge for 3D depth
      ctx.beginPath()
      ctx.moveTo(-hs, -hs)
      ctx.lineTo(hs, hs)
      ctx.strokeStyle = `rgba(129, 140, 248, ${alpha * 0.35})`
      ctx.stroke()

      ctx.restore()
    }

    let t = 0
    const render = () => {
      t += 0.015
      ctx.clearRect(0, 0, width, height)

      // Constellation connection mesh distance
      const maxDistance = 110

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.hypot(dx, dy)

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.18
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // Update and draw each particle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Upward antigravity lift with subtle horizontal sinusoidal drift
        p.y += p.vy
        p.x += p.vx + Math.sin(t + i) * 0.15
        p.angle += p.angularSpeed

        // Wrap around seamlessly
        if (p.y < -20) p.y = height + 20
        if (p.y > height + 20) p.y = -20
        if (p.x < -20) p.x = width + 20
        if (p.x > width + 20) p.x = -20

        // Interactive mouse repulsion physics
        const mdx = p.x - mouse.x
        const mdy = p.y - mouse.y
        const mDist = Math.hypot(mdx, mdy)

        if (mDist < mouse.radius) {
          const force = (mouse.radius - mDist) / mouse.radius
          const angle = Math.atan2(mdy, mdx)
          p.x += Math.cos(angle) * force * 3.5
          p.y += Math.sin(angle) * force * 3.5
        }

        const currentOpacity = p.opacity + Math.sin(t * p.pulseSpeed * 100) * 0.12

        if (p.isShape === 'cube') {
          drawCube(p.x, p.y, p.size * 1.8, p.angle, Math.max(0.1, currentOpacity))
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${Math.max(0.1, currentOpacity)})`
          ctx.shadowBlur = 8
          ctx.shadowColor = 'rgba(99, 102, 241, 0.4)'
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      parent?.removeEventListener('mousemove', handleMouseMove)
      parent?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-85 transition-opacity duration-1000"
      aria-hidden
    />
  )
}

