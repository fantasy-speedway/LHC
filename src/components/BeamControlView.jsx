import { useEffect, useRef, useState } from 'react'
import { particleOptions } from '../beam/particles'
import { calculateBeamDiagnostics } from '../physics/beam-physics'
import BeamEnergyGraph from './BeamEnergyGraph'
import '../simulation/operation-sequence.css'
import '../beam/beam-control.css'
import '../beam/beam-console.css'
import '../beam/beam-layout.css'

const speeds = [0.25, 0.5, 1, 2, 5, 10]
const CONFIG_LOAD_MS = 5000

function formatEnergy(energyGeV) {
  return energyGeV >= 1000 ? `${(energyGeV / 1000).toFixed(2)} TeV` : `${energyGeV.toFixed(1)} GeV`
}

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
        <label>TARGET ENERGY         <output>{formatEnergy(beam[targetKey])}</output>
        <input disabled={controlsLocked} type="range" min="6" max="6800" step="1" value={beam[targetKey]} onChange={(event) => onChange({ [targetKey]: Number(event.target.value) })} />
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
  const draftDiagnostics = calculateBeamDiagnostics(beam, {
    energyA: simulation.beamEnergy,
    energyB: simulation.beamEnergyB,
  })
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
        <span>MODEL √S<strong>{formatEnergy(simulation.beamDiagnostics.centerOfMassEnergyGeV)}</strong></span>
        <span>LUMINOSITY<strong>{simulation.beamDiagnostics.luminosityAvailable ? `${simulation.beamDiagnostics.luminosityCm2S.toExponential(2)} cm⁻²s⁻¹` : 'HEAD-ON PROTONS REQUIRED'}</strong></span>
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
      <div className="beam-field-setpoint">
        <span>DIPOLE FIELD / REQUIRED {draftDiagnostics.dipoleFieldRequiredTesla.toFixed(4)} T</span>
        <strong>{beam.dipoleFieldTesla.toFixed(4)} T <small>SIMULATED SETPOINT</small></strong>
        <p>Field match {draftDiagnostics.fieldRatio.toFixed(3)}× · p [GeV/c] = 0.299792458 × |q/e| × B [T] × ρ [m]; q/e = {draftDiagnostics.beamA.chargeNumber} / {draftDiagnostics.beamB.chargeNumber}, ρ = {draftDiagnostics.assumptions.bendingRadiusM.toLocaleString()} m.</p>
      </div>
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
      : channel === 'B'
        ? ['particleTypeB', 'targetEnergyB', 'intensityB', 'particleCountB', 'directionB']
        : channel === 'FIELD' ? ['dipoleFieldTesla']
          : channel === 'QUAD' ? ['quadrupoleGradientTM']
            : ['rfVoltageMV']
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
        <span>Configuration is available in standby or technical stop. Beam energy is bounded by the dipole rigidity; quadrupole focusing, RF ramp response, and bunch parameters feed the modeled diagnostics. All controls are educational, not operational.</span>
      </div>

      <section className="console-bank collision-source-bank" aria-label="Data-informed collision model">
        <header><span><b>00.</b> FIXED DATA-INFORMED COLLISION MODEL</span><small>NO SOURCE MODE SWITCH</small></header>
        <div className="collision-source-controls">
          <p>Every simulated event is resampled from the recorded CMS J/ψ→μ⁺μ⁻ dataset and passed through the educational detector-response model. The recorded template is identified in Event Display. This selected sample supports dimuon-like resampling only; its measured momenta are not scaled or relabeled as events at the configured beam energy.</p>
        </div>
      </section>

      <div className="console-readout-strip" aria-label="Live beam channel readouts">
        {readout('BEAM A ENERGY', formatEnergy(simulation.beamEnergy), simulation.startupSystems.beamAInjected)}
        {readout('BEAM B ENERGY', formatEnergy(simulation.beamEnergyB), simulation.startupSystems.beamBInjected)}
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
        <BeamStatusScreen simulation={simulation} beam={draftBeam} />
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
          <header><span><b>05.</b> BEAM DIAGNOSTICS / MACHINE PHYSICS</span><small>LIVE MODEL ESTIMATES</small></header>
          <div className="beam-instrument-readings">
            <span>DIPOLE FIELD / REQUIRED A·B<strong>{simulation.beamDiagnostics.dipoleFieldTesla.toFixed(4)} / {simulation.beamDiagnostics.beamA.requiredFieldTesla.toFixed(4)} · {simulation.beamDiagnostics.beamB.requiredFieldTesla.toFixed(4)} T</strong></span>
            <span>BEAM A · ENERGY / MOMENTUM<strong>{simulation.beamDiagnostics.beamA.energyGeV.toFixed(3)} GeV / {simulation.beamDiagnostics.beamA.momentumGeV.toFixed(3)} GeV/c</strong></span>
            <span>BEAM B · ENERGY / MOMENTUM<strong>{simulation.beamDiagnostics.beamB.energyGeV.toFixed(3)} GeV / {simulation.beamDiagnostics.beamB.momentumGeV.toFixed(3)} GeV/c</strong></span>
            <span>SIGNED MAGNETIC RIGIDITY A / B<strong>{simulation.beamDiagnostics.beamA.magneticRigidityTm.toFixed(3)} / {simulation.beamDiagnostics.beamB.magneticRigidityTm.toFixed(3)} T·m</strong></span>
            <span>RF RAMP FRACTION A / B<strong>{(simulation.beamDiagnostics.rfAccelerationFractionA * 100).toFixed(0)}% / {(simulation.beamDiagnostics.rfAccelerationFractionB * 100).toFixed(0)}%</strong></span>
            <span>NORMALIZED EMITTANCE<strong>{simulation.beamDiagnostics.normalizedEmittanceUm.toFixed(2)} μm</strong></span>
            <span>GEOMETRIC EMITTANCE A / B<strong>{(simulation.beamDiagnostics.geometricEmittanceAM * 1e9).toFixed(3)} / {(simulation.beamDiagnostics.geometricEmittanceBM * 1e9).toFixed(3)} nm·rad</strong></span>
            <span>TRANSVERSE SIZE A / B<strong>{(simulation.beamDiagnostics.beamSizeAM * 1e3).toFixed(3)} / {(simulation.beamDiagnostics.beamSizeBM * 1e3).toFixed(3)} mm</strong></span>
            <span>DIVERGENCE A / B<strong>{(simulation.beamDiagnostics.beamDivergenceAMrad * 1e3).toFixed(3)} / {(simulation.beamDiagnostics.beamDivergenceBMrad * 1e3).toFixed(3)} mrad</strong></span>
            <span>QUADRUPOLE / BETA*<strong>{simulation.beamDiagnostics.quadrupoleGradientTM.toFixed(1)} T/m / {simulation.beamDiagnostics.betaStarM.toFixed(3)} m</strong></span>
            <span>BUNCH POPULATION A / B<strong>{simulation.beamDiagnostics.bunchPopulationA.toExponential(2)} / {simulation.beamDiagnostics.bunchPopulationB.toExponential(2)}</strong></span>
            <span>BUNCH SPACING / EFFECTIVE COUNT<strong>{simulation.beamDiagnostics.bunchSpacingNs} ns / {simulation.beamDiagnostics.numberOfBunches.toLocaleString()}</strong></span>
            <span>BUNCH CROSSINGS / SECOND<strong>{simulation.beamDiagnostics.bunchCollisionFrequencyHz.toLocaleString(undefined, { maximumFractionDigits: 0 })} Hz</strong></span>
            <span>MODEL LUMINOSITY<strong>{simulation.beamDiagnostics.luminosityAvailable ? `${simulation.beamDiagnostics.luminosityCm2S.toExponential(2)} cm⁻²s⁻¹` : 'N/A FOR BEAM CONFIG'}</strong></span>
            <span>ORBIT / STABILITY<strong>{simulation.beamDiagnostics.orbitOffsetMm.toFixed(3)} mm / {simulation.beamDiagnostics.stabilityPercent.toFixed(1)}%</strong></span>
            <span>CENTRE-OF-MASS ENERGY (√s)<strong>{simulation.beamDiagnostics.centerOfMassEnergyGeV.toFixed(3)} GeV</strong></span>
            <span>FIELD LIMIT / ORBIT STATUS<strong>{simulation.beamDiagnostics.fieldLimited ? 'FIELD LIMITED' : 'FIELD OK'} · {simulation.beamDiagnostics.orbitCorrectionNeeded ? 'CORRECTION CHECK' : 'ORBIT OK'}</strong></span>
          </div>
        </section>
        <section className="console-bank beam-diagnostic-bank beam-speed-bank">
          <header><span><b>06.</b> MAGNET FIELD SETPOINT</span><small>{activeChannel === 'FIELD' ? 'LOADING' : controlsLocked ? 'INTERLOCKED' : '5 SEC MODEL'}</small></header>
          <div className="beam-magnet-instrument">
            <label>DIPOLE FIELD <output>{draftBeam.dipoleFieldTesla.toFixed(4)} T</output>
              <input disabled={controlsLocked || activeChannel !== null} type="range" min="0.001" max="8.5" step="0.001" value={draftBeam.dipoleFieldTesla} onChange={(event) => updateDraft({ dipoleFieldTesla: Number(event.target.value) })} />
            </label>
            {activeChannel === 'FIELD' && <progress max="1" value={applyProgress} aria-label="Dipole field setting progress" />}
            <button type="button" disabled={controlsLocked || activeChannel !== null} onClick={() => applyChannel('FIELD')}>
              {activeChannel === 'FIELD' ? `SETTING FIELD · ${Math.round(applyProgress * 100)}%` : 'SET DIPOLE FIELD'}
            </button>
            <label>QUADRUPOLE GRADIENT <output>{draftBeam.quadrupoleGradientTM} T/m</output>
              <input disabled={controlsLocked || activeChannel !== null} type="range" min="20" max="250" step="5" value={draftBeam.quadrupoleGradientTM} onChange={(event) => updateDraft({ quadrupoleGradientTM: Number(event.target.value) })} />
            </label>
            {activeChannel === 'QUAD' && <progress max="1" value={applyProgress} aria-label="Quadrupole gradient setting progress" />}
            <button type="button" disabled={controlsLocked || activeChannel !== null} onClick={() => applyChannel('QUAD')}>
              {activeChannel === 'QUAD' ? `SETTING QUADRUPOLES · ${Math.round(applyProgress * 100)}%` : 'SET QUADRUPOLE CIRCUIT'}
            </button>
            <label>RF CAVITY VOLTAGE <output>{draftBeam.rfVoltageMV.toFixed(1)} MV</output>
              <input disabled={controlsLocked || activeChannel !== null} type="range" min="1" max="32" step="0.5" value={draftBeam.rfVoltageMV} onChange={(event) => updateDraft({ rfVoltageMV: Number(event.target.value) })} />
            </label>
            {activeChannel === 'RF' && <progress max="1" value={applyProgress} aria-label="RF cavity voltage setting progress" />}
            <button type="button" disabled={controlsLocked || activeChannel !== null} onClick={() => applyChannel('RF')}>
              {activeChannel === 'RF' ? `SETTING RF · ${Math.round(applyProgress * 100)}%` : 'SET RF CIRCUIT'}
            </button>
          </div>
          <header className="beam-rate-header"><span><b>07.</b> SIMULATION RATE</span><small>LOCAL MODEL</small></header>
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
