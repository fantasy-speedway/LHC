import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeCmsDimuonEvents } from './cms-analysis.js'
import { MUON_MASS_GEV } from '../physics/beam-physics.js'

function makeEvent(id, charges) {
  const massGeV = 3.1
  const momentum = Math.sqrt((massGeV / 2) ** 2 - MUON_MASS_GEV ** 2)
  const energy = Math.hypot(momentum, MUON_MASS_GEV)
  return {
    id,
    sourceRun: 1,
    sourceEventId: id,
    invariantMass: massGeV,
    particles: [
      { id: `${id}-a`, type: 'Muon', charge: charges[0], energy, px: momentum, py: 0, pz: 0 },
      { id: `${id}-b`, type: 'Muon', charge: charges[1], energy, px: -momentum, py: 0, pz: 0 },
    ],
  }
}

test('CMS dimuon analysis computes candidates and sequential cutflow from four-vectors', () => {
  const result = analyzeCmsDimuonEvents(
    [makeEvent(1, [1, -1]), makeEvent(2, [1, 1])],
    {
      minimumMuonPtGeV: 0.5,
      maximumAbsEta: 2.4,
      minimumMassGeV: 3,
      maximumMassGeV: 3.2,
      oppositeChargeRequired: true,
      histogramMinimumGeV: 2.4,
      histogramMaximumGeV: 4,
      histogramBins: 20,
    },
  )

  assert.deepEqual(result.cutflow.map((step) => step.count), [2, 2, 1, 1, 1])
  assert.equal(result.selected.length, 1)
  assert.ok(Math.abs(result.selected[0].candidate.massGeV - 3.1) < 1e-10)
  assert.equal(result.selected[0].sourceMassGeV, 3.1)
  assert.equal(result.histogram.length, 20)
  assert.equal(result.meanMassGeV, result.selected[0].candidate.massGeV)
})

test('CMS dimuon analysis rejects records missing momentum components', () => {
  const result = analyzeCmsDimuonEvents([{
    particles: [
      { type: 'Muon', charge: 1, energy: 2 },
      { type: 'Muon', charge: -1, energy: 2 },
    ],
  }])

  assert.deepEqual(result.cutflow.map((step) => step.count), [1, 0, 0, 0, 0])
  assert.equal(result.meanMassGeV, null)
})
