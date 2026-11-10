import assert from 'node:assert/strict'
import test from 'node:test'
import { applyBeamPreset, beamPresets } from './presets.js'
import { momentumFromEnergyGeV, PROTON_MASS_GEV, momentumFromDipoleFieldGeV } from '../physics/beam-physics.js'

test('beam presets cover injection, intermediate, and Run 3 reference energies', () => {
  const injection = beamPresets.find((preset) => preset.id === 'injection')
  const intermediate = beamPresets.find((preset) => preset.id === 'intermediate')
  const run3 = beamPresets.find((preset) => preset.id === 'run-3-reference')

  assert.equal(injection.beam.initialEnergy, 450)
  assert.equal(injection.beam.targetEnergy, 450)
  assert.equal(intermediate.beam.initialEnergy, 450)
  assert.equal(intermediate.beam.targetEnergy, 2500)
  assert.equal(run3.beam.initialEnergy, 450)
  assert.equal(run3.beam.targetEnergy, 6800)
  assert.equal(run3.beam.numberOfBunches, 2808)
  assert.equal(run3.beam.particleType, 'proton')
  assert.equal(run3.beam.direction, 'clockwise')
  assert.equal(run3.beam.directionB, 'counterClockwise')
})

test('preset dipole fields match their target energy and applying preserves unrelated settings', () => {
  const run3 = beamPresets.find((preset) => preset.id === 'run-3-reference')
  const beam = applyBeamPreset({ customSetting: true }, run3.id)
  const expectedMomentum = momentumFromEnergyGeV(6800, PROTON_MASS_GEV)

  assert.ok(Math.abs(momentumFromDipoleFieldGeV(beam.dipoleFieldTesla) - expectedMomentum) < 1e-8)
  assert.equal(beam.customSetting, true)
  assert.throws(() => applyBeamPreset({}, 'unknown'))
})
