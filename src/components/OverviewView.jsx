import OperationSequence from './OperationSequence'
import './overview-view.css'

const shortcuts = [
  { view: 'Collider', eyebrow: 'ACCELERATOR MAP', title: 'Inspect the ring', description: 'Explore the LHC schematic, injector chain, and modeled subsystem status.', icon: '◉' },
  { view: 'Beam Control', eyebrow: 'BEAM CONFIGURATION', title: 'Configure beam channels', description: 'Compare Beam A and B settings, energy targets, and diagnostics.', icon: '⇄' },
  { view: 'Event Display', eyebrow: 'EVENT REVIEW', title: 'Review a recorded event', description: 'Inspect measured CMS tracks, priority tags, and saved labels.', icon: '▦' },
  { view: 'Analysis', eyebrow: 'DATA ANALYSIS', title: 'Explore event summaries', description: 'Compare energy distributions, particles, and detector activity.', icon: '⌁' },
]

function SummaryCard({ label, value, detail, tone = '' }) {
  return <article className={`overview-summary-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

export default function OverviewView({ simulation, operations, onNavigate }) {
  const phase = simulation.operationPhase.replaceAll('_', ' ')
  const latestEvent = simulation.latestCollision
  const activeFaults = simulation.faults.filter((fault) => fault.status === 'ACTIVE').length

  return (
    <div className="overview-page">
      <header className="overview-welcome">
        <div>
          <span className="section-kicker">CONTROL ROOM / MISSION SUMMARY</span>
          <h3>Experiment Overview</h3>
          <p>One place to follow the current operating phase, event stream, and system health.</p>
        </div>
        <span className="overview-mode-badge">EDUCATIONAL MODEL · NOT CONNECTED TO CERN</span>
      </header>

      <section className="overview-summary" aria-label="Current run summary">
        <SummaryCard label="COLLIDER PHASE" value={phase} detail={simulation.message} tone="phase" />
        <SummaryCard label="BEAM ENERGY" value={`${simulation.beamEnergy.toFixed(2)} GeV`} detail={`A / ${simulation.beamEnergyB.toFixed(2)} GeV / B`} />
        <SummaryCard label="PHYSICS EVENTS" value={simulation.collisions.toLocaleString()} detail="Events in this local session" />
        <SummaryCard label="SYSTEM HEALTH" value={`${simulation.systemHealth.toFixed(1)}%`} detail={activeFaults ? `${activeFaults} modeled alerts active` : 'No modeled alerts active'} tone={activeFaults ? 'warning' : ''} />
      </section>

      <OperationSequence simulation={simulation} operations={operations} />

      <section className="overview-latest">
        <div className="overview-section-heading">
          <div><span className="section-kicker">LATEST EVENT</span><h4>{latestEvent ? latestEvent.label : 'No event in this session yet'}</h4></div>
          <button onClick={() => onNavigate('Collision')} disabled={!latestEvent}>OPEN COLLISION CHAMBER ↗</button>
        </div>
        {latestEvent ? (
          <div className="overview-event-details">
            <span>REFERENCE<strong>{latestEvent.sourceParticle}</strong></span>
            <span>PARTICLES<strong>{latestEvent.particles.length}</strong></span>
            <span>TOTAL ENERGY<strong>{latestEvent.totalEnergy.toFixed(2)} GeV</strong></span>
            <span>SIMULATION TIME<strong>{latestEvent.time.toFixed(3)} ns</strong></span>
          </div>
        ) : (
          <p className="overview-empty">Complete the staged start-up sequence and enable collisions to begin the educational event replay.</p>
        )}
      </section>

      <section className="overview-shortcuts" aria-label="Explore the simulator">
        {shortcuts.map((shortcut) => (
          <button className="overview-shortcut" key={shortcut.view} onClick={() => onNavigate(shortcut.view)}>
            <span className="overview-shortcut-icon" aria-hidden="true">{shortcut.icon}</span>
            <span className="section-kicker">{shortcut.eyebrow}</span>
            <strong>{shortcut.title}</strong>
            <small>{shortcut.description}</small>
            <span className="overview-shortcut-link">OPEN {shortcut.view.toUpperCase()} ↗</span>
          </button>
        ))}
      </section>
    </div>
  )
}
