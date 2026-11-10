import { buildDimuonCandidates, deriveParticleKinematics } from '../physics/beam-physics.js'

function histogram(values, bins) {
  if (!values.length) return []
  let minimum = values.reduce((current, value) => Math.min(current, value), Infinity)
  let maximum = values.reduce((current, value) => Math.max(current, value), -Infinity)
  if (minimum === maximum) {
    minimum -= 0.5
    maximum += 0.5
  }
  const width = (maximum - minimum) / bins
  const result = Array.from({ length: bins }, (_, index) => ({
    low: minimum + index * width,
    high: minimum + (index + 1) * width,
    count: 0,
  }))
  values.forEach((value) => {
    const index = Math.min(bins - 1, Math.floor((value - minimum) / width))
    result[index].count += 1
  })
  return result
}

export function summarizeEventObservables(events, bins = 12) {
  const particles = events.flatMap((event) => event.particles ?? [])
  const kinematics = particles.map((particle) => ({
    particle,
    derived: deriveParticleKinematics(particle),
  }))
  const valueFor = (derivedKey, storedKey) => kinematics
    .map(({ particle, derived }) => Number.isFinite(derived[derivedKey])
      ? derived[derivedKey]
      : particle[storedKey])
    .filter(Number.isFinite)
  const missingTransverseMomentum = events
    .map((event) => event.missingTransverseMomentumGeV)
    .filter(Number.isFinite)
  const dimuonMasses = events.flatMap((event) =>
    buildDimuonCandidates(event)
      .map((candidate) => candidate.massGeV)
      .filter(Number.isFinite))

  return {
    transverseMomentum: histogram(valueFor('transverseMomentumGeV', 'transverseMomentum'), bins),
    pseudorapidity: histogram(valueFor('pseudorapidity', 'pseudorapidity'), bins),
    azimuth: histogram(valueFor('azimuthRadians', 'direction'), bins),
    missingTransverseMomentum: histogram(missingTransverseMomentum, bins),
    dimuonMass: histogram(dimuonMasses, bins),
    counts: {
      events: events.length,
      particles: particles.length,
      missingTransverseMomentumEvents: missingTransverseMomentum.length,
      dimuonCandidates: dimuonMasses.length,
    },
  }
}

export function estimateDimuonSideband(candidates) {
  const masses = candidates.filter(Number.isFinite)
  const signalWindow = [2.9469, 3.2469]
  const sidebands = [[2.4, 2.8], [3.4, 4.0]]
  const signalWindowCount = masses.filter((mass) => mass >= signalWindow[0] && mass < signalWindow[1]).length
  const sidebandCount = masses.filter((mass) =>
    sidebands.some(([low, high]) => mass >= low && mass < high)).length
  const signalWidth = signalWindow[1] - signalWindow[0]
  const sidebandWidth = sidebands.reduce((sum, [low, high]) => sum + high - low, 0)
  const estimatedBackground = sidebandCount * signalWidth / sidebandWidth
  const estimatedSignal = Math.max(0, signalWindowCount - estimatedBackground)

  return {
    signalWindow,
    signalWindowCount,
    sidebandCount,
    estimatedBackground,
    estimatedSignal,
    signalToBackground: estimatedBackground > 0 ? estimatedSignal / estimatedBackground : null,
    countingSignificance: estimatedBackground > 0 ? estimatedSignal / Math.sqrt(estimatedBackground) : null,
  }
}
