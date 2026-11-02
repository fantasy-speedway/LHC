import { telemetryRows } from '../data/navigation'
import BeamControlPanel from './BeamControlPanel'
import BeamEnergyGraph from './BeamEnergyGraph'
import CollisionPanel from './CollisionPanel'

function TelemetryCard({ title, value, detail, tone = 'green', icon }) {
  return <div className="telemetry-card"><div className="telemetry-heading"><span className={`telemetry-icon ${tone}`}>{icon}</span><span>{title}</span><b className={`pulse ${tone}`} /></div><div className="telemetry-value">{value}</div>{detail && <div className="telemetry-detail">{detail}</div>}</div>
}

export default function TelemetryPanel({ simulation, onBeamChange, onEndFill }) {
  const circulating = ['STABLE_BEAMS', 'COLLISIONS', 'END_FILL_REQUESTED', 'END_FILL'].includes(simulation.operationPhase)
  const beamStatus = simulation.beamStatus === 'RUNNING' ? 'COLLISIONS ACTIVE' : circulating ? 'STABLE CIRCULATION' : simulation.beamStatus
  const collisionStatus = ['COLLISIONS', 'END_FILL_REQUESTED'].includes(simulation.operationPhase) ? 'ARMED' : 'IDLE'
  return (
    <aside className="telemetry-panel">
      <div className="side-label">SYSTEM TELEMETRY <span className="telemetry-refresh">↻</span></div>
      <div className="telemetry-cards">
        <TelemetryCard title="COLLIDER STATUS" value={simulation.status} detail={simulation.message} icon="◉" />
        <TelemetryCard title="BEAM STATUS" value={beamStatus} detail={`${simulation.beam.particleType.toUpperCase()} / A + B`} icon="⇄" />
        <TelemetryCard title="COLLISION STATUS" value={collisionStatus} detail="Simplified event channel" tone="amber" icon="✦" />
      </div>
      <div className="telemetry-section beam-readout">
        <div className="section-heading">BEAM TELEMETRY <span>MODEL</span></div>
        <div className="beam-metrics">
          <span>ENERGY<strong>{simulation.beamEnergy.toFixed(2)} <small>GeV</small></strong></span>
          <span>ACTIVITY<strong>{Math.round(simulation.beamActivity * 100)}<small>%</small></strong></span>
          <span>COUNT<strong>{simulation.beam.particleCount}</strong></span>
          <span>REVOLUTIONS<strong>{simulation.revolutions.toFixed(2)}</strong></span>
        </div>
        <BeamEnergyGraph history={simulation.energyHistory} />
      </div>
      <div className="telemetry-section">
        <div className="section-heading">BEAM CONFIGURATION <span>MODEL</span></div>
        <div className="beam-readout"><BeamControlPanel beam={simulation.beam} onChange={onBeamChange} disabled={!['STANDBY', 'TECHNICAL_STOP'].includes(simulation.operationPhase)} /></div>
      </div>
      <div className="telemetry-section">
        <div className="section-heading">COLLISION EVENTS</div>
        <CollisionPanel simulation={simulation} onEndFill={onEndFill} />
      </div>
      <div className="telemetry-section">
        <div className="section-heading">SYSTEM CHECKS <span>{simulation.operationPhase === 'STARTUP_PROCEDURE' ? 'IN PROGRESS' : 'SIMULATED'}</span></div>
        {simulation.checks.map((check) => (
          <div className="parameter-row check-row" key={check.name}>
            <span>{check.name}</span>
            <b className={check.status === 'PASS' ? 'green' : check.status === 'CHECKING' ? 'amber' : ''}>
              {check.status === 'PASS' ? '✓ PASS' : check.status}
            </b>
          </div>
        ))}
      </div>
      <div className="telemetry-section">
        <div className="section-heading">RING PARAMETERS <span>MODEL</span></div>
        {telemetryRows.map((row) => (
          <div className="parameter-row" key={row.label}>
            <span>{row.label}</span><b className={row.tone}>{row.label === 'MAGNET ARRAY' ? simulation.magnetStatus : circulating ? 'ACTIVE' : row.value}</b>
          </div>
        ))}
      </div>
      <div className="telemetry-section speed-readout">
        <div className="section-heading">SIMULATION SPEED</div>
        <div className="speed-number">{simulation.speed.toFixed(2)}<small>×</small></div>
        <div className="speed-scale"><span>0.25×</span><span>4.00×</span></div>
      </div>
      <div className="warning-box">
        <span className="warning-icon">!</span>
        <div><b>SIMULATION ONLY</b><p>Model telemetry is not connected to CERN equipment.</p></div>
      </div>
    </aside>
  )
}
