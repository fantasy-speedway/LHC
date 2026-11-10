import assert from 'node:assert/strict'
import test from 'node:test'
import { createDataInformedEvent } from './data-informed.js'
import { simulateDetectorResponse } from '../detector/response.js'

const recordedTemplates = [
  {
    id: 401,
    sourceRecordId: 301,
    sourceRun: 150431,
    sourceEventId: 35123456,
    invariantMass: 3.096,
    particles: [
      { id: 'recorded-a', type: 'Muon', charge: 1, energy: 1.7, px: 1.5, py: 0.1, pz: 0.7, transverseMomentum: 1.503, pseudorapidity: 0.448, direction: 0.067, lifetime: null, detectionProbability: 1, muonTrackType: 'GL' },
      { id: 'recorded-b', type: 'Muon', charge: -1, energy: 1.7, px: -1.5, py: -0.1, pz: -0.7, transverseMomentum: 1.503, pseudorapidity: -0.448, direction: -3.075, lifetime: null, detectionProbability: 1, muonTrackType: 'GL' },
    ],
  },
  {
    id: 402,
    sourceRecordId: 301,
    sourceRun: 150431,
    sourceEventId: 35123457,
    invariantMass: 3.2,
    particles: [
      { id: 'recorded-c', type: 'Muon', charge: 1, energy: 1.8, px: 1.4, py: 0.2, pz: 0.8, transverseMomentum: 1.414, pseudorapidity: 0.54, direction: 0.142, lifetime: null, detectionProbability: 1, muonTrackType: 'GL' },
      { id: 'recorded-d', type: 'Muon', charge: -1, energy: 1.8, px: -1.4, py: -0.2, pz: -0.8, transverseMomentum: 1.414, pseudorapidity: -0.54, direction: -3, lifetime: null, detectionProbability: 1, muonTrackType: 'GL' },
    ],
  },
]

function makeEvent(eventNumber, templates) {
  return createDataInformedEvent({
    eventNumber,
    time: eventNumber / 10,
    templates,
    beam: { direction: 'clockwise', directionB: 'counterClockwise' },
    beamDiagnostics: {
      beamA: { energyGeV: 4, momentumGeV: 3.9 },
      beamB: { energyGeV: 4, momentumGeV: 3.9 },
      centerOfMassEnergyGeV: 8,
      dipoleFieldTesla: 0.0143,
      luminosityCm2S: 1e30,
    },
  })
}

test('data-informed events resample recorded CMS dimuons and retain template provenance', () => {
  const event = makeEvent(42, recordedTemplates)
  const template = recordedTemplates.find((item) =>
    item.sourceRun === event.templateSource.runNumber
    && item.sourceEventId === event.templateSource.eventNumber)

  assert.equal(event.eventMode, 'DATA_INFORMED_SIMULATION')
  assert.equal(event.dataOrigin, 'CERN Open Data-derived simulation')
  assert.equal(event.sourceRun, null)
  assert.equal(event.sourceEventId, null)
  assert.equal(event.particles.length, 2)
  assert.ok(template)
  assert.equal(event.invariantMass, template.invariantMass)
  assert.deepEqual(event.particles.map(({ px, py, pz, energy, charge }) => ({ px, py, pz, energy, charge })),
    template.particles.map(({ px, py, pz, energy, charge }) => ({ px, py, pz, energy, charge })))
  assert.match(event.simulatedCollisionContext.provenance, /not recalculated/)
})

test('data-informed detector response is reproducible and is not labeled as truth-level data', () => {
  const event = makeEvent(17, recordedTemplates)
  const response = simulateDetectorResponse(event, { detectorEfficiency: 1, seed: event.id })
  const repeated = simulateDetectorResponse(event, { detectorEfficiency: 1, seed: event.id })
  const degraded = simulateDetectorResponse(event, { detectorEfficiency: 0.1, seed: event.id })

  assert.deepEqual(response.particles, repeated.particles)
  assert.ok(degraded.particles.length <= response.particles.length)
  assert.equal(response.eventMode, 'DATA_INFORMED_SIMULATION')
  assert.equal(response.reconstructionFlags.truthLevelAvailable, false)
  assert.equal(response.reconstructionFlags.resampledRecordedReconstruction, true)
  assert.equal(response.reconstructionFlags.missingTransverseMomentumFullEventCoverage, false)
  assert.match(response.missingTransverseMomentumDefinition, /not full-event/)
  assert.ok(Number.isFinite(response.missingTransverseMomentumGeV))
  assert.ok(response.reconstructedVertex)
  assert.equal('responseInputParticles' in response, false)
})
