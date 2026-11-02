import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseRunningIncident, chooseStartupFailure, runningIncidents, startupFailures } from './incidents.js'

test('startup incident weights match the supplied 27% failure model', () => {
  assert.equal(startupFailures.reduce((total, outcome) => total + outcome.probability, 0), 27)
  assert.equal(chooseStartupFailure(() => 0)?.id, 'cryo-delay')
  assert.equal(chooseStartupFailure(() => 0.27), null)
  assert.equal(chooseStartupFailure(() => 0.999), null)
})

test('running incidents use the supplied marginal probabilities per ten-minute interval', () => {
  assert.ok(Math.abs(runningIncidents.reduce((total, outcome) => total + outcome.probability, 0) - 10.38) < 1e-9)
  assert.equal(chooseRunningIncident(() => 0)?.id, 'minor-beam-loss')
  assert.equal(chooseRunningIncident(() => 0.05)?.id, 'detector-data-dropout')
  assert.equal(chooseRunningIncident(() => 0.11), null)
})
