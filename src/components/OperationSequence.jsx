import { startupProcedure, startupProcedureSections } from '../simulation/startup-procedure'
import '../simulation/operation-sequence.css'

function isStartupPhase(phase) {
  return ['STANDBY', 'TECHNICAL_STOP', 'STARTUP_PROCEDURE'].includes(phase)
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

function sectionClass(section) {
  return section.toLowerCase().replaceAll(' ', '-')
}

function StartupControlGroup({ section, number, simulation, operations }) {
  const completed = new Set(simulation.completedProcedureSteps)
  const steps = startupProcedure.filter((step) => step.section === section)
  const active = isStartupPhase(simulation.operationPhase)
  const currentStep = simulation.startupProcedureStep

  return (
    <section className={`startup-procedure-group console-bank bank-${sectionClass(section)}`}>
      <header>
        <span><b>{number}.</b> {section}</span>
        <small>{steps.filter((step) => completed.has(step.id)).length} / {steps.length} READY</small>
      </header>
      <div className="startup-procedure-actions">
        {steps.map((step) => {
          const index = startupProcedure.indexOf(step)
          const isComplete = completed.has(step.id)
          const isBusy = simulation.startupBusyStep === step.id
          const isCurrent = active && !isComplete && index === currentStep
          const isLocked = !isComplete && !isCurrent
          const canTurnOff = step.control === 'switch' && isComplete && active && !isBusy
          const className = `startup-procedure-action ${isComplete ? 'complete' : isCurrent ? 'current' : 'locked'}`
          return (
            <article className={className} key={step.id}>
              <span className="procedure-action-state">{isComplete ? '✓' : isLocked ? '○' : isBusy ? '…' : '▶'}</span>
              <div className="procedure-action-copy">
                <strong>{step.label}</strong>
                <p>{step.description}</p>
                {isBusy && <progress max="1" value={simulation.startupProgress} aria-label={`${step.label} progress`} />}
              </div>
              {step.control === 'switch' ? (
                <label className={`procedure-switch ${isComplete || isBusy && simulation.startupSwitchTarget ? 'on' : ''} ${isLocked || isBusy ? 'locked' : ''}`}>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={step.command}
                    checked={isBusy ? simulation.startupSwitchTarget ?? isComplete : isComplete}
                    disabled={(!isCurrent && !canTurnOff) || isBusy}
                    onChange={(event) => operations.performStartupAction(step.id, event.target.checked)}
                  />
                  <span className="procedure-switch-track"><i /></span>
                  <strong>
                    {isBusy
                      ? `${simulation.startupSwitchTarget ? 'STARTING' : 'SHUTTING OFF'} ${Math.round(simulation.startupProgress * 100)}%`
                      : isComplete ? 'ON / READY' : 'OFF'}
                  </strong>
                </label>
              ) : (
                <button
                  onClick={() => operations.performStartupAction(step.id)}
                  disabled={!isCurrent || isBusy}
                  title={isLocked ? 'Complete the previous interlocked control first.' : step.description}
                >
                  {isComplete ? '✓ COMPLETE' : isBusy ? `IN PROGRESS · ${Math.round(simulation.startupProgress * 100)}%` : step.command}
                </button>
              )}
              <small className="procedure-action-timing">
                {step.duration >= 10000 ? `MODEL WAIT · ${(step.duration / 1000).toFixed(0)} SEC` : `MODEL · ${(step.duration / 1000).toFixed(1)} SEC`}
              </small>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RingStatusScreen({ simulation, systems, beamEnergy, colliderStatus, beamStatus, collisionActive }) {
  return (
    <section className="console-ring-screen" aria-label="Simulated LHC ring status">
      <header><span>LHC RING STATUS</span><i>MODEL / NO LIVE CONNECTION</i></header>
      <div className="console-ring-body">
        <div className="console-ring-metrics">
          <span>STATUS<strong>{colliderStatus}</strong></span>
          <span>BEAM ENERGY<strong>{systems.beamRampComplete ? beamEnergy : 'NOT AT TARGET'}</strong></span>
          <span>LUMINOSITY<strong>NOT MODELED</strong></span>
          <span>BEAM A<strong>{systems.beamAInjected ? beamStatus : 'OFF'}</strong></span>
          <span>BEAM B<strong>{systems.beamBInjected ? beamStatus : 'OFF'}</strong></span>
          <span>COLLISIONS<strong>{collisionActive ? 'ACTIVE · LOCAL' : 'OFF'}</strong></span>
          <span>EVENTS<strong>{simulation.collisions.toLocaleString()}</strong></span>
        </div>
        <svg className="console-ring-svg" viewBox="0 0 360 245" role="img" aria-label="Schematic of the LHC ring and detector locations">
          <defs>
            <filter id="ring-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <ellipse cx="180" cy="122" rx="145" ry="76" fill="none" stroke="#1b4550" strokeWidth="14" />
          <ellipse cx="180" cy="122" rx="145" ry="76" fill="none" stroke="#59d7cd" strokeWidth="2" strokeDasharray="9 3" filter="url(#ring-glow)" />
          <ellipse cx="180" cy="122" rx="137" ry="68" fill="none" stroke="#e990c8" strokeWidth="2" strokeDasharray="9 3" />
          <ellipse cx="180" cy="122" rx="112" ry="49" fill="none" stroke="#314d55" strokeWidth="1" />
          <path d="M37 121h286M180 44v156" stroke="#172c33" strokeWidth="1" strokeDasharray="3 5" />
          <g fill="#59d7cd" stroke="#071217" strokeWidth="3">
            <circle cx="180" cy="46" r="7" /><circle cx="36" cy="122" r="7" /><circle cx="180" cy="198" r="7" /><circle cx="324" cy="122" r="7" />
          </g>
          <g fill="#a8bdba" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            <text x="164" y="27">CMS</text><text x="9" y="112">ALICE</text><text x="159" y="224">ATLAS</text><text x="299" y="111">LHCb</text>
            <text x="89" y="93" fill="#59d7cd">BEAM A</text><text x="216" y="154" fill="#e990c8">BEAM B</text>
          </g>
          <g fill="#e2a16c">
            <circle cx="88" cy="68" r="3" /><circle cx="270" cy="68" r="3" /><circle cx="88" cy="176" r="3" /><circle cx="270" cy="176" r="3" />
          </g>
        </svg>
      </div>
      <footer>
        <span>BEAM A <i className={systems.beamAInjected ? 'on' : ''} /></span>
        <span>BEAM B <i className={systems.beamBInjected ? 'on beam-b' : ''} /></span>
        <span>MAGNETS <i className={systems.magnetPowerEnabled ? 'on magnet' : ''} /></span>
        <span>DETECTORS <i className={systems.atlasReady && systems.cmsReady ? 'on detector' : ''} /></span>
      </footer>
    </section>
  )
}

function StartupPanel({ simulation, operations }) {
  const phase = simulation.operationPhase
  const systems = simulation.startupSystems
  const beamEnergy = `${simulation.beamEnergy.toFixed(2)} / ${simulation.beamEnergyB.toFixed(2)} GeV`
  const referenceEnergy = '13.6 TeV Run 3 reference'
  const collisionActive = ['COLLISIONS', 'END_FILL_REQUESTED'].includes(phase)
  const beamStatus = phase === 'DUMPING' ? 'DUMP IN PROGRESS' : phase === 'BEAM_DUMPED' ? 'DUMPED' : ['RAMPING_DOWN', 'TECHNICAL_STOP'].includes(phase) ? 'OFF' : 'STABLE · MODEL'
  const colliderStatus = phase === 'COLLISIONS'
    ? 'RUNNING'
    : phase === 'END_FILL_REQUESTED'
      ? 'END OF FILL REQUESTED'
      : phase === 'END_FILL'
        ? 'FILL ENDED'
        : phase === 'DUMPING'
          ? 'BEAM DUMP IN PROGRESS'
          : ['BEAM_DUMPED', 'RAMPING_DOWN', 'TECHNICAL_STOP'].includes(phase)
            ? phase.replaceAll('_', ' ')
            : systems.collisionModeArmed ? 'COLLISION MODE ARMED' : 'READYING FILL'

  return (
    <>
      <div className="procedure-reference">
        <strong>{referenceEnergy}</strong>
        <span>CERN Run 3 reference only. The local energy is shown separately in GeV; luminosity is not modeled.</span>
      </div>

      <div className="console-readout-strip" aria-label="Live simulated readouts">
        {readout('MAGNET TEMPERATURE', `${systems.cryoTemperature.toFixed(1)} K`, systems.cryoReady)}
        {readout('RING PRESSURE', `${systems.vacuumPressure.toExponential(1)} mbar`, systems.vacuumStable)}
        {readout('DIPOLE CURRENT', `${systems.dipoleProgress.toFixed(0)}%`, systems.dipolesReady)}
        {readout('BEAM A / B ENERGY', beamEnergy, systems.beamRampComplete)}
        {readout(
          'BEAM A / B CURRENT',
          `${systems.beamAInjected ? simulation.beam.particleCount.toLocaleString() : 0} / ${systems.beamBInjected ? simulation.beam.particleCountB.toLocaleString() : 0} model particles`,
          systems.beamAInjected && systems.beamBInjected,
        )}
      </div>

      <div className="console-main-grid">
        <div className="console-side-bank left">
          {startupProcedureSections.slice(0, 3).map((section, index) => (
            <StartupControlGroup key={section} section={section} number={index + 1} simulation={simulation} operations={operations} />
          ))}
        </div>
        <RingStatusScreen
          simulation={simulation}
          systems={systems}
          beamEnergy={beamEnergy}
          colliderStatus={colliderStatus}
          beamStatus={beamStatus}
          collisionActive={collisionActive}
        />
        <div className="console-side-bank right">
          {startupProcedureSections.slice(3, 6).map((section, index) => (
            <StartupControlGroup key={section} section={section} number={index + 4} simulation={simulation} operations={operations} />
          ))}
        </div>
      </div>

      <div className="console-lower-banks">
        {startupProcedureSections.slice(6).map((section, index) => (
          <StartupControlGroup key={section} section={section} number={index + 7} simulation={simulation} operations={operations} />
        ))}
      </div>

      {phase === 'COLLISIONS' && (
        <div className="operation-guidance" aria-live="polite">
          <p>Data-informed simulation is active using resampled CMS dimuon records. Use end-of-fill to stop on the next event boundary.</p>
          <button className="operation-action warning" onClick={operations.endFill}>REQUEST END OF FILL</button>
        </div>
      )}
      {phase === 'END_FILL_REQUESTED' && (
        <div className="operation-guidance" aria-live="polite"><p>Waiting for the next event boundary; collision generation will stop before beam extraction.</p></div>
      )}
      {phase === 'END_FILL' && (
        <div className="operation-guidance" aria-live="polite">
          <p>The fill has ended. The beams remain in stable circulation until the dump command.</p>
          <button className="operation-action warning" onClick={operations.dumpBeam}>EXTRACT BEAMS TO DUMP</button>
        </div>
      )}
      {phase === 'DUMPING' && (
        <div className="operation-guidance" aria-live="polite"><p>Beam extraction to the modeled dump is in progress.</p></div>
      )}
      {phase === 'BEAM_DUMPED' && (
        <div className="operation-guidance" aria-live="polite">
          <p>Beams are dumped. For another fill, keep the modeled cryogenic and magnet systems ready; a technical stop is optional.</p>
          <div className="operation-actions">
            <button className="operation-action primary" onClick={operations.prepareNextFill}>PREPARE NEXT FILL</button>
            <button className="operation-action warning" onClick={operations.rampDown}>BEGIN TECHNICAL STOP</button>
          </div>
        </div>
      )}
      {phase === 'RAMPING_DOWN' && (
        <div className="operation-guidance" aria-live="polite"><p>Magnet power converters are ramping down in the local model.</p></div>
      )}
      {phase === 'TECHNICAL_STOP' && (
        <div className="operation-guidance" aria-live="polite"><p>Technical-stop state. Begin again with grid power when ready; real cooldown and warm-up durations are not modeled.</p></div>
      )}
      {phase === 'FAULT' && (
        <div className="operation-guidance" aria-live="assertive"><p>Procedure halted by a modeled fault. Do not treat this local interface as a machine-protection system.</p></div>
      )}
      {phase === 'STANDALONE_RUN' && (
        <div className="operation-guidance" aria-live="polite"><p>The standalone experiment runner is separate from the staged collider procedure.</p></div>
      )}
    </>
  )
}

export default function OperationSequence({ simulation, operations }) {
  const phase = simulation.operationPhase ?? 'STANDBY'
  const canSkipStartup = ['STANDBY', 'TECHNICAL_STOP', 'STARTUP_PROCEDURE'].includes(phase)
    && !simulation.startupBusyStep
    && !simulation.incident

  return (
    <section className="operation-sequence" aria-labelledby="operation-sequence-title">
      <header className="operation-sequence-header">
        <div>
          <span className="section-kicker">SIMULATED OPERATOR PROCEDURE</span>
          <h3 id="operation-sequence-title">Interlocked start-up and fill controls</h3>
          <p>Operate each named control in order. Pushbuttons run timed commands; switches stay latched and can be turned off to reset dependent steps.</p>
        </div>
        <strong className={`operation-phase phase-${phase.toLowerCase().replaceAll('_', '-')}`}>{phase.replaceAll('_', ' ')}</strong>
      </header>

      <StartupPanel simulation={simulation} operations={operations} />

      <p className="operation-disclaimer">
        Educational state machine only: timed cooldown, vacuum, magnet, and energy readings are simplified model outputs, not live measurements. Actual LHC commissioning, machine protection, cryogenics, injector transfers, detector coordination, and approvals require CERN equipment and qualified operators. This app cannot control or certify accelerator hardware.
      </p>
      {canSkipStartup && (
        <details className="operation-skip-options">
          <summary>Optional quick start</summary>
          <p>Skip the timed control sequence and start the local, data-informed collision replay.</p>
          <button type="button" onClick={operations.skipStartup}>SKIP TIMED SETUP</button>
        </details>
      )}
    </section>
  )
}
