import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadAnalysisReports,
  loadEventCollections,
  loadResearchNotes,
  loadResearchProjects,
  restoreResearchArchive,
  saveAnalysisReport,
  saveResearchNotes,
} from './storage.js'

function installMemoryStorage() {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

test('research archive restore merges records without replacing existing data', () => {
  installMemoryStorage()
  saveResearchNotes([{ id: 'existing-note', title: 'Local note', observation: 'kept' }])
  localStorage.setItem('lhc-completed-experiments', JSON.stringify([{ id: 'existing-run', name: 'Local run', events: [] }]))
  localStorage.setItem('lhc-saved-events', JSON.stringify([{ recordId: 'existing-event', particles: [] }]))

  const result = restoreResearchArchive({
    format: 'lhc-research-archive',
    version: 1,
    experiments: [
      { id: 'existing-run', name: 'Incoming duplicate', events: [] },
      { id: 'imported-run', name: 'Imported run', events: [] },
    ],
    collisions: [
      { recordId: 'existing-event', particles: [] },
      { recordId: 'imported-event', particles: [] },
    ],
    notes: [
      { id: 'existing-note', title: 'Incoming duplicate' },
      { id: 'imported-note', title: 'Imported note' },
    ],
  })

  assert.deepEqual(result, {
    experimentsAdded: 1,
    collisionsAdded: 1,
    notesAdded: 1,
    projectsAdded: 0,
    reportsAdded: 0,
    collectionsAdded: 0,
  })
  assert.equal(loadResearchNotes()[0].title, 'Local note')
  assert.equal(JSON.parse(localStorage.getItem('lhc-completed-experiments')).length, 2)
  assert.equal(JSON.parse(localStorage.getItem('lhc-saved-events')).length, 2)
})

test('research archive restore rejects unknown format versions', () => {
  installMemoryStorage()
  assert.throws(() => restoreResearchArchive({ format: 'unknown', version: 1 }), /not a valid LHC research archive/)
})

test('version 2 archive restores research projects, reports, and event collections', () => {
  installMemoryStorage()
  const result = restoreResearchArchive({
    format: 'lhc-research-archive',
    version: 2,
    experiments: [],
    collisions: [],
    notes: [],
    projects: [{ id: 'project-1', name: 'Dimuon study' }],
    reports: [{ id: 'report-1', title: 'Selection report' }],
    collections: [{ id: 'collection-1', name: 'Candidates', eventIds: ['event-1'] }],
  })

  assert.deepEqual(result, {
    experimentsAdded: 0,
    collisionsAdded: 0,
    notesAdded: 0,
    projectsAdded: 1,
    reportsAdded: 1,
    collectionsAdded: 1,
  })
  assert.equal(loadResearchProjects()[0].name, 'Dimuon study')
  assert.equal(loadAnalysisReports()[0].title, 'Selection report')
  assert.deepEqual(loadEventCollections()[0].eventIds, ['event-1'])
})

test('saving an analysis report persists it without duplicating its ID', () => {
  installMemoryStorage()
  saveAnalysisReport({ id: 'report-1', title: 'Initial report' })
  saveAnalysisReport({ id: 'report-1', title: 'Updated report' })

  assert.equal(loadAnalysisReports().length, 1)
  assert.equal(loadAnalysisReports()[0].title, 'Updated report')
})
