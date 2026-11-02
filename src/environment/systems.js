export const environmentDefaults = { cooling: { temperature: 78, efficiency: 96, coolant: 'NOMINAL', health: 98 }, power: { stability: 99, activity: 'Stable' }, magnets: { stability: 98.8, activity: 'Orbit correction ready' }, vacuum: { quality: 99.7, activity: 'Nominal' }, detector: { temperature: 81, efficiency: 98, activity: 'Recording ready' }, computing: { load: 22, activity: 'Nominal throughput' }, beam: { stability: 98.8, activity: 'Standby' }, sensors: { noise: 3, activity: 'Low noise' }, acquisition: { health: 99, activity: 'Connected' } }

export const faultTypes = [
  ['Cooling warning', 'Cooling', 'Cooling performance decreasing. Detector efficiency may be reduced.'],
  ['Magnet instability', 'Magnets', 'Beam orbit stability outside the normal simulated range.'],
  ['Beam instability', 'Beam', 'Beam stability has entered a noisy simulated regime.'],
  ['Detector malfunction', 'Detector', 'Detector response efficiency has been reduced.'],
  ['Sensor noise', 'Sensors', 'Sensor noise is affecting measurement precision.'],
  ['Data acquisition error', 'Acquisition', 'Some simulated detector records may be delayed.'],
  ['Power fluctuation', 'Power', 'Power stability is fluctuating in the simulated environment.'],
  ['Vacuum warning', 'Vacuum', 'Vacuum quality has drifted from nominal simulation values.'],
  ['Computing overload', 'Computing', 'Event processing throughput is reduced by simulated load.'],
  ['Communication error', 'Control', 'A simulated control-room communication channel is intermittent.'],
]
