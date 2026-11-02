import { useState } from 'react'
import { colliderComponents } from '../collider/components'
import ColliderCanvas from './ColliderCanvas'
import InjectorChain from './InjectorChain'
import '../collider/collider-overrides.css'

const speedPresets = [0.25, 0.5, 1, 2, 5, 10]

function SystemRow({ label, status, health, activity, warning }) {
  return <div className="system-row"><span className={`system-signal ${warning ? 'warning' : ''}`} /><div><b>{label}</b><small>{status} / {activity}</small></div><strong>{health}%</strong></div>
}

export default function ColliderView({ simulation, onSpeed, onNavigate, injectorStage, onInjectorStageChange }) {
  const [selectedId, setSelectedId] = useState(null)
  const [labelsVisible, setLabelsVisible] = useState(true)
  const [rotation, setRotation] = useState(0)
  const selectedComponent = colliderComponents.find((component) => component.id === selectedId)
  const running = simulation.operationPhase === 'COLLISIONS'
  const circulating = ['STABLE_BEAMS', 'COLLISIONS', 'END_FILL_REQUESTED', 'END_FILL'].includes(simulation.operationPhase)
  const activity = Math.round(simulation.beamActivity * 100)

  return (
    <div className="collider-page">
      <div className="collider-page-header">
        <div><span className="section-kicker">COLLIDER / EDUCATIONAL RING MAP</span><h3>Simulated Collider Map</h3></div>
        <div className="collider-page-metrics">
          <span>STATUS<strong className={running ? 'green' : ''}>{simulation.status}</strong></span>
          <span>TIME<strong>{simulation.time.toFixed(3)} ns</strong></span>
          <span>EXPERIMENT<strong>{simulation.experimentId}</strong></span>
          <span>EVENT COUNT<strong>{simulation.events.toLocaleString()}</strong></span>
          <span>MODEL HEALTH<strong className="green">98.7%</strong></span>
        </div>
      </div>
      <div className="collider-layout">
        <div className="collider-map-column">
          <div className="collider-map">
            <ColliderCanvas simulation={simulation} selectedId={selectedId} onSelect={setSelectedId} labelsVisible={labelsVisible} onLabelsChange={setLabelsVisible} rotation={rotation} injectorStage={injectorStage} />
            <div className="map-readouts"><span>SECTOR 04 / AZIMUTH 180°</span><span>BEAM PIPE A / B</span><span>COLLISION CHAMBER D-01</span><span>SCHEMATIC / NOT TO SCALE</span></div>
            <div className="rotation-controls">
              <button onClick={() => setRotation((value) => value - .12)} title="Rotate ring counter-clockwise" aria-label="Rotate ring counter-clockwise">↶</button>
              <output>{Math.round((rotation * 180) / Math.PI)}°</output>
              <button onClick={() => setRotation((value) => value + .12)} title="Rotate ring clockwise" aria-label="Rotate ring clockwise">↷</button>
            </div>
          </div>
          <InjectorChain stage={injectorStage} onStageChange={onInjectorStageChange} />
          <div className="collider-control-deck">
            <div className="collider-map-context">
              <span className="section-kicker">RING SCHEMATIC</span>
              <p>Explore accelerator components and CERN’s injector chain here. Configure beam settings and view detailed channel diagnostics in Beam Control.</p>
              <button onClick={() => onNavigate('Beam Control')}>OPEN BEAM CONTROL ↗</button>
            </div>
            <div className="preset-speed"><span>SIMULATION SPEED</span>{speedPresets.map((speed) => <button className={simulation.speed === speed ? 'active' : ''} onClick={() => onSpeed(speed)} key={speed}>{speed}×</button>)}</div>
          </div>
          <div className="collider-live-strip">
            <span>BEAM ENERGY <b>{simulation.beamEnergy.toFixed(2)} GeV</b></span>
            <span>COLLISION RATE <b>{simulation.collisionRate.toFixed(2)} / ns</b></span>
            <span>ACTIVE PARTICLES <b>{circulating ? simulation.beam.particleCount.toLocaleString() : '0'}</b></span>
            <span>DETECTOR ACTIVITY <b>{activity}%</b></span>
            <span>EVENTS PROCESSED <b>{simulation.events.toLocaleString()}</b></span>
            <span>SIMULATION TIME <b>{simulation.time.toFixed(3)} ns</b></span>
          </div>
        </div>
        <aside className="collider-inspector-column">
          <section className="collider-inspector-panel">
            <div className="section-heading">COMPONENT INSPECTOR <span>{selectedComponent ? 'SELECTED' : 'RING OVERVIEW'}</span></div>
            {selectedComponent ? <>
              <h4>{selectedComponent.name}</h4>
              <div className="collider-detail-grid">
                <span>STATUS<strong className="green">{selectedComponent.status}</strong></span>
                <span>HEALTH<strong className="green">{selectedComponent.health}</strong></span>
                <span>ACTIVITY<strong>{selectedComponent.activity}</strong></span>
                <span>VALUE<strong>{selectedComponent.value}</strong></span>
              </div>
              <p>{selectedComponent.description}</p>
              <button className="inspector-clear" onClick={() => setSelectedId(null)}>CLEAR SELECTION</button>
            </> : <div className="inspector-empty">Select an injection point, acceleration section, detector, collision point, or monitoring point on the live map.</div>}
          </section>
          <section className="system-status-panel">
            <div className="section-heading">SYSTEM STATUS <span>MODEL</span></div>
            <SystemRow label="BEAM SYSTEM" status={running ? 'ACTIVE' : 'STANDBY'} health="99.2" activity={`${activity}% output`} />
            <SystemRow label="MAGNET SYSTEM" status={simulation.magnetStatus ?? 'STANDBY'} health="98.9" activity={running ? 'Stable beams / collision fill' : circulating ? 'Stable circulation' : 'Standby'} />
            <SystemRow label="VACUUM SYSTEM" status="NOMINAL" health="99.7" activity="Stable" />
            <SystemRow label="DETECTOR SYSTEM" status={simulation.collisions ? 'RECORDING' : 'READY'} health="99.8" activity={`${simulation.detectedParticles} particles`} />
            <SystemRow label="COOLING SYSTEM" status="NOMINAL" health="98.6" activity="Thermal balance" />
            <SystemRow label="SAFETY SYSTEM" status={simulation.status === 'FAULT' ? 'WARNING' : 'MODEL'} health="100" activity={simulation.status === 'FAULT' ? 'Simulated fault' : 'Not connected to CERN'} warning={simulation.status === 'FAULT'} />
          </section>
        </aside>
      </div>
    </div>
  )
}
