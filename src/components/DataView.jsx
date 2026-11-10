import { useMemo, useState } from 'react'
import { loadCompletedExperiments, deleteCompletedExperiment } from '../experiments/storage'
import { detectorLayers } from '../detector/model'
import { classifyCollisionPriority, priorityDetails } from '../collision/classification'
import { loadSavedCollisionEvents } from '../collision/storage'
import {
  loadAnalysisReports,
  loadEventCollections,
  loadResearchNotes,
  loadResearchProjects,
  restoreResearchArchive,
  saveEventCollections,
  saveResearchNotes,
  saveResearchProjects,
} from '../research/storage'
import '../data/data-view.css'

const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
const download = (filename, content, type = 'text/csv') => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
const toCsv = (rows, columns) => [
  columns.map((column) => csvEscape(column.label)).join(','),
  ...rows.map((row) => columns.map((column) => csvEscape(column.value(row))).join(',')),
].join('\n')

function priorityLabel(event) {
  const priority = classifyCollisionPriority(event).priority
  return priority === 'UNMARKED' ? '—' : `${priorityDetails[priority].marker} ${priorityDetails[priority].label}`
}

function savedPriority(event) {
  return event.reviewedPriority ?? event.priority ?? 'UNMARKED'
}

export default function DataView({ simulation }) {
  const [experiments, setExperiments] = useState(loadCompletedExperiments)
  const [savedArchive, setSavedArchive] = useState(() => {
    try {
      return { collisions: loadSavedCollisionEvents(), error: '' }
    } catch (error) {
      return { collisions: [], error: `Could not read the saved collision archive: ${error.message}` }
    }
  })
  const { collisions: savedCollisions, error: archiveError } = savedArchive
  const [query, setQuery] = useState('')
  const [eventQuery, setEventQuery] = useState('')
  const [particleType, setParticleType] = useState('ALL')
  const [sortKey, setSortKey] = useState('date')
  const [sortDirection, setSortDirection] = useState('desc')
  const [note, setNote] = useState({ title: '', projectId: '', experimentId: '', datasetId: '', observation: '', hypothesis: '', conclusion: '' })
  const [notebookState, setNotebookState] = useState(() => {
    try { return { notes: loadResearchNotes(), error: '' } }
    catch (error) { return { notes: [], error: `Could not read research notes: ${error.message}` } }
  })
  const [researchStatus, setResearchStatus] = useState('')
  const [archiveStatus, setArchiveStatus] = useState('')
  const [archiveInputKey, setArchiveInputKey] = useState(0)
  const [researchRecords, setResearchRecords] = useState(() => {
    try {
      return {
        projects: loadResearchProjects(),
        reports: loadAnalysisReports(),
        collections: loadEventCollections(),
        error: '',
      }
    } catch (error) {
      return { projects: [], reports: [], collections: [], error: `Could not read the research archive: ${error.message}` }
    }
  })
  const [projectName, setProjectName] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const notes = notebookState.notes
  const { projects, reports, collections } = researchRecords

  const allEvents = useMemo(() => {
    const uniqueEvents = [
      ...simulation.eventHistory.map((event) => ({ ...event, experiment: 'CURRENT RUN / DATA-INFORMED SIMULATION' })),
      ...experiments.flatMap((experiment) => (experiment.events ?? []).map((event) => ({ ...event, experiment: experiment.name }))),
    ].reduce((map, event) => map.set(`${event.experiment}-${event.id}`, event), new Map())
    return [...uniqueEvents.values()]
  }, [experiments, simulation.eventHistory])
  const particles = allEvents
    .flatMap((event) => event.particles.map((particle) => ({
      ...particle,
      eventId: event.label,
      experiment: event.experiment,
      eventMode: event.eventMode,
      sourceRun: event.sourceRun,
      sourceEventId: event.sourceEventId,
    })))
    .filter((particle) => particleType === 'ALL' || particle.type === particleType)
  const visibleExperiments = experiments
    .filter((experiment) => `${experiment.id} ${experiment.name} ${experiment.beamA} ${experiment.beamB}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const left = sortKey === 'name' ? a.name : a.completedAt ?? ''
      const right = sortKey === 'name' ? b.name : b.completedAt ?? ''
      return (left > right ? 1 : -1) * (sortDirection === 'asc' ? 1 : -1)
    })
  const visibleEvents = allEvents.filter((event) => event.label.toLowerCase().includes(eventQuery.toLowerCase()))
  const visibleSavedCollisions = savedCollisions.filter((event) =>
    `${event.label ?? ''} ${event.runNumber ?? ''} ${event.sourceEventNumber ?? ''}`.toLowerCase().includes(eventQuery.toLowerCase()))
  const experimentById = new Map(experiments.map((experiment) => [experiment.id, experiment]))
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const datasetOptions = [
    { id: 'cms-reference-301', name: 'CERN CMS J/psi dimuon reference dataset (2,000 events)' },
    { id: 'saved-collision-archive', name: `Saved collision archive (${savedCollisions.length} events)` },
    ...collections.map((collection) => ({ id: `collection:${collection.id}`, name: `${collection.name} (${collection.eventIds.length} events)` })),
    ...experiments.map((experiment) => ({ id: `experiment:${experiment.id}`, name: `${experiment.name} dataset` })),
  ]
  const datasetById = new Map(datasetOptions.map((dataset) => [dataset.id, dataset]))
  const researchTimeline = [
    ...projects.map((project) => ({
      id: `project:${project.id}`,
      type: 'RESEARCH PROJECT',
      title: project.name,
      date: project.createdAt,
    })),
    ...experiments.map((experiment) => ({
      id: `experiment:${experiment.id}`,
      type: 'EXPERIMENT',
      title: experiment.name,
      date: experiment.completedAt,
      datasetId: `experiment:${experiment.id}`,
    })),
    ...notes.map((item) => ({
      id: `note:${item.id}`,
      type: 'RESEARCH NOTE',
      title: item.title,
      date: item.createdAt ?? item.date,
      projectId: item.projectId,
      experimentId: item.experimentId,
      datasetId: item.datasetId,
    })),
    ...reports.map((report) => ({
      id: `report:${report.id}`,
      type: 'ANALYSIS REPORT',
      title: report.title,
      date: report.createdAt,
      projectId: report.projectId,
      datasetId: report.datasetId,
    })),
  ].sort((left, right) => String(right.date ?? '').localeCompare(String(left.date ?? '')))

  const refreshArchive = () => {
    setExperiments(loadCompletedExperiments())
    try {
      setSavedArchive({ collisions: loadSavedCollisionEvents(), error: '' })
    } catch (error) {
      setSavedArchive({ collisions: [], error: `Could not read the saved collision archive: ${error.message}` })
    }
    try {
      setNotebookState({ notes: loadResearchNotes(), error: '' })
    } catch (error) {
      setNotebookState((current) => ({ ...current, error: `Could not read research notes: ${error.message}` }))
    }
    try {
      setResearchRecords({
        projects: loadResearchProjects(),
        reports: loadAnalysisReports(),
        collections: loadEventCollections(),
        error: '',
      })
    } catch (error) {
      setResearchRecords((current) => ({ ...current, error: `Could not read research archive: ${error.message}` }))
    }
  }

  const createProject = () => {
    const name = projectName.trim()
    if (!name) return
    const project = {
      id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: new Date().toISOString(),
    }
    try {
      const next = [project, ...projects]
      saveResearchProjects(next)
      setResearchRecords((current) => ({ ...current, projects: next, error: '' }))
      setProjectName('')
      setResearchStatus(`Research project "${name}" created.`)
    } catch (error) {
      setResearchStatus(`Could not create research project: ${error.message}`)
    }
  }

  const createCollection = () => {
    const name = collectionName.trim()
    if (!name) return
    const collection = {
      id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: new Date().toISOString(),
      eventIds: [],
    }
    try {
      const next = [collection, ...collections]
      saveEventCollections(next)
      setResearchRecords((current) => ({ ...current, collections: next, error: '' }))
      setSelectedCollectionId(collection.id)
      setCollectionName('')
      setResearchStatus(`Event collection "${name}" created.`)
    } catch (error) {
      setResearchStatus(`Could not create event collection: ${error.message}`)
    }
  }

  const addEventToCollection = (recordId) => {
    if (!selectedCollectionId) {
      setResearchStatus('Select or create an event collection first.')
      return
    }
    try {
      const next = collections.map((collection) => collection.id !== selectedCollectionId
        ? collection
        : { ...collection, eventIds: collection.eventIds.includes(recordId) ? collection.eventIds : [...collection.eventIds, recordId] })
      saveEventCollections(next)
      setResearchRecords((current) => ({ ...current, collections: next, error: '' }))
      setResearchStatus('Saved collision added to the selected event collection.')
    } catch (error) {
      setResearchStatus(`Could not update event collection: ${error.message}`)
    }
  }

  const saveNote = () => {
    if (!note.title.trim()) {
      setResearchStatus('Enter a title before saving a research note.')
      return
    }
    const now = new Date().toISOString()
    const experiment = experimentById.get(note.experimentId)
    const next = [{
      ...note,
      project: projectById.get(note.projectId)?.name ?? '',
      experiment: experiment?.name ?? '',
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: now.slice(0, 10),
      createdAt: now,
    }, ...notes]
    try {
      saveResearchNotes(next)
      setNotebookState({ notes: next, error: '' })
      setResearchStatus('Research note saved to this browser.')
      setNote({ title: '', projectId: '', experimentId: '', datasetId: '', observation: '', hypothesis: '', conclusion: '' })
    } catch (error) {
      setResearchStatus(`Could not save research note: ${error.message}`)
    }
  }
  const removeNote = (id) => {
    const next = notes.filter((item) => item.id !== id)
    try {
      saveResearchNotes(next)
      setNotebookState({ notes: next, error: '' })
      setResearchStatus('Research note deleted.')
    } catch (error) {
      setResearchStatus(`Could not delete research note: ${error.message}`)
    }
  }

  const importResearchArchive = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const archive = JSON.parse(await file.text())
      const imported = restoreResearchArchive(archive)
      refreshArchive()
      setArchiveStatus(`Archive merged: ${imported.experimentsAdded} experiments, ${imported.collisionsAdded} collisions, ${imported.notesAdded} notes, ${imported.projectsAdded} projects, ${imported.reportsAdded} reports, and ${imported.collectionsAdded} collections added. Existing records were kept.`)
    } catch (error) {
      setArchiveStatus(`Could not import research archive: ${error.message}`)
    } finally {
      setArchiveInputKey((key) => key + 1)
    }
  }

  const exportResearchArchive = () => {
    try {
      const archive = {
        format: 'lhc-research-archive',
        version: 2,
        exportedAt: new Date().toISOString(),
        experiments,
        collisions: savedCollisions,
        notes,
        projects,
        reports,
        collections,
      }
      download('lhc-research-archive.json', JSON.stringify(archive, null, 2), 'application/json')
      setArchiveStatus('Research archive exported. Store the downloaded file as a backup.')
    } catch (error) {
      setArchiveStatus(`Could not export research archive: ${error.message}`)
    }
  }

  const experimentColumns = [
    { label: 'EXPERIMENT ID', value: (row) => row.id },
    { label: 'EXPERIMENT NAME', value: (row) => row.name },
    { label: 'DATE', value: (row) => row.completedAt?.slice(0, 10) },
    { label: 'BEAM A', value: (row) => row.beamA },
    { label: 'BEAM B', value: (row) => row.beamB },
    { label: 'EVENTS', value: (row) => row.stats?.processed ?? row.events?.length ?? 0 },
    { label: 'STATUS', value: () => 'COMPLETED' },
  ]
  const eventColumns = [
    { label: 'EVENT ID', value: (row) => row.label },
    { label: 'EXPERIMENT', value: (row) => row.experiment },
    { label: 'SIMULATION TIME', value: (row) => `${row.time.toFixed(3)} ns` },
    { label: 'RUN / EVENT', value: (row) => row.sourceRun == null ? '—' : `${row.sourceRun} / ${row.sourceEventId}` },
    { label: 'PARTICLES', value: (row) => row.particles.length },
    { label: 'TOTAL ENERGY', value: (row) => `${row.totalEnergy.toFixed(2)} GeV` },
    { label: 'INVARIANT MASS', value: (row) => row.invariantMass == null ? '—' : `${row.invariantMass.toFixed(3)} GeV` },
    { label: 'SCORE', value: (row) => row.interestingScore ?? 'NOT SCORED' },
    { label: 'PRIORITY', value: priorityLabel },
  ]
  const savedCollisionColumns = [
    { label: 'RUN / EVENT', value: (row) => `${row.runNumber ?? '—'} / ${row.sourceEventNumber ?? row.id ?? '—'}` },
    { label: 'PRIORITY', value: (row) => `${priorityDetails[savedPriority(row)]?.marker ?? ''} ${priorityDetails[savedPriority(row)]?.label ?? savedPriority(row)}` },
    { label: 'COLLISION ENERGY', value: (row) => row.collisionEnergyGeV == null ? 'Unavailable' : `${row.collisionEnergyGeV} GeV` },
    { label: 'SOURCE TIME', value: (row) => row.sourceTimestamp ?? 'Unavailable' },
    { label: 'MASS CANDIDATE', value: (row) => row.invariantMass == null ? '—' : `${row.invariantMass.toFixed(3)} GeV` },
    { label: 'SAVED', value: (row) => row.savedAt?.replace('T', ' ').slice(0, 19) ?? '—' },
    { label: 'REVIEW', value: (row) => row.reviewedAt ? 'REVIEWED / TRAINING' : 'AUTO TAG ONLY' },
  ]
  const savedCollisionCsvColumns = [
    ...savedCollisionColumns,
    { label: 'SOURCE RECORD', value: (row) => row.sourceRecordId },
    { label: 'RECORD KEY', value: (row) => row.recordId },
    { label: 'PARTICLE TYPES', value: (row) => row.reconstructedParticleTypes?.join('; ') },
    { label: 'PARTICLES JSON', value: (row) => JSON.stringify(row.particles) },
    { label: 'MASS CANDIDATES JSON', value: (row) => JSON.stringify(row.massCandidates) },
    { label: 'MISSING PT (GeV)', value: (row) => row.missingTransverseMomentumGeV },
    { label: 'COLLISION ENERGY NOTE', value: (row) => row.collisionEnergyUnavailableReason },
    { label: 'SOURCE TIMESTAMP NOTE', value: (row) => row.sourceTimestampUnavailableReason },
    { label: 'DETECTOR QUALITY', value: (row) => JSON.stringify(row.detectorQuality) },
    { label: 'RECONSTRUCTION FLAGS', value: (row) => JSON.stringify(row.reconstructionFlags) },
    { label: 'AUTO PRIORITY REASONS', value: (row) => row.priorityReasons?.join('; ') },
    { label: 'REVIEWED PRIORITY', value: (row) => row.reviewedPriority },
    { label: 'REVIEWED AT', value: (row) => row.reviewedAt },
  ]
  const particleColumns = [
    { label: 'PARTICLE ID', value: (row) => row.id },
    { label: 'EVENT ID', value: (row) => row.sourceEventId ?? row.eventId },
    { label: 'TYPE', value: (row) => row.type },
    { label: 'ENERGY', value: (row) => `${row.energy.toFixed(3)} GeV` },
    { label: 'PT / ETA', value: (row) => row.transverseMomentum == null ? '—' : `${row.transverseMomentum.toFixed(3)} / ${row.pseudorapidity.toFixed(3)}` },
    { label: 'CMS TRACK', value: (row) => row.muonTrackType ?? detectorLayers.find((layer) => row.lifetime / 5 >= layer.radius * .86)?.label ?? 'No layer hit' },
    { label: 'STATUS', value: (row) => row.eventMode === 'DATA_INFORMED_SIMULATION' ? 'SIMULATED RECONSTRUCTION' : row.isDetected ? 'RECORDED IN CMS' : row.detectionProbability >= .65 ? 'SIM DETECTED' : 'BELOW THRESHOLD' },
  ]

  return <div className="data-page">
    <div className="data-header">
      <div><span className="section-kicker">DATA / CENTRAL ARCHIVE</span><h3>Data Management</h3><p>Saved collisions, reviewed labels, completed experiments, and the live simulator stream.</p></div>
      <button className="data-refresh" onClick={refreshArchive}>↻ REFRESH ARCHIVE</button>
    </div>
    {archiveError && <p className="archive-error" role="alert">{archiveError}</p>}

    <section className="data-section">
      <div className="data-section-header"><div><span className="section-kicker">01 / SAVED COLLISIONS</span><h4>Collision Archive / {savedCollisions.length} saved</h4></div><div className="data-tools"><select aria-label="Select event collection" value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)}><option value="">SELECT COLLECTION</option>{collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select><input placeholder="Search run or event..." value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} /></div></div>
      {researchStatus && <p className="research-status" role="status">{researchStatus}</p>}
      {researchRecords.error && <p className="archive-error" role="alert">{researchRecords.error}</p>}
      <p className="archive-note">Auto tags are rule-based, not verified physics discoveries. Only reviewed labels are included in local ranking. Missing source measurements remain unavailable.</p>
      <div className="data-table">
        <div className="data-row data-head">{savedCollisionColumns.map((column) => <span key={column.label}>{column.label}</span>)}<span>COLLECTION</span></div>
        {visibleSavedCollisions.map((event) => <div className="data-row" key={event.recordId}>
          {savedCollisionColumns.map((column) => <span className={column.label === 'PRIORITY' ? `priority-text priority-${savedPriority(event).toLowerCase()}` : ''} key={column.label}>{column.value(event)}</span>)}
          <span><button onClick={() => addEventToCollection(event.recordId)}>ADD</button></span>
        </div>)}
        {!visibleSavedCollisions.length && <div className="data-empty">No saved collisions match the search. Save an event from Event Display to archive it.</div>}
      </div>
    </section>

    <section className="data-section">
      <div className="data-section-header"><div><span className="section-kicker">02 / EXPERIMENT DATABASE</span><h4>Completed Experiments</h4></div><div className="data-tools"><input placeholder="Search experiments..." value={query} onChange={(event) => setQuery(event.target.value)} /><select value={sortKey} onChange={(event) => setSortKey(event.target.value)}><option value="date">SORT DATE</option><option value="name">SORT NAME</option></select><button onClick={() => setSortDirection((value) => value === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑' : '↓'}</button></div></div>
      <div className="data-table"><div className="data-row data-head">{experimentColumns.map((column) => <span key={column.label}>{column.label}</span>)}<span>ACTIONS</span></div>{visibleExperiments.map((experiment) => <div className="data-row" key={experiment.id}>{experimentColumns.map((column) => <span key={column.label}>{column.value(experiment)}</span>)}<span><button onClick={() => window.dispatchEvent(new CustomEvent('open-experiments'))}>OPEN</button><button className="danger" onClick={() => { deleteCompletedExperiment(experiment.id); refreshArchive() }}>DELETE</button></span></div>)}{!visibleExperiments.length && <div className="data-empty">No completed experiments in persistent storage.</div>}</div>
    </section>

    <section className="data-section">
      <div className="data-section-header"><div><span className="section-kicker">03 / EVENT DATABASE</span><h4>Collision Events</h4></div><input placeholder="Search Event ID..." value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} /></div>
      <div className="data-table"><div className="data-row data-head">{eventColumns.map((column) => <span key={column.label}>{column.label}</span>)}</div>{visibleEvents.slice().reverse().map((event) => <button className="data-row data-button" key={`${event.experiment}-${event.id}`} onClick={() => window.dispatchEvent(new CustomEvent('open-event-display', { detail: event.id }))}>{eventColumns.map((column) => <span className={column.label === 'PRIORITY' ? `priority-text priority-${classifyCollisionPriority(event).priority.toLowerCase()}` : ''} key={column.label}>{column.value(event)}</span>)}</button>)}{!visibleEvents.length && <div className="data-empty">No event records match the search.</div>}</div>
    </section>

    <section className="data-section">
      <div className="data-section-header"><div><span className="section-kicker">04 / PARTICLE DATABASE</span><h4>Detected Particles</h4></div><select value={particleType} onChange={(event) => setParticleType(event.target.value)}><option>ALL</option>{[...new Set(particles.map((particle) => particle.type))].map((type) => <option key={type}>{type}</option>)}</select></div>
      <div className="data-table"><div className="data-row data-head">{particleColumns.map((column) => <span key={column.label}>{column.label}</span>)}</div>{particles.filter((particle) => particle.detectionProbability >= .65).slice(-60).map((particle) => <div className="data-row" key={`${particle.eventId}-${particle.id}`}>{particleColumns.map((column) => <span key={column.label}>{column.value(particle)}</span>)}</div>)}</div>
    </section>

    <section className="data-section notebook-section">
      <div className="data-section-header"><div><span className="section-kicker">05 / RESEARCH NOTEBOOK</span><h4>Lab Notes</h4></div><button className="data-save" onClick={saveNote}>SAVE NOTE</button></div>
      {notebookState.error && <p className="archive-error" role="alert">{notebookState.error}</p>}
      {researchStatus && <p className="research-status" role="status">{researchStatus}</p>}
      <div className="research-project-create"><input placeholder="New research project name" value={projectName} onChange={(event) => setProjectName(event.target.value)} /><button onClick={createProject}>CREATE PROJECT</button></div>
      <div className="note-form">
        <input placeholder="Title" value={note.title} onChange={(event) => setNote({ ...note, title: event.target.value })} />
        <select aria-label="Link research project" value={note.projectId} onChange={(event) => setNote({ ...note, projectId: event.target.value })}>
          <option value="">No linked project</option>
          {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
        </select>
        <select aria-label="Link experiment" value={note.experimentId} onChange={(event) => setNote({ ...note, experimentId: event.target.value })}>
          <option value="">No linked experiment</option>
          {experiments.map((experiment) => <option value={experiment.id} key={experiment.id}>{experiment.name}</option>)}
        </select>
        <select aria-label="Link dataset" value={note.datasetId} onChange={(event) => setNote({ ...note, datasetId: event.target.value })}>
          <option value="">No linked dataset</option>
          {datasetOptions.map((dataset) => <option value={dataset.id} key={dataset.id}>{dataset.name}</option>)}
        </select>
        <textarea placeholder="Observation" value={note.observation} onChange={(event) => setNote({ ...note, observation: event.target.value })} />
        <textarea placeholder="Hypothesis" value={note.hypothesis} onChange={(event) => setNote({ ...note, hypothesis: event.target.value })} />
        <textarea placeholder="Conclusion" value={note.conclusion} onChange={(event) => setNote({ ...note, conclusion: event.target.value })} />
      </div>
      {notes.map((item) => (
        <article className="note-row" key={item.id}>
          <div><b>{item.title}</b><span>{item.date} / {item.project || projectById.get(item.projectId)?.name || 'NO PROJECT'}</span><span>{item.experiment || experimentById.get(item.experimentId)?.name || 'UNASSIGNED EXPERIMENT'}</span>
            {item.datasetId && <span>DATASET / {datasetById.get(item.datasetId)?.name ?? item.datasetId}</span>}
          </div>
          <p><strong>OBS</strong> {item.observation} <strong>HYP</strong> {item.hypothesis} <strong>CON</strong> {item.conclusion}</p>
          <button onClick={() => removeNote(item.id)}>DELETE</button>
        </article>
      ))}
    </section>

    <section className="data-section research-history">
      <div className="data-section-header"><div><span className="section-kicker">06 / CONTINUOUS RESEARCH HISTORY</span><h4>Experiments, datasets, and notes</h4></div></div>
      <div className="research-collections">
        <label>NEW EVENT COLLECTION<input placeholder="Collection name" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} /></label>
        <button onClick={createCollection}>CREATE COLLECTION</button>
        {collections.map((collection) => <article key={collection.id}>
          <strong>{collection.name}</strong><span>{collection.eventIds.length} saved events · {new Date(collection.createdAt).toLocaleDateString()}</span>
          <div>{collection.eventIds.map((id) => {
            const event = savedCollisions.find((record) => record.recordId === id)
            return <span key={id}>{event ? `${event.runNumber ?? '—'} / ${event.sourceEventNumber ?? event.id}` : id}</span>
          })}</div>
        </article>)}
        {!collections.length && <p>No event collections yet. Create one, select it above, and add saved events.</p>}
      </div>
      <div className="research-reports">
        <h5>Saved analysis reports / {reports.length}</h5>
        {reports.map((report) => <article key={report.id}><strong>{report.title}</strong><span>{new Date(report.createdAt).toLocaleString()} · {report.datasetName ?? report.datasetId ?? 'no dataset'}</span><small>{report.summary}</small></article>)}
        {!reports.length && <p>No saved analysis reports yet. Save results from the Analysis page.</p>}
      </div>
      <div className="research-datasets">
        {datasetOptions.map((dataset) => <div key={dataset.id}><span>DATASET</span><strong>{dataset.name}</strong><small>{dataset.id}</small></div>)}
      </div>
      <div className="research-timeline">
        {researchTimeline.map((item) => <article key={item.id}>
          <time>{item.date ? new Date(item.date).toLocaleString() : 'DATE NOT RECORDED'}</time>
          <span>{item.type}</span><strong>{item.title}</strong>
          {item.projectId && <small>PROJECT / {projectById.get(item.projectId)?.name ?? item.projectId}</small>}
          {item.experimentId && <small>EXPERIMENT / {experimentById.get(item.experimentId)?.name ?? item.experimentId}</small>}
          {item.datasetId && <small>DATASET / {datasetById.get(item.datasetId)?.name ?? item.datasetId}</small>}
        </article>)}
        {!researchTimeline.length && <div className="data-empty">Complete an experiment or save a linked research note to begin the timeline.</div>}
      </div>
    </section>

    <section className="data-export"><div><span className="section-kicker">EXPORT / DATA PRODUCTS</span><h4>Export Data</h4><p>Browser storage is device-specific. Keep a research archive backup to move or restore records.</p>{archiveStatus && <p className="research-status" role="status">{archiveStatus}</p>}</div><div>
      <button onClick={exportResearchArchive}>EXPORT COMPLETE RESEARCH ARCHIVE JSON</button>
      <label className="research-import">IMPORT / MERGE RESEARCH ARCHIVE JSON<input key={archiveInputKey} type="file" accept="application/json,.json" onChange={importResearchArchive} /></label>
      <button onClick={() => download('saved-collisions.json', JSON.stringify(savedCollisions, null, 2), 'application/json')}>EXPORT SAVED COLLISIONS JSON</button>
      <button onClick={() => download('saved-collisions.csv', toCsv(savedCollisions, savedCollisionCsvColumns))}>EXPORT SAVED COLLISIONS CSV</button>
      <button onClick={() => download('experiments.json', JSON.stringify(experiments, null, 2), 'application/json')}>EXPORT EXPERIMENT JSON</button>
      <button onClick={() => download('experiments.csv', toCsv(experiments, experimentColumns))}>EXPORT EXPERIMENT CSV</button>
      <button onClick={() => download('events.csv', toCsv(allEvents, eventColumns))}>EXPORT EVENT DATA CSV</button>
      <button onClick={() => download('particles.csv', toCsv(particles, particleColumns))}>EXPORT PARTICLE DATA CSV</button>
    </div></section>
  </div>
}
