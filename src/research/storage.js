import { loadCompletedExperiments } from '../experiments/storage.js'
import { loadSavedCollisionEvents } from '../collision/storage.js'

const notesKey = 'lhc-research-notebook'
const experimentsKey = 'lhc-completed-experiments'
const collisionsKey = 'lhc-saved-events'
const projectsKey = 'lhc-research-projects'
const reportsKey = 'lhc-analysis-reports'
const collectionsKey = 'lhc-event-collections'

function readList(key, description, isValid) {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  const records = JSON.parse(raw)
  if (!isRecordList(records, isValid)) throw new Error(`${description} are not a valid list.`)
  return records
}

function isRecordList(value, isValid) {
  return Array.isArray(value) && value.every(isValid)
}

export function loadResearchNotes() {
  return readList(notesKey, 'Research notes', (note) =>
    note && typeof note === 'object' && note.id != null && typeof note.title === 'string',
  ).map((note) => ({
    ...note,
    projectId: note.projectId ?? null,
    experimentId: note.experimentId ?? null,
    datasetId: note.datasetId ?? null,
  }))
}

export function saveResearchNotes(notes) {
  if (!Array.isArray(notes)) throw new Error('Research notes must be a list.')
  localStorage.setItem(notesKey, JSON.stringify(notes))
}

export function loadResearchProjects() {
  return readList(projectsKey, 'Research projects', (project) =>
    project && typeof project.id === 'string' && typeof project.name === 'string',
  )
}

export function saveResearchProjects(projects) {
  if (!Array.isArray(projects)) throw new Error('Research projects must be a list.')
  localStorage.setItem(projectsKey, JSON.stringify(projects))
}

export function loadAnalysisReports() {
  return readList(reportsKey, 'Analysis reports', (report) =>
    report && typeof report.id === 'string' && typeof report.title === 'string',
  )
}

export function saveAnalysisReport(report) {
  if (!report || typeof report.id !== 'string' || typeof report.title !== 'string') {
    throw new Error('Analysis report is invalid.')
  }
  const reports = loadAnalysisReports()
  localStorage.setItem(reportsKey, JSON.stringify([report, ...reports.filter((item) => item.id !== report.id)]))
}

export function loadEventCollections() {
  return readList(collectionsKey, 'Event collections', (collection) =>
    collection && typeof collection.id === 'string' && typeof collection.name === 'string' && Array.isArray(collection.eventIds),
  )
}

export function saveEventCollections(collections) {
  if (!Array.isArray(collections)) throw new Error('Event collections must be a list.')
  localStorage.setItem(collectionsKey, JSON.stringify(collections))
}

function mergeById(existing, imported, idOf) {
  const merged = new Map(existing.map((record) => [idOf(record), record]))
  for (const record of imported) {
    if (!merged.has(idOf(record))) merged.set(idOf(record), record)
  }
  return [...merged.values()]
}

export function restoreResearchArchive(archive) {
  if (
    !archive
    || archive.format !== 'lhc-research-archive'
    || ![1, 2].includes(archive.version)
    || !isRecordList(archive.experiments, (record) => record && typeof record.id === 'string' && Array.isArray(record.events))
    || !isRecordList(archive.collisions, (record) => record && typeof record.recordId === 'string' && Array.isArray(record.particles))
    || !isRecordList(archive.notes, (record) => record && record.id != null && typeof record.title === 'string')
    || (archive.version === 2 && (
      !isRecordList(archive.projects, (record) => record && typeof record.id === 'string' && typeof record.name === 'string')
      || !isRecordList(archive.reports, (record) => record && typeof record.id === 'string' && typeof record.title === 'string')
      || !isRecordList(archive.collections, (record) => record && typeof record.id === 'string' && typeof record.name === 'string' && Array.isArray(record.eventIds))
    ))
  ) {
    throw new Error('This file is not a valid LHC research archive (supported versions 1 and 2).')
  }

  const existingExperiments = loadCompletedExperiments()
  const existingCollisions = loadSavedCollisionEvents()
  const existingNotes = loadResearchNotes()
  const existingProjects = loadResearchProjects()
  const existingReports = loadAnalysisReports()
  const existingCollections = loadEventCollections()
  const next = {
    experiments: mergeById(existingExperiments, archive.experiments, (record) => record.id),
    collisions: mergeById(existingCollisions, archive.collisions, (record) => record.recordId),
    notes: mergeById(existingNotes, archive.notes, (record) => String(record.id)),
    projects: mergeById(existingProjects, archive.projects ?? [], (record) => record.id),
    reports: mergeById(existingReports, archive.reports ?? [], (record) => record.id),
    collections: mergeById(existingCollections, archive.collections ?? [], (record) => record.id),
  }
  const keys = [experimentsKey, collisionsKey, notesKey, projectsKey, reportsKey, collectionsKey]
  const values = [next.experiments, next.collisions, next.notes, next.projects, next.reports, next.collections]
    .map((records) => JSON.stringify(records))
  const previous = keys.map((key) => localStorage.getItem(key))

  try {
    keys.forEach((key, index) => localStorage.setItem(key, values[index]))
  } catch (error) {
    try {
      keys.forEach((key, index) => {
        if (previous[index] == null) localStorage.removeItem(key)
        else localStorage.setItem(key, previous[index])
      })
    } catch (rollbackError) {
      throw new Error(`Research archive import failed and rollback was incomplete: ${rollbackError.message}`)
    }
    throw new Error(`Research archive import failed: ${error.message}`)
  }

  return {
    experimentsAdded: next.experiments.length - existingExperiments.length,
    collisionsAdded: next.collisions.length - existingCollisions.length,
    notesAdded: next.notes.length - existingNotes.length,
    projectsAdded: next.projects.length - existingProjects.length,
    reportsAdded: next.reports.length - existingReports.length,
    collectionsAdded: next.collections.length - existingCollections.length,
  }
}
