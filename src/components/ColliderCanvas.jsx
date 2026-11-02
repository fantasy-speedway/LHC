import { useCallback, useEffect, useRef, useState } from 'react'
import { colliderComponents } from '../collider/components'
import { getParticleType } from '../beam/particles'

const TAU = Math.PI * 2

function getGeometry(width, height, camera) {
  return { cx: width * 0.68 + camera.x, cy: height / 2 + camera.y, radius: Math.min(Math.min(width, height) * 0.33, width * 0.29) * camera.zoom }
}

export default function ColliderCanvas({ simulation, selectedId, onSelect, labelsVisible, onLabelsChange, rotation = 0, injectorStage = 0 }) {
  const canvasRef = useRef(null)
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const draw = useCallback((canvas, context) => {
    const ratio = window.devicePixelRatio || 1; const width = canvas.clientWidth; const height = canvas.clientHeight
    canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0)
    const { cx, cy, radius } = getGeometry(width, height, camera)
    const background = context.createRadialGradient(cx, cy, radius * 0.08, cx, cy, Math.max(width, height) * 0.72)
    background.addColorStop(0, '#10252a')
    background.addColorStop(0.58, '#0a171d')
    background.addColorStop(1, '#071015')
    context.fillStyle = background; context.fillRect(0, 0, width, height)
    context.strokeStyle = 'rgba(110, 148, 157, .055)'; context.lineWidth = 1
    for (let grid = 40; grid < width; grid += 40) { context.beginPath(); context.moveTo(grid, 0); context.lineTo(grid, height); context.stroke() }
    for (let grid = 40; grid < height; grid += 40) { context.beginPath(); context.moveTo(0, grid); context.lineTo(width, grid); context.stroke() }
    context.strokeStyle = 'rgba(89, 215, 205, .08)'; context.setLineDash([3, 8]); context.beginPath(); context.moveTo(cx, 0); context.lineTo(cx, height); context.moveTo(0, cy); context.lineTo(width, cy); context.stroke(); context.setLineDash([])
    context.strokeStyle = 'rgba(89, 215, 205, .07)'; context.lineWidth = 1; context.beginPath(); context.arc(cx, cy, radius * 0.53, 0, TAU); context.stroke()
    context.strokeStyle = 'rgba(89, 215, 205, .12)'; context.setLineDash([2, 7]); context.beginPath(); context.arc(cx, cy, radius + 19 * camera.zoom, 0, TAU); context.stroke(); context.setLineDash([])
    context.save(); context.shadowColor = '#59d7cd'; context.shadowBlur = 20 * camera.zoom; context.strokeStyle = 'rgba(89, 215, 205, .14)'; context.lineWidth = 28 * camera.zoom; context.beginPath(); context.arc(cx, cy, radius, 0, TAU); context.stroke(); context.restore()
    context.strokeStyle = '#20383f'; context.lineWidth = 24 * camera.zoom; context.beginPath(); context.arc(cx, cy, radius, 0, TAU); context.stroke()
    context.strokeStyle = '#0d1b20'; context.lineWidth = 16 * camera.zoom; context.beginPath(); context.arc(cx, cy, radius, 0, TAU); context.stroke()
    context.strokeStyle = '#37656b'; context.lineWidth = 2 * camera.zoom; context.beginPath(); context.arc(cx, cy, radius - 8 * camera.zoom, 0, TAU); context.stroke()
    context.strokeStyle = 'rgba(185, 218, 210, .16)'; context.lineWidth = 1
    for (let tick = 0; tick < 72; tick += 1) {
      const angle = tick * TAU / 72 + rotation
      const major = tick % 6 === 0
      const innerRadius = radius + (major ? 12 : 15) * camera.zoom
      const outerRadius = radius + 20 * camera.zoom
      context.beginPath()
      context.moveTo(cx + Math.cos(angle) * innerRadius, cy + Math.sin(angle) * innerRadius)
      context.lineTo(cx + Math.cos(angle) * outerRadius, cy + Math.sin(angle) * outerRadius)
      context.strokeStyle = major ? 'rgba(159, 199, 193, .38)' : 'rgba(159, 199, 193, .14)'
      context.lineWidth = major ? 1.2 : 0.7
      context.stroke()
    }
    const boosterRadius = Math.min(width, height) * 0.09 * camera.zoom
    const boosterX = width * 0.17 + camera.x
    const boosterY = cy
    const linacX = Math.max(12 * camera.zoom, boosterX - boosterRadius - 24 * camera.zoom)
    const routeEnd = cx - radius
    const routeLength = routeEnd - (boosterX + boosterRadius)
    const psX = boosterX + boosterRadius + routeLength * 0.36
    const spsX = boosterX + boosterRadius + routeLength * 0.68
    const routeY = cy

    context.save()
    context.strokeStyle = 'rgba(226, 161, 108, .5)'
    context.lineWidth = 1.2 * camera.zoom
    context.setLineDash([4 * camera.zoom, 5 * camera.zoom])
    context.beginPath()
    context.moveTo(linacX, routeY)
    context.lineTo(routeEnd, routeY)
    context.stroke()
    context.setLineDash([])
    context.fillStyle = '#091017'
    context.strokeStyle = '#bb7855'
    context.fillRect(linacX - 7 * camera.zoom, routeY - 5 * camera.zoom, 14 * camera.zoom, 10 * camera.zoom)
    context.strokeRect(linacX - 7 * camera.zoom, routeY - 5 * camera.zoom, 14 * camera.zoom, 10 * camera.zoom)
    if (labelsVisible) {
      context.fillStyle = '#bb9c83'
      context.font = `${Math.max(8, 9 * camera.zoom)}px IBM Plex Mono, monospace`
      context.textAlign = 'center'
      context.fillText('LINAC4', linacX, routeY + 19 * camera.zoom)
    }

    context.strokeStyle = 'rgba(89, 215, 205, .46)'
    context.lineWidth = 2 * camera.zoom
    for (let ring = 0; ring < 4; ring += 1) {
      const ringRadius = boosterRadius * (1 - ring * 0.19)
      context.beginPath()
      context.arc(boosterX, boosterY, ringRadius, 0, TAU)
      context.stroke()
    }
    const transferStations = [
      { x: psX, label: 'PS', radius: 8 * camera.zoom },
      { x: spsX, label: 'SPS', radius: 11 * camera.zoom },
    ]
    if (routeLength > 70 * camera.zoom) {
      transferStations.forEach(({ x, label, radius: stationRadius }) => {
        context.beginPath()
        context.arc(x, routeY, stationRadius, 0, TAU)
        context.strokeStyle = 'rgba(185, 218, 210, .7)'
        context.lineWidth = 1.3 * camera.zoom
        context.stroke()
        if (labelsVisible) {
          context.fillStyle = '#769396'
          context.font = `${Math.max(8, 9 * camera.zoom)}px IBM Plex Mono, monospace`
          context.textAlign = 'center'
          context.fillText(label, x, routeY + 24 * camera.zoom)
        }
      })
    }
    if (labelsVisible) {
      context.fillStyle = '#59d7cd'
      context.font = `${Math.max(8, 9 * camera.zoom)}px IBM Plex Mono, monospace`
      context.textAlign = 'center'
      context.fillText('PS BOOSTER', boosterX, boosterY - boosterRadius - 8 * camera.zoom)
      context.fillStyle = '#769396'
      context.font = `${Math.max(7, 8 * camera.zoom)}px IBM Plex Mono, monospace`
      context.fillText('4 RINGS', boosterX, boosterY + boosterRadius + 18 * camera.zoom)
    }
    const stagePositions = [linacX, boosterX, psX, spsX, routeEnd]
    if (injectorStage === 1) {
      const angle = simulation.time * 2.4 + rotation
      context.fillStyle = '#fff3bd'
      context.shadowColor = '#fff3bd'
      context.shadowBlur = 10
      context.beginPath()
      context.arc(boosterX + Math.cos(angle) * boosterRadius, boosterY + Math.sin(angle) * boosterRadius, 3 * camera.zoom, 0, TAU)
      context.fill()
    } else {
      context.fillStyle = '#fff3bd'
      context.shadowColor = '#fff3bd'
      context.shadowBlur = 10
      context.beginPath()
      context.arc(stagePositions[injectorStage] ?? linacX, routeY, 3 * camera.zoom, 0, TAU)
      context.fill()
    }
    context.restore()

    colliderComponents.forEach((component) => {
      const angle = component.angle + rotation; const x = cx + Math.cos(angle) * radius; const y = cy + Math.sin(angle) * radius; const active = selectedId === component.id
      context.save(); context.translate(x, y); context.rotate(angle + Math.PI / 2); context.fillStyle = component.type === 'ACCELERATION' ? '#bb7855' : component.type === 'DETECTOR' ? '#59d7cd' : component.type === 'COLLISION' ? '#e2a16c' : '#3c6973'; context.fillRect(-18 * camera.zoom, -7 * camera.zoom, 36 * camera.zoom, 14 * camera.zoom); if (active) { context.strokeStyle = '#ecf8f3'; context.lineWidth = 2; context.strokeRect(-23 * camera.zoom, -12 * camera.zoom, 46 * camera.zoom, 24 * camera.zoom) } context.restore()
      if (labelsVisible) { context.fillStyle = active ? '#ecf8f3' : '#769396'; context.font = `${Math.max(9, 10 * camera.zoom)}px IBM Plex Mono, monospace`; const labelX = x + Math.cos(angle) * (34 * camera.zoom); const labelY = y + Math.sin(angle) * (34 * camera.zoom); context.textAlign = labelX < cx ? 'right' : 'left'; context.fillText(component.type, labelX, labelY) }
    })
    const particle = getParticleType(simulation.beam.particleType); const particleB = getParticleType(simulation.beam.particleTypeB ?? simulation.beam.particleType); const sampleCount = Math.min(56, Math.max(12, Math.round(simulation.beam.particleCount / 8))); const sampleCountB = Math.min(56, Math.max(12, Math.round((simulation.beam.particleCountB ?? simulation.beam.particleCount) / 8))); const phase = simulation.time * 1.8; const intensityFactor = 0.35 + simulation.beam.intensity / 150; const intensityFactorB = 0.35 + (simulation.beam.intensityB ?? simulation.beam.intensity) / 150; const beamAlpha = simulation.status === 'RUNNING' ? (0.2 + simulation.beamActivity * 0.8) * intensityFactor : simulation.status === 'PAUSED' ? 0.35 * intensityFactor : 0; const beamAlphaB = simulation.status === 'RUNNING' ? (0.2 + simulation.beamActivity * 0.8) * intensityFactorB : simulation.status === 'PAUSED' ? 0.35 * intensityFactorB : 0
    const drawBeam = (offset, direction, label, color, beamParticle, count, alpha) => {
      context.save(); context.globalAlpha = alpha; context.strokeStyle = color; context.lineWidth = 2.2 * camera.zoom; context.setLineDash([7 * camera.zoom, 9 * camera.zoom]); context.beginPath(); context.arc(cx, cy, radius - 3 * camera.zoom, offset, offset + Math.PI * direction); context.stroke(); context.setLineDash([])
      for (let index = 0; index < count; index += 1) { const angle = phase * direction + offset + (index / count) * TAU + rotation; const x = cx + Math.cos(angle) * radius; const y = cy + Math.sin(angle) * radius; context.fillStyle = index % 5 === 0 ? beamParticle.accent : color; context.shadowColor = color; context.shadowBlur = 5 + beamParticle.size * 4; context.beginPath(); context.arc(x, y, (1.35 + beamParticle.size * 1.45) * camera.zoom, 0, TAU); context.fill() }
      const indicatorAngle = phase * direction + offset + (direction > 0 ? 0.5 : -0.5); const indicatorX = cx + Math.cos(indicatorAngle) * (radius + 24 * camera.zoom); const indicatorY = cy + Math.sin(indicatorAngle) * (radius + 24 * camera.zoom); context.globalAlpha = 1; context.fillStyle = color; context.font = '10px IBM Plex Mono, monospace'; context.textAlign = indicatorX < cx ? 'right' : 'left'; context.fillText(label, indicatorX, indicatorY); context.restore()
    }
    drawBeam(0, simulation.beam.direction === 'clockwise' ? 1 : -1, 'BEAM A', particle.color, particle, sampleCount, beamAlpha); drawBeam(Math.PI, simulation.beam.directionB === 'clockwise' ? 1 : -1, 'BEAM B', '#dc7857', particleB, sampleCountB, beamAlphaB)
    if (simulation.latestCollision) {
      const collisionAngle = 1.58 + rotation; const collisionX = cx + Math.cos(collisionAngle) * radius; const collisionY = cy + Math.sin(collisionAngle) * radius; const age = Math.max(0, simulation.time - simulation.latestCollision.time)
      if (simulation.collisionFlash > 0) { context.save(); context.globalAlpha = simulation.collisionFlash; context.fillStyle = '#fff3bd'; context.shadowColor = '#fff3bd'; context.shadowBlur = 28; context.beginPath(); context.arc(collisionX, collisionY, 9 + simulation.collisionFlash * 18, 0, TAU); context.fill(); context.restore() }
      if (age < 4) simulation.latestCollision.particles.forEach((secondary) => { const distance = Math.min(radius * 0.7, 8 + age * radius * 0.22); const direction = secondary.direction + rotation; const endX = collisionX + Math.cos(direction) * distance; const endY = collisionY + Math.sin(direction) * distance; const alpha = Math.max(0, 1 - age / 4); context.save(); context.globalAlpha = alpha; context.strokeStyle = secondary.color; context.lineWidth = 1.2 * camera.zoom; context.beginPath(); context.moveTo(collisionX, collisionY); context.lineTo(endX, endY); context.stroke(); context.fillStyle = secondary.color; context.shadowColor = secondary.color; context.shadowBlur = 8; context.beginPath(); context.arc(endX, endY, 2.2 * camera.zoom, 0, TAU); context.fill(); context.restore() })
      if (labelsVisible) { context.fillStyle = '#fff3bd'; context.font = '10px IBM Plex Mono, monospace'; context.textAlign = 'left'; context.fillText(simulation.latestCollision.label, collisionX + 16, collisionY + 18) }
    }
    if (labelsVisible) { context.fillStyle = '#d4e2df'; context.font = '10px IBM Plex Mono, monospace'; context.textAlign = 'left'; context.fillText('COLLISION POINT', cx + 28, cy - 18); context.fillText('DETECTOR / D-01', cx - 48, cy + radius + 50); context.fillStyle = '#6f8e91'; context.fillText('BEAM PIPE A / B', cx - 48, cy + 4) }
  }, [camera, injectorStage, labelsVisible, rotation, selectedId, simulation])
  useEffect(() => { const canvas = canvasRef.current; const context = canvas.getContext('2d'); const render = () => draw(canvas, context); render(); window.addEventListener('resize', render); return () => window.removeEventListener('resize', render) }, [camera, draw, labelsVisible, rotation, selectedId, simulation])
  const componentAtPoint = (event) => { const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); const { cx, cy, radius } = getGeometry(rect.width, rect.height, camera); const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }; let closest = null; let closestDistance = 32 * camera.zoom; colliderComponents.forEach((component) => { const angle = component.angle + rotation; const distance = Math.hypot(point.x - (cx + Math.cos(angle) * radius), point.y - (cy + Math.sin(angle) * radius)); if (distance < closestDistance) { closest = component; closestDistance = distance } }); return closest }
  const handlePointerDown = (event) => { dragStart.current = { x: event.clientX, y: event.clientY }; setDragging(true); canvasRef.current.setPointerCapture(event.pointerId) }
  const handlePointerMove = (event) => { if (!dragging) return; const dx = event.clientX - dragStart.current.x; const dy = event.clientY - dragStart.current.y; dragStart.current = { x: event.clientX, y: event.clientY }; setCamera((current) => ({ ...current, x: current.x + dx, y: current.y + dy })) }
  const handlePointerUp = (event) => { setDragging(false); canvasRef.current.releasePointerCapture(event.pointerId); const moved = Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y); if (moved < 5) onSelect(componentAtPoint(event)?.id ?? null) }
  const zoomBy = (amount) => setCamera((current) => ({ ...current, zoom: Math.max(.65, Math.min(1.8, current.zoom + amount)) }))
  return <><canvas ref={canvasRef} className={`collider-canvas ${dragging ? 'dragging' : ''}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} aria-label="Interactive circular collider visualization" /><div className="canvas-tools"><button onClick={() => zoomBy(.15)} title="Zoom in" aria-label="Zoom in">+</button><button onClick={() => zoomBy(-.15)} title="Zoom out" aria-label="Zoom out">−</button><button onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })} title="Reset view" aria-label="Reset view">⌂</button><label title="Toggle component labels"><input type="checkbox" checked={labelsVisible} onChange={(event) => onLabelsChange(event.target.checked)} /> LABELS</label></div></>
}
