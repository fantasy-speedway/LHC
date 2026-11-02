import cmsDimuonCsv from '../data/cms-2010-jpsi-dimuon.csv?raw'

const cmsDimuonEvents = (() => {
  const [headerLine, ...lines] = cmsDimuonCsv.trim().split(/\r?\n/)
  const headers = headerLine.split(',')
  const requiredFields = ['Type', 'Run', 'Event', 'E1', 'px1', 'py1', 'pz1', 'pt1', 'eta1', 'phi1', 'Q1', 'E2', 'px2', 'py2', 'pz2', 'pt2', 'eta2', 'phi2', 'Q2', 'M']

  if (requiredFields.some((field) => !headers.includes(field))) {
    throw new Error('The bundled CMS dimuon data is missing required columns.')
  }

  const rows = lines.filter(Boolean).map((line, index) => {
    const values = line.split(',')
    if (values.length !== headers.length) {
      throw new Error(`Invalid CMS dimuon data at row ${index + 2}.`)
    }

    const row = Object.fromEntries(headers.map((header, column) => [header, values[column]]))
    for (const field of requiredFields.filter((field) => field !== 'Type')) {
      if (!Number.isFinite(Number(row[field]))) {
        throw new Error(`Invalid CMS dimuon value for ${field} at row ${index + 2}.`)
      }
    }
    return row
  })

  if (rows.length === 0) {
    throw new Error('The bundled CMS dimuon reference dataset is empty.')
  }
  return rows
})()

let nextCmsDimuonEvent = 0

export function createCollisionEvent({ eventNumber, time }) {
  const record = cmsDimuonEvents[nextCmsDimuonEvent]
  nextCmsDimuonEvent = (nextCmsDimuonEvent + 1) % cmsDimuonEvents.length

  const particles = [1, 2].map((index) => {
    const value = (field) => Number(record[`${field}${index}`])
    const px = value('px')
    const py = value('py')
    const pz = value('pz')

    return {
      id: `${eventNumber}-${index - 1}`,
      type: 'Muon',
      energy: value('E'),
      direction: value('phi'),
      momentum: Math.hypot(px, py, pz),
      transverseMomentum: value('pt'),
      pseudorapidity: value('eta'),
      px,
      py,
      pz,
      lifetime: null,
      charge: value('Q'),
      isDetected: true,
      detectionProbability: 1,
      muonTrackType: record.Type,
      color: '#e990c8',
    }
  })

  return {
    id: eventNumber,
    label: `CMS RUN ${record.Run} / EVENT ${record.Event}`,
    time,
    sourceParticle: 'J/ψ → μ+μ−',
    dataOrigin: 'CERN Open Data',
    sourceRecordId: 301,
    sourceRun: Number(record.Run),
    sourceEventId: Number(record.Event),
    invariantMass: Number(record.M),
    totalEnergy: particles.reduce((sum, particle) => sum + particle.energy, 0),
    interestingScore: null,
    detectedParticles: particles.length,
    particles,
  }
}
