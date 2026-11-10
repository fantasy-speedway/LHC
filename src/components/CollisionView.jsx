import { useEffect, useMemo, useState } from 'react'
import { buildDetectorResponse } from '../detector/model'
import DetectorCanvas from './DetectorCanvas'
import '../collision/collision-view.css'

function formatDirection(direction) {
  return `${Math.round((direction * 180) / Math.PI)}°`
}

function getEventDuration(event) {
  if (!event) return 0
  if (event.dataOrigin === 'CERN Open Data' || event.eventMode === 'DATA_INFORMED_SIMULATION') return 2.6
  const lifetimes = event.particles.map((particle) => particle.lifetime).filter(Number.isFinite)
  return Math.min(2.6, Math.max(.8, Math.max(...lifetimes, 0) * .52))
}

export default function CollisionView({ simulation }) {
  const [eventId, setEventId] = useState(null)
  const [selectedParticleId, setSelectedParticleId] = useState(null)
  const [playing, setPlaying] = useState(true)
  const [animationTime, setAnimationTime] = useState(2.6)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const event = simulation.eventHistory.find((item) => item.id === eventId) ?? simulation.latestCollision
  const response = useMemo(() => buildDetectorResponse(event), [event])
  const duration = getEventDuration(event)
  const selectedParticle = event?.particles.find((particle) => particle.id === selectedParticleId)
  const detectedParticles = event?.particles.filter((particle) => particle.isDetected ?? particle.detectionProbability >= .65) ?? []
  const chargedParticles = event?.particles.filter((particle) => particle.charge !== 0).length ?? 0
  const neutralParticles = event ? event.particles.length - chargedParticles : 0
  const eventIndex = event ? simulation.eventHistory.findIndex((item) => item.id === event.id) : -1
  const isCernEvent = event?.dataOrigin === 'CERN Open Data'
  const isDataInformedEvent = event?.eventMode === 'DATA_INFORMED_SIMULATION'

  const loadEvent = (id) => {
    setEventId(id)
    setSelectedParticleId(null)
    setAnimationTime(0)
    setPlaying(true)
  }
  const previous = () => { if (eventIndex > 0) loadEvent(simulation.eventHistory[eventIndex - 1].id) }
  const next = () => { if (eventIndex >= 0 && eventIndex < simulation.eventHistory.length - 1) loadEvent(simulation.eventHistory[eventIndex + 1].id) }
  const random = () => {
    if (simulation.eventHistory.length) {
      loadEvent(simulation.eventHistory[Math.floor(Math.random() * simulation.eventHistory.length)].id)
    }
  }
  const replay = () => {
    if (!event) return
    setAnimationTime(0)
    setPlaying(true)
  }

  useEffect(() => {
    if (!playing || !event) return undefined
    let frame
    let previousTime
    const tick = (timestamp) => {
      if (!previousTime) previousTime = timestamp
      setAnimationTime((current) => {
        const nextTime = current + (timestamp - previousTime) / 1000
        if (nextTime >= duration) {
          setPlaying(false)
          return duration
        }
        return nextTime
      })
      previousTime = timestamp
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, event, playing])

  return (
    <div className="collision-lab">
      <div className="collision-lab-header">
        <div>
          <span className="section-kicker">COLLISIONS / DETECTOR PLAYBACK</span>
          <h3>Live Collision Chamber</h3>
          <p>Replay the current event through a layered detector view. For CERN record IDs, priority review, and saving labels, use Event Display.</p>
        </div>
        <div className="collision-lab-state">
          <span>{event?.dataOrigin ?? 'EVENT STREAM'}</span>
          <strong>{event ? event.label : 'AWAITING EVENT'}</strong>
        </div>
      </div>
      <div className="collision-lab-grid">
        <div className="collision-chamber-column">
          <div className="collision-chamber">
            <DetectorCanvas
              event={event}
              response={response}
              display={{ showTracks: true, showEnergy: true, showLabels: true, showLayers: true, showParticleIds: false }}
              rotation={rotation}
              zoom={zoom}
              animationTime={animationTime}
              selectedParticleId={selectedParticleId}
              onParticleSelect={setSelectedParticleId}
            />
            <div className="chamber-beam beam-a">BEAM A <i /></div>
            <div className="chamber-beam beam-b">BEAM B <i /></div>
            <div className="chamber-controls">
              <button onClick={() => setRotation((value) => value - .12)} aria-label="Rotate chamber left">↶</button>
              <button onClick={() => setRotation((value) => value + .12)} aria-label="Rotate chamber right">↷</button>
              <button onClick={() => setZoom((value) => Math.min(1.6, value + .1))} aria-label="Zoom chamber in">+</button>
              <button onClick={() => setZoom((value) => Math.max(.7, value - .1))} aria-label="Zoom chamber out">−</button>
            </div>
          </div>
          <div className="collision-timeline">
            <div className="timeline-labels">
              <span>COLLISION START</span>
              <b>{event ? `${animationTime.toFixed(2)} / ${duration.toFixed(2)} ns` : 'NO EVENT'}</b>
              <span>DETECTOR DISPLAY</span>
            </div>
            <div className="timeline-track"><i style={{ width: `${duration ? Math.min(100, animationTime / duration * 100) : 0}%` }} /><b className="timeline-vertex" /></div>
            <div className="timeline-stages"><span>BEAMS APPROACH</span><span>VERTEX</span><span>TRACKS</span><span>DISPLAY</span></div>
          </div>
          <div className="collision-controls">
            <button onClick={previous} disabled={eventIndex <= 0}>◀ PREVIOUS EVENT</button>
            <button onClick={next} disabled={eventIndex < 0 || eventIndex >= simulation.eventHistory.length - 1}>NEXT EVENT ▶</button>
            <button onClick={replay} disabled={!event}>↻ REPLAY</button>
            <button onClick={() => setPlaying(true)} disabled={!event || playing}>▶ PLAY</button>
            <button onClick={() => setPlaying(false)} disabled={!event || !playing}>Ⅱ PAUSE DISPLAY</button>
            <button onClick={random} disabled={!simulation.eventHistory.length}>⤨ RANDOM EVENT</button>
          </div>
        </div>
        <aside className="collision-info-column">
          <section className="collision-info-panel">
            <div className="section-heading">EVENT INFORMATION <span>{isCernEvent ? 'CERN DATA REFERENCE' : isDataInformedEvent ? 'DATA-INFORMED SIMULATION' : event ? 'SIMULATED' : 'STANDBY'}</span></div>
            {isCernEvent ? (
              <div className="collision-info-grid">
                <span>CMS RUN<strong>{event.sourceRun}</strong></span>
                <span>CMS EVENT<strong>{event.sourceEventId}</strong></span>
                <span>INVARIANT MASS<strong>{event.invariantMass.toFixed(3)} GeV</strong></span>
                <span>MUON TRACKS<strong>{event.particles.length}</strong></span>
                <span>SIMULATION TIME<strong>{event.time.toFixed(3)} ns</strong></span>
                <span>TOTAL MUON ENERGY<strong>{event.totalEnergy.toFixed(2)} GeV</strong></span>
              </div>
            ) : (
              <div className="collision-info-grid">
                <span>EVENT ID<strong>{event?.label ?? '—'}</strong></span>
                {isDataInformedEvent && <>
                  <span>CMS TEMPLATE<strong>{`RUN ${event.templateSource.runNumber} / EVENT ${event.templateSource.eventNumber}`}</strong></span>
                  <span>TEMPLATE MASS<strong>{`${event.templateInvariantMassGeV.toFixed(3)} GeV`}</strong></span>
                  <span>MODELED √s<strong>{event.centerOfMassEnergyGeV == null ? '—' : `${event.centerOfMassEnergyGeV.toFixed(2)} GeV`}</strong></span>
                </>}
                <span>SIMULATION TIME<strong>{event ? `${event.time.toFixed(3)} ns` : '—'}</strong></span>
                <span>PARTICLES PRODUCED<strong>{event?.particles.length ?? 0}</strong></span>
                <span>CHARGED PARTICLES<strong>{chargedParticles}</strong></span>
                <span>NEUTRAL PARTICLES<strong>{neutralParticles}</strong></span>
                <span>DETECTED PARTICLES<strong>{event?.detectedParticles ?? 0}</strong></span>
                <span>TOTAL ENERGY<strong>{event ? `${event.totalEnergy.toFixed(2)} GeV` : '—'}</strong></span>
                <span>EVENT DURATION<strong>{event ? `${duration.toFixed(2)} ns` : '—'}</strong></span>
              </div>
            )}
          </section>
          <section className="collision-particle-inspector">
            <div className="section-heading">PARTICLE INSPECTOR <span>{selectedParticle ? 'SELECTED' : 'IDLE'}</span></div>
            {selectedParticle ? (
              <>
                <h4>{selectedParticle.type}</h4>
                <span className="particle-id">TRACK {selectedParticle.id}</span>
                <dl>
                  <dt>ENERGY</dt><dd>{selectedParticle.energy.toFixed(3)} GeV</dd>
                  <dt>CHARGE</dt><dd>{selectedParticle.charge > 0 ? `+${selectedParticle.charge}` : selectedParticle.charge}</dd>
                  <dt>DIRECTION</dt><dd>{formatDirection(selectedParticle.direction)}</dd>
                  {isCernEvent ? <>
                    <dt>TRANSVERSE MOMENTUM</dt><dd>{selectedParticle.transverseMomentum.toFixed(3)} GeV/c</dd>
                    <dt>PSEUDORAPIDITY</dt><dd>{selectedParticle.pseudorapidity.toFixed(5)}</dd>
                    <dt>CMS TRACK TYPE</dt><dd>{selectedParticle.muonTrackType}</dd>
                  </> : <>
                    <dt>LIFETIME</dt><dd>{Number.isFinite(selectedParticle.lifetime) ? `${selectedParticle.lifetime.toFixed(2)} ns` : 'Not available in the recorded template'}</dd>
                  </>}
                </dl>
              </>
            ) : <p>Select a {isCernEvent ? 'recorded CMS muon track' : 'particle'} to inspect its properties.</p>}
          </section>
        </aside>
      </div>
      <section className="collision-particle-table">
        <div className="section-heading">{isCernEvent ? 'RECORDED MUON TRACKS' : 'DETECTED PARTICLES'} <span>{detectedParticles.length} RECORDS</span></div>
        <div className="particle-table-head">
          <span>PARTICLE</span><span>ENERGY</span><span>CHARGE</span><span>DIRECTION</span><span>{isCernEvent ? 'CMS TYPE' : 'LIFETIME'}</span><span>STATUS</span>
        </div>
        {detectedParticles.length ? detectedParticles.map((particle) => (
          <button className={selectedParticleId === particle.id ? 'particle-table-row selected' : 'particle-table-row'} onClick={() => setSelectedParticleId(particle.id)} key={particle.id}>
            <b>{particle.type}</b>
            <span>{particle.energy.toFixed(3)} GeV</span>
            <span>{particle.charge > 0 ? `+${particle.charge}` : particle.charge}</span>
            <span>{formatDirection(particle.direction)}</span>
            <span>{isCernEvent || isDataInformedEvent ? particle.muonTrackType : Number.isFinite(particle.lifetime) ? `${particle.lifetime.toFixed(2)} ns` : '—'}</span>
            <strong>{isCernEvent ? 'RECORDED' : isDataInformedEvent ? 'SIMULATED RECO' : 'DETECTED'}</strong>
          </button>
        )) : <div className="particle-table-empty">Start collisions to create a data-informed event from the recorded CMS dimuon sample.</div>}
      </section>
      <section className="collision-history-panel">
        <div className="section-heading">RECENT EVENTS <span>{simulation.eventHistory.length} RETAINED</span></div>
        <div className="collision-history-list">
          {simulation.eventHistory.slice().reverse().map((historyEvent) => (
            <button className={event?.id === historyEvent.id ? 'collision-history-row active' : 'collision-history-row'} onClick={() => loadEvent(historyEvent.id)} key={historyEvent.id}>
              <b>{historyEvent.label}</b>
              <span>{historyEvent.time.toFixed(3)} ns</span>
              <span>{historyEvent.particles.length} {historyEvent.dataOrigin === 'CERN Open Data' ? 'muons' : 'particles'}</span>
              <strong>{historyEvent.interestingScore == null ? '—' : `${historyEvent.interestingScore}/100`}</strong>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
