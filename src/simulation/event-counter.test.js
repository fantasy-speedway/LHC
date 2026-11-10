import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceProcessedEventCounter } from './event-counter.js'

test('processed-event counter carries fractional frame increments forward', () => {
  let count = 0
  let remainder = 0

  for (let frame = 0; frame < 60; frame += 1) {
    const next = advanceProcessedEventCounter(count, remainder, 1000 / 60, 1)
    count = next.count
    remainder = next.remainder
  }

  assert.equal(count, 40)
  assert.ok(remainder < 1)
  assert.ok(remainder >= 0)
})

test('processed-event counter scales with simulation speed and keeps sub-frame progress', () => {
  let next = advanceProcessedEventCounter(100, 0, 16, 0.5)
  assert.equal(next.count, 100)
  assert.equal(next.remainder, 0.32)

  next = advanceProcessedEventCounter(next.count, next.remainder, 16, 0.5)
  assert.equal(next.count, 100)
  assert.equal(next.remainder, 0.64)

  next = advanceProcessedEventCounter(next.count, next.remainder, 16, 0.5)
  assert.equal(next.count, 100)
  assert.ok(Math.abs(next.remainder - 0.96) < 1e-12)
})
