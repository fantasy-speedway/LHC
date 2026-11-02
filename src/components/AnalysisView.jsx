import { useMemo, useState } from 'react'
import { loadCompletedExperiments } from '../experiments/storage'
import { detectorLayers } from '../detector/model'
import '../analysis/analysis-view.css'

const particleTypes = ['ALL', 'Photon', 'Electron', 'Positron', 'Muon', 'Neutrino', 'Pion', 'Kaon', 'Proton', 'Neutron', 'Luminon', 'Fluxon']
const layerNames = ['ALL', 'INNER TRACKING', 'ELECTROMAGNETIC', 'HADRONIC', 'MUON DETECTOR']

function flattenEvents(simulation, archived) {
  const live = simulation.eventHistory.map((event) => ({ ...event, source: 'LIVE' }))
  const stored = archived.flatMap((experiment) => (experiment.events ?? []).map((event) => ({ ...event, source: experiment.name })))
  const map = new Map()
  ;[...stored, ...live].forEach((event) => map.set(`${event.source}-${event.id}`, event))
  return [...map.values()]
}

function energyValues(events, type = 'ALL') {
  return events.flatMap((event) => event.particles)
    .filter((particle) => type === 'ALL' || particle.type === type)
    .map((particle) => particle.energy)
}

function Bars({ values, color = 'var(--cyan)', labels = [] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="analysis-bars">
      {values.map((value, index) => (
        <div className="analysis-bar-wrap" key={`${labels[index] ?? index}`}>
          <b style={{ height: `${(value / max) * 100}%`, background: color }} title={`${labels[index] ?? ''}: ${value}`} />
          <span>{labels[index] ?? index + 1}</span>
        </div>
      ))}
    </div>
  )
}

function Histogram({ values, bins }) {
  const maxValue = Math.max(...values, 1)
  const width = maxValue / bins || 1
  const counts = Array.from({ length: bins }, (_, index) =>
    values.filter((value) => value >= index * width && value < (index + 1) * width).length)
  return <Bars values={counts} color="var(--amber)" labels={counts.map((_, index) => `${(index * width).toFixed(1)}`)} />
}

function buildStats(events) {
  const particles = events.flatMap((event) => event.particles)
  const frequencies = particles.reduce((map, particle) => map.set(particle.type, (map.get(particle.type) ?? 0) + 1), new Map())
  const highest = events.reduce((best, event) => !best || event.totalEnergy > best.totalEnergy ? event : best, null)
  const interesting = events.filter((event) =>
    event.interestingScore >= 78 || event.particles.length >= 6 || event.particles.some((particle) => particle.fictional))
  return { events, particles, frequencies, highest, interesting, average: events.length ? particles.length / events.length : 0 }
}

function detectorActivity(events) {
  const cernOnly = events.length > 0 && events.every((event) => event.dataOrigin === 'CERN Open Data')
  return detectorLayers.map((layer, index) => {
    const available = !cernOnly || layer.id === 'tracking' || layer.id === 'muon'
    const value = events.reduce((sum, event) => {
      if (event.dataOrigin === 'CERN Open Data') {
        if (layer.id === 'tracking') {
          return sum + event.particles.filter((particle) => particle.muonTrackType.includes('T') || particle.muonTrackType.includes('G')).length
        }
        if (layer.id === 'muon') {
          return sum + event.particles.filter((particle) => particle.muonTrackType.includes('G')).length
        }
        return sum
      }
      return sum + event.particles.filter((particle) =>
        particle.lifetime / 5 >= layer.radius * .86 && particle.detectionProbability >= .65).length
    }, 0)
    return { label: layer.label, value, available, color: layer.color, index }
  })
}

export default function AnalysisView({ simulation }) {
  const [particleFilter, setParticleFilter] = useState('ALL')
  const [energyFilter, setEnergyFilter] = useState('ALL')
  const [layerFilter, setLayerFilter] = useState('ALL')
  const [bins, setBins] = useState(8)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [comparison, setComparison] = useState({ left: '', right: '' })
  const archived = useMemo(() => loadCompletedExperiments(), [])
  const events = useMemo(() => flattenEvents(simulation, archived), [simulation, archived])
  const filteredEvents = useMemo(() => events.filter((event) =>
    energyFilter === 'ALL' || (energyFilter === 'LIVE' ? event.source === 'LIVE' : event.source === energyFilter)), [energyFilter, events])
  const stats = buildStats(filteredEvents)
  const frequencies = [...stats.frequencies.entries()].sort((a, b) => b[1] - a[1])
  const activity = detectorActivity(filteredEvents)
  const energies = energyValues(filteredEvents, particleFilter)
  const selectedEvent = filteredEvents.find((event) => `${event.source}-${event.id}` === selectedEventId)
  const experiments = [{ id: 'LIVE', name: 'CURRENT RUN REFERENCES', events: simulation.eventHistory }, ...archived]
  const comparisonData = (id) => {
    const experiment = experiments.find((item) => item.id === id)
    return experiment ? buildStats(experiment.events ?? []) : buildStats([])
  }
  const compareLeft = comparisonData(comparison.left)
  const compareRight = comparisonData(comparison.right)
  const cernOnly = filteredEvents.length > 0 && filteredEvents.every((event) => event.dataOrigin === 'CERN Open Data')

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <div>
          <span className="section-kicker">ANALYSIS / DATA REDUCTION</span>
          <h3>Collision Data Analysis</h3>
          <p>{cernOnly ? 'Energy and particle summaries use recorded CMS dimuon measurements.' : 'Summaries from collision history and locally archived experiments.'}</p>
        </div>
        <span className="analysis-source">{events.length} EVENTS IN WORKSPACE</span>
      </div>
      <div className="analysis-summary">
        {[
          ['TOTAL EVENTS', filteredEvents.length],
          ['RECORDED PARTICLES', filteredEvents.reduce((sum, event) => sum + event.detectedParticles, 0)],
          ['AVG PARTICLES / EVENT', stats.average.toFixed(2)],
          ['HIGHEST EVENT ENERGY', stats.highest ? `${stats.highest.totalEnergy.toFixed(2)} GeV` : '—'],
          ['MOST COMMON PARTICLE', frequencies[0]?.[0] ?? '—'],
          ['MODEL-FLAGGED EVENTS', stats.interesting.length],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="analysis-grid">
        <section className="analysis-panel">
          <div className="analysis-panel-header">
            <div><span className="section-kicker">PARTICLE ANALYSIS</span><h4>Particle Frequency</h4></div>
            <select value={particleFilter} onChange={(event) => setParticleFilter(event.target.value)}>
              {particleTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
          <Bars values={frequencies.map(([, value]) => value)} labels={frequencies.map(([type]) => type)} />
          <div className="analysis-filter-row">
            <label>EVENT RANGE
              <select value={energyFilter} onChange={(event) => setEnergyFilter(event.target.value)}>
                <option value="ALL">ALL EVENTS</option>
                <option value="LIVE">CURRENT RUN REFERENCES</option>
                {archived.map((experiment) => <option value={experiment.name} key={experiment.id}>{experiment.name}</option>)}
              </select>
            </label>
            <label>DETECTOR LAYER
              <select value={layerFilter} onChange={(event) => setLayerFilter(event.target.value)}>
                {layerNames.map((layer) => <option key={layer}>{layer}</option>)}
              </select>
            </label>
          </div>
        </section>
        <section className="analysis-panel">
          <div className="analysis-panel-header">
            <div><span className="section-kicker">ENERGY ANALYSIS</span><h4>Muon Energy Distribution</h4></div>
            <label className="bin-control">BINS <input type="number" min="4" max="16" value={bins} onChange={(event) => setBins(Math.max(4, Math.min(16, Number(event.target.value))))} /></label>
          </div>
          <Histogram values={energies} bins={bins} />
          <span className="chart-axis-label">ENERGY / GeV</span>
        </section>
        <section className="analysis-panel detector-analysis">
          <div className="analysis-panel-header"><div><span className="section-kicker">DETECTOR ANALYSIS</span><h4>Layer Activity</h4></div></div>
          {activity.map((layer) => (
            <div className="layer-activity-row" key={layer.label}>
              <span>{layer.label}</span>
              <i><b style={{ width: `${layer.available ? Math.min(100, layer.value * 8) : 0}%`, background: layer.color }} /></i>
              <strong>{layer.available ? `${layer.value} ${cernOnly ? 'tracks' : 'hits'}` : 'NOT IN CSV'}</strong>
            </div>
          ))}
        </section>
        <section className="analysis-panel interesting-analysis">
          <div className="analysis-panel-header">
            <div><span className="section-kicker">EVENT ANALYSIS</span><h4>Model-Flagged Events</h4></div>
            <span>{stats.interesting.length} flagged</span>
          </div>
          {stats.interesting.slice(0, 6).map((event) => (
            <button className={selectedEventId === `${event.source}-${event.id}` ? 'interesting-row active' : 'interesting-row'} onClick={() => setSelectedEventId(`${event.source}-${event.id}`)} key={`${event.source}-${event.id}`}>
              <b>{event.label}</b>
              <span>{event.particles.length} particles / {event.totalEnergy.toFixed(2)} GeV</span>
              <strong>{event.interestingScore == null ? 'NO SOURCE SCORE' : `${event.interestingScore}/100`}</strong>
            </button>
          ))}
          {!stats.interesting.length && <p>No events meet the simulator's model-based flagging criteria.</p>}
        </section>
      </div>
      {selectedEvent && (
        <section className="analysis-event-detail">
          <div><span className="section-kicker">SELECTED EVENT</span><h4>{selectedEvent.label}</h4><p>{selectedEvent.particles.map((particle) => particle.type).join(' · ')}</p></div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-event-display', { detail: selectedEvent.id }))}>OPEN IN EVENT DISPLAY</button>
        </section>
      )}
      <section className="comparison-panel">
        <div className="analysis-panel-header">
          <div><span className="section-kicker">EXPERIMENT COMPARISON</span><h4>Compare Archived Runs</h4></div>
          <div className="comparison-selects">
            <select value={comparison.left} onChange={(event) => setComparison((current) => ({ ...current, left: event.target.value }))}>
              <option value="">SELECT RUN A</option>
              {experiments.map((experiment) => <option value={experiment.id} key={`left-${experiment.id}`}>{experiment.name}</option>)}
            </select>
            <select value={comparison.right} onChange={(event) => setComparison((current) => ({ ...current, right: event.target.value }))}>
              <option value="">SELECT RUN B</option>
              {experiments.map((experiment) => <option value={experiment.id} key={`right-${experiment.id}`}>{experiment.name}</option>)}
            </select>
          </div>
        </div>
        <div className="comparison-grid">
          <div><span>EVENT COUNTS</span><Bars values={[compareLeft.events.length, compareRight.events.length]} labels={['A', 'B']} /></div>
          <div><span>PARTICLE DISTRIBUTION</span><Bars values={[compareLeft.particles.length, compareRight.particles.length]} labels={['A', 'B']} color="var(--amber)" /></div>
          <div><span>ENERGY TOTAL</span><Bars values={[compareLeft.particles.reduce((sum, particle) => sum + particle.energy, 0), compareRight.particles.reduce((sum, particle) => sum + particle.energy, 0)]} labels={['A', 'B']} color="var(--red)" /></div>
          <div><span>RECORDED PARTICLES</span><Bars values={[compareLeft.particles.filter((particle) => particle.isDetected ?? particle.detectionProbability >= .65).length, compareRight.particles.filter((particle) => particle.isDetected ?? particle.detectionProbability >= .65).length]} labels={['A', 'B']} /></div>
        </div>
      </section>
    </div>
  )
}
