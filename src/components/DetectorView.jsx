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
  const response = useMemo(() => buildDetectorResponse(event), [event])
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
