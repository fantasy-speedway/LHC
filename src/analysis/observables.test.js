import assert from 'node:assert/strict'
import test from 'node:test'
import { estimateDimuonSideband, summarizeEventObservables } from './observables.js'

test('workspace summaries use available particle kinematics and leave missing event MET unavailable', () => {
  const event = {
    missingTransverseMomentumGeV: 12,
    particles: [
      { id: 'muon-1', type: 'Muon', charge: 1, energy: 1.55, px: 1.5, py: 0, pz: 0 },
      { id: 'muon-2', type: 'Muon', charge: -1, energy: 1.55, px: -1.5, py: 0, pz: 0 },
    ],
  }
  const result = summarizeEventObservables([event, { particles: [] }], 4)

  assert.deepEqual(result.counts, {
    events: 2,
    particles: 2,
    missingTransverseMomentumEvents: 1,
    dimuonCandidates: 1,
  })
  assert.equal(result.transverseMomentum.reduce((sum, bin) => sum + bin.count, 0), 2)
  assert.equal(result.pseudorapidity.reduce((sum, bin) => sum + bin.count, 0), 2)
  assert.equal(result.azimuth.reduce((sum, bin) => sum + bin.count, 0), 2)
  assert.equal(result.missingTransverseMomentum.reduce((sum, bin) => sum + bin.count, 0), 1)
  assert.equal(result.dimuonMass.reduce((sum, bin) => sum + bin.count, 0), 1)
})

test('dimuon sideband estimate reports a scaled background and finite counting metrics', () => {
  const estimate = estimateDimuonSideband([3, 3.1, 2.5, 2.6, 3.5, 3.8, Number.NaN])

  assert.equal(estimate.signalWindowCount, 2)
  assert.equal(estimate.sidebandCount, 4)
  assert.ok(Math.abs(estimate.estimatedBackground - 1.2) < 1e-12)
  assert.ok(Math.abs(estimate.estimatedSignal - 0.8) < 1e-12)
  assert.ok(Math.abs(estimate.signalToBackground - 2 / 3) < 1e-12)
  assert.ok(Number.isFinite(estimate.countingSignificance))
})
