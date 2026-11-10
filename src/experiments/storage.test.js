import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCompletedExperiments, saveCompletedExperiment } from './storage.js'

test('completed experiments are not silently discarded after a fixed count', () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }

  for (let index = 0; index < 30; index += 1) {
    saveCompletedExperiment({ id: `run-${index}`, name: `Run ${index}`, events: [] })
  }

  assert.equal(loadCompletedExperiments().length, 30)
})
