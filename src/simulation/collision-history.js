const storageKey = 'lhc-collision-history'
const format = 'lhc-collision-history'
const version = 1
const historyLimit = 18

const emptyHistory = () => ({
  format,
  version,
  collisions: 0,
  detectedParticles: 0,
  averageEventEnergy: 0,
  events: [],
})

function isValidEvent(event) {
  return event && (typeof event.id === 'string' || Number.isFinite(event.id))
    && Array.isArray(event.particles)
}

export function loadCollisionHistory() {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return emptyHistory()

  const history = JSON.parse(raw)
  if (
    !history
    || history.format !== format
    || history.version !== version
    || !Number.isInteger(history.collisions)
    || history.collisions < 0
    || !Number.isInteger(history.detectedParticles)
    || history.detectedParticles < 0
    || !Number.isFinite(history.averageEventEnergy)
    || !Array.isArray(history.events)
    || history.events.length > historyLimit
    || !history.events.every(isValidEvent)
  ) {
    throw new Error('Saved collision history is invalid or uses an unsupported format.')
  }
  return history
}

export function saveCollisionHistory(history) {
  if (
    !history
    || !Number.isInteger(history.collisions)
    || history.collisions < 0
    || !Number.isInteger(history.detectedParticles)
    || history.detectedParticles < 0
    || !Number.isFinite(history.averageEventEnergy)
    || !Array.isArray(history.events)
    || !history.events.every(isValidEvent)
  ) {
    throw new Error('Collision history cannot be saved because its data is invalid.')
  }

  const record = {
    format,
    version,
    collisions: history.collisions,
    detectedParticles: history.detectedParticles,
    averageEventEnergy: history.averageEventEnergy,
    events: history.events.slice(-historyLimit),
  }
  localStorage.setItem(storageKey, JSON.stringify(record))
}
