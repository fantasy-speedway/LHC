import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateBeamDiagnostics,
  dipoleFieldForMomentumTesla,
  energyFromMomentumGeV,
  momentumFromDipoleFieldGeV,
  momentumFromEnergyGeV,
} from './beam-physics.js'

test('relativistic momentum and energy conversions are inverse', () => {
  const energy = 12
  const momentum = momentumFromEnergyGeV(energy, 0.93827208816)
  assert.ok(Math.abs(energyFromMomentumGeV(momentum, 0.93827208816) - energy) < 1e-10)
  assert.equal(momentumFromEnergyGeV(0.5, 0.93827208816), 0)
})

test('dipole rigidity connects momentum and magnetic field', () => {
  const momentum = 11.9
  const field = dipoleFieldForMomentumTesla(momentum)
  assert.ok(Math.abs(momentumFromDipoleFieldGeV(field) - momentum) < 1e-10)
})

test('beam diagnostics derive energy, center-of-mass energy, luminosity, and orbit response', () => {
  const energyGeV = 12
  const momentumGeV = momentumFromEnergyGeV(energyGeV, 0.93827208816)
  const beam = {
    particleType: 'proton',
    particleTypeB: 'proton',
    initialEnergy: energyGeV,
    initialEnergyB: energyGeV,
    targetEnergy: energyGeV,
    targetEnergyB: energyGeV,
    dipoleFieldTesla: dipoleFieldForMomentumTesla(momentumGeV),
    intensity: 80,
    intensityB: 80,
    direction: 'clockwise',
    directionB: 'counterClockwise',
  }
  const centered = calculateBeamDiagnostics(beam, { energyA: energyGeV, energyB: energyGeV, orbitOffsetMm: 0 })
  const offset = calculateBeamDiagnostics(beam, { energyA: energyGeV, energyB: energyGeV, orbitOffsetMm: 1 })

  assert.ok(Math.abs(centered.centerOfMassEnergyGeV - 2 * energyGeV) < 1e-8)
  assert.equal(centered.fieldLimited, false)
  assert.ok(centered.luminosityCm2S > 0)
  assert.ok(offset.luminosityCm2S < centered.luminosityCm2S)
  assert.ok(offset.stabilityPercent < centered.stabilityPercent)
})

test('insufficient dipole field limits the modeled beam energy', () => {
  const beam = {
    particleType: 'proton',
    particleTypeB: 'proton',
    initialEnergy: 12,
    initialEnergyB: 12,
    targetEnergy: 12,
    targetEnergyB: 12,
    dipoleFieldTesla: 0.01,
    intensity: 70,
    intensityB: 70,
  }
  const diagnostics = calculateBeamDiagnostics(beam, { energyA: 12, energyB: 12 })
  assert.equal(diagnostics.fieldLimited, true)
  assert.ok(diagnostics.beamA.energyGeV < 12)
})

test('beam directions change center-of-mass energy and luminosity availability', () => {
  const energyGeV = 12
  const momentumGeV = momentumFromEnergyGeV(energyGeV, 0.93827208816)
  const beam = {
    particleType: 'proton',
    particleTypeB: 'proton',
    initialEnergy: energyGeV,
    initialEnergyB: energyGeV,
    targetEnergy: energyGeV,
    targetEnergyB: energyGeV,
    dipoleFieldTesla: dipoleFieldForMomentumTesla(momentumGeV),
    intensity: 80,
    intensityB: 80,
    direction: 'clockwise',
    directionB: 'counterClockwise',
  }
  const headOn = calculateBeamDiagnostics(beam, { energyA: energyGeV, energyB: energyGeV })
  const coPropagating = calculateBeamDiagnostics({ ...beam, directionB: 'clockwise' }, {
    energyA: energyGeV,
    energyB: energyGeV,
  })

  assert.ok(headOn.centerOfMassEnergyGeV > 20)
  assert.ok(Math.abs(coPropagating.centerOfMassEnergyGeV - 2 * 0.93827208816) < 1e-8)
  assert.ok(headOn.luminosityAvailable)
  assert.equal(coPropagating.luminosityAvailable, false)
})
