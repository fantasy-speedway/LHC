function createRandom(seed) {
  let state = (seed >>> 0) || 1
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export function createDataInformedEvent({
  eventNumber,
  time,
  templates,
  beamDiagnostics,
  beam,
  seed = eventNumber,
}) {
  if (!Array.isArray(templates) || templates.length === 0) {
    throw new Error('Data-informed simulation requires recorded CMS event templates.')
  }
  const random = createRandom(seed)
  const template = templates[Math.floor(random() * templates.length)]
  const responseInputParticles = template.particles.map((particle, index) => ({
    ...particle,
    id: `${eventNumber}-template-${index + 1}`,
    templateParticleId: particle.id,
  }))
  const totalEnergy = responseInputParticles.reduce((sum, particle) => sum + particle.energy, 0)

  return {
    id: eventNumber,
    label: `DATA-INFORMED SIM ${eventNumber} / J/ψ → μ⁺μ⁻`,
    time,
    dataOrigin: 'CERN Open Data-derived simulation',
    eventMode: 'DATA_INFORMED_SIMULATION',
    sourceParticle: 'J/ψ → μ+μ− (empirical template)',
    sourceRecordId: 301,
    sourceRun: null,
    sourceEventId: null,
    templateSource: {
      recordId: template.sourceRecordId,
      runNumber: template.sourceRun,
      eventNumber: template.sourceEventId,
      samplingMethod: 'uniform resampling with replacement from recorded reconstructed dimuon events',
    },
    centerOfMassEnergyGeV: beamDiagnostics?.centerOfMassEnergyGeV ?? null,
    simulatedCollisionContext: {
      beamAEnergyGeV: beamDiagnostics?.beamA?.energyGeV ?? null,
      beamBEnergyGeV: beamDiagnostics?.beamB?.energyGeV ?? null,
      centerOfMassEnergyGeV: beamDiagnostics?.centerOfMassEnergyGeV ?? null,
      dipoleFieldTesla: beamDiagnostics?.dipoleFieldTesla ?? null,
      luminosityCm2S: beamDiagnostics?.luminosityCm2S ?? null,
      beamDirections: [beam?.direction ?? null, beam?.directionB ?? null],
      provenance: 'Beam settings describe the simulated machine state; event kinematics are resampled from the recorded CMS template and are not recalculated for this beam energy.',
    },
    invariantMass: template.invariantMass,
    templateInvariantMassGeV: template.invariantMass,
    totalEnergy,
    interestingScore: null,
    detectedParticles: responseInputParticles.length,
    responseInputParticles,
    particles: responseInputParticles,
    missingTransverseMomentumGeV: null,
    knownDecay: true,
    controlSample: true,
  }
}
