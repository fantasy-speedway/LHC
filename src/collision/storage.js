import { classifyCollisionPriority } from './classification.js'

const storageKey = 'lhc-saved-events'
const isFiniteNumber = (value) => Number.isFinite(value)

export function getCollisionRecordId(event) {
  if (event?.sourceRun != null && event?.sourceEventId != null) {
    return `cern:${event.sourceRecordId ?? 'unknown'}:${event.sourceRun}:${event.sourceEventId}`
  }
  return `event:${event?.dataOrigin ?? 'simulation'}:${event?.id ?? 'unknown'}:${event?.time ?? 'unknown'}`
}

export function createSavedCollision(event, savedAt = new Date().toISOString()) {
  const classification = classifyCollisionPriority(event)
  const particles = Array.isArray(event?.particles) ? event.particles : []
  const massCandidates = isFiniteNumber(event?.invariantMass)
    ? [{
        candidateId: 'recorded-particle-pair',
        particleIds: particles.map((particle) => particle.id),
        particleTypes: particles.map((particle) => particle.type),
        invariantMassGeV: event.invariantMass,
        provenance: event?.dataOrigin ?? 'simulation',
      }]
    : []

  return {
    ...event,
    recordId: getCollisionRecordId(event),
    savedAt,
    sourceTimestamp: event?.sourceTimestamp ?? null,
    sourceTimestampUnavailableReason: event?.sourceTimestamp == null ? 'The bundled derived CSV does not include an event timestamp.' : null,
    collisionEnergyGeV: isFiniteNumber(event?.collisionEnergyGeV) ? event.collisionEnergyGeV : null,
    collisionEnergyUnavailableReason: isFiniteNumber(event?.collisionEnergyGeV) ? null : 'Collision energy is not a field in the bundled derived CSV.',
    runNumber: event?.sourceRun ?? null,
    sourceEventNumber: event?.sourceEventId ?? null,
    reconstructedParticleTypes: [...new Set(particles.map((particle) => particle.type).filter(Boolean))],
    particles: particles.map((particle) => ({
      ...particle,
      momentumComponentsGeV: {
        px: isFiniteNumber(particle.px) ? particle.px : null,
        py: isFiniteNumber(particle.py) ? particle.py : null,
        pz: isFiniteNumber(particle.pz) ? particle.pz : null,
      },
      directionMetadata: {
        phiRadians: isFiniteNumber(particle.direction) ? particle.direction : null,
        pseudorapidity: isFiniteNumber(particle.pseudorapidity) ? particle.pseudorapidity : null,
      },
    })),
    missingTransverseMomentumGeV: isFiniteNumber(event?.missingTransverseMomentumGeV) ? event.missingTransverseMomentumGeV : null,
    massCandidates,
    detectorQuality: event?.detectorQuality ?? null,
    reconstructionFlags: {
      ...(event?.reconstructionFlags ?? {}),
      sourceReconstructionTypes: [...new Set(particles.map((particle) => particle.muonTrackType).filter(Boolean))],
      sourceTimestampAvailable: event?.sourceTimestamp != null,
      collisionEnergyAvailable: isFiniteNumber(event?.collisionEnergyGeV),
      missingTransverseMomentumAvailable: isFiniteNumber(event?.missingTransverseMomentumGeV),
      detectorQualityAvailable: event?.detectorQuality != null,
      detectorHitsAreSourceData: false,
    },
    priority: classification.priority,
    priorityReasons: classification.reasons,
    reviewedPriority: null,
    reviewedAt: null,
  }
}

export function loadSavedCollisionEvents() {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return []
  const records = JSON.parse(raw)
  if (!Array.isArray(records)) throw new Error('Saved collision archive is not a valid list.')
  return records.map((record) => {
    if (record?.recordId && Array.isArray(record.particles)) return record
    const normalized = createSavedCollision(record, record?.savedAt ?? new Date().toISOString())
    return { ...normalized, ...record, recordId: normalized.recordId }
  })
}

export function saveCollisionEvent(event) {
  const records = loadSavedCollisionEvents()
  const nextRecord = createSavedCollision(event)
  const existing = records.find((record) => record.recordId === nextRecord.recordId)
  const savedRecord = existing
    ? { ...nextRecord, ...existing, priority: nextRecord.priority, priorityReasons: nextRecord.priorityReasons }
    : nextRecord
  const nextRecords = [savedRecord, ...records.filter((record) => record.recordId !== savedRecord.recordId)]
  localStorage.setItem(storageKey, JSON.stringify(nextRecords))
  return savedRecord
}

export function reviewSavedCollision(recordId, reviewedPriority) {
  const records = loadSavedCollisionEvents()
  const index = records.findIndex((record) => record.recordId === recordId)
  if (index < 0) throw new Error('This collision is not saved. Save it before reviewing its label.')
  const reviewedRecord = {
    ...records[index],
    reviewedPriority,
    reviewedAt: new Date().toISOString(),
  }
  const nextRecords = records.slice()
  nextRecords[index] = reviewedRecord
  localStorage.setItem(storageKey, JSON.stringify(nextRecords))
  return reviewedRecord
}
