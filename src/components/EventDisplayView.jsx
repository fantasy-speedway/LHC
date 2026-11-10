import { useEffect, useMemo, useState } from 'react'
import { buildDetectorResponse } from '../detector/model'
import { classifyCollisionPriority, collisionPriorities, priorityDetails, rankAgainstReviewedEvents } from '../collision/classification'
import { getCollisionRecordId, loadSavedCollisionEvents, reviewSavedCollision, saveCollisionEvent } from '../collision/storage'
import DetectorCanvas from './DetectorCanvas'
import './event-display.css'

const defaultDisplay = { showTracks: true, showEnergy: true, showLabels: true, showLayers: true, showParticleIds: true }

function directionLabel(radians) {
  return `${Math.round((radians * 180) / Math.PI)}°`
}

function readSavedCollisionArchive() {
  try {
    return { events: loadSavedCollisionEvents(), error: '' }
  } catch (error) {
    return { events: [], error: `Could not read the saved collision archive: ${error.message}` }
  }
}

export default function EventDisplayView({ simulation, initialEventId = null }) {
  const [eventId, setEventId] = useState(initialEventId)
  const [cleared, setCleared] = useState(false)
  const [selectedParticleId, setSelectedParticleId] = useState(null)
  const [display, setDisplay] = useState(defaultDisplay)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [animationTime, setAnimationTime] = useState(2.6)
  const [playing, setPlaying] = useState(false)
  const [playbackRun, setPlaybackRun] = useState(0)
  const [query, setQuery] = useState('')
  const [savedArchive, setSavedArchive] = useState(readSavedCollisionArchive)
  const [reviewSelection, setReviewSelection] = useState(null)
  const savedEvents = savedArchive.events
  const saveError = savedArchive.error
  const currentEvent = cleared ? null : simulation.eventHistory.find((event) => event.id === eventId) ?? simulation.latestCollision
  const response = useMemo(() => buildDetectorResponse(currentEvent), [currentEvent])
  const classification = useMemo(() => classifyCollisionPriority(currentEvent), [currentEvent])
  const pairKinematics = useMemo(() => {
    const muons = currentEvent?.particles.filter((particle) => particle.type === 'Muon') ?? []
    if (muons.length !== 2) return { muons, transverseMomentum: null, deltaPhi: null, deltaR: null }

    const [first, second] = muons
    const componentsAvailable = [first.px, first.py, second.px, second.py].every(Number.isFinite)
    let deltaPhi = null
    let deltaR = null
    if (Number.isFinite(first.direction) && Number.isFinite(second.direction)) {
      deltaPhi = Math.abs(first.direction - second.direction)
      if (deltaPhi > Math.PI) deltaPhi = 2 * Math.PI - deltaPhi
      if (Number.isFinite(first.pseudorapidity) && Number.isFinite(second.pseudorapidity)) {
        deltaR = Math.hypot(first.pseudorapidity - second.pseudorapidity, deltaPhi)
      }
    }

    return {
      muons,
      transverseMomentum: componentsAvailable
        ? Math.hypot(first.px + second.px, first.py + second.py)
        : null,
      deltaPhi,
      deltaR,
    }
  }, [currentEvent])
  const learnedRanking = useMemo(() => rankAgainstReviewedEvents(currentEvent, savedEvents), [currentEvent, savedEvents])
  const savedRecord = currentEvent ? savedEvents.find((record) => record.recordId === getCollisionRecordId(currentEvent)) : null
  const reviewedCountSummary = Object.entries(learnedRanking.counts).map(([priority, count]) => `${priority}: ${count}`).join(' · ')
  const provisionalLabelSummary = learnedRanking.provisionalLabels?.length ? ` · provisional (<2 examples): ${learnedRanking.provisionalLabels.join(', ')}` : ''
  const selectedReviewPriority = reviewSelection && reviewSelection.recordId === savedRecord?.recordId
    ? reviewSelection.priority
    : savedRecord?.reviewedPriority ?? savedRecord?.priority ?? ''
  const eventIndex = currentEvent ? simulation.eventHistory.findIndex((event) => event.id === currentEvent.id) : -1
  const selectedParticle = currentEvent?.particles.find((particle) => particle.id === selectedParticleId)
  const detectedLayers = selectedParticle
    ? response.filter((layer) => layer.hits.some((hit) => hit.id === selectedParticle.id)).map((layer) => layer.label).join(' · ')
      || (currentEvent?.dataOrigin === 'CERN Open Data' ? 'Not included in source CSV' : 'No layer hit')
    : 'Select a track to inspect'

  const selectEvent = (id) => {
    setCleared(false)
    setEventId(id)
    setSelectedParticleId(null)
    setAnimationTime(0)
    setPlaying(false)
  }
  const previous = () => { if (eventIndex > 0) selectEvent(simulation.eventHistory[eventIndex - 1].id) }
  const next = () => { if (eventIndex >= 0 && eventIndex < simulation.eventHistory.length - 1) selectEvent(simulation.eventHistory[eventIndex + 1].id) }
  const play = () => {
    if (!currentEvent) return
    setAnimationTime(0)
    setPlaybackRun((run) => run + 1)
    setPlaying(true)
  }
  const replay = play
  const random = () => {
    if (simulation.eventHistory.length) {
      selectEvent(simulation.eventHistory[Math.floor(Math.random() * simulation.eventHistory.length)].id)
    }
  }
  const clear = () => {
    setCleared(true)
    setEventId(null)
    setSelectedParticleId(null)
    setPlaying(false)
    setAnimationTime(0)
  }
  const refreshSavedEvents = () => {
    setSavedArchive(readSavedCollisionArchive())
  }
  const saveEvent = () => {
    if (!currentEvent) return
    try {
      saveCollisionEvent(currentEvent)
      refreshSavedEvents()
    } catch (error) {
      setSavedArchive((archive) => ({ ...archive, error: `Could not save this collision: ${error.message}` }))
    }
  }
  const reviewEvent = () => {
    if (!savedRecord || !selectedReviewPriority) return
    try {
      reviewSavedCollision(savedRecord.recordId, selectedReviewPriority)
      setReviewSelection(null)
      refreshSavedEvents()
    } catch (error) {
      setSavedArchive((archive) => ({ ...archive, error: `Could not save the reviewed label: ${error.message}` }))
    }
  }
  const toggle = (key) => setDisplay((current) => ({ ...current, [key]: !current[key] }))

  useEffect(() => {
    if (!playing) return undefined
    let frame
    let startedAt
    const tick = (timestamp) => {
      if (startedAt === undefined) startedAt = timestamp
      const elapsed = Math.min(2.6, (timestamp - startedAt) / 1000)
      setAnimationTime(elapsed)
      if (elapsed >= 2.6) {
        setPlaying(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playbackRun, playing])

  const filteredHistory = simulation.eventHistory.slice().reverse().filter((event) =>
    `${event.label} ${event.sourceParticle} ${event.particles.map((particle) => particle.type).join(' ')}`
      .toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="event-display-view">
      <div className="event-display-toolbar">
        <div><span className="section-kicker">EVENT DISPLAY / PROVENANCE REVIEW</span><h3>Recorded and Data-Informed Events</h3></div>
        <div className="event-display-actions">
          <button className="save-event" onClick={saveEvent} disabled={!currentEvent}>{savedRecord ? '✓ SAVED' : '⇩ SAVE EVENT'}</button>
          <span>{currentEvent?.label ?? 'NO EVENT LOADED'}</span>
        </div>
      </div>
      {currentEvent && <div className="priority-review-panel">
        <div className={`priority-summary priority-${classification.priority.toLowerCase()}`}>
          {classification.priority !== collisionPriorities.UNMARKED && <span className="priority-triangle" aria-hidden="true">▲</span>}
          <div><strong>{priorityDetails[classification.priority].label}</strong><span>{classification.reasons.join(' ')}</span></div>
        </div>
        {savedRecord ? <div className="review-controls">
          <label htmlFor="review-priority">Reviewed label</label>
          <select id="review-priority" value={selectedReviewPriority} onChange={(event) => setReviewSelection({ recordId: savedRecord.recordId, priority: event.target.value })}>
            {Object.values(collisionPriorities).map((priority) => <option value={priority} key={priority}>{priorityDetails[priority].label}</option>)}
          </select>
          <button onClick={reviewEvent}>{savedRecord.reviewedAt ? 'UPDATE REVIEW' : 'CONFIRM / TRAIN LABEL'}</button>
          <span>{savedRecord.reviewedAt ? 'REVIEWED · INCLUDED IN LOCAL RANKING' : 'AUTO TAG ONLY · NOT USED FOR TRAINING'}</span>
        </div> : <p className="review-hint">Save this event to confirm or correct its tag. Only reviewed labels train the local ranking model.</p>}
        {learnedRanking.ready
          ? <p className="learned-ranking">REVIEWED-EVENT MATCH: <strong>{priorityDetails[learnedRanking.match.priority].label}</strong> · similarity {learnedRanking.match.similarity.toFixed(2)} · nearest measured-feature profile · reviewed examples: {reviewedCountSummary}{provisionalLabelSummary}</p>
          : <p className="learned-ranking">{learnedRanking.message}{reviewedCountSummary && ` Reviewed examples: ${reviewedCountSummary}.`}</p>}
        {saveError && <p className="archive-error" role="alert">{saveError}</p>}
      </div>}
      <div className="event-display-grid">
        <div className="event-visual-column">
          <div className="event-display-stage">
            <DetectorCanvas
              event={currentEvent}
              response={response}
              display={display}
              rotation={rotation}
              zoom={zoom}
              animationTime={animationTime}
              selectedParticleId={selectedParticleId}
              onParticleSelect={setSelectedParticleId}
            />
            <div className="event-display-controls">
              <button onClick={previous} disabled={eventIndex <= 0} title="Previous event" aria-label="Previous event">◀</button>
              <button onClick={next} disabled={eventIndex < 0 || eventIndex >= simulation.eventHistory.length - 1} title="Next event" aria-label="Next event">▶</button>
              <button onClick={play} disabled={!currentEvent || playing} title="Play event" aria-label="Play event">▶ PLAY</button>
              <button onClick={() => setPlaying(false)} disabled={!playing} title="Pause event" aria-label="Pause event">Ⅱ PAUSE</button>
              <button onClick={replay} disabled={!currentEvent} title="Replay event" aria-label="Replay event">↻ REPLAY</button>
              <button onClick={random} disabled={!simulation.eventHistory.length} title="Load a random event" aria-label="Random event">⤨ RANDOM</button>
              <button onClick={clear} title="Clear event display" aria-label="Clear event">× CLEAR</button>
            </div>
          </div>
          <div className="event-display-options">
            {Object.entries({ showTracks: 'TRACKS', showEnergy: 'ENERGY', showLabels: 'LABELS', showLayers: 'LAYERS', showParticleIds: 'PARTICLE IDS' }).map(([key, label]) => (
              <label key={key}><input type="checkbox" checked={display[key]} onChange={() => toggle(key)} />{label}</label>
            ))}
            <button onClick={() => setRotation((value) => value + .12)} title="Rotate event view" aria-label="Rotate event view">↷ ROTATE</button>
            <button onClick={() => setZoom((value) => Math.min(1.6, value + .1))} title="Zoom event view" aria-label="Zoom event view">+ ZOOM</button>
            <button onClick={() => { setRotation(0); setZoom(1) }} title="Reset event view" aria-label="Reset event view">⌂ RESET VIEW</button>
          </div>
          {currentEvent && (
            <div className="event-particle-strip">
              <span>MUON TRACKS / SELECT TO INSPECT</span>
              <div>{currentEvent.particles.map((particle) => (
                <button className={selectedParticleId === particle.id ? 'selected' : ''} onClick={() => setSelectedParticleId(particle.id)} key={particle.id}>
                  {particle.type} <small>{particle.id}</small>
                </button>
              ))}</div>
            </div>
          )}
        </div>
        <aside className="event-inspector">
          <div className="section-heading">PARTICLE INSPECTOR <span>{selectedParticle ? 'SELECTED' : 'IDLE'}</span></div>
          {selectedParticle ? (
            <div className="particle-details">
              <h4>{selectedParticle.type}</h4>
              <span className="particle-id">TRACK {selectedParticle.id}</span>
              <dl>
                <dt>CHARGE</dt><dd>{selectedParticle.charge > 0 ? `+${selectedParticle.charge}` : selectedParticle.charge}</dd>
                <dt>ENERGY</dt><dd>{selectedParticle.energy.toFixed(3)} GeV</dd>
                <dt>DIRECTION</dt><dd>{directionLabel(selectedParticle.direction)}</dd>
                <dt>MOMENTUM</dt><dd>{selectedParticle.momentum.toFixed(3)} GeV/c</dd>
                {[selectedParticle.px, selectedParticle.py, selectedParticle.pz].every(Number.isFinite) && <>
                  <dt>MOMENTUM COMPONENTS</dt><dd>px {selectedParticle.px.toFixed(3)} · py {selectedParticle.py.toFixed(3)} · pz {selectedParticle.pz.toFixed(3)} GeV/c</dd>
                  <dt>TRANSVERSE MOMENTUM</dt><dd>{selectedParticle.transverseMomentum.toFixed(3)} GeV/c</dd>
                  <dt>PSEUDORAPIDITY</dt><dd>{selectedParticle.pseudorapidity.toFixed(5)}</dd>
                </>}
                {selectedParticle.muonTrackType && <><dt>TRACK TYPE</dt><dd>CMS {selectedParticle.muonTrackType}</dd></>}
                <dt>LIFETIME</dt><dd>{selectedParticle.lifetime == null ? 'Not in source CSV' : `${selectedParticle.lifetime.toFixed(2)} ns`}</dd>
                <dt>DETECTOR RESPONSE</dt><dd>{detectedLayers}</dd>
              </dl>
            </div>
          ) : <div className="inspector-empty">Select a measured muon track to inspect its kinematics.</div>}
          <div className="event-summary-card">
            <span>EVENT</span><strong>{currentEvent?.label ?? '—'}</strong>
            {currentEvent?.dataOrigin === 'CERN Open Data' && <>
              <span>RECORDED INVARIANT MASS</span><strong>{currentEvent.invariantMass.toFixed(3)} GeV</strong>
              <span>SOURCE RUN / EVENT</span><strong>{currentEvent.sourceRun} / {currentEvent.sourceEventId}</strong>
              <span>COLLISION ENERGY</span><strong>Unavailable in bundled CSV</strong>
              <span>SOURCE TIMESTAMP</span><strong>Unavailable in bundled CSV</strong>
            </>}
            {currentEvent?.eventMode === 'DATA_INFORMED_SIMULATION' && <>
              <span>EVENT TYPE</span><strong>DATA-INFORMED SIMULATION · NOT A RECORDED COLLISION</strong>
              <span>RESAMPLED CMS TEMPLATE</span><strong>RUN {currentEvent.templateSource.runNumber} / EVENT {currentEvent.templateSource.eventNumber}</strong>
              <span>RECONSTRUCTED M(μμ)</span><strong>{currentEvent.invariantMass == null ? 'Unavailable' : `${currentEvent.invariantMass.toFixed(3)} GeV`}</strong>
              <span>RECORDED TEMPLATE MASS</span><strong>{currentEvent.templateInvariantMassGeV.toFixed(3)} GeV</strong>
              <span>BEAM ENERGY</span><strong>{currentEvent.simulatedCollisionContext.centerOfMassEnergyGeV == null ? 'Unavailable' : `${(currentEvent.simulatedCollisionContext.centerOfMassEnergyGeV / 1000).toFixed(3)} TeV modeled √s; template momenta not rescaled`}</strong>
            </>}
            <span>SIMULATION TIMESTAMP</span><strong>{currentEvent ? `${currentEvent.time.toFixed(3)} ns` : '—'}</strong>
            <span>MODEL SCORE</span><strong className="score">{currentEvent?.interestingScore == null ? 'NOT IN SOURCE DATA' : `${currentEvent.interestingScore}/100`}</strong>
          </div>
          {currentEvent && <section className="event-kinematics-card" aria-label="Event-level kinematics">
            <h4>Event-level details</h4>
            <p>{currentEvent.eventMode === 'RECORDED_CERN'
              ? 'Recorded CMS reconstructed-track quantities.'
              : 'Calculated from the resampled muon tracks; not a new CERN measurement.'}</p>
            <div className="event-kinematics-metrics">
              <span>MUON CANDIDATES<strong>{pairKinematics.muons.length}</strong></span>
              <span>PAIR pT<strong>{pairKinematics.transverseMomentum == null ? 'Unavailable' : `${pairKinematics.transverseMomentum.toFixed(3)} GeV/c`}</strong></span>
              <span>Δφ<strong>{pairKinematics.deltaPhi == null ? 'Unavailable' : `${pairKinematics.deltaPhi.toFixed(4)} rad`}</strong></span>
              <span>ΔR<strong>{pairKinematics.deltaR == null ? 'Unavailable' : pairKinematics.deltaR.toFixed(4)}</strong></span>
              <span>{currentEvent.eventMode === 'DATA_INFORMED_SIMULATION' ? 'MODELED MUON-ONLY IMBALANCE' : 'RECORDED MISSING pT'}<strong>{currentEvent.eventMode === 'DATA_INFORMED_SIMULATION' && Number.isFinite(currentEvent.missingTransverseMomentumGeV) ? `${currentEvent.missingTransverseMomentumGeV.toFixed(3)} GeV/c` : 'Not in source data'}</strong></span>
              <span>VERTEX<strong>{currentEvent.reconstructedVertex?.available ? 'Modeled track fit' : 'Unavailable'}</strong></span>
            </div>
            {pairKinematics.muons.length > 0 && <div className="event-muon-summary">
              {pairKinematics.muons.map((muon, index) => (
                <span key={muon.id}>MUON {index + 1} · Q {muon.charge > 0 ? `+${muon.charge}` : muon.charge} · pT {Number.isFinite(muon.transverseMomentum) ? `${muon.transverseMomentum.toFixed(3)} GeV/c` : 'unavailable'} · η {Number.isFinite(muon.pseudorapidity) ? muon.pseudorapidity.toFixed(4) : 'unavailable'}</span>
              ))}
            </div>}
            <small>Pair pT is the vector sum of the displayed muon transverse momenta. It is not full-event missing transverse momentum.</small>
          </section>}
        </aside>
      </div>
      <div className="event-history-panel">
        <div className="history-panel-header">
          <div><span className="section-kicker">ARCHIVE / COLLISION RECORDS</span><h4>Event History</h4><p>{simulation.collisions} total collisions · latest {simulation.eventHistory.length} retained in this browser</p></div>
          <input value={query} onChange={(input) => setQuery(input.target.value)} placeholder="Search events, particles..." aria-label="Search events" />
        </div>
        <div className="event-history-table">
          <div className="event-table-head"><span>EVENT ID</span><span>TIME</span><span>PARTICLES</span><span>INVARIANT MASS</span><span>PRIORITY</span></div>
          {filteredHistory.length ? filteredHistory.map((historyEvent) => (
            <button className={currentEvent?.id === historyEvent.id ? 'event-table-row active' : 'event-table-row'} onClick={() => selectEvent(historyEvent.id)} key={historyEvent.id}>
              <b>{historyEvent.label}</b>
              <span>{historyEvent.time.toFixed(3)} ns</span>
              <span>{historyEvent.particles.length} muons</span>
              <span>{historyEvent.invariantMass == null ? '—' : `${historyEvent.invariantMass.toFixed(3)} GeV`}</span>
              <strong className={`priority-text priority-${classifyCollisionPriority(historyEvent).priority.toLowerCase()}`}>
                {classifyCollisionPriority(historyEvent).priority === collisionPriorities.UNMARKED ? '—' : `${priorityDetails[classifyCollisionPriority(historyEvent).priority].marker} ${priorityDetails[classifyCollisionPriority(historyEvent).priority].label}`}
              </strong>
            </button>
          )) : <div className="history-empty">No events match the current search.</div>}
        </div>
      </div>
    </div>
  )
}
