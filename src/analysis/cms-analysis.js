import { buildDimuonCandidates } from '../physics/beam-physics.js'

export const DEFAULT_DIMUON_CUTS = {
  minimumMuonPtGeV: 0.5,
  maximumAbsEta: 2.4,
  minimumMassGeV: 2.6,
  maximumMassGeV: 3.5,
  oppositeChargeRequired: true,
  histogramMinimumGeV: 2.4,
  histogramMaximumGeV: 4.0,
  histogramBins: 20,
}

function isValidEvent(event) {
  return Array.isArray(event?.particles)
}

function bestCandidate(candidates) {
  return candidates
    .filter((candidate) => Number.isFinite(candidate.massGeV))
    .sort((left, right) => Math.abs(left.massGeV - 3.0969) - Math.abs(right.massGeV - 3.0969))[0] ?? null
}

export function analyzeCmsDimuonEvents(events, cuts = DEFAULT_DIMUON_CUTS) {
  const validEvents = events.filter(isValidEvent)
  const dimuonEvents = validEvents
    .map((event) => ({ event, candidates: buildDimuonCandidates(event) }))
    .filter((entry) => entry.candidates.length > 0)
  const chargeSelected = dimuonEvents
    .map((entry) => ({
      ...entry,
      candidates: entry.candidates.filter((candidate) =>
        !cuts.oppositeChargeRequired || candidate.oppositeCharge),
    }))
    .filter((entry) => entry.candidates.length > 0)
  const kinematicSelected = chargeSelected
    .map((entry) => {
      const candidates = entry.candidates.filter((candidate) =>
        candidate.muonTransverseMomentaGeV.every((value) => value >= cuts.minimumMuonPtGeV)
        && candidate.muonPseudorapidities.every((value) =>
          Number.isFinite(value) && Math.abs(value) <= cuts.maximumAbsEta))
      return { ...entry, candidates }
    })
    .filter((entry) => entry.candidates.length > 0)
  const withBestCandidate = kinematicSelected
    .map((entry) => ({ ...entry, candidate: bestCandidate(entry.candidates) }))
    .filter((entry) => entry.candidate)
  const massSelected = withBestCandidate.filter(({ candidate }) =>
    candidate.massGeV >= cuts.minimumMassGeV && candidate.massGeV <= cuts.maximumMassGeV)

  const selectedMasses = withBestCandidate.map(({ candidate }) => candidate.massGeV)
  const binWidth = (cuts.histogramMaximumGeV - cuts.histogramMinimumGeV) / cuts.histogramBins
  const histogram = Array.from({ length: cuts.histogramBins }, (_, index) => ({
    lowGeV: cuts.histogramMinimumGeV + index * binWidth,
    highGeV: cuts.histogramMinimumGeV + (index + 1) * binWidth,
    count: 0,
  }))
  for (const mass of selectedMasses) {
    const binIndex = Math.floor((mass - cuts.histogramMinimumGeV) / binWidth)
    if (binIndex >= 0 && binIndex < histogram.length) histogram[binIndex].count += 1
  }

  const selected = massSelected.map(({ event, candidate }) => ({
    event,
    candidate,
    sourceMassGeV: Number.isFinite(event.invariantMass) ? event.invariantMass : null,
  }))
  const meanMassGeV = selected.length
    ? selected.reduce((sum, item) => sum + item.candidate.massGeV, 0) / selected.length
    : null
  const massVariance = meanMassGeV == null
    ? null
    : selected.reduce((sum, item) => sum + (item.candidate.massGeV - meanMassGeV) ** 2, 0) / selected.length

  return {
    cutflow: [
      { label: 'Input events', count: validEvents.length },
      { label: 'At least two reconstructed muons', count: dimuonEvents.length },
      { label: cuts.oppositeChargeRequired ? 'Opposite-sign pair' : 'Charge selection disabled', count: chargeSelected.length },
      { label: 'Muon pT and |η| requirements', count: kinematicSelected.length },
      { label: `m(μμ) in ${cuts.minimumMassGeV.toFixed(2)}–${cuts.maximumMassGeV.toFixed(2)} GeV`, count: selected.length },
    ],
    histogram,
    candidateMasses: selectedMasses.filter(Number.isFinite),
    selected,
    meanMassGeV,
    massRmsGeV: massVariance == null ? null : Math.sqrt(massVariance),
    candidateEventCount: withBestCandidate.length,
    rejectedOutsideHistogram: selectedMasses.filter((mass) =>
      mass < cuts.histogramMinimumGeV || mass >= cuts.histogramMaximumGeV).length,
  }
}
