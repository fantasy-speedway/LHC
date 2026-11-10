export const SPEED_OF_LIGHT_M_S = 299_792_458
export const LHC_BENDING_RADIUS_M = 2_803.95
export const PROTON_MASS_GEV = 0.93827208816
export const ELECTRON_MASS_GEV = 0.00051099895
export const MUON_MASS_GEV = 0.1056583755
export const ELEMENTARY_CHARGE_C = 1.602176634e-19
export const PROTON_BUNCH_POPULATION = 1.15e11
export const LHC_REVOLUTION_FREQUENCY_HZ = SPEED_OF_LIGHT_M_S / 26_658.883
export const DEFAULT_NORMALIZED_EMITTANCE_UM = 2.5
export const DEFAULT_BETA_STAR_M = 0.4
export const DEFAULT_QUADRUPOLE_GRADIENT_T_M = 200
export const LHC_NOMINAL_BUNCHES = 2808
export const LHC_BUNCH_SPACING_NS = 25
export const LHC_CIRCUMFERENCE_M = 26_658.883
export const REFERENCE_RF_RAMP_VOLTAGE_MV = 16

const particleMassesGeV = {
  proton: PROTON_MASS_GEV,
  electron: ELECTRON_MASS_GEV,
  positron: ELECTRON_MASS_GEV,
  muon: MUON_MASS_GEV,
}

const particleChargeNumbers = {
  proton: 1,
  electron: -1,
  positron: 1,
  muon: -1,
}

export function getParticleMassGeV(particleType) {
  return particleMassesGeV[particleType] ?? PROTON_MASS_GEV
}

export function getParticleChargeNumber(particleType) {
  return particleChargeNumbers[particleType] ?? 1
}

export function momentumFromEnergyGeV(energyGeV, massGeV) {
  if (!Number.isFinite(energyGeV) || energyGeV < massGeV) return 0
  return Math.sqrt(Math.max(0, energyGeV ** 2 - massGeV ** 2))
}

export function energyFromMomentumGeV(momentumGeV, massGeV) {
  if (!Number.isFinite(momentumGeV) || momentumGeV < 0) return massGeV
  return Math.hypot(momentumGeV, massGeV)
}

export function dipoleFieldForMomentumTesla(momentumGeV, bendingRadiusM = LHC_BENDING_RADIUS_M, chargeNumber = 1) {
  if (!Number.isFinite(momentumGeV) || momentumGeV < 0 || !Number.isFinite(bendingRadiusM) || bendingRadiusM <= 0
    || !Number.isFinite(chargeNumber) || chargeNumber === 0) return 0
  return momentumGeV / (0.299792458 * bendingRadiusM * Math.abs(chargeNumber))
}

export function momentumFromDipoleFieldGeV(fieldTesla, bendingRadiusM = LHC_BENDING_RADIUS_M, chargeNumber = 1) {
  if (!Number.isFinite(fieldTesla) || fieldTesla < 0 || !Number.isFinite(bendingRadiusM) || bendingRadiusM <= 0
    || !Number.isFinite(chargeNumber) || chargeNumber === 0) return 0
  return 0.299792458 * fieldTesla * bendingRadiusM * Math.abs(chargeNumber)
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

function beamKinematics({ particleType, targetEnergyGeV, initialEnergyGeV, fieldTesla }) {
  const massGeV = getParticleMassGeV(particleType)
  const chargeNumber = getParticleChargeNumber(particleType)
  const targetMomentumGeV = momentumFromEnergyGeV(Math.max(targetEnergyGeV, massGeV), massGeV)
  const fieldMomentumGeV = momentumFromDipoleFieldGeV(fieldTesla, LHC_BENDING_RADIUS_M, chargeNumber)
  const momentumGeV = Math.min(targetMomentumGeV, fieldMomentumGeV)
  const energyGeV = energyFromMomentumGeV(momentumGeV, massGeV)
  const requestedEnergyGeV = Math.max(initialEnergyGeV ?? massGeV, massGeV)
  const actualEnergyGeV = Math.min(energyGeV, requestedEnergyGeV)
  const actualMomentumGeV = momentumFromEnergyGeV(actualEnergyGeV, massGeV)
  const gamma = actualEnergyGeV / massGeV

  return {
    particleType,
    massGeV,
    energyGeV: actualEnergyGeV,
    momentumGeV: actualMomentumGeV,
    targetEnergyGeV,
    targetMomentumGeV,
    fieldMomentumGeV,
    magneticRigidityTm: actualMomentumGeV / (0.299792458 * chargeNumber),
    requiredFieldTesla: dipoleFieldForMomentumTesla(targetMomentumGeV, LHC_BENDING_RADIUS_M, chargeNumber),
    chargeNumber,
    fieldLimited: fieldMomentumGeV + 1e-9 < targetMomentumGeV,
    gamma,
  }
}

export function calculateRfAccelerationFraction(particleType, rfVoltageMV) {
  if (!Number.isFinite(rfVoltageMV) || rfVoltageMV <= 0) return 0
  return clamp(
    Math.abs(getParticleChargeNumber(particleType)) * rfVoltageMV / REFERENCE_RF_RAMP_VOLTAGE_MV,
    0,
    1,
  )
}

export function calculateBeamDiagnostics(beam, {
  energyA = beam.initialEnergy,
  energyB = beam.initialEnergyB,
  timeSeconds = 0,
  orbitOffsetMm,
} = {}) {
  const fieldTesla = Number.isFinite(beam.dipoleFieldTesla) ? beam.dipoleFieldTesla : 0
  const channelA = beamKinematics({
    particleType: beam.particleType,
    targetEnergyGeV: beam.targetEnergy,
    initialEnergyGeV: energyA,
    fieldTesla,
  })
  const channelB = beamKinematics({
    particleType: beam.particleTypeB,
    targetEnergyGeV: beam.targetEnergyB,
    initialEnergyGeV: energyB,
    fieldTesla,
  })
  const requiredFieldTesla = Math.max(channelA.requiredFieldTesla, channelB.requiredFieldTesla)
  const fieldRatio = requiredFieldTesla > 0 ? fieldTesla / requiredFieldTesla : 1
  const modeledOrbitOffsetMm = Number.isFinite(orbitOffsetMm)
    ? orbitOffsetMm
    : 0.12 * Math.sin(timeSeconds * 0.21) + 0.045 * Math.sin(timeSeconds * 0.73)
  const fieldMismatchPercent = Math.abs(fieldRatio - 1) * 100
  const stabilityPercent = clamp(99.4 - Math.abs(modeledOrbitOffsetMm) * 2.2 - fieldMismatchPercent * 0.35, 75, 99.8)
  const configuredEmittanceUm = Number.isFinite(beam.normalizedEmittanceUm)
    ? beam.normalizedEmittanceUm
    : DEFAULT_NORMALIZED_EMITTANCE_UM
  const normalizedEmittanceUm = clamp(configuredEmittanceUm * (1 + (100 - stabilityPercent) * 0.025), 0.25, 20)
  const geometricEmittanceAM = normalizedEmittanceUm * 1e-6 / Math.max(channelA.gamma, 1)
  const geometricEmittanceBM = normalizedEmittanceUm * 1e-6 / Math.max(channelB.gamma, 1)
  const quadrupoleGradientTM = Number.isFinite(beam.quadrupoleGradientTM)
    ? clamp(beam.quadrupoleGradientTM, 20, 250)
    : DEFAULT_QUADRUPOLE_GRADIENT_T_M
  const betaStarM = clamp(
    DEFAULT_BETA_STAR_M * DEFAULT_QUADRUPOLE_GRADIENT_T_M / quadrupoleGradientTM,
    0.1,
    4,
  )
  const beamSizeAM = Math.sqrt(geometricEmittanceAM * betaStarM)
  const beamSizeBM = Math.sqrt(geometricEmittanceBM * betaStarM)
  const beamDivergenceAMrad = Math.sqrt(geometricEmittanceAM / betaStarM)
  const beamDivergenceBMrad = Math.sqrt(geometricEmittanceBM / betaStarM)
  const oppositeDirections = beam.direction != null && beam.directionB != null
    ? beam.direction !== beam.directionB
    : true
  const momentumAngleCosine = oppositeDirections ? -1 : 1
  const centerOfMassEnergyGeV = Math.sqrt(Math.max(0,
    channelA.massGeV ** 2
    + channelB.massGeV ** 2
    + 2 * (channelA.energyGeV * channelB.energyGeV
      - channelA.momentumGeV * channelB.momentumGeV * momentumAngleCosine),
  ))
  const headOnProtonBeams = beam.particleType === 'proton' && beam.particleTypeB === 'proton' && oppositeDirections
  const bunchPopulationA = PROTON_BUNCH_POPULATION * clamp(beam.intensity / 100, 0, 1)
  const bunchPopulationB = PROTON_BUNCH_POPULATION * clamp(beam.intensityB / 100, 0, 1)
  const requestedNumberOfBunches = clamp(Number.isFinite(beam.numberOfBunches) ? beam.numberOfBunches : 1, 1, LHC_NOMINAL_BUNCHES)
  const bunchSpacingNs = Number.isFinite(beam.bunchSpacingNs) ? Math.max(1, beam.bunchSpacingNs) : LHC_BUNCH_SPACING_NS
  const bunchSlotsAvailable = Math.max(1, Math.floor(1 / (LHC_REVOLUTION_FREQUENCY_HZ * bunchSpacingNs * 1e-9)))
  const numberOfBunches = Math.min(requestedNumberOfBunches, bunchSlotsAvailable)
  const orbitOffsetM = Math.abs(modeledOrbitOffsetMm) / 1000
  const overlapFactor = Math.exp(-(orbitOffsetM ** 2) / (2 * (beamSizeAM ** 2 + beamSizeBM ** 2)))
  const luminosityCm2S = headOnProtonBeams && beamSizeAM > 0 && beamSizeBM > 0
    ? LHC_REVOLUTION_FREQUENCY_HZ * numberOfBunches * bunchPopulationA * bunchPopulationB * overlapFactor
      / (2 * Math.PI * (beamSizeAM ** 2 + beamSizeBM ** 2)) / 1e4
    : null
  const rfVoltageMV = Number.isFinite(beam.rfVoltageMV) ? clamp(beam.rfVoltageMV, 1, 32) : REFERENCE_RF_RAMP_VOLTAGE_MV
  const rfAccelerationFractionA = calculateRfAccelerationFraction(beam.particleType, rfVoltageMV)
  const rfAccelerationFractionB = calculateRfAccelerationFraction(beam.particleTypeB, rfVoltageMV)

  return {
    beamA: channelA,
    beamB: channelB,
    dipoleFieldTesla: fieldTesla,
    dipoleFieldRequiredTesla: requiredFieldTesla,
    fieldRatio,
    fieldLimited: channelA.fieldLimited || channelB.fieldLimited,
    centerOfMassEnergyGeV,
    normalizedEmittanceUm,
    geometricEmittanceAM,
    geometricEmittanceBM,
    betaStarM,
    beamSizeAM,
    beamSizeBM,
    beamDivergenceAMrad,
    beamDivergenceBMrad,
    quadrupoleGradientTM,
    rfVoltageMV,
    rfAccelerationFractionA,
    rfAccelerationFractionB,
    bunchSpacingNs,
    requestedNumberOfBunches,
    bunchSlotsAvailable,
    numberOfBunches,
    bunchPopulationA,
    bunchPopulationB,
    bunchCollisionFrequencyHz: LHC_REVOLUTION_FREQUENCY_HZ * numberOfBunches,
    orbitOffsetMm: modeledOrbitOffsetMm,
    orbitCorrectionNeeded: Math.abs(modeledOrbitOffsetMm) > 0.1 || fieldMismatchPercent > 5,
    stabilityPercent,
    luminosityCm2S,
    luminosityAvailable: headOnProtonBeams,
    assumptions: {
      bendingRadiusM: LHC_BENDING_RADIUS_M,
      circumferenceM: LHC_CIRCUMFERENCE_M,
      bunches: numberOfBunches,
      requestedBunches: requestedNumberOfBunches,
      bunchSlotsAvailable,
      bunchSpacingNs,
      nominalProtonBunchPopulation: PROTON_BUNCH_POPULATION,
      normalizedEmittanceUm: DEFAULT_NORMALIZED_EMITTANCE_UM,
      betaStarM: DEFAULT_BETA_STAR_M,
      luminosityModel: 'single-bunch Gaussian head-on overlap; illustrative, not live',
    },
  }
}

export function deriveParticleKinematics(particle) {
  const componentsAvailable = [particle?.px, particle?.py, particle?.pz].every(Number.isFinite)
  if (!componentsAvailable) {
    return {
      available: false,
      reason: 'Momentum components are missing from this event record.',
      momentumGeV: null,
      transverseMomentumGeV: null,
      pseudorapidity: null,
      azimuthRadians: null,
      invariantMassGeV: null,
    }
  }

  const px = particle.px
  const py = particle.py
  const pz = particle.pz
  const momentumGeV = Math.hypot(px, py, pz)
  const transverseMomentumGeV = Math.hypot(px, py)
  const energyGeV = Number.isFinite(particle.energy) ? particle.energy : null
  const massSquared = energyGeV == null ? null : energyGeV ** 2 - momentumGeV ** 2

  return {
    available: true,
    reason: null,
    momentumGeV,
    transverseMomentumGeV,
    pseudorapidity: transverseMomentumGeV > 0 ? Math.asinh(pz / transverseMomentumGeV) : null,
    azimuthRadians: Math.atan2(py, px),
    invariantMassGeV: massSquared != null && massSquared >= -1e-6 ? Math.sqrt(Math.max(0, massSquared)) : null,
  }
}

export function buildDimuonCandidates(event) {
  const muons = (event?.particles ?? []).filter((particle) => /muon/i.test(particle.type ?? ''))
  const candidates = []

  for (let firstIndex = 0; firstIndex < muons.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < muons.length; secondIndex += 1) {
      const first = muons[firstIndex]
      const second = muons[secondIndex]
      const firstKinematics = deriveParticleKinematics(first)
      const secondKinematics = deriveParticleKinematics(second)
      if (!firstKinematics.available || !secondKinematics.available || !Number.isFinite(first.energy) || !Number.isFinite(second.energy)) continue
      const px = first.px + second.px
      const py = first.py + second.py
      const pz = first.pz + second.pz
      const energy = first.energy + second.energy
      const massSquared = energy ** 2 - px ** 2 - py ** 2 - pz ** 2
      const deltaPhi = Math.atan2(
        Math.sin(firstKinematics.azimuthRadians - secondKinematics.azimuthRadians),
        Math.cos(firstKinematics.azimuthRadians - secondKinematics.azimuthRadians),
      )
      const firstEta = firstKinematics.pseudorapidity
      const secondEta = secondKinematics.pseudorapidity

      candidates.push({
        particleIds: [first.id, second.id],
        massGeV: massSquared >= -1e-6 ? Math.sqrt(Math.max(0, massSquared)) : null,
        transverseMomentumGeV: Math.hypot(px, py),
        muonTransverseMomentaGeV: [
          firstKinematics.transverseMomentumGeV,
          secondKinematics.transverseMomentumGeV,
        ],
        muonPseudorapidities: [
          firstKinematics.pseudorapidity,
          secondKinematics.pseudorapidity,
        ],
        oppositeCharge: Number.isFinite(first.charge) && Number.isFinite(second.charge) && first.charge * second.charge < 0,
        deltaR: Number.isFinite(firstEta) && Number.isFinite(secondEta)
          ? Math.hypot(firstEta - secondEta, deltaPhi)
          : null,
      })
    }
  }

  return candidates
}
