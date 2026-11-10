import { detectorLayers } from './model.js'
import { buildDimuonCandidates } from '../physics/beam-physics.js'

const CMS_FIELD_T = 3.8
const MUON_MASS_GEV = 0.1056583755
const TRANSVERSE_TRACK_RESOLUTION_MM = 0.015
const LONGITUDINAL_TRACK_RESOLUTION_MM = 45
const BEAM_SPOT_CONSTRAINT_MM = 0.015

function createRandom(seed) {
  let state = (seed >>> 0) || 1
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function gaussian(random) {
  const first = Math.max(random(), Number.EPSILON)
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * random())
}

function fitPrimaryVertex(particles) {
  const tracks = particles.filter((particle) =>
    particle.charge !== 0 && particle.trackMeasurement)
  const beamSpotWeight = 1 / BEAM_SPOT_CONSTRAINT_MM ** 2
  let xx = beamSpotWeight
  let xy = 0
  let yy = beamSpotWeight
  let xRight = 0
  let yRight = 0

  for (const track of tracks) {
    const phi = track.direction
    const normalX = -Math.sin(phi)
    const normalY = Math.cos(phi)
    const weight = 1 / track.trackMeasurement.transverseUncertaintyMm ** 2
    const measuredImpactParameter = track.trackMeasurement.transverseImpactParameterMm
    xx += weight * normalX ** 2
    xy += weight * normalX * normalY
    yy += weight * normalY ** 2
    xRight += weight * normalX * measuredImpactParameter
    yRight += weight * normalY * measuredImpactParameter
  }

  const determinant = xx * yy - xy ** 2
  const zWeight = tracks.reduce(
    (sum, track) => sum + 1 / track.trackMeasurement.longitudinalUncertaintyMm ** 2,
    0,
  )
  const zRight = tracks.reduce(
    (sum, track) => sum
      + track.trackMeasurement.longitudinalImpactParameterMm
        / track.trackMeasurement.longitudinalUncertaintyMm ** 2,
    0,
  )
  const hasTrackFit = tracks.length >= 2 && determinant > 0 && zWeight > 0

  return {
    available: hasTrackFit,
    xMm: hasTrackFit ? (xRight * yy - yRight * xy) / determinant : null,
    yMm: hasTrackFit ? (yRight * xx - xRight * xy) / determinant : null,
    zMm: hasTrackFit ? zRight / zWeight : null,
    resolutionMm: {
      transverseX: hasTrackFit ? Math.sqrt(yy / determinant) : null,
      transverseY: hasTrackFit ? Math.sqrt(xx / determinant) : null,
      longitudinal: hasTrackFit ? Math.sqrt(1 / zWeight) : null,
    },
    tracksUsed: tracks.length,
    method: 'Weighted educational fit of reconstructed track impact parameters with a beam-spot constraint',
    status: hasTrackFit ? 'FITTED' : 'INSUFFICIENT_TRACKS',
  }
}

function particleMass(type) {
  if (type === 'Muon') return MUON_MASS_GEV
  return 0
}

function smearDirection(vector, random, sigma) {
  const magnitude = Math.hypot(vector.px, vector.py, vector.pz)
  if (magnitude === 0) return { px: 0, py: 0, pz: 0 }
  const phi = Math.atan2(vector.py, vector.px) + (random() - 0.5) * sigma
  const eta = Math.asinh(vector.pz / Math.max(Math.hypot(vector.px, vector.py), 1e-12))
    + (random() - 0.5) * sigma
  const transverse = magnitude / Math.cosh(eta)
  return {
    px: transverse * Math.cos(phi),
    py: transverse * Math.sin(phi),
    pz: transverse * Math.sinh(eta),
  }
}

function cellIndex(phi, eta) {
  const phiCell = Math.floor(((phi + Math.PI) / (2 * Math.PI)) * 72)
  const etaCell = Math.floor(((eta + 5) / 10) * 50)
  return `${Math.max(0, Math.min(71, phiCell))}:${Math.max(0, Math.min(49, etaCell))}`
}

function createRecoParticle(particle, index, random, fieldTesla, efficiencyScale) {
  if (particle.type === 'Neutrino') return null
  const baseEfficiency = particle.type === 'Muon' ? 0.985
    : particle.type === 'Electron' ? 0.97
      : particle.type === 'Photon' ? 0.94
        : particle.type === 'Jet' ? 0.91
          : 0.82
  const efficiency = Math.max(0, Math.min(1, baseEfficiency * efficiencyScale))
  if (random() > efficiency) return null

  const truthPt = Math.hypot(particle.px, particle.py)
  const fieldScale = Math.max(fieldTesla, 0.1) / CMS_FIELD_T
  const relativeResolution = particle.type === 'Muon'
    ? Math.hypot(0.008, 0.00012 * truthPt / fieldScale)
    : particle.type === 'Electron' ? Math.hypot(0.012, 0.01 / Math.sqrt(Math.max(particle.energy, 0.1)))
      : particle.type === 'Photon' ? Math.hypot(0.025, 0.10 / Math.sqrt(Math.max(particle.energy, 0.1)))
        : Math.hypot(0.05, 0.80 / Math.sqrt(Math.max(particle.energy, 0.1)))
  const scale = Math.max(0.01, 1 + (random() - 0.5) * Math.sqrt(12) * relativeResolution)
  const smearedDirection = smearDirection(particle, random, particle.type === 'Muon' ? 0.0015 : 0.01)
  const px = smearedDirection.px * scale
  const py = smearedDirection.py * scale
  const pz = smearedDirection.pz * scale
  const momentum = Math.hypot(px, py, pz)
  const transverseMomentum = Math.hypot(px, py)
  const energy = Math.hypot(momentum, particleMass(particle.type))
  const phi = Math.atan2(py, px)
  const eta = transverseMomentum > 0 ? Math.asinh(pz / transverseMomentum) : null
  const radiusM = particle.charge ? transverseMomentum / (0.299792458 * Math.max(fieldTesla, 0.1) * Math.abs(particle.charge)) : null
  const trackMeasurement = particle.charge !== 0 && ['Muon', 'Electron'].includes(particle.type)
    ? {
      transverseImpactParameterMm: gaussian(random) * TRANSVERSE_TRACK_RESOLUTION_MM,
      longitudinalImpactParameterMm: gaussian(random) * LONGITUDINAL_TRACK_RESOLUTION_MM,
      transverseUncertaintyMm: TRANSVERSE_TRACK_RESOLUTION_MM,
      longitudinalUncertaintyMm: LONGITUDINAL_TRACK_RESOLUTION_MM,
      source: 'simulated detector track measurement; not present in the CMS source record',
    }
    : null

  return {
    ...particle,
    id: `reco-${index + 1}`,
    energy,
    px,
    py,
    pz,
    momentum,
    transverseMomentum,
    pseudorapidity: eta,
    direction: phi,
    isDetected: true,
    detectionProbability: efficiency,
    truthParticleId: particle.id,
    truthEnergyGeV: particle.energy,
    trackCurvatureRadiusM: radiusM,
    ...(trackMeasurement ? { trackMeasurement } : {}),
    reconstructionLevel: 'CMS-inspired educational response',
  }
}

export function simulateDetectorResponse(event, {
  detectorEfficiency = 1,
  magneticFieldTesla = CMS_FIELD_T,
  seed = event?.id ?? 1,
} = {}) {
  if (event?.eventMode !== 'DATA_INFORMED_SIMULATION' || !Array.isArray(event.responseInputParticles)) {
    throw new Error('Detector response requires a data-informed simulation event.')
  }
  if (!Number.isFinite(detectorEfficiency) || !Number.isFinite(magneticFieldTesla) || magneticFieldTesla <= 0) {
    throw new Error('Detector efficiency and magnetic-field inputs must be valid finite values.')
  }

  const random = createRandom(seed + Math.round(magneticFieldTesla * 1000))
  const efficiencyScale = Math.max(0, Math.min(1.2, detectorEfficiency))
  const responseInputParticles = event.responseInputParticles
  const eventData = { ...event }
  delete eventData.responseInputParticles
  const particles = responseInputParticles
    .map((particle, index) => createRecoParticle(particle, index, random, magneticFieldTesla, efficiencyScale))
    .filter(Boolean)

  const cellMap = new Map()
  for (const particle of particles) {
    if (!['Photon', 'Electron', 'Jet'].includes(particle.type)) continue
    const electromagneticFraction = particle.type === 'Jet' ? 0.28 : 0.96
    const electromagneticEnergyGeV = particle.energy * electromagneticFraction
    const hadronicEnergyGeV = particle.type === 'Jet'
      ? particle.energy - electromagneticEnergyGeV
      : particle.type === 'Electron' || particle.type === 'Photon' ? particle.energy - electromagneticEnergyGeV : 0
    const eta = particle.pseudorapidity ?? 0
    const key = cellIndex(particle.direction, eta)
    const updateCell = (layerId, energyGeV) => {
      if (energyGeV <= 0) return
      const cellKey = `${layerId}:${key}`
      const current = cellMap.get(cellKey)
      if (current) current.energyGeV += energyGeV
      else cellMap.set(cellKey, { id: cellKey, layerId, eta, phi: particle.direction, energyGeV })
    }
    updateCell('electromagnetic', electromagneticEnergyGeV)
    updateCell('hadronic', hadronicEnergyGeV)
  }

  const visiblePx = particles.reduce((sum, particle) => sum + particle.px, 0)
  const visiblePy = particles.reduce((sum, particle) => sum + particle.py, 0)
  const cells = [...cellMap.values()]
  const layers = detectorLayers.map((layer) => {
    const hits = particles.filter((particle) => {
      if (layer.id === 'tracking') return ['Muon', 'Electron'].includes(particle.type) && particle.charge !== 0
      if (layer.id === 'muon') return particle.type === 'Muon'
      if (layer.id === 'electromagnetic') return ['Photon', 'Electron'].includes(particle.type)
      return particle.type === 'Jet'
    }).map((particle) => ({
      ...particle,
      position: {
        x: Math.cos(particle.direction) * layer.radius,
        y: Math.sin(particle.direction) * layer.radius,
      },
      time: event.time,
      classification: particle.type.toUpperCase(),
      depositedEnergy: layer.id === 'electromagnetic' || layer.id === 'hadronic' ? particle.energy : null,
    }))
    const layerCells = cells.filter((cell) => cell.layerId === layer.id)
    return {
      ...layer,
      hits,
      cells: layerCells,
      detected: layer.id === 'electromagnetic' || layer.id === 'hadronic' ? layerCells.length : hits.length,
      depositedEnergy: layerCells.reduce((sum, cell) => sum + cell.energyGeV, 0),
      available: true,
    }
  })

  const reconstructedVertex = fitPrimaryVertex(particles)
  const quality = Math.max(0, Math.min(100,
    100 * particles.length / Math.max(responseInputParticles.length, 1)))
  const reconstructedDimuonMass = buildDimuonCandidates({ particles })
    .map((candidate) => candidate.massGeV)
    .find(Number.isFinite) ?? null

  return {
    ...eventData,
    particles,
    detectedParticles: particles.length,
    totalEnergy: particles.reduce((sum, particle) => sum + particle.energy, 0),
    invariantMass: reconstructedDimuonMass,
    missingTransverseMomentumGeV: Math.hypot(visiblePx, visiblePy),
    missingTransverseMomentumDefinition: 'Partial transverse imbalance of resampled muon tracks only; not full-event missing transverse momentum.',
    detectorQuality: {
      scorePercent: quality,
      reconstructedParticles: particles.length,
      inputTemplateParticles: responseInputParticles.length,
      magneticFieldTesla,
      detectorEfficiencyScale: efficiencyScale,
    },
    reconstructionFlags: {
      eventMode: 'DATA_INFORMED_SIMULATION',
      truthLevelAvailable: false,
      resampledRecordedReconstruction: true,
      detectorSmearingApplied: true,
      detectorEfficiencyApplied: true,
      reconstructedVertexUsesTrackFit: true,
      reconstructedVertexUsesSimulatedTrackMeasurements: true,
      missingTransverseMomentumIsReconstructed: true,
      missingTransverseMomentumFullEventCoverage: false,
    },
    reconstructedVertex,
    detectorResponse: {
      detector: 'CMS-inspired model',
      magneticFieldTesla,
      layers,
      cells,
    },
  }
}
