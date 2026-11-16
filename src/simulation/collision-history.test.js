import test from 'node:test'
import assert from 'node:assert/strict'
import { createCollisionHistoryStore } from './collision-history.js'

function createMemoryIndexedDB() {
  const databases = new Map()

  return {
    open(name) {
      const request = {}
      setTimeout(() => {
        let database = databases.get(name)
        const isNew = !database
        if (!database) {
          database = {
            stores: new Map(),
            objectStoreNames: { contains(storeName) { return database.stores.has(storeName) } },
            createObjectStore(storeName, { keyPath }) {
              database.stores.set(storeName, { keyPath, records: new Map() })
            },
            transaction(storeNames) {
              let pending = 0
              let completed = false
              const transaction = {
                oncomplete: null,
                onerror: null,
                onabort: null,
                error: null,
                abort() {
                  if (completed) return
                  completed = true
                  setTimeout(() => transaction.onabort?.(), 0)
                },
                objectStore(storeName) {
                  const store = database.stores.get(storeName)
                  const requestOperation = (operation) => {
                    const operationRequest = {}
                    pending += 1
                    setTimeout(() => {
                      try {
                        operationRequest.result = operation(store.records)
                        operationRequest.onsuccess?.({ target: operationRequest })
                      } catch (error) {
                        operationRequest.error = error
                        operationRequest.onerror?.()
                        transaction.error = error
                        transaction.onerror?.()
                      }
                      pending -= 1
                      if (pending === 0 && !completed) {
                        completed = true
                        setTimeout(() => transaction.oncomplete?.(), 0)
                      }
                    }, 0)
                    return operationRequest
                  }
                  return {
                    get: (key) => requestOperation((records) => records.get(key)),
                    getAll: () => requestOperation((records) => [...records.values()]),
                    put: (record) => requestOperation((records) => {
                      records.set(record[store.keyPath], record)
                      return record[store.keyPath]
                    }),
                  }
                },
              }
              assert.ok(storeNames.length)
              return transaction
            },
          }
          databases.set(name, database)
        }
        request.result = database
        if (isNew) request.onupgradeneeded?.()
        request.onsuccess?.()
      }, 0)
      return request
    },
  }
}

function createStore(legacyValue = null) {
  const values = new Map(legacyValue == null ? [] : [['lhc-collision-history', legacyValue]])
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  return createCollisionHistoryStore({
    indexedDBProvider: createMemoryIndexedDB,
    legacyStorageProvider: () => localStorage,
  })
}

const event = (id) => ({ id, particles: [{ id: `${id}-muon` }] })

test('collision history persists every event and restores totals in order', async () => {
  const store = createStore()
  for (let index = 1; index <= 25; index += 1) {
    await store.append(event(`sim-session-${index}`), {
      collisions: index,
      detectedParticles: index * 2,
      averageEventEnergy: 6.2,
    })
  }

  const restored = await store.load()
  assert.equal(restored.collisions, 25)
  assert.equal(restored.detectedParticles, 50)
  assert.equal(restored.events.length, 25)
  assert.equal(restored.events[0].id, 'sim-session-1')
  assert.equal(restored.events.at(-1).id, 'sim-session-25')
})

test('collision history migrates existing browser data before adding new events', async () => {
  const legacy = JSON.stringify({
    format: 'lhc-collision-history',
    version: 1,
    collisions: 20,
    detectedParticles: 40,
    averageEventEnergy: 7.5,
    events: Array.from({ length: 18 }, (_, index) => event(`legacy-${index + 1}`)),
  })
  const store = createStore(legacy)
  const restoredLegacy = await store.load()

  assert.equal(restoredLegacy.collisions, 20)
  assert.equal(restoredLegacy.events.length, 18)
  await store.append(event('new-event'), {
    collisions: 21,
    detectedParticles: 42,
    averageEventEnergy: 7.4,
  })
  const restored = await store.load()
  assert.equal(restored.events.length, 19)
  assert.equal(restored.events[0].id, 'legacy-1')
  assert.equal(restored.events.at(-1).id, 'new-event')
})

test('invalid legacy history is reported instead of replaced', async () => {
  const store = createStore(JSON.stringify({ format: 'unknown', version: 1 }))

  await assert.rejects(store.load(), /invalid or uses an unsupported format/)
})
