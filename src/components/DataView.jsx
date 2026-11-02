import { useMemo, useState } from 'react'
import { loadCompletedExperiments, deleteCompletedExperiment } from '../experiments/storage'
import { detectorLayers } from '../detector/model'
import { classifyCollisionPriority, priorityDetails } from '../collision/classification'
import { loadSavedCollisionEvents } from '../collision/storage'
import '../data/data-view.css'

const notesKey = 'lhc-research-notebook'
const readNotes = () => { try { return JSON.parse(localStorage.getItem(notesKey) ?? '[]') } catch { return [] } }
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
  const [note, setNote] = useState({ title: '', experiment: '', observation: '', hypothesis: '', conclusion: '' })
  const [notes, setNotes] = useState(readNotes)

  const allEvents = useMemo(() => {
    const uniqueEvents = [
      ...simulation.eventHistory.map((event) => ({ ...event, experiment: 'CURRENT RUN / CERN REFERENCES' })),
      ...experiments.flatMap((experiment) => (experiment.events ?? []).map((event) => ({ ...event, experiment: experiment.name }))),
    ].reduce((map, event) => map.set(`${event.experiment}-${event.id}`, event), new Map())
    return [...uniqueEvents.values()]
  }, [experiments, simulation.eventHistory])
  const particles = allEvents
    .flatMap((event) => event.particles.map((particle) => ({
      ...particle,
      eventId: event.label,
      experiment: event.experiment,
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

  const refreshArchive = () => {
    setExperiments(loadCompletedExperiments())
    try {
      setSavedArchive({ collisions: loadSavedCollisionEvents(), error: '' })
    } catch (error) {
      setSavedArchive({ collisions: [], error: `Could not read the saved collision archive: ${error.message}` })
    }
  }

  const saveNote = () => {
    if (!note.title.trim()) return
    const next = [{ ...note, id: Date.now(), date: new Date().toISOString().slice(0, 10) }, ...notes]
    localStorage.setItem(notesKey, JSON.stringify(next))
    setNotes(next)
    setNote({ title: '', experiment: '', observation: '', hypothesis: '', conclusion: '' })
  }
  const removeNote = (id) => {
    const next = notes.filter((item) => item.id !== id)
    localStorage.setItem(notesKey, JSON.stringify(next))
    setNotes(next)
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
    { label: 'STATUS', value: (row) => row.isDetected ? 'RECORDED IN CMS' : row.detectionProbability >= .65 ? 'SIM DETECTED' : 'BELOW THRESHOLD' },
  ]

  return <div className="data-page">
    <div className="data-header">
      <div><span className="section-kicker">DATA / CENTRAL ARCHIVE</span><h3>Data Management</h3><p>Saved collisions, reviewed labels, completed experiments, and the live simulator stream.</p></div>
      <button className="data-refresh" onClick={refreshArchive}>↻ REFRESH ARCHIVE</button>
    </div>
    {archiveError && <p className="archive-error" role="alert">{archiveError}</p>}

    <section className="data-section">
      <div className="data-section-header"><div><span className="section-kicker">01 / SAVED COLLISIONS</span><h4>Collision Archive / {savedCollisions.length} saved</h4></div><input placeholder="Search run or event..." value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} /></div>
      <p className="archive-note">Auto tags are rule-based, not verified physics discoveries. Only reviewed labels are included in local ranking. Missing source measurements remain unavailable.</p>
      <div className="data-table">
        <div className="data-row data-head">{savedCollisionColumns.map((column) => <span key={column.label}>{column.label}</span>)}</div>
        {visibleSavedCollisions.map((event) => <div className="data-row" key={event.recordId}>
          {savedCollisionColumns.map((column) => <span className={column.label === 'PRIORITY' ? `priority-text priority-${savedPriority(event).toLowerCase()}` : ''} key={column.label}>{column.value(event)}</span>)}
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
      <div className="note-form"><input placeholder="Title" value={note.title} onChange={(event) => setNote({ ...note, title: event.target.value })} /><input placeholder="Experiment" value={note.experiment} onChange={(event) => setNote({ ...note, experiment: event.target.value })} /><textarea placeholder="Observation" value={note.observation} onChange={(event) => setNote({ ...note, observation: event.target.value })} /><textarea placeholder="Hypothesis" value={note.hypothesis} onChange={(event) => setNote({ ...note, hypothesis: event.target.value })} /><textarea placeholder="Conclusion" value={note.conclusion} onChange={(event) => setNote({ ...note, conclusion: event.target.value })} /></div>
      {notes.map((item) => <article className="note-row" key={item.id}><div><b>{item.title}</b><span>{item.date} / {item.experiment || 'UNASSIGNED'}</span></div><p><strong>OBS</strong> {item.observation} <strong>HYP</strong> {item.hypothesis} <strong>CON</strong> {item.conclusion}</p><button onClick={() => removeNote(item.id)}>DELETE</button></article>)}
    </section>

    <section className="data-export"><div><span className="section-kicker">EXPORT / DATA PRODUCTS</span><h4>Export Data</h4></div><div>
      <button onClick={() => download('saved-collisions.json', JSON.stringify(savedCollisions, null, 2), 'application/json')}>EXPORT SAVED COLLISIONS JSON</button>
      <button onClick={() => download('saved-collisions.csv', toCsv(savedCollisions, savedCollisionCsvColumns))}>EXPORT SAVED COLLISIONS CSV</button>
      <button onClick={() => download('experiments.json', JSON.stringify(experiments, null, 2), 'application/json')}>EXPORT EXPERIMENT JSON</button>
      <button onClick={() => download('experiments.csv', toCsv(experiments, experimentColumns))}>EXPORT EXPERIMENT CSV</button>
      <button onClick={() => download('events.csv', toCsv(allEvents, eventColumns))}>EXPORT EVENT DATA CSV</button>
      <button onClick={() => download('particles.csv', toCsv(particles, particleColumns))}>EXPORT PARTICLE DATA CSV</button>
    </div></section>
  </div>
}
