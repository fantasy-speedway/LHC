const databaseName = 'lhc-collision-archive'
const databaseVersion = 1
const eventStoreName = 'events'
const metadataStoreName = 'metadata'
const metadataKey = 'summary'
const legacyStorageKey = 'lhc-collision-history'
const format = 'lhc-collision-history'
const version = 1

const emptyHistory = () => ({
  collisions: 0,
  detectedParticles: 0,
  averageEventEnergy: 0,
  events: [],
})

function isValidEvent(event) {
  return event && (typeof event.id === 'string' || Number.isFinite(event.id))
    && Array.isArray(event.particles)
}

function validateSummary(summary) {
  if (
    !summary
    || !Number.isInteger(summary.collisions)
    || summary.collisions < 0
    || !Number.isInteger(summary.detectedParticles)
    || summary.detectedParticles < 0
    || !Number.isFinite(summary.averageEventEnergy)
  ) {
    throw new Error('Saved collision-history totals are invalid.')
  }
}

function readLegacyHistory(storage) {
  const raw = storage?.getItem(legacyStorageKey)
  if (!raw) return emptyHistory()

  const legacy = JSON.parse(raw)
  if (
    !legacy
    || legacy.format !== format
    || legacy.version !== version
    || !Array.isArray(legacy.events)
    || !legacy.events.every(isValidEvent)
  ) {
    throw new Error('Saved collision history is invalid or uses an unsupported format.')
  }
  validateSummary(legacy)
  return legacy
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Collision history database request failed.'))
  })
}

function openDatabase(indexedDBProvider) {
  const indexedDB = indexedDBProvider()
  if (!indexedDB) throw new Error('This browser does not support persistent collision history.')

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(eventStoreName)) {
        database.createObjectStore(eventStoreName, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(metadataStoreName)) {
        database.createObjectStore(metadataStoreName, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open collision history database.'))
    request.onblocked = () => reject(new Error('Collision history database upgrade is blocked by another open app tab.'))
  })
}

function ensureMigrated(database, legacyStorageProvider) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([eventStoreName, metadataStoreName], 'readwrite')
    let migrationError = null
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(migrationError ?? transaction.error ?? new Error('Could not initialize collision history.'))
    transaction.onabort = () => reject(migrationError ?? transaction.error ?? new Error('Collision history initialization was interrupted.'))

    transaction.objectStore(metadataStoreName).get(metadataKey).onsuccess = (result) => {
      if (result.target.result) return
      try {
        const history = readLegacyHistory(legacyStorageProvider())
        history.events.forEach((event, index) => {
          transaction.objectStore(eventStoreName).put({ ...event, historyIndex: index + 1 })
        })
        transaction.objectStore(metadataStoreName).put({
          key: metadataKey,
          format,
          version,
          collisions: history.collisions,
          detectedParticles: history.detectedParticles,
          averageEventEnergy: history.averageEventEnergy,
        })
      } catch (error) {
        migrationError = error instanceof Error ? error : new Error(String(error))
        transaction.abort()
      }
    }
  })
}

export function createCollisionHistoryStore({
  indexedDBProvider = () => globalThis.indexedDB,
  legacyStorageProvider = () => globalThis.localStorage,
} = {}) {
  let databasePromise
  const getDatabase = () => {
    if (!databasePromise) {
      databasePromise = openDatabase(indexedDBProvider).catch((error) => {
        databasePromise = null
        throw error
      })
    }
    return databasePromise
  }

  async function load() {
    const database = await getDatabase()
    await ensureMigrated(database, legacyStorageProvider)
    const transaction = database.transaction([eventStoreName, metadataStoreName], 'readonly')
    const eventsRequest = transaction.objectStore(eventStoreName).getAll()
    const summaryRequest = transaction.objectStore(metadataStoreName).get(metadataKey)
    const [events, summary] = await Promise.all([
      requestResult(eventsRequest),
      requestResult(summaryRequest),
    ])
    if (!summary || summary.format !== format || summary.version !== version) {
      throw new Error('Saved collision-history metadata is invalid or uses an unsupported format.')
    }
    validateSummary(summary)
    if (!Array.isArray(events) || !events.every((event) =>
      isValidEvent(event) && Number.isInteger(event.historyIndex) && event.historyIndex > 0)) {
      throw new Error('Saved collision events are invalid or incomplete.')
    }
    return {
      collisions: summary.collisions,
      detectedParticles: summary.detectedParticles,
      averageEventEnergy: summary.averageEventEnergy,
      events: events.sort((left, right) => left.historyIndex - right.historyIndex),
    }
  }

  async function append(event, summary) {
    if (!isValidEvent(event)) throw new Error('Collision event cannot be saved because its data is invalid.')
    validateSummary(summary)
    const database = await getDatabase()
    await ensureMigrated(database, legacyStorageProvider)
    const transaction = database.transaction([eventStoreName, metadataStoreName], 'readwrite')
    transaction.objectStore(eventStoreName).put({
      ...event,
      historyIndex: summary.collisions,
    })
    transaction.objectStore(metadataStoreName).put({
      key: metadataKey,
      format,
      version,
      collisions: summary.collisions,
      detectedParticles: summary.detectedParticles,
      averageEventEnergy: summary.averageEventEnergy,
    })
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this collision.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving this collision was interrupted.'))
    })
  }

  return { load, append }
}

const browserStore = createCollisionHistoryStore()

export function loadCollisionHistory() {
  return browserStore.load()
}

export function appendCollisionEvent(event, summary) {
  return browserStore.append(event, summary)
}
