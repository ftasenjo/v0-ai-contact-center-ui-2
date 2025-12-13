"use client"

import { useEffect, useRef } from "react"

export function WaveformVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    const bars = 64
    const barWidth = canvas.width / bars
    const values: number[] = new Array(bars).fill(0).map(() => Math.random() * 0.5 + 0.1)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < bars; i++) {
        // Simulate audio waveform movement
        values[i] += (Math.random() - 0.5) * 0.1
        values[i] = Math.max(0.1, Math.min(1, values[i]))

        const barHeight = values[i] * canvas.height * 0.8
        const x = i * barWidth
        const y = (canvas.height - barHeight) / 2

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        gradient.addColorStop(0, "oklch(0.55 0.2 250 / 0.8)")
        gradient.addColorStop(1, "oklch(0.55 0.2 250 / 0.3)")

        ctx.fillStyle = gradient
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <div className="bg-muted/50 rounded-lg p-2">
      <canvas ref={canvasRef} width={600} height={60} className="w-full h-[60px]" />
    </div>
  )
}
