import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateBeamDiagnostics,
  calculateRfAccelerationFraction,
  calculateRfRampEnergyGeV,
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

test('dipole rigidity scales with charge magnitude and particle mass affects momentum', () => {
  const momentum = 11.9
  const singlyChargedField = dipoleFieldForMomentumTesla(momentum)
  const doublyChargedField = dipoleFieldForMomentumTesla(momentum, undefined, 2)

  assert.ok(Math.abs(doublyChargedField * 2 - singlyChargedField) < 1e-12)
  assert.ok(Math.abs(momentumFromDipoleFieldGeV(doublyChargedField, undefined, 2) - momentum) < 1e-10)
  assert.notEqual(momentumFromEnergyGeV(1, 0.93827208816), momentumFromEnergyGeV(1, 0.00051099895))

  const electronDiagnostics = calculateBeamDiagnostics({
    particleType: 'electron',
    particleTypeB: 'positron',
    initialEnergy: 1,
    initialEnergyB: 1,
    targetEnergy: 1,
    targetEnergyB: 1,
    dipoleFieldTesla: dipoleFieldForMomentumTesla(momentumFromEnergyGeV(1, 0.00051099895)),
  }, { energyA: 1, energyB: 1 })
  assert.ok(electronDiagnostics.beamA.magneticRigidityTm < 0)
  assert.ok(electronDiagnostics.beamB.magneticRigidityTm > 0)
})

test('bunch spacing limits the effective bunch count and changes luminosity', () => {
  const beam = {
    particleType: 'proton',
    particleTypeB: 'proton',
    initialEnergy: 12,
    initialEnergyB: 12,
    targetEnergy: 12,
    targetEnergyB: 12,
    dipoleFieldTesla: dipoleFieldForMomentumTesla(momentumFromEnergyGeV(12, 0.93827208816)),
    intensity: 80,
    intensityB: 80,
    direction: 'clockwise',
    directionB: 'counterClockwise',
    numberOfBunches: 2808,
  }
  const spacing25ns = calculateBeamDiagnostics({ ...beam, bunchSpacingNs: 25 }, { energyA: 12, energyB: 12, orbitOffsetMm: 0 })
  const spacing50ns = calculateBeamDiagnostics({ ...beam, bunchSpacingNs: 50 }, { energyA: 12, energyB: 12, orbitOffsetMm: 0 })

  assert.equal(spacing25ns.numberOfBunches, 2808)
  assert.ok(spacing50ns.numberOfBunches < spacing25ns.numberOfBunches)
  assert.ok(spacing50ns.luminosityCm2S < spacing25ns.luminosityCm2S)
})

test('RF voltage limits ramp progress and honors charge magnitude', () => {
  assert.equal(calculateRfAccelerationFraction('proton', 8), 0.5)
  assert.equal(calculateRfAccelerationFraction('electron', 16), 1)
  assert.equal(calculateRfAccelerationFraction('proton', 32), 1)

  const nominalHalfRamp = calculateRfRampEnergyGeV({
    initialEnergyGeV: 4, targetEnergyGeV: 12, particleType: 'proton', rfVoltageMV: 16, progress: 0.5,
  })
  const lowerVoltageHalfRamp = calculateRfRampEnergyGeV({
    initialEnergyGeV: 4, targetEnergyGeV: 12, particleType: 'proton', rfVoltageMV: 8, progress: 0.5,
  })
  const lowerVoltageCompleteRamp = calculateRfRampEnergyGeV({
    initialEnergyGeV: 4, targetEnergyGeV: 12, particleType: 'proton', rfVoltageMV: 8, progress: 1,
  })

  assert.equal(nominalHalfRamp.energyGeV, 8)
  assert.equal(lowerVoltageHalfRamp.energyGeV, 6)
  assert.equal(lowerVoltageCompleteRamp.energyGeV, 8)
  assert.equal(lowerVoltageCompleteRamp.estimatedTimeToTargetSeconds, 120)
  assert.equal(lowerVoltageCompleteRamp.energyGainRateGeVPerSecond, 8 / 120)
})

test('quadrupole optics, vacuum, and cryogenic conditions affect beam diagnostics', () => {
  const beam = {
    particleType: 'proton',
    particleTypeB: 'proton',
    initialEnergy: 12,
    initialEnergyB: 12,
    targetEnergy: 12,
    targetEnergyB: 12,
    dipoleFieldTesla: dipoleFieldForMomentumTesla(momentumFromEnergyGeV(12, 0.93827208816)),
    quadrupoleGradientTM: 200,
    intensity: 80,
    intensityB: 80,
    direction: 'clockwise',
    directionB: 'counterClockwise',
  }
  const nominal = calculateBeamDiagnostics(beam, {
    energyA: 12, energyB: 12, orbitOffsetMm: 0, vacuumPressureMbar: 1e-9, cryogenicTemperatureK: 1.9,
  })
  const degraded = calculateBeamDiagnostics({ ...beam, quadrupoleGradientTM: 100 }, {
    energyA: 12, energyB: 12, orbitOffsetMm: 0, vacuumPressureMbar: 1e-7, cryogenicTemperatureK: 3.9,
  })

  assert.ok(Math.abs(nominal.betaStarAM - 0.4) < 1e-8)
  assert.ok(degraded.betaStarAM > nominal.betaStarAM)
  assert.ok(degraded.beamSizeAM > nominal.beamSizeAM)
  assert.ok(degraded.stabilityPercent < nominal.stabilityPercent)
  assert.equal(degraded.vacuumStabilityPenaltyPercent, 2.5)
})

test('orbit correction reduces modeled offset and restores overlap stability', () => {
  const beam = {
    particleType: 'proton',
    particleTypeB: 'proton',
    initialEnergy: 12,
    initialEnergyB: 12,
    targetEnergy: 12,
    targetEnergyB: 12,
    dipoleFieldTesla: dipoleFieldForMomentumTesla(momentumFromEnergyGeV(12, 0.93827208816)),
    quadrupoleGradientTM: 200,
    direction: 'clockwise',
    directionB: 'counterClockwise',
  }
  const uncorrected = calculateBeamDiagnostics(beam, { energyA: 12, energyB: 12, timeSeconds: 2 })
  const corrected = calculateBeamDiagnostics(beam, {
    energyA: 12, energyB: 12, timeSeconds: 2, orbitCorrectionActive: true,
  })

  assert.ok(Math.abs(corrected.orbitOffsetMm) < Math.abs(uncorrected.orbitOffsetMm))
  assert.ok(corrected.stabilityPercent > uncorrected.stabilityPercent)
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
