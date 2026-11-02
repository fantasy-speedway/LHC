import { useMemo, useState } from 'react'
import { detectorGuides, discoveryScenarios, particleCatalogue, particleCatalogueByName, particleSources } from '../physics/catalogue'
import { faultTypes } from '../environment/systems'
import '../physics/discovery-view.css'

const EMPTY_EVENTS = []

export default function DiscoveryView({ simulation }) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [selected, setSelected] = useState('Higgs boson')
  const events = simulation.eventHistory ?? EMPTY_EVENTS

  const scenarioRows = useMemo(() => discoveryScenarios.map((scenario) => {
    const observations = events.filter((event) => event.particles.some((entry) => entry.type === scenario.particle)).length
    const confidence = Math.min(99, Math.round(observations / scenario.requiredObservations * 100))
    const state = observations >= scenario.requiredObservations ? 'CONFIRMED' : observations >= Math.ceil(scenario.requiredObservations / 2) ? 'CANDIDATE' : observations ? 'UNCONFIRMED' : 'UNKNOWN'
    return { ...scenario, observations, confidence, state }
  }), [events])

  const categories = useMemo(() => ['All', ...new Set(particleCatalogue.map((entry) => entry.category))], [])
  const visibleParticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return particleCatalogue.filter((entry) => {
      const matchesCategory = categoryFilter === 'All' || entry.category === categoryFilter
      const searchableText = `${entry.name} ${entry.symbol} ${entry.category} ${entry.group} ${entry.antiparticle} ${entry.composition} ${entry.description} ${entry.searchTerms}`.toLowerCase()
      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery))
    })
  }, [categoryFilter, query])
  const selectedParticle = particleCatalogueByName[selected]
  const systemHealth = simulation.systemHealth?.toFixed(1) ?? '98.7'
  const environment = simulation.environment

  return (
    <div className="discovery-page">
      <div className="discovery-header">
        <div>
          <span className="section-kicker">DISCOVERY / PARTICLE REFERENCE</span>
          <h3>Particle Library</h3>
          <p>Explore the Standard Model and common particles reconstructed in collider events.</p>
        </div>
        <span className="historical-badge">REFERENCE GUIDE · {particleCatalogue.length} ENTRIES</span>
      </div>

      <div className="discovery-layout">
        <section className="catalogue-panel">
          <div className="panel-title catalogue-toolbar">
            <div>
              <span className="section-kicker">PARTICLE CATALOGUE</span>
              <h4>Established particles and common resonances</h4>
              <p>Antiparticles, approximate values, decay clues, and detector signatures are included in each record.</p>
            </div>
            <div className="catalogue-filters">
              <label>
                <span className="sr-only">Filter by particle class</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  {categories.map((category) => <option key={category} value={category}>{category === 'All' ? 'All classes' : category}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Search particle library</span>
                <input placeholder="Search name, symbol, decay..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
            </div>
          </div>
          <div className="catalogue-count" aria-live="polite">
            Showing {visibleParticles.length} of {particleCatalogue.length} reference entries
          </div>
          <div className="catalogue-table">
            <div className="catalogue-head"><span>PARTICLE</span><span>CLASS</span><span>CHARGE</span><span>MASS</span><span>SPIN</span><span>LIFETIME</span></div>
            {visibleParticles.map((entry) => (
              <button
                className={selected === entry.name ? 'catalogue-row selected' : 'catalogue-row'}
                onClick={() => setSelected(entry.name)}
                key={entry.id}
                aria-pressed={selected === entry.name}
                title={`Open ${entry.name} reference record`}
              >
                <b><span>{entry.symbol}</span> {entry.name}</b>
                <span>{entry.category}</span>
                <span>{entry.charge}</span>
                <span>{entry.mass}</span>
                <span>{entry.spin}</span>
                <span>{entry.lifetime}</span>
              </button>
            ))}
            {visibleParticles.length === 0 && <div className="catalogue-empty">No particles match this search. Try a name, symbol, class, or decay product.</div>}
          </div>
        </section>

        {selectedParticle && (
          <aside className="particle-card" aria-live="polite">
            <span className="section-kicker">PARTICLE REFERENCE RECORD</span>
            <div className="particle-card-heading">
              <div>
                <h4>{selectedParticle.name}</h4>
                <span className="particle-category">{selectedParticle.category} · {selectedParticle.group}</span>
              </div>
              <strong>{selectedParticle.symbol}</strong>
            </div>
            <p className="particle-summary">{selectedParticle.description}</p>
            <dl className="particle-facts-grid">
              <div><dt>Electric charge</dt><dd>{selectedParticle.charge}</dd></div>
              <div><dt>Approx. mass</dt><dd>{selectedParticle.mass}</dd></div>
              <div><dt>Spin</dt><dd>{selectedParticle.spin}</dd></div>
              <div><dt>Lifetime / status</dt><dd>{selectedParticle.lifetime}</dd></div>
              <div><dt>Antiparticle</dt><dd>{selectedParticle.antiparticle}</dd></div>
              <div><dt>Structure</dt><dd>{selectedParticle.composition}</dd></div>
            </dl>
            <div className="particle-detail-block">
              <h5>How it is produced</h5>
              <p>{selectedParticle.production}</p>
            </div>
            <div className="particle-detail-block">
              <h5>Typical decay or interaction</h5>
              <p>{selectedParticle.decays}</p>
            </div>
            <div className="particle-signature">
              <h5>What the detector may show</h5>
              <p>{selectedParticle.signature}</p>
            </div>
            <div className="particle-caveat">
              <h5>Interpretation note</h5>
              <p>{selectedParticle.caveat}</p>
            </div>
            <div className="particle-history">
              <span>DISCOVERY / IDENTIFICATION</span>
              <p>{selectedParticle.discoveryYear} · {selectedParticle.discoverer}</p>
            </div>
          </aside>
        )}
      </div>

      <section className="detector-guide-panel">
        <div className="panel-title">
          <div><span className="section-kicker">READING THE EVENT</span><h4>How detector signatures work</h4></div>
          <span className="historical-note">Detectors observe signals; particle identities are reconstructed from them.</span>
        </div>
        <div className="detector-guide-grid">
          {detectorGuides.map((guide) => (
            <article key={guide.title}>
              <span>{guide.detector}</span>
              <h5>{guide.title}</h5>
              <p>{guide.signal}</p>
              <small>{guide.examples}</small>
            </article>
          ))}
        </div>
        <p className="library-scope-note">
          This is a practical reference, not a list of every known hadron or resonance. Quarks and gluons are confined and are inferred from hadrons and jets. The graviton and dark-matter particles are not established Standard Model particles and are not listed as discovered particles here.
        </p>
        <div className="particle-source-links">
          <span>REFERENCE SOURCES</span>
          {particleSources.map((source) => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}
        </div>
      </section>

      <section className="scenario-panel">
        <div className="panel-title">
          <div><span className="section-kicker">DISCOVERY SCENARIOS</span><h4>Educational evidence progress</h4></div>
          <span className="historical-note">This simplified simulation is not an experimental discovery or statistical significance.</span>
        </div>
        <div className="scenario-grid">
          {scenarioRows.map((scenario) => (
            <button className={selected === scenario.particle ? 'scenario-row selected' : 'scenario-row'} onClick={() => setSelected(scenario.particle)} key={scenario.id}>
              <div><b>{scenario.particle}</b><span>Historical identification: {scenario.historicalYear}</span></div>
              <strong>{scenario.state}</strong>
              <i><b style={{ width: `${scenario.confidence}%` }} /></i>
              <small>{scenario.observations} simulated observations / {scenario.confidence}% progress</small>
            </button>
          ))}
        </div>
      </section>

      <section className="environment-panel">
        <div className="panel-title">
          <div><span className="section-kicker">SYSTEM ENVIRONMENT</span><h4>Living Experiment Conditions</h4></div>
          <strong className="health-score">SIMULATED SYSTEM HEALTH {systemHealth}%</strong>
        </div>
        <div className="environment-grid">
          <div><span>COOLING</span><b>{environment?.cooling?.temperature?.toFixed(1) ?? '78.0'} K</b><small>{environment?.cooling?.efficiency ?? 96}% efficiency / {environment?.cooling?.coolant ?? 'NOMINAL'}</small></div>
          <div><span>POWER STABILITY</span><b>{environment?.power?.stability ?? 99}%</b><small>{environment?.power?.activity ?? 'Stable'}</small></div>
          <div><span>MAGNET STABILITY</span><b>{environment?.magnets?.stability ?? 98.8}%</b><small>{environment?.magnets?.activity ?? 'Orbit correction ready'}</small></div>
          <div><span>DETECTOR EFFICIENCY</span><b>{environment?.detector?.efficiency ?? 98}%</b><small>{environment?.detector?.activity ?? 'Recording ready'}</small></div>
          <div><span>COMPUTING LOAD</span><b>{environment?.computing?.load ?? 22}%</b><small>{environment?.computing?.activity ?? 'Nominal throughput'}</small></div>
          <div><span>SENSOR NOISE</span><b>{environment?.sensors?.noise ?? 3}%</b><small>{environment?.sensors?.activity ?? 'Low noise'}</small></div>
        </div>
      </section>

      <section className="fault-panel">
        <div className="panel-title"><div><span className="section-kicker">ERROR LOG / DIAGNOSTICS</span><h4>Environmental Faults</h4></div><span>{simulation.faults?.length ?? 0} retained</span></div>
        {simulation.faults?.length
          ? simulation.faults.slice().reverse().map((fault) => <div className={`fault-row ${fault.severity.toLowerCase()}`} key={fault.id}><strong>{fault.severity}</strong><b>{fault.name}</b><span>{fault.description}</span><small>{fault.system} / {fault.status} / {fault.startTime.toFixed(2)} ns</small></div>)
          : <div className="fault-empty">No randomized environmental faults currently active. Potential fault classes: {faultTypes.map((fault) => fault[0]).join(', ')}.</div>}
      </section>
    </div>
  )
}
