import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCollisionHistory, saveCollisionHistory } from './collision-history.js'

function installStorage(initialValue = null) {
  const values = new Map(initialValue == null ? [] : [['lhc-collision-history', initialValue]])
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  return values
}

test('collision history persists and restores recent events and totals', () => {
  installStorage()
  const history = {
    collisions: 24,
    detectedParticles: 48,
    averageEventEnergy: 6.2,
    events: [{ id: 'sim-session-24', particles: [{ id: 'muon-1' }] }],
  }

  saveCollisionHistory(history)

  assert.deepEqual(loadCollisionHistory(), {
    ...history,
    format: 'lhc-collision-history',
    version: 1,
  })
})

test('collision history keeps only the most recent 18 events', () => {
  installStorage()
  const events = Array.from({ length: 20 }, (_, index) => ({ id: `sim-session-${index}`, particles: [] }))
  saveCollisionHistory({ collisions: 20, detectedParticles: 0, averageEventEnergy: 0, events })

  const restored = loadCollisionHistory()
  assert.equal(restored.events.length, 18)
  assert.equal(restored.events[0].id, 'sim-session-2')
  assert.equal(restored.events.at(-1).id, 'sim-session-19')
})

test('invalid saved collision history is reported instead of overwritten', () => {
  installStorage(JSON.stringify({ format: 'other', version: 1 }))

  assert.throws(loadCollisionHistory, /invalid or uses an unsupported format/)
})
