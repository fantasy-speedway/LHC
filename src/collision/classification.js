export const collisionPriorities = Object.freeze({
  BLACK: 'BLACK',
  RED: 'RED',
  AMBER: 'AMBER',
  BLUE: 'BLUE',
  UNMARKED: 'UNMARKED',
})

export const priorityDetails = Object.freeze({
  BLACK: { marker: '▲', label: 'HIGGS CANDIDATE', color: '#111820' },
  RED: { marker: '▲', label: 'HIGH PRIORITY', color: '#f05b56' },
  AMBER: { marker: '▲', label: 'MEDIUM PRIORITY', color: '#e9b64e' },
  BLUE: { marker: '▲', label: 'RESEARCH SAMPLE', color: '#58a9ff' },
  UNMARKED: { marker: '', label: 'UNMARKED', color: 'var(--muted)' },
})

const jpsiMassGeV = 3.0969
const jpsiMassWindowGeV = 0.15
const higgsMassGeV = 125
const higgsMassWindowGeV = 2
const isFiniteNumber = (value) => Number.isFinite(value)
const particleType = (particle) => String(particle?.type ?? '').toLowerCase()

export function classifyCollisionPriority(event) {
  const particles = Array.isArray(event?.particles) ? event.particles : []
  const mass = event?.invariantMass
  const maxPt = Math.max(0, ...particles.map((particle) => particle?.transverseMomentum).filter(isFiniteNumber))
  const missingPt = event?.missingTransverseMomentumGeV
  const higgsCandidate = isFiniteNumber(mass) && Math.abs(mass - higgsMassGeV) <= higgsMassWindowGeV
  const jpsiCandidate = isFiniteNumber(mass) && Math.abs(mass - jpsiMassGeV) <= jpsiMassWindowGeV

  if (higgsCandidate) {
    return { priority: collisionPriorities.BLACK, reasons: ['Invariant mass is within 125 ± 2 GeV Higgs-candidate window.'] }
  }

  const highPriorityReasons = []
  if (maxPt > 100) highPriorityReasons.push('A reconstructed particle has pT above 100 GeV/c.')
  if (isFiniteNumber(missingPt) && missingPt > 100) highPriorityReasons.push('Recorded missing transverse momentum exceeds 100 GeV.')
  if (jpsiCandidate) highPriorityReasons.push('Invariant mass is within 3.0969 ± 0.15 GeV of the investigated J/ψ mass.')
  if (event?.rareReconstructedCombination === true) highPriorityReasons.push('The event is flagged as a rare reconstructed-particle combination.')
  if (event?.strongBackgroundDisagreement === true) highPriorityReasons.push('The event is flagged as strongly disagreeing with a background prediction.')
  if (highPriorityReasons.length) {
    return { priority: collisionPriorities.RED, reasons: highPriorityReasons }
  }

  const highEnergyLeptonsOrPhotons = particles.filter((particle) =>
    ['electron', 'muon', 'photon'].includes(particleType(particle)) && isFiniteNumber(particle.energy) && particle.energy > 50,
  )
  const leptonCount = particles.filter((particle) => ['electron', 'muon'].includes(particleType(particle))).length
  const amberReasons = []
  if (highEnergyLeptonsOrPhotons.length >= 2) amberReasons.push('At least two reconstructed leptons or photons exceed 50 GeV.')
  if (leptonCount === 3 || leptonCount === 4) amberReasons.push(`The event contains ${leptonCount} reconstructed leptons.`)
  if (event?.interestingDijetMass === true) amberReasons.push('The event is flagged as an interesting dijet-mass candidate.')
  if (event?.displacedVertex === true || event?.nonPromptTracks === true) amberReasons.push('The event contains a displaced vertex or non-prompt tracks.')
  if (event?.unusualTransverseMomentumImbalance === true) amberReasons.push('The event is flagged for unusual transverse-momentum imbalance.')
  if (amberReasons.length) {
    return { priority: collisionPriorities.AMBER, reasons: amberReasons }
  }

  if (event?.dataOrigin === 'CERN Open Data' || event?.knownDecay === true || event?.controlSample === true || event?.excellentReconstruction === true) {
    return { priority: collisionPriorities.BLUE, reasons: ['Known decay, control, or research sample; source quality is limited to recorded fields.'] }
  }

  return { priority: collisionPriorities.UNMARKED, reasons: ['No configured priority rule matched the available event measurements.'] }
}

function getLearningFeatures(event) {
  const particles = Array.isArray(event?.particles) ? event.particles : []
  const transverseMomenta = particles.map((particle) => particle?.transverseMomentum).filter(isFiniteNumber)
  const energies = particles.map((particle) => particle?.energy).filter(isFiniteNumber)
  return [
    isFiniteNumber(event?.invariantMass) ? event.invariantMass : null,
    transverseMomenta.length ? Math.max(...transverseMomenta) : null,
    transverseMomenta.length ? transverseMomenta.reduce((sum, value) => sum + value, 0) : null,
    energies.length ? energies.reduce((sum, value) => sum + value, 0) : null,
    particles.length,
    particles.filter((particle) => particleType(particle) === 'muon').length,
  ]
}

export function rankAgainstReviewedEvents(event, savedEvents) {
  const reviewed = (Array.isArray(savedEvents) ? savedEvents : [])
    .filter((record) => record?.reviewedAt && Object.values(collisionPriorities).includes(record.reviewedPriority))
  const counts = reviewed.reduce((result, record) => {
    result[record.reviewedPriority] = (result[record.reviewedPriority] ?? 0) + 1
    return result
  }, {})
  const trainedLabels = Object.keys(counts)
  if (reviewed.length < 4 || trainedLabels.length < 2) {
    return {
      ready: false,
      counts,
      includedLabels: [],
      message: 'Review at least four events across two or more categories to enable ranking.',
      match: null,
    }
  }

  const trainingRows = reviewed
    .filter((record) => trainedLabels.includes(record.reviewedPriority))
    .map((record) => ({ label: record.reviewedPriority, features: getLearningFeatures(record) }))
  const featureCount = trainingRows[0].features.length
  const scales = Array.from({ length: featureCount }, (_, index) => {
    const values = trainingRows.map((row) => row.features[index]).filter(isFiniteNumber)
    if (values.length < 2) return 1
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    return Math.max(Math.sqrt(variance), 1e-6)
  })
  const targetFeatures = getLearningFeatures(event)
  const distances = trainedLabels.map((label) => {
    const rows = trainingRows.filter((row) => row.label === label)
    let sum = 0
    let dimensions = 0
    for (let index = 0; index < featureCount; index += 1) {
      if (!isFiniteNumber(targetFeatures[index])) continue
      const values = rows.map((row) => row.features[index]).filter(isFiniteNumber)
      if (!values.length) continue
      const center = values.reduce((total, value) => total + value, 0) / values.length
      sum += ((targetFeatures[index] - center) / scales[index]) ** 2
      dimensions += 1
    }
    return { label, distance: dimensions ? Math.sqrt(sum / dimensions) : Infinity }
  }).sort((left, right) => left.distance - right.distance)
  const nearest = distances[0]
  if (!nearest || !Number.isFinite(nearest.distance)) {
    return { ready: false, counts, includedLabels: trainedLabels, message: 'No shared measured features are available for comparison.', match: null }
  }
  return {
    ready: true,
    counts,
    includedLabels: trainedLabels,
    provisionalLabels: trainedLabels.filter((label) => counts[label] < 2),
    message: `Nearest reviewed category; based on ${trainedLabels.length} trained categories.`,
    match: { priority: nearest.label, distance: nearest.distance, similarity: 1 / (1 + nearest.distance) },
  }
}
