import test from 'node:test'
import assert from 'node:assert/strict'
import { createStartupSystems, startupProcedure } from './startup-procedure.js'

test('startup controls cover the requested order as individual commands', () => {
  assert.deepEqual(startupProcedure.map((step) => step.section), [
    'Main power',
    'Main power',
    'Main power',
    'Cooling system',
    'Vacuum system',
    'Magnet system',
    'Magnet system',
    'Magnet system',
    'Injector chain',
    'Injector chain',
    'Injector chain',
    'Inject proton beams',
    'Inject proton beams',
    'Accelerate beams',
    'Accelerate beams',
    'Beam alignment',
    'Beam alignment',
    'Detector preparation',
    'Detector preparation',
    'Detector preparation',
    'Begin collisions',
    'Begin collisions',
    'Begin collisions',
  ])
  assert.equal(new Set(startupProcedure.map((step) => step.id)).size, startupProcedure.length)
  assert.equal(startupProcedure.at(-1).id, 'start-collisions')
  assert.ok(startupProcedure.every((step) =>
    step.label && step.command && step.system && step.duration >= 900 && ['button', 'switch'].includes(step.control)))
  assert.ok(startupProcedure.filter((step) => step.control === 'switch').length >= 8)
  assert.ok(startupProcedure.find((step) => step.id === 'cryo-start').duration >= 10000)
  assert.ok(startupProcedure.find((step) => step.id === 'vacuum-pumps').duration >= 5000)
})

test('modeled systems begin unpowered and report no ready hardware', () => {
  const systems = createStartupSystems()

  assert.equal(systems.gridPower, false)
  assert.equal(systems.cryoTemperature, 78)
  assert.equal(systems.cryoReady, false)
  assert.equal(systems.vacuumStable, false)
  assert.equal(systems.beamAInjected, false)
  assert.equal(systems.beamBInjected, false)
  assert.equal(systems.atlasReady, false)
  assert.equal(systems.cmsReady, false)
  assert.equal(systems.collisionsActive, false)
})

test('startup controls use the requested modeled transition durations', () => {
  const durations = Object.fromEntries(startupProcedure.map(({ id, duration }) => [id, duration]))

  assert.deepEqual(durations, {
    'mains-power': 5000,
    'emergency-stop-reset': 5000,
    'verify-status-lights': 5000,
    'cryo-start': 30000,
    'vacuum-pumps': 20000,
    'magnet-power': 15000,
    'ramp-dipoles': 30000,
    'ramp-quadrupoles': 20000,
    'linac-start': 15000,
    'booster-enable': 15000,
    'sps-transfer-ready': 15000,
    'inject-beam-a': 10000,
    'inject-beam-b': 10000,
    'rf-system': 5000,
    'beam-ramp': 60000,
    'orbit-correction': 20000,
    collimation: 15000,
    'atlas-ready': 10000,
    'cms-ready': 10000,
    'data-acquisition': 10000,
    'squeeze-beams': 30000,
    'collision-arm': 5000,
    'start-collisions': 5000,
  })
})
