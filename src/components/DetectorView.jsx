import { useMemo, useState } from 'react'
import { buildDetectorResponse } from '../detector/model'
import './detector-view.css'

const detectorSystems = {
  ATLAS: {
    name: 'ATLAS',
    description: 'A general-purpose experiment with an inner tracker, calorimeters, a large air-core muon spectrometer, and a toroidal magnet system.',
    components: [
      { id: 'tracking', name: 'Inner Detector', detail: 'Pixel, silicon-strip, and transition-radiation tracking systems.' },
      { id: 'electromagnetic', name: 'Electromagnetic calorimeter', detail: 'Liquid-argon calorimetry measures electromagnetic showers.' },
      { id: 'hadronic', name: 'Hadronic calorimeter', detail: 'Tile and liquid-argon systems sample hadronic showers.' },
      { id: 'muon', name: 'Muon spectrometer', detail: 'Large outer tracking chambers measure muons.' },
      { id: 'magnets', name: 'Magnet system', detail: 'Solenoid and toroidal magnets bend charged-particle trajectories.' },
    ],
  },
  CMS: {
    name: 'CMS',
    description: 'A general-purpose experiment with a silicon tracker, crystal electromagnetic calorimeter, hadron calorimeter, and muon detectors inside and outside a solenoid.',
    components: [
      { id: 'tracking', name: 'Silicon tracker', detail: 'Pixel and strip tracking reconstruct charged-particle trajectories.' },
      { id: 'electromagnetic', name: 'Electromagnetic calorimeter (ECAL)', detail: 'Lead-tungstate crystals measure electromagnetic showers.' },
      { id: 'hadronic', name: 'Hadron calorimeter (HCAL)', detail: 'Sampling calorimetry measures hadronic shower energy.' },
      { id: 'muon', name: 'Muon system', detail: 'Drift tubes, cathode-strip chambers, and resistive-plate chambers identify muons.' },
      { id: 'magnets', name: 'Solenoid magnet', detail: 'The 3.8 T superconducting solenoid bends charged tracks within the detector.' },
    ],
  },
}

function DetectorGeometry({ event }) {
  const layers = [
    { id: 'tracking', label: 'PIXEL + STRIP TRACKER', radius: 32, color: '#59d7cd' },
    { id: 'electromagnetic', label: 'ECAL / CRYSTALS', radius: 54, color: '#f0b36d' },
    { id: 'hadronic', label: 'HCAL / SAMPLING', radius: 72, color: '#d58cff' },
    { id: 'muon', label: 'MUON CHAMBERS', radius: 98, color: '#8fb8ff' },
  ]
  const particles = (event?.particles ?? []).filter((particle) => particle.charge !== 0 || ['Photon', 'Jet'].includes(particle.type))
  const cells = event?.detectorResponse?.cells ?? []
  const magneticField = event?.detectorResponse?.magneticFieldTesla ?? 3.8
  const vertex = event?.reconstructedVertex
  const vertexX = vertex?.available ? 400 + vertex.xMm * 0.1 : 400
  const vertexY = vertex?.available ? 130 - vertex.yMm * 0.1 : 130

  return (
    <section className="detector-geometry-panel">
      <header><span className="section-kicker">DETECTOR GEOMETRY / EVENT RESPONSE</span><strong>BARREL + ENDCAP CROSS-SECTION</strong></header>
      <div className="detector-geometry-scroll">
        <svg viewBox="0 0 800 260" role="img" aria-label="Schematic CMS barrel and endcap detector geometry with event tracks and calorimeter cells">
          <path d="M190 130H610" className="detector-geometry-beamline" />
          {layers.map((layer) => (
            <g key={layer.id} className="detector-geometry-layer">
              <path d={`M225 ${130 - layer.radius}H575 C600 ${130 - layer.radius} 600 ${130 + layer.radius} 575 ${130 + layer.radius}H225 C200 ${130 + layer.radius} 200 ${130 - layer.radius} 225 ${130 - layer.radius}Z`} stroke={layer.color} />
              <ellipse cx="225" cy="130" rx="14" ry={layer.radius} stroke={layer.color} />
              <ellipse cx="575" cy="130" rx="14" ry={layer.radius} stroke={layer.color} />
              <text x="620" y={134 - layer.radius} fill={layer.color}>{layer.label}</text>
            </g>
          ))}
          <text x="360" y="24" className="detector-geometry-label">CMS-INSPIRED BARREL</text>
          <text x="204" y="246" className="detector-geometry-label">ENDCAP</text>
          <text x="548" y="246" className="detector-geometry-label">ENDCAP</text>
          <circle cx={vertexX} cy={vertexY} r="3" className="detector-geometry-vertex" />
          {particles.map((particle, index) => {
            const pt = Math.max(particle.transverseMomentum ?? 0.1, 0.1)
            const bend = particle.charge
              ? Math.sign(particle.charge) * Math.min(0.9, 0.04 * magneticField / pt)
              : 0
            const phi = (particle.direction ?? 0) + bend
            const endRadius = ['Photon', 'Jet'].includes(particle.type) ? 76 : 50
            const endX = 400 + Math.cos(phi) * endRadius
            const endY = 130 + Math.sin(phi) * endRadius
            const controlX = 400 + Math.cos(phi + bend * 0.5) * endRadius * 0.56
            const controlY = 130 + Math.sin(phi + bend * 0.5) * endRadius * 0.56
            return <path key={particle.id ?? index} d={`M400 130 Q${controlX} ${controlY} ${endX} ${endY}`} className={`detector-event-track ${particle.type.toLowerCase()}`}><title>{`${particle.type} · pT ${particle.transverseMomentum?.toFixed(2) ?? '—'} GeV/c${particle.charge ? ` · charge ${particle.charge}` : ''}`}</title></path>
          })}
          {cells.map((cell) => {
            const radius = cell.layerId === 'electromagnetic' ? 56 : 75
            const x = 400 + Math.cos(cell.phi) * radius
            const y = 130 + Math.sin(cell.phi) * radius
            return <rect key={cell.id} x={x - 3} y={y - 3} width="6" height="6" className={`detector-energy-cell ${cell.layerId}`}><title>{`${cell.layerId} cell · ${cell.energyGeV.toFixed(2)} GeV`}</title></rect>
          })}
          <text x="20" y="232" className="detector-geometry-note">SOLENOID FIELD: {magneticField.toFixed(1)} T</text>
          <text x="20" y="247" className="detector-geometry-note">SCHEMATIC / NOT TO SCALE</text>
        </svg>
      </div>
      <p>Charged-track curvature and calorimeter-cell deposits are educational response-model outputs for data-informed simulations. The model starts from resampled recorded CMS dimuon reconstructions; it does not produce detector measurements or a full collision simulation.</p>
    </section>
  )
}

function layerMeasurement(component, response, event, selectedDetector) {
  if (!event) return { status: 'AWAITING EVENT', value: '—', detail: 'Select or generate an event to inspect response.' }
  if (component.id === 'magnets') {
    return {
      status: 'DETECTOR REFERENCE',
      value: selectedDetector === 'CMS' ? '3.8 T reference' : 'ATLAS field system',
      detail: 'Reference description only; magnetic field values are not measured by this event view.',
    }
  }

  const layer = response.find((item) => item.id === component.id)
  if (event.dataOrigin === 'CERN Open Data') {
    if (selectedDetector !== 'CMS') {
      return { status: 'NO ATLAS RECORD LOADED', value: 'Unavailable', detail: 'The bundled CERN sample contains CMS records only; ATLAS measurements are not inferred.' }
    }
    if (!layer?.available) {
      return { status: 'NOT IN SOURCE FILE', value: 'Unavailable', detail: 'This CMS CSV contains no measurements for this detector subsystem.' }
    }
    return {
      status: 'CMS SOURCE TRACKS',
      value: `${layer.detected ?? 0} track${layer.detected === 1 ? '' : 's'}`,
      detail: component.id === 'muon'
        ? 'Global-muon classifications from the recorded CMS event; not raw chamber hits.'
        : 'Reconstructed muon tracks from the recorded CMS source; not raw silicon hits.',
    }
  }

  return {
    status: 'SIMULATED RESPONSE',
    value: `${layer?.detected ?? 0} modeled hits`,
    detail: 'Educational detector-model output, not a CERN measurement.',
  }
}

export default function DetectorView({ simulation }) {
  const [selectedDetector, setSelectedDetector] = useState('CMS')
  const [eventId, setEventId] = useState(null)
  const event = simulation.eventHistory.find((item) => item.id === eventId) ?? simulation.latestCollision
  const response = useMemo(
    () => event?.detectorResponse?.layers ?? buildDetectorResponse(event),
    [event],
  )
  const detector = detectorSystems[selectedDetector]
  const isCernEvent = event?.dataOrigin === 'CERN Open Data'
  const measurementsAvailable = isCernEvent
    ? selectedDetector === 'CMS' ? response.filter((layer) => layer.available).length : 0
    : event ? response.length : 0

  return (
    <div className="detector-view">
      <header className="detector-toolbar">
        <div>
          <span className="section-kicker">DETECTOR / EXPERIMENT SELECTOR</span>
          <h3>Individual Detector Systems</h3>
          <p>Choose an experiment to inspect its detector subsystems separately.</p>
        </div>
        <label className="detector-event-select">
          <span>EVENT</span>
          <select value={eventId ?? ''} onChange={(input) => setEventId(input.target.value ? Number(input.target.value) : null)}>
            <option value="">LATEST EVENT</option>
            {simulation.eventHistory.slice().reverse().map((historyEvent) => (
              <option value={historyEvent.id} key={historyEvent.id}>{historyEvent.label}</option>
            ))}
          </select>
        </label>
      </header>

      <nav className="detector-selector" aria-label="Select experiment detector">
        {Object.keys(detectorSystems).map((name) => (
          <button
            className={selectedDetector === name ? 'active' : ''}
            key={name}
            onClick={() => setSelectedDetector(name)}
            aria-pressed={selectedDetector === name}
          >
            <span>{name}</span>
            <small>{name === 'CMS' && isCernEvent ? 'SOURCE DATA LOADED' : name === 'ATLAS' && isCernEvent ? 'NO ATLAS SAMPLE' : 'DETECTOR OVERVIEW'}</small>
          </button>
        ))}
      </nav>

      <section className={`detector-experiment-panel detector-${selectedDetector.toLowerCase()}`}>
        <div className="detector-experiment-heading">
          <div>
            <span className="section-kicker">CERN EXPERIMENT / {detector.name}</span>
            <h4>{detector.name} detector</h4>
            <p>{detector.description}</p>
          </div>
          <div className="detector-experiment-stats">
            <span>EVENT<strong>{event?.label ?? 'No event selected'}</strong></span>
            <span>SUBSYSTEMS<strong>{detector.components.length}</strong></span>
            <span>LAYERS WITH EVENT DATA<strong>{measurementsAvailable}</strong></span>
          </div>
        </div>

        <DetectorGeometry event={event} />

        <section className="detector-vertex-panel">
          <div>
            <span className="section-kicker">TRACK RECONSTRUCTION / PRIMARY VERTEX</span>
            <h4>{event?.reconstructedVertex?.available ? 'Educational track-fit estimate' : 'Vertex unavailable from this event'}</h4>
            <p>{event?.reconstructedVertex?.available
              ? `${event.reconstructedVertex.method}. Impact-parameter measurements are generated by the local response model and are not present in the recorded CMS file.`
              : isCernEvent
                ? 'The bundled CMS reference contains reconstructed muon momenta, not per-track impact parameters or raw hits, so this interface does not infer a vertex from those records.'
                : 'At least two reconstructed charged tracks with modeled impact-parameter measurements are needed for this educational fit.'}</p>
          </div>
          {event?.reconstructedVertex?.available && (
            <div className="detector-vertex-readings">
              <span>X<strong>{event.reconstructedVertex.xMm.toFixed(4)} mm</strong></span>
              <span>Y<strong>{event.reconstructedVertex.yMm.toFixed(4)} mm</strong></span>
              <span>Z<strong>{event.reconstructedVertex.zMm.toFixed(2)} mm</strong></span>
              <span>TRACKS / Z RESOLUTION<strong>{event.reconstructedVertex.tracksUsed} / ±{event.reconstructedVertex.resolutionMm.longitudinal.toFixed(1)} mm</strong></span>
            </div>
          )}
        </section>

        <div className="detector-component-list">
          {detector.components.map((component, index) => {
            const measurement = layerMeasurement(component, response, event, selectedDetector)
            return (
              <article className={`detector-component-card ${measurement.status === 'NOT IN SOURCE FILE' || measurement.status === 'NO ATLAS RECORD LOADED' ? 'unavailable' : ''}`} key={component.id}>
                <div className={`detector-component-diagram diagram-${component.id}`} aria-hidden="true">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="detector-component-copy">
                  <span className="section-kicker">SUBSYSTEM / {String(index + 1).padStart(2, '0')}</span>
                  <h5>{component.name}</h5>
                  <p>{component.detail}</p>
                  <div className="detector-measurement">
                    <span>{measurement.status}</span>
                    <strong>{measurement.value}</strong>
                    <small>{measurement.detail}</small>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <aside className="detector-data-note">
        <span className="section-kicker">DATA PROVENANCE</span>
        <p>{isCernEvent
          ? selectedDetector === 'CMS'
            ? 'The bundled sample contains reconstructed CMS dimuon records. Track classifications are source data; it does not contain raw detector hits, calorimeter deposits, or ATLAS events.'
            : 'Only CMS records are bundled in this app. ATLAS is shown as a detector reference; no ATLAS measurements are loaded or inferred.'
          : 'Detector response values for local generated events are educational model estimates, not readings from ATLAS, CMS, or live CERN equipment.'}</p>
      </aside>
    </div>
  )
}
