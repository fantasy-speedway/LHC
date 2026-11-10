import {
  dipoleFieldForMomentumTesla,
  momentumFromEnergyGeV,
  PROTON_MASS_GEV,
} from '../physics/beam-physics.js'

function createPreset({
  id,
  label,
  initialEnergyGeV,
  targetEnergyGeV,
  intensity,
  bunches,
  quadrupoleGradientTM,
}) {
  const targetMomentumGeV = momentumFromEnergyGeV(targetEnergyGeV, PROTON_MASS_GEV)

  return {
    id,
    label,
    description: `${initialEnergyGeV.toLocaleString()} GeV injection · ${targetEnergyGeV.toLocaleString()} GeV target`,
    beam: {
      particleType: 'proton',
      particleTypeB: 'proton',
      initialEnergy: initialEnergyGeV,
      initialEnergyB: initialEnergyGeV,
      targetEnergy: targetEnergyGeV,
      targetEnergyB: targetEnergyGeV,
      dipoleFieldTesla: dipoleFieldForMomentumTesla(targetMomentumGeV),
      intensity,
      intensityB: intensity,
      direction: 'clockwise',
      directionB: 'counterClockwise',
      particleCount: 256,
      particleCountB: 256,
      quadrupoleGradientTM,
      rfVoltageMV: 16,
      normalizedEmittanceUm: 2.5,
      bunchSpacingNs: 25,
      numberOfBunches: bunches,
    },
  }
}

export const beamPresets = [
  createPreset({
    id: 'injection',
    label: 'Injection configuration',
    initialEnergyGeV: 450,
    targetEnergyGeV: 450,
    intensity: 68,
    bunches: 2808,
    quadrupoleGradientTM: 200,
  }),
  createPreset({
    id: 'intermediate',
    label: 'Intermediate energy',
    initialEnergyGeV: 450,
    targetEnergyGeV: 2500,
    intensity: 80,
    bunches: 1200,
    quadrupoleGradientTM: 200,
  }),
  createPreset({
    id: 'run-3-reference',
    label: 'LHC Run 3 reference',
    initialEnergyGeV: 450,
    targetEnergyGeV: 6800,
    intensity: 100,
    bunches: 2808,
    quadrupoleGradientTM: 200,
  }),
]

export function beamPresetById(id) {
  return beamPresets.find((preset) => preset.id === id) ?? null
}

export function applyBeamPreset(beam, presetId) {
  const preset = beamPresetById(presetId)
  if (!preset) throw new Error(`Unknown beam preset: ${presetId}`)
  return {
    ...beam,
    ...preset.beam,
  }
}
