export const startupFailures = [
  {
    id: 'cryo-delay',
    stepId: 'cryo-start',
    name: 'Cryogenic cooling delay',
    probability: 8,
    severity: 'FAULT',
    system: 'Cooling',
    description: 'Cryogenic cooldown is slower than the modeled target. Check the cooling system, recover, then retry CRYO START.',
  },
  {
    id: 'vacuum-instability',
    stepId: 'vacuum-pumps',
    name: 'Vacuum instability',
    probability: 5,
    severity: 'FAULT',
    system: 'Vacuum',
    description: 'Beam-pipe pressure did not stabilize. Recover the modeled vacuum system, then retry VACUUM PUMPS ON.',
  },
  {
    id: 'power-fluctuation',
    stepId: 'mains-power',
    name: 'Power fluctuation',
    probability: 3,
    severity: 'FAULT',
    system: 'Power',
    description: 'Grid power fluctuated during startup. Recover the modeled power system, then retry GRID POWER.',
  },
  {
    id: 'magnet-supply-fault',
    stepId: 'magnet-power',
    name: 'Magnet power supply fault',
    probability: 2,
    severity: 'FAULT',
    system: 'Magnets',
    description: 'A modeled magnet power converter failed its startup check. Recover the supply, then retry MAGNET POWER ENABLE.',
  },
  {
    id: 'rf-tuning-error',
    stepId: 'rf-system',
    name: 'RF system tuning error',
    probability: 4,
    severity: 'FAULT',
    system: 'RF',
    description: 'The simulated RF system needs another tuning pass. Recover the RF system, then retry RF SYSTEM ON.',
  },
  {
    id: 'detector-not-responding',
    stepId: 'atlas-ready',
    name: 'Detector not responding',
    probability: 3,
    severity: 'FAULT',
    system: 'Detector',
    description: 'The modeled detector readiness check did not respond. Recover detector readiness, then retry.',
  },
  {
    id: 'injection-timing-fault',
    stepId: 'inject-beam-a',
    name: 'Injection timing fault',
    probability: 2,
    severity: 'FAULT',
    system: 'Injector',
    description: 'The modeled injector timing was not synchronized. Recover the timing sequence, then retry BEAM A injection.',
  },
]

export const runningIncidents = [
  {
    id: 'minor-beam-loss',
    name: 'Minor beam loss',
    probability: 5,
    severity: 'WARNING',
    system: 'Beam',
    description: 'A minor beam-loss monitor excursion was detected. Acknowledge and continue monitoring.',
  },
  {
    id: 'detector-data-dropout',
    name: 'Detector data drop-out',
    probability: 3,
    severity: 'WARNING',
    system: 'Data acquisition',
    description: 'A simulated detector data stream briefly dropped out. Acknowledge and monitor the next events.',
  },
  {
    id: 'vacuum-warning',
    name: 'Vacuum warning',
    probability: 1,
    severity: 'WARNING',
    system: 'Vacuum',
    description: 'The modeled beam-pipe vacuum drifted from its nominal range. Acknowledge and monitor the readout.',
  },
  {
    id: 'cooling-warning',
    name: 'Cooling warning',
    probability: 1,
    severity: 'WARNING',
    system: 'Cooling',
    description: 'The modeled cooling system reported a temperature deviation. Acknowledge and monitor the readout.',
  },
  {
    id: 'magnet-quench',
    name: 'Magnet quench',
    probability: 0.1,
    severity: 'CRITICAL',
    system: 'Magnets',
    description: 'A modeled magnet quench triggered the automatic beam-dump sequence.',
  },
  {
    id: 'emergency-beam-dump',
    name: 'Emergency beam dump',
    probability: 0.2,
    severity: 'CRITICAL',
    system: 'Beam protection',
    description: 'The modeled beam-protection system initiated an automatic dump.',
  },
  {
    id: 'major-vacuum-leak',
    name: 'Major vacuum leak',
    probability: 0.02,
    severity: 'CRITICAL',
    system: 'Vacuum',
    description: 'A major modeled vacuum leak triggered an automatic beam dump.',
  },
  {
    id: 'detector-trip',
    name: 'Detector trip',
    probability: 0.05,
    severity: 'FAULT',
    system: 'Detector',
    description: 'A detector protection trip interrupted data taking. Recovery is required before the fill can resume.',
  },
  {
    id: 'power-grid-interruption',
    name: 'Power grid interruption',
    probability: 0.01,
    severity: 'CRITICAL',
    system: 'Power',
    description: 'A modeled grid interruption triggered an automatic beam dump.',
  },
]

function chooseWeightedOutcome(outcomes, random) {
  const roll = random() * 100
  let threshold = 0
  for (const outcome of outcomes) {
    threshold += outcome.probability
    if (roll < threshold) return outcome
  }
  return null
}

export function chooseStartupFailure(random = Math.random) {
  return chooseWeightedOutcome(startupFailures, random)
}

export function chooseRunningIncident(random = Math.random) {
  return chooseWeightedOutcome(runningIncidents, random)
}

export function createIncident(outcome, time) {
  return {
    ...outcome,
    id: `${outcome.id}-${Date.now()}-${Math.round(time * 1000)}`,
    time,
    status: 'ACTIVE',
    recoveryProgress: 0,
  }
}
