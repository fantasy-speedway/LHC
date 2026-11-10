export const defaultExperiment = {
  name: 'CMS Dimuon Data-Informed Study', description: 'Resample measured CMS J/ψ-to-dimuon kinematics and apply the educational detector-response model.', beamA: 'proton', beamB: 'proton', initialEnergy: 4, targetEnergy: 12, intensity: 68, events: 10000, speed: 1,
}

export const experimentPresets = [
  { name: 'Baseline Data-Informed Run', description: 'Resample the CMS dimuon reference with the baseline educational beam configuration.', beamA: 'proton', beamB: 'proton', initialEnergy: 4, targetEnergy: 12, intensity: 72, events: 10000, speed: 1 },
  { name: 'Energy Diagnostics Demo', description: 'Explore simulated beam-energy diagnostics; the recorded template momenta are not energy-scaled.', beamA: 'electron', beamB: 'positron', initialEnergy: 2, targetEnergy: 8, intensity: 54, events: 5000, speed: 1.25 },
  { name: 'Muon Track Study', description: 'Inspect resampled CMS muon kinematics after the local detector response.', beamA: 'muon', beamB: 'muon', initialEnergy: 4, targetEnergy: 16, intensity: 66, events: 7500, speed: 1 },
  { name: 'Fast Data-Informed Run', description: 'Run the same empirical dimuon model more quickly; the beam-energy scan is only a simulation.', beamA: 'proton', beamB: 'proton', initialEnergy: 8, targetEnergy: 24, intensity: 86, events: 15000, speed: 1.5 },
  { name: 'Detector Display Demo', description: 'Explore the simplified detector response; the CMS CSV has no calorimeter-cell measurements.', beamA: 'electron', beamB: 'positron', initialEnergy: 2, targetEnergy: 6, intensity: 42, events: 2500, speed: 2 },
  { ...defaultExperiment, name: 'Custom Data-Informed Run', description: 'Configure local run controls using resampled recorded CMS dimuon events.' },
]