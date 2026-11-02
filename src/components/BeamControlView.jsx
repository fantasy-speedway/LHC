import { useEffect, useRef, useState } from 'react'
import { particleOptions } from '../beam/particles'
import BeamEnergyGraph from './BeamEnergyGraph'
import '../simulation/operation-sequence.css'
import '../beam/beam-control.css'
import '../beam/beam-console.css'
import '../beam/beam-layout.css'

const speeds = [0.25, 0.5, 1, 2, 5, 10]
const CONFIG_LOAD_MS = 5000

function readout(label, value, ready) {
  return (
    <div className={`procedure-readout ${ready ? 'ready' : ''}`} key={label}>
      <i />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function BeamChannelBank({
  channel,
  beam,
  onChange,
  onApply,
  controlsLocked,
  applying,
  applyProgress,
}) {
  const isBeamB = channel === 'B'
  const typeKey = isBeamB ? 'particleTypeB' : 'particleType'
  const targetKey = isBeamB ? 'targetEnergyB' : 'targetEnergy'
  const intensityKey = isBeamB ? 'intensityB' : 'intensity'
  const countKey = isBeamB ? 'particleCountB' : 'particleCount'
  const directionKey = isBeamB ? 'directionB' : 'direction'
  const particle = particleOptions.find((option) => option.value === beam[typeKey])

  return (
    <section className={`console-bank beam-channel-bank ${isBeamB ? 'beam-channel-b' : 'beam-channel-a'}`}>
      <header>
        <span><b>{isBeamB ? '02' : '01'}.</b> BEAM {channel} CONFIGURATION</span>
        <small>{applying ? 'LOADING' : controlsLocked ? 'INTERLOCKED' : 'READY'}</small>
      </header>
      <div className="beam-channel-readout">
        <span className="beam-particle-symbol">{particle?.symbol}</span>
        <div><small>CONFIGURED PARTICLE</small><strong>{particle?.label ?? 'Not selected'}</strong></div>
      </div>
      <div className="beam-channel-controls">
        <label>PARTICLE TYPE
          <select disabled={controlsLocked} value={beam[typeKey]} onChange={(event) => onChange({ [typeKey]: event.target.value })}>
            {particleOptions.map((option) => <option value={option.value} key={option.value}>{option.label} / {option.symbol}</option>)}
          </select>
        </label>
        <label>TARGET ENERGY <output>{beam[targetKey].toFixed(1)} GeV</output>
          <input disabled={controlsLocked} type="range" min="6" max="24" step="0.5" value={beam[targetKey]} onChange={(event) => onChange({ [targetKey]: Number(event.target.value) })} />
        </label>
        <label>BEAM INTENSITY <output>{beam[intensityKey]}%</output>
          <input disabled={controlsLocked} type="range" min="10" max="100" step="1" value={beam[intensityKey]} onChange={(event) => onChange({ [intensityKey]: Number(event.target.value) })} />
        </label>
        <label>SIMULATED PARTICLES <output>{beam[countKey]}</output>
          <input disabled={controlsLocked} type="range" min="32" max="512" step="16" value={beam[countKey]} onChange={(event) => onChange({ [countKey]: Number(event.target.value) })} />
        </label>
        <label>DIRECTION
          <select disabled={controlsLocked} value={beam[directionKey]} onChange={(event) => onChange({ [directionKey]: event.target.value })}>
            <option value="clockwise">Clockwise</option>
            <option value="counterClockwise">Counter-clockwise</option>
          </select>
        </label>
      </div>
      <div className="beam-channel-command">
        <div className="beam-channel-progress" aria-live="polite">
          <i className={applying ? 'active' : ''} />
          <span>{applying ? `APPLYING · ${Math.round(applyProgress * 100)}%` : controlsLocked ? 'CONFIGURATION INHIBITED' : 'CONFIGURATION STAGED'}</span>
        </div>
        {applying && <progress max="1" value={applyProgress} aria-label={`Beam ${channel} configuration progress`} />}
        <button type="button" disabled={controlsLocked} onClick={onApply}>
          {applying ? `LOADING · ${Math.ceil(CONFIG_LOAD_MS * (1 - applyProgress) / 1000)} SEC` : `LOAD BEAM ${channel}`}
        </button>
      </div>
    </section>
  )
}

function BeamStatusScreen({ simulation, beam }) {
  const { startupSystems: systems } = simulation
  const statusA = systems.beamAInjected ? 'INJECTED' : 'NOT INJECTED'
  const statusB = systems.beamBInjected ? 'INJECTED' : 'NOT INJECTED'
  const particleA = particleOptions.find((option) => option.value === beam.particleType)
  const particleB = particleOptions.find((option) => option.value === beam.particleTypeB)

  return (
    <section className="console-ring-screen beam-status-screen" aria-label="Dual beam channel status screen">
      <header><span>DUAL BEAM CONTROL / CHANNEL MONITOR</span><i>MODEL / NO LIVE CONNECTION</i></header>
      <div className="beam-screen-metrics">
        <span>CHANNEL A<strong>{statusA}</strong></span>
        <span>CHANNEL B<strong>{statusB}</strong></span>
        <span>RAMP STATUS<strong>{systems.beamRampComplete ? 'AT TARGET' : systems.rfEnabled ? 'READY' : 'STANDBY'}</strong></span>
        <span>COLLISIONS<strong>{systems.collisionsActive ? 'ACTIVE · LOCAL' : 'OFF'}</strong></span>
      </div>
      <div className="beam-ring-visual">
        <svg viewBox="0 0 360 220" role="img" aria-label="Schematic of the two counter-circulating beam channels">
          <defs>
            <filter id="beam-screen-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <ellipse cx="180" cy="111" rx="136" ry="66" fill="none" stroke="#1b4550" strokeWidth="15" />
          <ellipse cx="180" cy="111" rx="136" ry="66" fill="none" stroke="#59d7cd" strokeWidth="2" strokeDasharray="9 3" filter="url(#beam-screen-glow)" />
          <ellipse cx="180" cy="111" rx="127" ry="57" fill="none" stroke="#e990c8" strokeWidth="2" strokeDasharray="9 3" />
          <ellipse cx="180" cy="111" rx="101" ry="38" fill="none" stroke="#314d55" strokeWidth="1" />
          <path d="M45 110h270M180 44v133" stroke="#172c33" strokeWidth="1" strokeDasharray="3 5" />
          <path d="M92 59l8-5-1 9zM269 157l-8 5 1-9z" fill="#59d7cd" />
          <path d="M265 57l-8-5 1 9zM95 161l8 5-1-9z" fill="#e990c8" />
          <g fill="#5de7a4" stroke="#071217" strokeWidth="3">
            <circle cx="180" cy="45" r="6" /><circle cx="44" cy="111" r="6" /><circle cx="180" cy="177" r="6" /><circle cx="316" cy="111" r="6" />
          </g>
          <g fill="#a8bdba" fontSize="9" fontFamily="IBM Plex Mono, monospace">
            <text x="164" y="25">CMS</text><text x="12" y="100">ALICE</text><text x="158" y="200">ATLAS</text><text x="294" y="100">LHCb</text>
            <text x="86" y="98" fill="#59d7cd">A · {particleA?.symbol ?? '—'}</text>
            <text x="207" y="133" fill="#e990c8">B · {particleB?.symbol ?? '—'}</text>
          </g>
        </svg>
        <div className="beam-screen-readouts">
          <span><i className="beam-channel-a-light" />BEAM A<strong>{simulation.beamEnergy.toFixed(2)} GeV</strong></span>
          <span><i className="beam-channel-b-light" />BEAM B<strong>{simulation.beamEnergyB.toFixed(2)} GeV</strong></span>
          <span>INTENSITY<strong>{beam.intensity}% / {beam.intensityB}%</strong></span>
          <span>PARTICLES<strong>{beam.particleCount} / {beam.particleCountB}</strong></span>
        </div>
      </div>
      <footer>
        <span>BEAM A <i className={systems.beamAInjected ? 'on' : ''} /></span>
        <span>BEAM B <i className={systems.beamBInjected ? 'on beam-b' : ''} /></span>
        <span>RF SYSTEM <i className={systems.rfEnabled ? 'on' : ''} /></span>
        <span>ENERGY RAMP <i className={systems.beamRampComplete ? 'on' : ''} /></span>
      </footer>
    </section>
  )
}

export default function BeamControlView({ simulation, onBeamChange, onSpeed }) {
  const controlsLocked = !['STANDBY', 'TECHNICAL_STOP'].includes(simulation.operationPhase)
  const [draftBeam, setDraftBeam] = useState(simulation.beam)
  const [activeChannel, setActiveChannel] = useState(null)
  const [applyProgress, setApplyProgress] = useState(0)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [])

  const updateDraft = (updates) => {
    setDraftBeam((current) => ({ ...current, ...updates }))
  }

  const applyChannel = (channel) => {
    if (controlsLocked || activeChannel) return

    const channelKeys = channel === 'A'
      ? ['particleType', 'targetEnergy', 'intensity', 'particleCount', 'direction']
      : ['particleTypeB', 'targetEnergyB', 'intensityB', 'particleCountB', 'directionB']
    const config = Object.fromEntries(channelKeys.map((key) => [key, draftBeam[key]]))
    const startedAt = performance.now()
    setActiveChannel(channel)
    setApplyProgress(0)
    intervalRef.current = window.setInterval(() => {
      setApplyProgress(Math.min(1, (performance.now() - startedAt) / CONFIG_LOAD_MS))
    }, 50)
    timeoutRef.current = window.setTimeout(() => {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
      timeoutRef.current = null
      onBeamChange(config)
      setActiveChannel(null)
      setApplyProgress(0)
    }, CONFIG_LOAD_MS)
  }

  const statusLabel = controlsLocked ? 'CONFIGURATION LOCKED' : 'STANDBY / READY'

  return (
    <section className="operation-sequence beam-control-console" aria-labelledby="beam-console-title">
      <header className="operation-sequence-header">
        <div>
          <span className="section-kicker">SIMULATED BEAM OPERATOR CONSOLE</span>
          <h3 id="beam-console-title">Dual-channel beam configuration and diagnostics</h3>
          <p>Stage Beam A and Beam B settings independently. Load each channel with its timed operator pushbutton.</p>
        </div>
        <strong className={`operation-phase ${controlsLocked ? 'phase-startup-procedure' : ''}`}>{statusLabel}</strong>
      </header>

      <div className="procedure-reference beam-control-reference">
        <strong>BEAM CHANNEL SETTINGS</strong>
        <span>Configuration is available in standby or technical stop. Injection, RF, acceleration, and alignment remain interlocked in the Overview startup procedure.</span>
      </div>

      <div className="console-readout-strip" aria-label="Live beam channel readouts">
        {readout('BEAM A ENERGY', `${simulation.beamEnergy.toFixed(2)} GeV`, simulation.startupSystems.beamAInjected)}
        {readout('BEAM B ENERGY', `${simulation.beamEnergyB.toFixed(2)} GeV`, simulation.startupSystems.beamBInjected)}
        {readout('BEAM A INTENSITY', `${simulation.beam.intensity}%`, simulation.startupSystems.beamAInjected)}
        {readout('BEAM B INTENSITY', `${simulation.beam.intensityB}%`, simulation.startupSystems.beamBInjected)}
        {readout('BEAM STABILITY', `${simulation.beamStability.toFixed(1)}%`, simulation.beamStability > 97)}
      </div>

      <div className="beam-console-main-grid">
        <BeamChannelBank
          channel="A" beam={draftBeam} onChange={updateDraft}
          onApply={() => applyChannel('A')} controlsLocked={controlsLocked || activeChannel !== null}
          applying={activeChannel === 'A'} applyProgress={activeChannel === 'A' ? applyProgress : 0}
        />
        <BeamStatusScreen simulation={simulation} beam={simulation.beam} />
        <BeamChannelBank
          channel="B" beam={draftBeam} onChange={updateDraft}
          onApply={() => applyChannel('B')} controlsLocked={controlsLocked || activeChannel !== null}
          applying={activeChannel === 'B'} applyProgress={activeChannel === 'B' ? applyProgress : 0}
        />
      </div>

      <div className="console-lower-banks beam-console-lower">
        <section className="console-bank beam-diagnostic-bank">
          <header><span><b>03.</b> BEAM A ENERGY HISTORY</span><small>SIMULATED</small></header>
          <BeamEnergyGraph history={simulation.energyHistory} />
        </section>
        <section className="console-bank beam-diagnostic-bank">
          <header><span><b>04.</b> BEAM B ENERGY HISTORY</span><small>SIMULATED</small></header>
          <BeamEnergyGraph history={simulation.energyHistoryB} />
        </section>
        <section className="console-bank beam-diagnostic-bank">
          <header><span><b>05.</b> CIRCULATION METRICS</span><small>MODEL</small></header>
          <div className="beam-instrument-readings">
            <span>REVOLUTIONS A<strong>{simulation.revolutions.toFixed(2)}</strong></span>
            <span>REVOLUTIONS B<strong>{simulation.revolutionsB.toFixed(2)}</strong></span>
            <span>DETECTOR ACTIVITY<strong>{Math.round(simulation.beamActivity * 100)}%</strong></span>
            <span>DETECTED PARTICLES<strong>{simulation.detectedParticles.toLocaleString()}</strong></span>
          </div>
        </section>
        <section className="console-bank beam-diagnostic-bank beam-speed-bank">
          <header><span><b>06.</b> SIMULATION RATE</span><small>LOCAL MODEL</small></header>
          <div className="beam-speed-control">
            <span>MODEL SPEED</span>
            <div>{speeds.map((speed) => <button className={simulation.speed === speed ? 'active' : ''} onClick={() => onSpeed(speed)} key={speed}>{speed}×</button>)}</div>
          </div>
        </section>
      </div>

      <p className="operation-disclaimer">
        Educational control model only. These controls configure local simulated beam parameters and do not represent CERN settings or live telemetry. No accelerator hardware is connected.
      </p>
    </section>
  )
}
