import { useCallback, useEffect, useRef } from 'react'
import { detectorLayers } from '../detector/model'

const TAU = Math.PI * 2
const trackTravel = (particle) => particle.lifetime == null ? 1 : Math.min(1, Math.max(.08, particle.lifetime / 5))

export default function DetectorCanvas({ event, response, display, rotation, zoom, animationTime, selectedParticleId, onParticleSelect }) {
  const canvasRef = useRef(null)
  const draw = useCallback((canvas, context) => {
    const ratio = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * ratio
    canvas.height = height * ratio
    context.setTransform(ratio, 0, 0, ratio, 0, 0)

    const size = Math.min(width, height)
    const cx = width / 2
    const cy = height / 2
    const radius = size * .4 * zoom
    const progress = Math.min(1, animationTime / 2.6)

    context.fillStyle = '#071016'
    context.fillRect(0, 0, width, height)
    context.strokeStyle = 'rgba(110, 148, 157, .08)'
    context.lineWidth = 1
    for (let grid = 32; grid < width; grid += 32) {
      context.beginPath()
      context.moveTo(grid, 0)
      context.lineTo(grid, height)
      context.stroke()
    }
    for (let grid = 32; grid < height; grid += 32) {
      context.beginPath()
      context.moveTo(0, grid)
      context.lineTo(width, grid)
      context.stroke()
    }

    context.strokeStyle = '#223a41'
    context.setLineDash([2, 6])
    context.beginPath()
    context.arc(cx, cy, radius + 18, 0, TAU)
    context.stroke()
    context.setLineDash([])
    if (display.showLayers) {
      detectorLayers.forEach((layer) => {
        context.strokeStyle = layer.color
        context.globalAlpha = .34
        context.lineWidth = 12 * zoom
        context.beginPath()
        context.arc(cx, cy, radius * layer.radius, 0, TAU)
        context.stroke()
        context.globalAlpha = 1
        context.strokeStyle = '#26434a'
        context.lineWidth = 1
        context.beginPath()
        context.arc(cx, cy, radius * layer.radius, 0, TAU)
        context.stroke()
        if (display.showLabels) {
          context.fillStyle = layer.color
          context.font = '9px IBM Plex Mono, monospace'
          context.textAlign = 'left'
          context.fillText(layer.shortLabel, cx + radius * layer.radius + 7, cy - 5)
        }
      })
    }

    context.fillStyle = '#fff3bd'
    context.shadowColor = '#fff3bd'
    context.shadowBlur = event ? 18 : 0
    context.beginPath()
    context.arc(cx, cy, event ? 5 : 3, 0, TAU)
    context.fill()
    context.shadowBlur = 0

    if (event) {
      event.particles.forEach((particle, index) => {
        const travel = trackTravel(particle)
        const angle = particle.direction + rotation
        const distance = radius * travel * progress
        const endX = cx + Math.cos(angle) * distance
        const endY = cy + Math.sin(angle) * distance
        const alpha = .35 + progress * .65
        const selected = selectedParticleId === particle.id
        context.save()
        context.globalAlpha = selected ? 1 : alpha
        context.strokeStyle = particle.color
        context.fillStyle = particle.color
        context.lineWidth = selected ? 3 : particle.charge === 0 ? 1 : 1.8
        context.shadowColor = particle.color
        context.shadowBlur = display.showTracks ? selected ? 16 : 7 : 0
        if (display.showTracks && particle.charge !== 0) {
          const bend = particle.charge * radius * .08 * (index % 2 ? -1 : 1)
          context.beginPath()
          context.moveTo(cx, cy)
          context.quadraticCurveTo(cx - Math.sin(angle) * bend, cy + Math.cos(angle) * bend, endX, endY)
          context.stroke()
        }
        if (particle.charge === 0 && display.showEnergy) {
          context.beginPath()
          context.arc(endX, endY, 4 + particle.energy * 1.2, 0, TAU)
          context.fill()
        } else {
          context.beginPath()
          context.arc(endX, endY, selected ? 3.5 : 2.2, 0, TAU)
          context.fill()
        }
        if (display.showParticleIds) {
          context.shadowBlur = 0
          context.font = '8px IBM Plex Mono, monospace'
          context.fillText(`${particle.type} ${particle.id}`, endX + 5, endY - 5)
        }
        context.restore()
      })
    }

    if (display.showEnergy && response) {
      response.forEach((layer) => layer.hits.forEach((hit) => {
        const x = cx + hit.position.x * radius * progress
        const y = cy + hit.position.y * radius * progress
        context.save()
        context.globalAlpha = .7
        context.fillStyle = layer.color
        context.fillRect(x - 2, y - 2, 4, 4)
        context.restore()
      }))
    }
    if (display.showLabels) {
      context.fillStyle = '#789397'
      context.font = '10px IBM Plex Mono, monospace'
      context.textAlign = 'center'
      context.fillText(event ? event.label : 'AWAITING COLLISION EVENT', cx, height - 20)
    }
  }, [animationTime, display, event, response, rotation, selectedParticleId, zoom])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const render = () => draw(canvas, context)
    render()
    window.addEventListener('resize', render)
    return () => window.removeEventListener('resize', render)
  }, [draw])

  const handleCanvasClick = (pointerEvent) => {
    if (!event || !onParticleSelect) return
    const rect = canvasRef.current.getBoundingClientRect()
    const radius = Math.min(rect.width, rect.height) * .4 * zoom
    const progress = Math.min(1, animationTime / 2.6)
    const point = { x: pointerEvent.clientX - rect.left, y: pointerEvent.clientY - rect.top }
    let closest = null
    let closestDistance = 22
    event.particles.forEach((particle) => {
      const distance = radius * trackTravel(particle) * progress
      const angle = particle.direction + rotation
      const endpoint = { x: rect.width / 2 + Math.cos(angle) * distance, y: rect.height / 2 + Math.sin(angle) * distance }
      const hitDistance = Math.hypot(point.x - endpoint.x, point.y - endpoint.y)
      if (hitDistance < closestDistance) {
        closest = particle
        closestDistance = hitDistance
      }
    })
    onParticleSelect(closest?.id ?? null)
  }

  return <canvas ref={canvasRef} onClick={handleCanvasClick} className="detector-canvas" aria-label="Animated detector display with recorded CMS reference tracks" />
}
