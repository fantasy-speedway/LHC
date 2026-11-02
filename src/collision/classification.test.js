import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyCollisionPriority, collisionPriorities, rankAgainstReviewedEvents } from './classification.js'
import { createSavedCollision, loadSavedCollisionEvents, reviewSavedCollision, saveCollisionEvent } from './storage.js'

const muon = (pt, energy = 10) => ({ type: 'Muon', transverseMomentum: pt, energy, muonTrackType: 'GT' })

test('priority rules use black before red and red before amber', () => {
  const higgs = classifyCollisionPriority({ invariantMass: 125, particles: [muon(150)] })
  assert.equal(higgs.priority, collisionPriorities.BLACK)
  const red = classifyCollisionPriority({ invariantMass: 3.0969, particles: [muon(150)] })
  assert.equal(red.priority, collisionPriorities.RED)
  const amber = classifyCollisionPriority({ particles: [muon(5, 60), muon(4, 55)] })
  assert.equal(amber.priority, collisionPriorities.AMBER)
})

test('unavailable measurements do not activate missing-momentum rules', () => {
  const result = classifyCollisionPriority({ particles: [muon(4)], missingTransverseMomentumGeV: null })
  assert.equal(result.priority, collisionPriorities.UNMARKED)
  const saved = createSavedCollision({ sourceRun: 1, sourceEventId: 2, particles: [muon(4)] }, '2025-01-01T00:00:00.000Z')
  assert.equal(saved.collisionEnergyGeV, null)
  assert.equal(saved.sourceTimestamp, null)
  assert.equal(saved.missingTransverseMomentumGeV, null)
  assert.equal(saved.reconstructionFlags.missingTransverseMomentumAvailable, false)
  assert.equal(saved.particles[0].momentumComponentsGeV.px, null)
})

test('CERN research events are blue unless a higher-priority rule applies', () => {
  assert.equal(classifyCollisionPriority({ dataOrigin: 'CERN Open Data', particles: [] }).priority, collisionPriorities.BLUE)
})

test('saved source events are idempotent and only reviewed labels enter the training archive', () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const event = { id: 1, sourceRecordId: 301, sourceRun: 42, sourceEventId: 7, dataOrigin: 'CERN Open Data', particles: [muon(5)] }
  const firstSave = saveCollisionEvent(event)
  const secondSave = saveCollisionEvent(event)
  assert.equal(firstSave.recordId, secondSave.recordId)
  assert.equal(loadSavedCollisionEvents().length, 1)
  assert.equal(loadSavedCollisionEvents()[0].reviewedAt, null)
  const reviewed = reviewSavedCollision(firstSave.recordId, 'BLUE')
  assert.equal(reviewed.reviewedPriority, 'BLUE')
  assert.ok(reviewed.reviewedAt)
  assert.equal(loadSavedCollisionEvents()[0].reviewedPriority, 'BLUE')
})

test('reviewed-event ranking uses all reviewed labels after four examples', () => {
  const event = { invariantMass: 3, particles: [muon(5)] }
  const examples = [
    { ...event, reviewedPriority: 'BLUE', reviewedAt: 'reviewed' },
    { ...event, reviewedPriority: 'RED', reviewedAt: 'reviewed' },
  ]
  assert.equal(rankAgainstReviewedEvents(event, examples).ready, false)
  const ready = rankAgainstReviewedEvents(event, [
    ...examples,
    { ...event, reviewedPriority: 'BLUE', reviewedAt: 'reviewed' },
    { ...event, reviewedPriority: 'RED', reviewedAt: 'reviewed' },
    { ...event, reviewedPriority: 'AMBER', reviewedAt: 'reviewed' },
  ])
  assert.equal(ready.ready, true)
  assert.ok(ready.includedLabels.includes('AMBER'))
  assert.deepEqual(ready.provisionalLabels, ['AMBER'])
  assert.ok(['BLUE', 'RED'].includes(ready.match.priority))
})
