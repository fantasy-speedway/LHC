
import test from 'node:test'
import assert from 'node:assert/strict'
import { detectorGuides, discoveryScenarios, particleCatalogue, particleCatalogueByName, particleSources } from './catalogue.js'

test('particle reference includes the Standard Model particles and collider antiparticle examples', () => {
  const expectedParticles = [
    'Up', 'Down', 'Charm', 'Strange', 'Top', 'Bottom',
    'Electron', 'Positron', 'Electron neutrino', 'Muon', 'Muon neutrino', 'Tau', 'Tau neutrino',
    'Photon', 'Gluon', 'W boson', 'Z boson', 'Higgs boson',
  ]
  for (const name of expectedParticles) assert.ok(particleCatalogueByName[name], `Missing catalogue entry: ${name}`)
  assert.ok(particleCatalogue.length >= 35, 'The reference should include common composite particles and resonances')
  assert.ok(particleCatalogueByName['J/psi'])
  assert.ok(particleCatalogueByName['K short'])
  assert.ok(particleCatalogueByName['K long'])
})

test('every particle record has a distinct key and its explanatory reference fields', () => {
  const ids = particleCatalogue.map((entry) => entry.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const entry of particleCatalogue) {
    for (const field of ['name', 'symbol', 'category', 'charge', 'mass', 'spin', 'lifetime', 'antiparticle', 'composition', 'description', 'production', 'decays', 'signature', 'caveat', 'discoverer']) {
      assert.equal(typeof entry[field], 'string', `${entry.name} is missing ${field}`)
      assert.ok(entry[field].length > 0, `${entry.name} has an empty ${field}`)
    }
  }
})

test('discovery scenarios and detector guides reference existing educational content', () => {
  for (const scenario of discoveryScenarios) assert.ok(particleCatalogueByName[scenario.particle])
  assert.ok(detectorGuides.length >= 5)
  assert.ok(particleSources.some((source) => source.url.includes('pdg.lbl.gov')))
  assert.ok(particleSources.some((source) => source.url.includes('cms.cern')))
})
