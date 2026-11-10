import { useMemo, useState } from 'react'
import { loadCompletedExperiments } from '../experiments/storage'
import { detectorLayers } from '../detector/model'
import { getCmsDimuonDataset } from '../collision/engine'
import { analyzeCmsDimuonEvents, DEFAULT_DIMUON_CUTS } from '../analysis/cms-analysis'
import { estimateDimuonSideband, summarizeEventObservables } from '../analysis/observables'
import { loadResearchProjects, saveAnalysisReport } from '../research/storage'
import '../analysis/analysis-view.css'

const particleTypes = ['ALL', 'Photon', 'Electron', 'Positron', 'Muon', 'Neutrino', 'Pion', 'Kaon', 'Proton', 'Neutron', 'Luminon', 'Fluxon']
const layerNames = ['ALL', 'INNER TRACKING', 'ELECTROMAGNETIC', 'HADRONIC', 'MUON DETECTOR']
const cmsReferenceEvents = getCmsDimuonDataset()

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

function ObservableDistribution({ title, histogram, unit }) {
  const counts = histogram.map((bin) => bin.count)
  const labels = histogram.map((bin) => bin.low.toFixed(1))
  return (
    <section className="observable-chart">
      <h5>{title}</h5>
      {histogram.length
        ? <><Bars values={counts} labels={labels} color="var(--cyan)" /><span>{unit} / BIN LOWER EDGE</span></>
        : <p>No recorded values are available in this event selection.</p>}
    </section>
  )
}

function CmsMassHistogram({ histogram }) {
  const maximum = Math.max(...histogram.map((bin) => bin.count), 1)
  const chartWidth = Math.max(histogram.length * 22, 220)
  const chartHeight = 120

  return (
    <div className="cms-mass-chart-scroll">
      <svg className="cms-mass-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Dimuon invariant-mass histogram">
        <path d={`M0 ${chartHeight - 18}H${chartWidth}`} className="cms-chart-axis" />
        {histogram.map((bin, index) => {
          const height = (bin.count / maximum) * (chartHeight - 30)
          return (
            <g key={bin.lowGeV}>
              <rect x={index * 22 + 4} y={chartHeight - 19 - height} width="12" height={height} rx="1" className="cms-chart-bar" />
              {index % 2 === 0 && <text x={index * 22 + 4} y={chartHeight - 5} className="cms-chart-label">{bin.lowGeV.toFixed(1)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
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
  const [analysisSource, setAnalysisSource] = useState('CMS_REFERENCE')
  const [dimuonCuts, setDimuonCuts] = useState(DEFAULT_DIMUON_CUTS)
  const [researchProjects] = useState(() => {
    try {
      return { items: loadResearchProjects(), error: '' }
    } catch (error) {
      return { items: [], error: `Could not read research projects: ${error.message}` }
    }
  })
  const [reportProjectId, setReportProjectId] = useState('')
  const [reportStatus, setReportStatus] = useState('')
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
  const cmsInputEvents = analysisSource === 'CMS_REFERENCE' ? cmsReferenceEvents : filteredEvents
  const cmsResult = useMemo(() => analyzeCmsDimuonEvents(cmsInputEvents, dimuonCuts), [cmsInputEvents, dimuonCuts])
  const observables = useMemo(() => summarizeEventObservables(filteredEvents), [filteredEvents])
  const sidebandEstimate = useMemo(() => estimateDimuonSideband(cmsResult.candidateMasses), [cmsResult.candidateMasses])
  const inputCount = cmsResult.cutflow[0]?.count ?? 0
  const selectedCount = cmsResult.selected.length
  const datasetId = analysisSource === 'CMS_REFERENCE' ? 'cms-reference-301' : 'analysis-workspace'
  const datasetName = analysisSource === 'CMS_REFERENCE'
    ? 'CERN CMS J/psi dimuon reference dataset (2,000 events)'
    : 'Current / archived experiment workspace'

  const saveReport = () => {
    const now = new Date()
    const reportId = `analysis-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
    const report = {
      id: reportId,
      title: `J/psi dimuon selection / ${now.toLocaleString()}`,
      createdAt: now.toISOString(),
      projectId: reportProjectId || null,
      datasetId,
      datasetName,
      analysisType: 'cms-style-dimuon-selection',
      source: analysisSource,
      summary: `${selectedCount} selected of ${inputCount} input events; mean selected mass ${cmsResult.meanMassGeV == null ? 'unavailable' : `${cmsResult.meanMassGeV.toFixed(4)} GeV`}.`,
      parameters: { ...dimuonCuts },
      result: {
        inputCount,
        candidateEventCount: cmsResult.candidateEventCount,
        selectedCount,
        meanMassGeV: cmsResult.meanMassGeV,
        massRmsGeV: cmsResult.massRmsGeV,
        cutflow: cmsResult.cutflow,
        histogram: cmsResult.histogram,
        backgroundEstimate: sidebandEstimate,
        selectedEvents: cmsResult.selected.map(({ event, candidate, sourceMassGeV }) => ({
          runNumber: event.sourceRun ?? null,
          eventNumber: event.sourceEventId ?? event.id ?? null,
          reconstructedMassGeV: candidate.massGeV,
          sourceMassGeV,
          pairTransverseMomentumGeV: candidate.transverseMomentumGeV,
        })),
      },
    }

    try {
      saveAnalysisReport(report)
      setReportStatus(`Analysis report saved${reportProjectId ? ' to the selected project' : ''}.`)
    } catch (error) {
      setReportStatus(`Could not save analysis report: ${error.message}`)
    }
  }

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
          ['RECONSTRUCTED PARTICLES', filteredEvents.reduce((sum, event) => sum + event.detectedParticles, 0)],
          ['AVG PARTICLES / EVENT', stats.average.toFixed(2)],
          ['HIGHEST EVENT ENERGY', stats.highest ? `${stats.highest.totalEnergy.toFixed(2)} GeV` : '—'],
          ['MOST COMMON PARTICLE', frequencies[0]?.[0] ?? '—'],
          ['MODEL-FLAGGED EVENTS', stats.interesting.length],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <section className="analysis-panel cms-analysis-panel">
        <div className="cms-analysis-header">
          <div>
            <span className="section-kicker">CMS-STYLE DIMUON WORKFLOW / DERIVED OBSERVABLES</span>
            <h4>J/psi to dimuon selection</h4>
            <p>Four-vector reconstruction and sequential event cuts. This educational analysis is not an official CMS result.</p>
          </div>
          <div className="cms-analysis-actions">
            <label>INPUT DATASET
              <select value={analysisSource} onChange={(event) => setAnalysisSource(event.target.value)}>
                <option value="CMS_REFERENCE">CMS 2010 J/psi dimuon reference ({cmsReferenceEvents.length.toLocaleString()} events)</option>
                <option value="WORKSPACE">Current / archived experiment workspace ({filteredEvents.length.toLocaleString()} events)</option>
              </select>
            </label>
            <label>LINK TO PROJECT
              <select aria-label="Link analysis report to project" value={reportProjectId} onChange={(event) => setReportProjectId(event.target.value)}>
                <option value="">No project</option>
                {researchProjects.items.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={saveReport}>SAVE ANALYSIS REPORT</button>
          </div>
        </div>
        {researchProjects.error && <p className="cms-report-status error" role="alert">{researchProjects.error}</p>}
        {reportStatus && <p className="cms-report-status" role="status">{reportStatus}</p>}
        <div className="cms-analysis-summary">
          <div><span>INPUT EVENTS</span><strong>{inputCount.toLocaleString()}</strong></div>
          <div><span>SELECTED CANDIDATES</span><strong>{selectedCount.toLocaleString()}</strong></div>
          <div><span>SELECTION EFFICIENCY</span><strong>{inputCount ? `${(100 * selectedCount / inputCount).toFixed(2)}%` : '—'}</strong></div>
          <div><span>MEAN SELECTED MASS</span><strong>{cmsResult.meanMassGeV == null ? '—' : `${cmsResult.meanMassGeV.toFixed(4)} GeV`}</strong></div>
          <div><span>MASS RMS</span><strong>{cmsResult.massRmsGeV == null ? '—' : `${cmsResult.massRmsGeV.toFixed(4)} GeV`}</strong></div>
        </div>
        <div className="cms-analysis-workspace">
          <div className="cms-cuts-panel">
            <div className="analysis-panel-header"><div><span className="section-kicker">SELECTION / EDITABLE</span><h5>Muon and resonance cuts</h5></div></div>
            <label>Minimum muon pT <output>{dimuonCuts.minimumMuonPtGeV.toFixed(1)} GeV</output>
              <input type="range" min="0" max="10" step="0.1" value={dimuonCuts.minimumMuonPtGeV} onChange={(event) => setDimuonCuts((current) => ({ ...current, minimumMuonPtGeV: Number(event.target.value) }))} />
            </label>
            <label>Maximum |eta| <output>{dimuonCuts.maximumAbsEta.toFixed(1)}</output>
              <input type="range" min="0.5" max="2.4" step="0.1" value={dimuonCuts.maximumAbsEta} onChange={(event) => setDimuonCuts((current) => ({ ...current, maximumAbsEta: Number(event.target.value) }))} />
            </label>
            <label>Minimum dimuon mass <output>{dimuonCuts.minimumMassGeV.toFixed(2)} GeV</output>
              <input type="range" min="2" max="3.4" step="0.01" value={dimuonCuts.minimumMassGeV} onChange={(event) => setDimuonCuts((current) => ({ ...current, minimumMassGeV: Math.min(Number(event.target.value), current.maximumMassGeV) }))} />
            </label>
            <label>Maximum dimuon mass <output>{dimuonCuts.maximumMassGeV.toFixed(2)} GeV</output>
              <input type="range" min="2.7" max="4" step="0.01" value={dimuonCuts.maximumMassGeV} onChange={(event) => setDimuonCuts((current) => ({ ...current, maximumMassGeV: Math.max(Number(event.target.value), current.minimumMassGeV) }))} />
            </label>
            <label className="cms-charge-cut"><input type="checkbox" checked={dimuonCuts.oppositeChargeRequired} onChange={(event) => setDimuonCuts((current) => ({ ...current, oppositeChargeRequired: event.target.checked }))} /> Require opposite-charge muons</label>
            <p>pT and eta cuts apply to both muons. The analysis uses recorded components and charges; detector efficiencies and missing quantities are not invented.</p>
          </div>
          <div className="cms-cutflow-panel">
            <div className="analysis-panel-header"><div><span className="section-kicker">EVENT SELECTION / CUT FLOW</span><h5>Sequential requirements</h5></div></div>
            {cmsResult.cutflow.map((step, index) => (
              <div className="cms-cutflow-row" key={step.label}>
                <span><i>{String(index + 1).padStart(2, '0')}</i>{step.label}</span>
                <strong>{step.count.toLocaleString()}</strong>
                <div><i style={{ width: `${inputCount ? step.count / inputCount * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="cms-mass-panel">
          <div className="analysis-panel-header"><div><span className="section-kicker">RECONSTRUCTED FOUR-VECTORS / GeV</span><h5>Opposite-sign dimuon mass</h5></div><span>{cmsResult.candidateEventCount.toLocaleString()} candidates before mass-window cut</span></div>
          <CmsMassHistogram histogram={cmsResult.histogram} />
          <div className="cms-result-table">
            <div><span>RUN / EVENT</span><span>RECOMPUTED m(mumu)</span><span>RECORDED m(mumu)</span><span>PAIR pT</span></div>
            {cmsResult.selected.slice(0, 8).map(({ event, candidate, sourceMassGeV }) => (
              <div key={`${event.sourceRun}-${event.sourceEventId}`}>
                <span>{event.sourceRun} / {event.sourceEventId}</span>
                <span>{candidate.massGeV.toFixed(4)} GeV</span>
                <span>{sourceMassGeV == null ? '—' : `${sourceMassGeV.toFixed(4)} GeV`}</span>
                <span>{candidate.transverseMomentumGeV.toFixed(4)} GeV</span>
              </div>
            ))}
            {!cmsResult.selected.length && <p>No events pass the current selection. Relax the cuts to inspect the sample.</p>}
          </div>
          <div className="cms-sideband-estimate">
            <span className="section-kicker">EDUCATIONAL SIDEBAND MODEL / UNWEIGHTED COUNTS</span>
            <div>
              <span>PEAK WINDOW / CANDIDATES</span><strong>{sidebandEstimate.signalWindowCount}</strong>
              <span>EST. BACKGROUND</span><strong>{sidebandEstimate.estimatedBackground.toFixed(2)}</strong>
              <span>S / B</span><strong>{sidebandEstimate.signalToBackground == null ? '—' : sidebandEstimate.signalToBackground.toFixed(2)}</strong>
              <span>S / √B</span><strong>{sidebandEstimate.countingSignificance == null ? '—' : sidebandEstimate.countingSignificance.toFixed(2)}</strong>
            </div>
            <p>Background is extrapolated from fixed low/high mass sidebands under a flat-shape assumption. This selected reference sample has no event weights or independent background model; these values are illustrative only, not a discovery significance.</p>
          </div>
        </div>
        <p className="cms-analysis-provenance">
          Source: <a href="https://opendata.cern.ch/record/301" target="_blank" rel="noreferrer">CERN Open Data record 301</a>, a selected 2,000-event derived CMS dimuon CSV. Recomputed pair mass uses recorded E, px, py, and pz values; the separately shown source mass is the CSV value. This sample does not provide complete CMS detector objects, trigger decisions, pileup, event weights, or luminosity certification.
        </p>
      </section>
      <section className="analysis-panel observable-analysis">
        <div className="analysis-panel-header">
          <div><span className="section-kicker">RECONSTRUCTED OBSERVABLES / SELECTED WORKSPACE</span><h4>Momentum, Direction, and Missing pT</h4></div>
          <span>{observables.counts.events} events / {observables.counts.particles} particles</span>
        </div>
        <div className="observable-summary">
          <div><span>EVENTS WITH STORED pT-IMBALANCE VALUE</span><strong>{observables.counts.missingTransverseMomentum} / {observables.counts.events}</strong></div>
          <div><span>RECONSTRUCTED DIMUON PAIRS</span><strong>{observables.counts.dimuonCandidates}</strong></div>
        </div>
        <div className="observable-grid">
          <ObservableDistribution title="Particle pT" histogram={observables.transverseMomentum} unit="GeV/c" />
          <ObservableDistribution title="Pseudorapidity η" histogram={observables.pseudorapidity} unit="η" />
          <ObservableDistribution title="Azimuth φ" histogram={observables.azimuth} unit="rad" />
          <ObservableDistribution title="Event missing pT" histogram={observables.missingTransverseMomentum} unit="GeV/c" />
          <ObservableDistribution title="Reconstructed dimuon mass" histogram={observables.dimuonMass} unit="GeV/c²" />
        </div>
        <p className="observable-disclaimer">Only stored momentum components or reconstructed detector-response values are used. Recorded CMS events have no missing-pT field. For resampled simulation events, the plotted pT imbalance uses only the selected muon tracks and is not full-event missing transverse momentum; dimuon candidates require recorded muon four-vectors.</p>
      </section>
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
