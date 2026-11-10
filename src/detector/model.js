export const detectorLayers = [
  { id: 'tracking', label: 'INNER TRACKING', shortLabel: 'TRACKING', radius: 0.26, color: '#59d7cd' },
  { id: 'electromagnetic', label: 'ELECTROMAGNETIC', shortLabel: 'EM CALORIMETER', radius: 0.47, color: '#f0b36d' },
  { id: 'hadronic', label: 'HADRONIC', shortLabel: 'HADRONIC CALORIMETER', radius: 0.69, color: '#d58cff' },
  { id: 'muon', label: 'MUON DETECTOR', shortLabel: 'MUON SYSTEM', radius: 0.9, color: '#8fb8ff' },
]

export function buildDetectorResponse(event) {
  if (event?.eventMode === 'DATA_INFORMED_SIMULATION' && Array.isArray(event.detectorResponse?.layers)) {
    return event.detectorResponse.layers
  }

  if (event?.dataOrigin === 'CERN Open Data') {
    return detectorLayers.map((layer) => {
      const available = layer.id === 'tracking' || layer.id === 'muon'
      const hits = available
        ? event.particles
          .filter((particle) => layer.id === 'tracking' || particle.muonTrackType.includes('G'))
          .map((particle) => ({
            ...particle,
            position: {
              x: Math.cos(particle.direction) * layer.radius,
              y: Math.sin(particle.direction) * layer.radius,
            },
            time: event.time,
            classification: `CMS ${particle.muonTrackType} muon track`,
            depositedEnergy: null,
          }))
        : []

      return {
        ...layer,
        hits,
        detected: available ? hits.length : null,
        depositedEnergy: null,
        available,
      }
    })
  }

  return detectorLayers.map((layer) => {
    const hits = (event?.particles ?? []).filter((particle) => particle.lifetime / 5 >= layer.radius * 0.86 && Math.random() < particle.detectionProbability)
    return { ...layer, hits: hits.map((particle) => ({ ...particle, position: { x: Math.cos(particle.direction) * layer.radius, y: Math.sin(particle.direction) * layer.radius }, time: event?.time ?? 0, classification: particle.fictional ? 'FICTIONAL' : particle.type.toUpperCase(), depositedEnergy: particle.energy * (0.12 + layer.radius * 0.2) })), detected: hits.length, depositedEnergy: hits.reduce((sum, particle) => sum + particle.energy * (0.12 + layer.radius * 0.2), 0) }
  })
}