export const defaultExperiment = {
  name: 'CMS Dimuon Reference Study', description: 'Replay recorded CMS J/ψ-to-dimuon events. Beam and detector settings only affect the educational simulation.', beamA: 'proton', beamB: 'proton', initialEnergy: 4, targetEnergy: 12, intensity: 68, collisionMode: 'Standard interaction', detector: 'Full', events: 10000, speed: 1,
}

export const experimentPresets = [
  { name: 'Baseline CMS Replay', description: 'Replay recorded CMS dimuon events with the default simulated beam display.', beamA: 'proton', beamB: 'proton', initialEnergy: 4, targetEnergy: 12, intensity: 72, collisionMode: 'Standard interaction', detector: 'Full', events: 10000, speed: 1 },
  { name: 'Energy Control Demo', description: 'Recorded CMS events stay unchanged; use this preset to explore the simulated energy controls.', beamA: 'electron', beamB: 'positron', initialEnergy: 2, targetEnergy: 8, intensity: 54, collisionMode: 'Electromagnetic focus', detector: 'Precision', events: 5000, speed: 1.25 },
  { name: 'Muon Track Review', description: 'Review recorded CMS muon tracks with the local detector animation.', beamA: 'muon', beamB: 'muon', initialEnergy: 4, targetEnergy: 16, intensity: 66, collisionMode: 'Long-lived study', detector: 'Full', events: 7500, speed: 1 },
  { name: 'Fast CMS Replay', description: 'Replay the same recorded dimuon sample more quickly; the energy scan is only a simulation.', beamA: 'proton', beamB: 'proton', initialEnergy: 8, targetEnergy: 24, intensity: 86, collisionMode: 'High variance', detector: 'Full', events: 15000, speed: 1.5 },
  { name: 'Detector Display Demo', description: 'Explore the simulated detector display; the CMS CSV does not contain calorimeter hits.', beamA: 'electron', beamB: 'positron', initialEnergy: 2, targetEnergy: 6, intensity: 42, collisionMode: 'Calibration pulse', detector: 'Tracking only', events: 2500, speed: 2 },
  { ...defaultExperiment, name: 'Custom CMS Replay', description: 'Configure local animation and run controls while replaying recorded CMS dimuon events.' },
]