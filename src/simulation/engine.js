import { checkNames } from '../collider/components'
import { createCollisionEvent } from '../collision/engine'
import { environmentDefaults } from '../environment/systems'
import { createSkippedStartupState, createStartupSystems, startupProcedure } from './startup-procedure'
import { chooseRunningIncident, chooseStartupFailure, createIncident } from './incidents'
import { calculateBeamDiagnostics, calculateRfRampEnergyGeV } from '../physics/beam-physics'
import { advanceProcessedEventCounter } from './event-counter'
import { simulateDetectorResponse } from '../detector/response'
import { loadCollisionHistory, saveCollisionHistory } from './collision-history'

const defaultBeam = {
  particleType: 'proton',
  particleTypeB: 'proton',
  initialEnergy: 4,
  initialEnergyB: 4,
  targetEnergy: 12,
  targetEnergyB: 12,
  dipoleFieldTesla: 0.0143,
  intensity: 68,
  intensityB: 68,
  direction: 'clockwise',
  directionB: 'counterClockwise',
  particleCount: 256,
  particleCountB: 256,
  quadrupoleGradientTM: 200,
  rfVoltageMV: 16,
  normalizedEmittanceUm: 2.5,
  bunchSpacingNs: 25,
  numberOfBunches: 2808,
}
const initialBeamDiagnostics = calculateBeamDiagnostics(defaultBeam, {
  energyA: defaultBeam.initialEnergy,
  energyB: defaultBeam.initialEnergyB,
})

function startupCheckStatus(systems) {
  const statuses = {
    'Vacuum system': systems.vacuumStable ? 'PASS' : systems.vacuumPumpsOn ? 'CHECKING' : 'NOT CHECKED',
    'Beam system': systems.beamRampComplete ? 'PASS' : systems.beamAInjected || systems.beamBInjected ? 'CHECKING' : 'NOT CHECKED',
    Detector: systems.atlasReady && systems.cmsReady && systems.dataAcquisitionEnabled ? 'PASS' : systems.atlasReady || systems.cmsReady ? 'CHECKING' : 'NOT CHECKED',
    'Control system': systems.gridPower ? 'PASS' : 'NOT CHECKED',
    'Safety systems': systems.statusLightsVerified ? 'PASS' : systems.emergencyStopReset ? 'CHECKING' : 'NOT CHECKED',
  }
  return checkNames.map((name) => ({ name, status: statuses[name] ?? 'NOT CHECKED' }))
}

function machineTelemetrySample(time, diagnostics, cryogenicTemperatureK, vacuumPressureMbar) {
  return {
    time,
    beamEnergyGeV: (diagnostics.beamA.energyGeV + diagnostics.beamB.energyGeV) / 2,
    dipoleFieldTesla: diagnostics.dipoleFieldTesla,
    quadrupoleGradientTM: diagnostics.quadrupoleGradientTM,
    vacuumPressureMbar,
    cryogenicTemperatureK,
    orbitOffsetMm: diagnostics.orbitOffsetMm,
    stabilityPercent: diagnostics.stabilityPercent,
    luminosityCm2S: diagnostics.luminosityCm2S,
  }
}

const initialState = {
  status: 'READY',
  beamStatus: 'OFF',
  magnetStatus: 'STANDBY',
  operationPhase: 'STANDBY',
  time: 0,
  speed: 1,
  events: 12847,
  fps: 60,
  experimentId: 'EXP-26-0907-A',
  message: 'Data-informed simulation ready. Events will be resampled from the recorded CERN CMS dimuon reference dataset.',
  checks: checkNames.map((name) => ({ name, status: 'NOT CHECKED' })),
  startupProcedureStep: 0,
  completedProcedureSteps: [],
  startupBusyStep: null,
  startupSwitchTarget: null,
  startupProgress: 0,
  startupSystems: createStartupSystems(),
  startupFailure: null,
  startupAttemptFailureChosen: false,
  incident: null,
  beamActivity: 0,
  beamStability: initialBeamDiagnostics.stabilityPercent,
  beamEnergy: initialBeamDiagnostics.beamA.energyGeV,
  beamEnergyB: initialBeamDiagnostics.beamB.energyGeV,
  beamDiagnostics: initialBeamDiagnostics,
  revolutions: 0,
  revolutionsB: 0,
  energyHistory: [{ time: 0, energy: defaultBeam.initialEnergy }],
  energyHistoryB: [{ time: 0, energy: defaultBeam.initialEnergyB }],
  telemetryHistory: [],
  beam: defaultBeam,
  collisions: 0,
  detectedParticles: 0,
  averageEventEnergy: 0,
  collisionHistoryError: null,
  collisionRate: 0,
  eventHistory: [],
  latestCollision: null,
  collisionFlash: 0,
  nextCollisionTime: 1.25,
  environment: environmentDefaults,
  faults: [],
  systemHealth: 98.7,
  discoveryObservations: {},
}

export function createSimulationEngine() {
  let restoredHistory
  let historyLoadError = null
  try {
    restoredHistory = loadCollisionHistory()
  } catch (error) {
    restoredHistory = { collisions: 0, detectedParticles: 0, averageEventEnergy: 0, events: [] }
    historyLoadError = error instanceof Error ? error.message : String(error)
  }
  const sessionId = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  let state = {
    ...initialState,
    collisions: restoredHistory.collisions,
    detectedParticles: restoredHistory.detectedParticles,
    averageEventEnergy: restoredHistory.averageEventEnergy,
    eventHistory: restoredHistory.events,
    latestCollision: restoredHistory.events.at(-1) ?? null,
    collisionHistoryError: historyLoadError,
  }
  let frame = null
  let transition = null
  let procedureInterval = null
  let historyClock = 0
  let processedEventRemainder = 0
  let runningIncidentElapsedMs = 0
  let endFillAtNextEvent = false
  let autoDumpAtBoundary = false
  const listeners = new Set()
  const notify = () => listeners.forEach((listener) => listener({ ...state }))
  const setState = (next) => {
    state = { ...state, ...next }
    notify()
  }
  const stopFrame = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  }
  const clearTransition = () => {
    if (transition !== null) window.clearTimeout(transition)
    transition = null
    if (procedureInterval !== null) window.clearInterval(procedureInterval)
    procedureInterval = null
  }
  const setBeamEnergies = (energyA, energyB, startupSystems = state.startupSystems) => ({
    ...(() => {
      const beamDiagnostics = calculateBeamDiagnostics(state.beam, {
        energyA,
        energyB,
        timeSeconds: performance.now() / 1000,
        orbitCorrectionActive: startupSystems.orbitCorrected,
        vacuumPressureMbar: startupSystems.vacuumPressure,
        cryogenicTemperatureK: startupSystems.cryoTemperature,
      })
      const beamEnergy = beamDiagnostics.beamA.energyGeV
      const beamEnergyB = beamDiagnostics.beamB.energyGeV
      return {
        beamEnergy,
        beamEnergyB,
        beamStability: beamDiagnostics.stabilityPercent,
        beamDiagnostics,
        energyHistory: [...state.energyHistory, { time: state.time, energy: beamEnergy }].slice(-48),
        energyHistoryB: [...state.energyHistoryB, { time: state.time, energy: beamEnergyB }].slice(-48),
      }
    })(),
  })
  const recordIncident = (outcome, options = {}) => {
    const incident = {
      ...createIncident(outcome, state.time),
      resumePhase: options.resumePhase ?? state.operationPhase,
      retryStepId: options.retryStepId ?? null,
    }
    const fault = {
      id: incident.id,
      name: incident.name,
      system: incident.system,
      description: incident.description,
      severity: incident.severity,
      startTime: state.time,
      status: 'ACTIVE',
      experimentId: state.experimentId,
    }
    const next = {
      incident,
      faults: [...state.faults, fault].slice(-12),
      message: `${incident.severity}: ${incident.description}`,
    }

    if (options.retryStepId) {
      clearTransition()
      stopFrame()
      setState({
        ...next,
        status: 'FAULT',
        operationPhase: 'FAULT',
        startupBusyStep: null,
        startupSwitchTarget: null,
        startupProgress: 0,
      })
      return
    }

    if (incident.severity === 'CRITICAL') {
      autoDumpAtBoundary = true
      endFillAtNextEvent = true
      setState({
        ...next,
        status: 'EMERGENCY BEAM DUMP',
        operationPhase: 'END_FILL_REQUESTED',
        message: `${incident.name}: automatic beam dump initiated; collisions will stop at the next event boundary.`,
      })
    } else if (incident.severity === 'FAULT') {
      stopFrame()
      setState({
        ...next,
        status: 'FAULT',
        operationPhase: 'FAULT',
      })
    } else {
      setState(next)
    }
  }

  const tick = (timestamp) => {
    if (!state.lastTimestamp) state.lastTimestamp = timestamp
    const elapsed = Math.min(timestamp - state.lastTimestamp, 100)
    const nextTime = state.time + elapsed * 0.0008 * state.speed
    const activeVacuumFaults = state.faults.filter((fault) =>
      fault.system === 'Vacuum' && ['ACTIVE', 'RECOVERING'].includes(fault.status)).length
    const activeCoolingFaults = state.faults.filter((fault) =>
      fault.system === 'Cooling' && ['ACTIVE', 'RECOVERING'].includes(fault.status)).length
    const vacuumPressureMbar = state.startupSystems.vacuumPressure * 10 ** activeVacuumFaults
    const cryogenicTemperatureK = (state.startupSystems.cryoReady
      ? 1.9 + Math.sin(nextTime * 0.7) * 0.02
      : state.startupSystems.cryoTemperature) + activeCoolingFaults * 0.4
    const beamDiagnostics = calculateBeamDiagnostics(state.beam, {
      energyA: state.beamEnergy,
      energyB: state.beamEnergyB,
      timeSeconds: timestamp / 1000,
      orbitCorrectionActive: state.startupSystems.orbitCorrected,
      vacuumPressureMbar,
      cryogenicTemperatureK,
    })
    const beamEnergy = beamDiagnostics.beamA.energyGeV
    const beamEnergyB = beamDiagnostics.beamB.energyGeV
    const environment = {
      ...state.environment,
      cooling: {
        ...state.environment.cooling,
        temperature: cryogenicTemperatureK,
        efficiency: Math.max(0, 100 - Math.max(0, cryogenicTemperatureK - 1.9) * 5),
      },
      vacuum: {
        ...state.environment.vacuum,
        quality: Math.max(0, 100 - Math.max(0, Math.log10(vacuumPressureMbar / 1e-9)) * 8),
        activity: vacuumPressureMbar > 1e-9 ? 'Pressure elevated' : 'Nominal',
      },
      computing: { ...state.environment.computing, load: Math.min(96, 22 + state.collisions * 0.4) },
    }
    const processingEvents = ['COLLISIONS', 'STANDALONE_RUN'].includes(state.operationPhase)
    const processedEventCounter = processingEvents
      ? advanceProcessedEventCounter(state.events, processedEventRemainder, elapsed, state.speed)
      : { count: state.events, remainder: 0 }
    processedEventRemainder = processedEventCounter.remainder
    historyClock += elapsed
    const energyHistory = historyClock > 140
      ? [...state.energyHistory, { time: nextTime, energy: beamEnergy }].slice(-48)
      : state.energyHistory
    const energyHistoryB = historyClock > 140
      ? [...state.energyHistoryB, { time: nextTime, energy: beamEnergyB }].slice(-48)
      : state.energyHistoryB
    const telemetryHistory = historyClock > 140
      ? [...state.telemetryHistory, machineTelemetrySample(
        nextTime,
        beamDiagnostics,
        cryogenicTemperatureK,
        vacuumPressureMbar,
      )].slice(-60)
      : state.telemetryHistory
    if (historyClock > 140) historyClock = 0

    let nextState = {
      ...state,
      environment,
      time: nextTime,
      events: processedEventCounter.count,
      fps: Math.round(1000 / Math.max(elapsed, 16)),
      beamActivity: Math.min(1, state.beamActivity + elapsed * 0.001),
      beamStability: beamDiagnostics.stabilityPercent,
      beamEnergy,
      beamEnergyB,
      beamDiagnostics,
      revolutions: state.revolutions + elapsed * 0.00014 * state.speed,
      revolutionsB: state.revolutionsB + elapsed * 0.00014 * state.speed,
      energyHistory,
      energyHistoryB,
      telemetryHistory,
      collisionFlash: Math.max(0, state.collisionFlash - elapsed * 0.002),
      systemHealth: Math.max(82, 98.7 - state.faults.filter((fault) => ['ACTIVE', 'RECOVERING'].includes(fault.status)).length * 4),
      beamStatus: ['COLLISIONS', 'STANDALONE_RUN'].includes(state.operationPhase) ? 'RUNNING' : 'STABLE',
      lastTimestamp: timestamp,
    }

    const collisionsActive = ['COLLISIONS', 'END_FILL_REQUESTED', 'STANDALONE_RUN'].includes(state.operationPhase)
    let runningOutcome = null
    if (['COLLISIONS', 'STANDALONE_RUN'].includes(state.operationPhase) && !state.incident) {
      runningIncidentElapsedMs += elapsed * state.speed
      if (runningIncidentElapsedMs >= 600_000) {
        runningIncidentElapsedMs %= 600_000
        runningOutcome = chooseRunningIncident()
      }
    }

    if (collisionsActive && nextTime >= state.nextCollisionTime) {
      const collision = createCollisionEvent({
        eventNumber: state.collisions + 1,
        time: nextTime,
        beamDiagnostics,
        beam: state.beam,
      })
      const activeDetectorFaults = state.faults.filter((fault) =>
        fault.system === 'Detector' && ['ACTIVE', 'RECOVERING'].includes(fault.status)).length
      const detectorEfficiency = Math.max(0, environment.detector.efficiency - activeDetectorFaults * 8) / 100
        * Math.max(0, Math.min(1, environment.cooling.efficiency / 100))
      const collisionWithContext = {
        ...simulateDetectorResponse(collision, {
          detectorEfficiency,
          magneticFieldTesla: 3.8,
          seed: collision.id,
        }),
        id: `sim-${sessionId}-${state.collisions + 1}`,
        simulationSessionId: sessionId,
      }
      const eventHistory = [...state.eventHistory, collisionWithContext].slice(-18)
      const collisions = state.collisions + 1
      const detectedParticles = state.detectedParticles + collisionWithContext.detectedParticles
      const averageEventEnergy = ((state.averageEventEnergy * state.collisions) + collisionWithContext.totalEnergy) / collisions
      let collisionHistoryError = null
      try {
        saveCollisionHistory({
          collisions,
          detectedParticles,
          averageEventEnergy,
          events: eventHistory,
        })
      } catch (error) {
        collisionHistoryError = error instanceof Error ? error.message : String(error)
      }
      nextState = {
        ...nextState,
        collisions,
        detectedParticles,
        averageEventEnergy,
        collisionHistoryError,
        collisionRate: collisions / Math.max(nextTime, 0.1),
        eventHistory,
        latestCollision: collisionWithContext,
        collisionFlash: 1,
        nextCollisionTime: endFillAtNextEvent
          ? state.nextCollisionTime
          : nextTime + (1.25 + Math.random() * 1.5) / Math.max(0.1,
            Math.min(3, Math.sqrt(Math.max(0.001,
              (beamDiagnostics.luminosityCm2S ?? 0)
              / Math.max(initialBeamDiagnostics.luminosityCm2S ?? 1, 1),
            )))
            * (beamDiagnostics.stabilityPercent / 99.4)
            * (environment.vacuum.quality / 100)),
        message: endFillAtNextEvent
          ? 'End-of-fill request reached an event boundary. Collisions have stopped; beams remain in stable circulation.'
          : `${collision.label} resampled from CERN CMS data and passed through the educational detector-response model.`,
      }

      if (endFillAtNextEvent) {
        endFillAtNextEvent = false
        nextState = { ...nextState, operationPhase: 'END_FILL', status: 'ENDING FILL', beamStatus: 'STABLE' }
      }
    }

    state = nextState
    notify()
    if (runningOutcome) recordIncident(runningOutcome, { resumePhase: state.operationPhase })
    if (state.operationPhase === 'END_FILL' && autoDumpAtBoundary) {
      autoDumpAtBoundary = false
      dumpBeam()
      return
    }
    if (['STABLE_BEAMS', 'COLLISIONS', 'END_FILL_REQUESTED', 'END_FILL', 'STANDALONE_RUN'].includes(state.operationPhase)) {
      frame = requestAnimationFrame(tick)
    } else {
      frame = null
    }
  }

  const performStartupAction = (actionId, enabled = true) => {
    const canStart = ['STANDBY', 'TECHNICAL_STOP', 'STARTUP_PROCEDURE'].includes(state.operationPhase)
    if (!canStart || state.startupBusyStep) return

    if (!enabled) {
      const stepIndex = startupProcedure.findIndex((step) => step.id === actionId)
      const step = startupProcedure[stepIndex]
      if (step?.control !== 'switch' || !state.completedProcedureSteps.includes(actionId)) return

      clearTransition()
      stopFrame()
      setState({
        status: 'SYSTEM SHUTDOWN',
        startupBusyStep: step.id,
        startupSwitchTarget: false,
        startupProgress: 0,
        message: `Switching ${step.label} off. Dependent controls will be reset after the modeled shutdown interval.`,
      })

      const shutdownDuration = Math.min(step.duration, 1800)
      const startedAt = performance.now()
      procedureInterval = window.setInterval(() => {
        const progress = Math.min(1, (performance.now() - startedAt) / shutdownDuration)
        setState({ startupProgress: progress })
        if (progress === 1) {
          window.clearInterval(procedureInterval)
          procedureInterval = null

          const startupSystems = { ...state.startupSystems }
          startupProcedure.slice(stepIndex).forEach((dependentStep) => {
            startupSystems[dependentStep.system] = false
          })
          if (step.id === 'cryo-start') {
            startupSystems.cryoStarted = false
            startupSystems.cryoTemperature = 78
          } else if (step.id === 'vacuum-pumps') {
            startupSystems.vacuumPumpsOn = false
            startupSystems.vacuumPressure = 1e3
          } else if (step.id === 'ramp-dipoles') {
            startupSystems.dipoleProgress = 0
          } else if (step.id === 'ramp-quadrupoles') {
            startupSystems.quadrupoleProgress = 0
          } else if (step.id === 'beam-ramp') {
            startupSystems.beamRampProgress = 0
          }
          const completedProcedureSteps = state.completedProcedureSteps.filter((id) =>
            startupProcedure.findIndex((procedureStep) => procedureStep.id === id) < stepIndex)
          const beamRampWasReset = startupProcedure.slice(stepIndex).some((dependentStep) => dependentStep.id === 'beam-ramp')
          const isStandby = stepIndex === 0 && !startupSystems.gridPower
          const resetBeamEnergies = beamRampWasReset
            ? setBeamEnergies(state.beam.initialEnergy, state.beam.initialEnergyB)
            : {}
          setState({
            status: isStandby ? 'READY' : 'START-UP IN PROGRESS',
            operationPhase: isStandby ? 'STANDBY' : 'STARTUP_PROCEDURE',
            startupProcedureStep: stepIndex,
            completedProcedureSteps,
            startupBusyStep: null,
            startupSwitchTarget: null,
            startupProgress: 0,
            startupSystems,
            startupFailure: isStandby ? null : state.startupFailure,
            startupAttemptFailureChosen: isStandby ? false : state.startupAttemptFailureChosen,
            checks: startupCheckStatus(startupSystems),
            beamStatus: startupSystems.beamBInjected ? 'INJECTED' : startupSystems.beamAInjected ? 'INJECTED' : 'OFF',
            magnetStatus: startupSystems.magnetPowerEnabled ? 'POWERED / STABLE' : 'STANDBY',
            ...resetBeamEnergies,
            message: isStandby
              ? 'All simulated startup controls are off. The collider model is in standby.'
              : `${step.label} is off. Dependent procedure controls have been reset and must be completed again.`,
          })
        }
      }, 80)
      return
    }

    let stepIndex = state.startupProcedureStep
    let completedSteps = state.completedProcedureSteps
    let systems = state.startupSystems
    let startupFailure = state.startupFailure
    let startupAttemptFailureChosen = state.startupAttemptFailureChosen
    if (state.operationPhase === 'TECHNICAL_STOP') {
      stepIndex = 0
      completedSteps = []
      systems = createStartupSystems()
      startupFailure = null
      startupAttemptFailureChosen = false
    }

    const step = startupProcedure[stepIndex]
    if (!step || step.id !== actionId) return
    if (!startupAttemptFailureChosen) {
      startupFailure = chooseStartupFailure()
      startupAttemptFailureChosen = true
    }
    if (step.id === 'emergency-stop-reset' && !systems.gridPower) return
    if (step.id === 'verify-status-lights' && (!systems.gridPower || !systems.emergencyStopReset)) return
    if (step.id === 'magnet-power' && (!systems.cryoReady || !systems.vacuumStable)) return
    if (step.id === 'ramp-dipoles' && !systems.magnetPowerEnabled) return
    if (step.id === 'ramp-quadrupoles' && !systems.dipolesReady) return
    if (step.id === 'linac-start' && !systems.quadrupolesReady) return
    if (step.id === 'booster-enable' && !systems.linacReady) return
    if (step.id === 'sps-transfer-ready' && !systems.boosterReady) return
    if (step.id === 'inject-beam-a' && !systems.spsReady) return
    if (step.id === 'inject-beam-b' && !systems.beamAInjected) return
    if (step.id === 'rf-system' && (!systems.beamAInjected || !systems.beamBInjected)) return
    if (step.id === 'beam-ramp' && !systems.rfEnabled) return
    if (step.id === 'orbit-correction' && !systems.beamRampComplete) return
    if (step.id === 'collimation' && !systems.orbitCorrected) return
    if (step.id === 'atlas-ready' && !systems.collimationEnabled) return
    if (step.id === 'cms-ready' && !systems.atlasReady) return
    if (step.id === 'data-acquisition' && !systems.cmsReady) return
    if (step.id === 'squeeze-beams' && !systems.dataAcquisitionEnabled) return
    if (step.id === 'collision-arm' && !systems.beamsSqueezed) return
    if (step.id === 'start-collisions' && !systems.collisionModeArmed) return

    clearTransition()
    stopFrame()
    if (step.id === 'cryo-start') {
      systems = { ...systems, cryoStarted: true }
    } else if (step.id === 'vacuum-pumps') {
      systems = { ...systems, vacuumPumpsOn: true }
    } else if (step.id === 'beam-ramp') {
      setState({
        beamEnergy: state.beam.initialEnergy,
        beamEnergyB: state.beam.initialEnergyB,
      })
    }

    setState({
      operationPhase: 'STARTUP_PROCEDURE',
      status: step.duration ? 'SYSTEM STARTING' : 'START-UP IN PROGRESS',
      checks: startupCheckStatus(systems),
      startupProcedureStep: stepIndex,
      completedProcedureSteps: completedSteps,
      startupBusyStep: step.duration ? step.id : null,
      startupSwitchTarget: step.control === 'switch' ? true : null,
      startupProgress: 0,
      startupSystems: systems,
      startupFailure,
      startupAttemptFailureChosen,
      message: step.duration ? `${step.label}: waiting for the modeled system to reach its ready condition.` : `${step.command}: awaiting operator confirmation.`,
    })

    const completeAction = () => {
      if (startupFailure?.stepId === step.id) {
        const failedSystems = { ...state.startupSystems, [step.system]: false }
        const failureReset = {
          'mains-power': { gridPower: false },
          'cryo-start': { cryoReady: false },
          'vacuum-pumps': { vacuumStable: false },
          'magnet-power': { magnetPowerEnabled: false },
          'rf-system': { rfEnabled: false },
          'atlas-ready': { atlasReady: false },
          'inject-beam-a': { beamAInjected: false },
        }[step.id]
        Object.assign(failedSystems, failureReset)
        const checks = startupCheckStatus(failedSystems)
        setState({
          startupSystems: failedSystems,
          checks,
          message: `${startupFailure.name}: startup is paused for recovery.`,
        })
        recordIncident(startupFailure, { resumePhase: 'STARTUP_PROCEDURE', retryStepId: step.id })
        return
      }

      const currentSystems = { ...state.startupSystems, [step.system]: true }
      if (step.id === 'cryo-start') {
        currentSystems.cryoStarted = true
        currentSystems.cryoTemperature = 1.9
      } else if (step.id === 'vacuum-pumps') {
        currentSystems.vacuumPumpsOn = true
        currentSystems.vacuumPressure = 1e-9
      } else if (step.id === 'ramp-dipoles') {
        currentSystems.dipoleProgress = 100
      } else if (step.id === 'ramp-quadrupoles') {
        currentSystems.quadrupoleProgress = 100
      } else if (step.id === 'beam-ramp') {
        currentSystems.beamRampProgress = 100
      }

      if (step.id === 'beam-ramp'
        && (state.beamEnergy + 1e-6 < state.beam.targetEnergy
          || state.beamEnergyB + 1e-6 < state.beam.targetEnergyB)) {
        setState({
          status: 'BEAM RAMP BELOW TARGET',
          operationPhase: 'STARTUP_PROCEDURE',
          startupProcedureStep: stepIndex,
          completedProcedureSteps: completedSteps,
          startupBusyStep: null,
          startupSwitchTarget: null,
          startupProgress: 0,
          startupSystems: { ...state.startupSystems, beamRampComplete: false, beamRampProgress: 100 },
          checks: startupCheckStatus({ ...state.startupSystems, beamRampComplete: false }),
          message: `RF ramp stopped at ${state.beamEnergy.toFixed(2)} / ${state.beam.targetEnergy.toFixed(2)} GeV for Beam A and ${state.beamEnergyB.toFixed(2)} / ${state.beam.targetEnergyB.toFixed(2)} GeV for Beam B. Increase RF voltage or correct the magnet field, then retry the ramp.`,
        })
        return
      }

      const nextStepIndex = stepIndex + 1
      const nextStep = startupProcedure[nextStepIndex]
      const isStartingCollisions = step.id === 'start-collisions'
      const nextCompletedSteps = [...completedSteps, step.id]
      const beamUpdates = step.id === 'beam-ramp'
        ? setBeamEnergies(
          calculateRfRampEnergyGeV({
            initialEnergyGeV: state.beam.initialEnergy,
            targetEnergyGeV: state.beam.targetEnergy,
            particleType: state.beam.particleType,
            rfVoltageMV: state.beam.rfVoltageMV,
            progress: 1,
            rampDurationSeconds: step.duration / 1000,
          }).energyGeV,
          calculateRfRampEnergyGeV({
            initialEnergyGeV: state.beam.initialEnergyB,
            targetEnergyGeV: state.beam.targetEnergyB,
            particleType: state.beam.particleTypeB,
            rfVoltageMV: state.beam.rfVoltageMV,
            progress: 1,
            rampDurationSeconds: step.duration / 1000,
          }).energyGeV,
        )
        : {}

      if (isStartingCollisions) {
        runningIncidentElapsedMs = 0
        setState({
          ...beamUpdates,
          status: 'RUNNING',
          beamStatus: 'RUNNING',
          magnetStatus: 'POWERED / STABLE',
          operationPhase: 'COLLISIONS',
          startupProcedureStep: nextStepIndex,
          completedProcedureSteps: nextCompletedSteps,
          startupBusyStep: null,
          startupSwitchTarget: null,
          startupProgress: 1,
          startupSystems: currentSystems,
          checks: startupCheckStatus(currentSystems),
          beamActivity: 0.18,
          message: 'Physics fill active. The local educational event replay is recording; no CERN hardware is connected.',
          lastTimestamp: 0,
        })
        frame = requestAnimationFrame(tick)
        return
      }

      setState({
        ...beamUpdates,
        status: nextStep ? 'START-UP IN PROGRESS' : 'READY',
        beamStatus: currentSystems.beamBInjected ? 'INJECTED' : currentSystems.beamAInjected ? 'INJECTED' : 'OFF',
        magnetStatus: currentSystems.magnetPowerEnabled ? 'POWERED / STABLE' : 'STANDBY',
        operationPhase: 'STARTUP_PROCEDURE',
        startupProcedureStep: nextStepIndex,
        completedProcedureSteps: nextCompletedSteps,
        startupBusyStep: null,
        startupSwitchTarget: null,
        startupProgress: 0,
        startupSystems: currentSystems,
        checks: startupCheckStatus(currentSystems),
        message: nextStep
          ? `${step.label} complete. Next control: ${nextStep.label}.`
          : 'All simulated start-up checks are complete. Collision mode is ready to arm.',
      })
    }

    if (!step.duration) {
      completeAction()
      return
    }

    const startedAt = performance.now()
    procedureInterval = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / step.duration)
      const progressSystems = { ...state.startupSystems }
      if (step.id === 'cryo-start') {
        progressSystems.cryoTemperature = 78 + (1.9 - 78) * progress
      } else if (step.id === 'vacuum-pumps') {
        progressSystems.vacuumPressure = 10 ** (3 - 12 * progress)
      } else if (step.id === 'ramp-dipoles') {
        progressSystems.dipoleProgress = progress * 100
      } else if (step.id === 'ramp-quadrupoles') {
        progressSystems.quadrupoleProgress = progress * 100
      } else if (step.id === 'beam-ramp') {
        progressSystems.beamRampProgress = progress * 100
        setState(setBeamEnergies(
          calculateRfRampEnergyGeV({
            initialEnergyGeV: state.beam.initialEnergy,
            targetEnergyGeV: state.beam.targetEnergy,
            particleType: state.beam.particleType,
            rfVoltageMV: state.beam.rfVoltageMV,
            progress,
            rampDurationSeconds: step.duration / 1000,
          }).energyGeV,
          calculateRfRampEnergyGeV({
            initialEnergyGeV: state.beam.initialEnergyB,
            targetEnergyGeV: state.beam.targetEnergyB,
            particleType: state.beam.particleTypeB,
            rfVoltageMV: state.beam.rfVoltageMV,
            progress,
            rampDurationSeconds: step.duration / 1000,
          }).energyGeV,
        ))
      }
      setState({
        startupProgress: progress,
        startupSystems: progressSystems,
        checks: startupCheckStatus(progressSystems),
      })
      if (progress === 1) {
        window.clearInterval(procedureInterval)
        procedureInterval = null
        completeAction()
      }
    }, 80)
  }

  const endFill = ({ afterNextEvent = true } = {}) => {
    if (state.operationPhase !== 'COLLISIONS') return
    if (afterNextEvent) {
      endFillAtNextEvent = true
      setState({
        operationPhase: 'END_FILL_REQUESTED',
        message: 'End-of-fill requested. The model will stop collisions after the next event boundary.',
      })
      return
    }
    endFillAtNextEvent = false
    setState({
      status: 'ENDING FILL',
      beamStatus: 'STABLE',
      operationPhase: 'END_FILL',
      message: 'Physics fill ended. Beams remain in stable circulation until the dump step.',
    })
  }

  const skipStartup = () => {
    if (!['STANDBY', 'TECHNICAL_STOP', 'STARTUP_PROCEDURE'].includes(state.operationPhase)
      || state.startupBusyStep
      || state.incident) return

    clearTransition()
    stopFrame()
    endFillAtNextEvent = false
    autoDumpAtBoundary = false
    runningIncidentElapsedMs = 0

    const prepared = createSkippedStartupState(false)
    const beamUpdates = setBeamEnergies(
      state.beam.targetEnergy,
      state.beam.targetEnergyB,
      prepared.startupSystems,
    )
    const beamRampComplete = beamUpdates.beamEnergy + 1e-6 >= state.beam.targetEnergy
      && beamUpdates.beamEnergyB + 1e-6 >= state.beam.targetEnergyB
    const startupSystems = {
      ...prepared.startupSystems,
      beamRampComplete,
      collisionsActive: true,
    }
    const energyMessage = beamRampComplete
      ? 'Configured beam targets reached.'
      : `Beam energy is dipole-limited to ${beamUpdates.beamEnergy.toFixed(2)} / ${beamUpdates.beamEnergyB.toFixed(2)} GeV, below the configured targets.`

    setState({
      ...beamUpdates,
      status: 'RUNNING',
      beamStatus: 'RUNNING',
      magnetStatus: 'POWERED / STABLE',
      operationPhase: 'COLLISIONS',
      startupProcedureStep: prepared.startupProcedureStep,
      completedProcedureSteps: prepared.completedProcedureSteps,
      startupBusyStep: null,
      startupSwitchTarget: null,
      startupProgress: 1,
      startupSystems,
      startupFailure: null,
      startupAttemptFailureChosen: true,
      checks: startupCheckStatus(startupSystems),
      beamActivity: 0.18,
      message: `Timed start-up skipped; local CMS-template collision replay started. ${energyMessage} No CERN hardware is connected.`,
      lastTimestamp: 0,
    })
    frame = requestAnimationFrame(tick)
  }

  const resolveIncident = (incidentId) => {
    const incident = state.incident
    if (!incident || incident.id !== incidentId) return

    if (incident.severity === 'WARNING') {
      setState({
        incident: null,
        faults: state.faults.map((fault) => fault.id === incidentId ? { ...fault, status: 'ACKNOWLEDGED' } : fault),
        message: `${incident.name} acknowledged. Continue monitoring the modeled system.`,
      })
      return
    }

    if (incident.severity === 'CRITICAL') {
      setState({
        incident: null,
        faults: state.faults.map((fault) => fault.id === incidentId ? { ...fault, status: 'ACKNOWLEDGED' } : fault),
        message: `${incident.name} acknowledged. The automatic beam-protection sequence continues.`,
      })
      return
    }

    if (incident.status !== 'ACTIVE') return
    const recoveryDurationMs = 60_000 + Math.random() * 120_000
    const startedAt = performance.now()
    setState({
      incident: { ...incident, status: 'RECOVERING', recoveryDurationMs, recoveryProgress: 0 },
      faults: state.faults.map((fault) => fault.id === incidentId ? { ...fault, status: 'RECOVERING' } : fault),
      message: `${incident.name} recovery started. The modeled subsystem is unavailable until recovery completes.`,
    })
    procedureInterval = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / recoveryDurationMs)
      if (progress < 1) {
        setState({
          incident: { ...state.incident, recoveryProgress: progress },
        })
        return
      }

      window.clearInterval(procedureInterval)
      procedureInterval = null
      const retryStepIndex = startupProcedure.findIndex((step) => step.id === incident.retryStepId)
      const isStartupRecovery = retryStepIndex >= 0
      const startupSystems = { ...state.startupSystems }
      if (isStartupRecovery) {
        const step = startupProcedure[retryStepIndex]
        startupSystems[step.system] = false
        if (step.id === 'cryo-start') {
          startupSystems.cryoStarted = false
          startupSystems.cryoTemperature = 78
        }
        if (step.id === 'vacuum-pumps') {
          startupSystems.vacuumPumpsOn = false
          startupSystems.vacuumPressure = 1e3
        }
      }
      const phase = isStartupRecovery ? 'STARTUP_PROCEDURE' : incident.resumePhase
      setState({
        incident: null,
        faults: state.faults.map((fault) => fault.id === incidentId ? { ...fault, status: 'RESOLVED' } : fault),
        operationPhase: phase,
        status: isStartupRecovery ? 'START-UP IN PROGRESS' : 'RUNNING',
        beamStatus: isStartupRecovery ? state.beamStatus : 'RUNNING',
        ...(isStartupRecovery ? {
          startupProcedureStep: retryStepIndex,
          completedProcedureSteps: state.completedProcedureSteps.filter((id) =>
            startupProcedure.findIndex((step) => step.id === id) < retryStepIndex),
          startupSystems,
          startupFailure: null,
          startupBusyStep: null,
          startupSwitchTarget: null,
          startupProgress: 0,
          checks: startupCheckStatus(startupSystems),
        } : { lastTimestamp: 0 }),
        message: `${incident.name} recovery complete. ${isStartupRecovery ? 'Retry the interrupted startup control.' : 'Operations have resumed.'}`,
      })
      if (!isStartupRecovery) frame = requestAnimationFrame(tick)
    }, 1000)
  }

  const dumpBeam = () => {
    if (state.operationPhase !== 'END_FILL') return
    clearTransition()
    stopFrame()
    autoDumpAtBoundary = false
    setState({
      status: 'DUMPING',
      beamStatus: 'DUMPING',
      operationPhase: 'DUMPING',
      message: 'Simulated beam extraction to the designated beam-dump absorber.',
    })
    transition = window.setTimeout(() => {
      transition = null
      setState({
        status: 'BEAM DUMPED',
        beamStatus: 'OFF',
        operationPhase: 'BEAM_DUMPED',
        beamActivity: 0,
        magnetStatus: 'POWERED / STABLE',
        message: 'Both simulated beams are dumped. The superconducting magnet system remains cold and powered between fills.',
      })
    }, 900)
  }

  const rampDown = () => {
    if (state.operationPhase !== 'BEAM_DUMPED') return
    clearTransition()
    setState({
      status: 'RAMPING DOWN',
      beamStatus: 'OFF',
      magnetStatus: 'RAMPING DOWN',
      operationPhase: 'RAMPING_DOWN',
      message: 'Simulated magnet circuits are ramping down after beam extraction.',
    })
    transition = window.setTimeout(() => {
      transition = null
      const energies = setBeamEnergies(0, 0)
      setState({
        ...energies,
        status: 'TECHNICAL STOP',
        beamStatus: 'OFF',
        magnetStatus: 'OFF',
        operationPhase: 'TECHNICAL_STOP',
        beamActivity: 0,
        startupProcedureStep: 0,
        completedProcedureSteps: [],
        startupBusyStep: null,
        startupSwitchTarget: null,
        startupProgress: 0,
        startupSystems: createStartupSystems(),
        checks: startupCheckStatus(createStartupSystems()),
        message: 'Technical-stop state reached. Magnet warm-up and cooldown times are not modelled.',
      })
    }, 900)
  }

  const prepareNextFill = () => {
    if (state.operationPhase !== 'BEAM_DUMPED') return
    const injectionStep = startupProcedure.findIndex((step) => step.id === 'inject-beam-a')
    const completedProcedureSteps = startupProcedure.slice(0, injectionStep).map((step) => step.id)
    const startupSystems = {
      ...state.startupSystems,
      beamAInjected: false,
      beamBInjected: false,
      rfEnabled: false,
      beamRampComplete: false,
      beamRampProgress: 0,
      orbitCorrected: false,
      collimationEnabled: false,
      atlasReady: false,
      cmsReady: false,
      dataAcquisitionEnabled: false,
      beamsSqueezed: false,
      collisionModeArmed: false,
      collisionsActive: false,
    }
    setState({
      status: 'READY',
      beamStatus: 'OFF',
      operationPhase: 'STARTUP_PROCEDURE',
      startupProcedureStep: injectionStep,
      completedProcedureSteps,
      startupBusyStep: null,
      startupSwitchTarget: null,
      startupProgress: 0,
      startupSystems,
      startupFailure: null,
      startupAttemptFailureChosen: false,
      checks: startupCheckStatus(startupSystems),
      beamEnergy: state.beam.initialEnergy,
      beamEnergyB: state.beam.initialEnergyB,
      message: 'Next fill selected. Powered magnet, cryogenic, vacuum, and injector readiness are retained; inject fresh beams to continue.',
    })
  }

  const standaloneStart = () => {
    if (state.status === 'RUNNING' || !['STANDBY', 'STANDALONE_RUN'].includes(state.operationPhase)) return
    if (state.status === 'PAUSED') {
      setState({ status: 'RUNNING', operationPhase: 'STANDALONE_RUN', beamStatus: 'RUNNING', message: 'Standalone experiment run resumed.', lastTimestamp: 0 })
      frame = requestAnimationFrame(tick)
      return
    }
    clearTransition()
    endFillAtNextEvent = false
    runningIncidentElapsedMs = 0
    setState({
      status: 'RUNNING',
      beamStatus: 'RUNNING',
      operationPhase: 'STANDALONE_RUN',
      message: 'Standalone experiment run active. The staged collider controls are separate.',
      lastTimestamp: 0,
    })
    frame = requestAnimationFrame(tick)
  }

  const pause = () => {
    if (state.status !== 'RUNNING' || state.operationPhase !== 'STANDALONE_RUN') return
    stopFrame()
    setState({ status: 'PAUSED', beamStatus: 'PAUSED', message: 'Standalone experiment run paused.' })
  }

  const stopStandalone = () => {
    if (state.operationPhase !== 'STANDALONE_RUN' || !['RUNNING', 'PAUSED'].includes(state.status)) return
    stopFrame()
    setState({
      status: 'READY',
      beamStatus: 'OFF',
      operationPhase: 'STANDBY',
      beamActivity: 0,
      message: 'Standalone experiment run finished. The collider model is in standby.',
    })
  }

  return {
    snapshot: () => ({ ...state }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    performStartupAction,
    skipStartup,
    resolveIncident,
    endFill,
    dumpBeam,
    prepareNextFill,
    rampDown,
    start: standaloneStart,
    pause,
    pauseBeam: pause,
    stopBeam: () => endFill({ afterNextEvent: false }),
    stopStandalone,
    fault: (message = 'A simulated subsystem reported a fault.') => {
      clearTransition()
      stopFrame()
      endFillAtNextEvent = false
      setState({ status: 'FAULT', beamStatus: 'OFF', operationPhase: 'FAULT', startupBusyStep: null, message, beamActivity: 0 })
    },
    setSpeed: (speed) => setState({ speed }),
    setBeamConfig: (updates) => {
      if (!['STANDBY', 'TECHNICAL_STOP'].includes(state.operationPhase)
        && state.status !== 'PAUSED'
        && state.status !== 'BEAM RAMP BELOW TARGET') return
      const beam = { ...state.beam, ...updates }
      const diagnostics = calculateBeamDiagnostics(beam, {
        energyA: beam.initialEnergy,
        energyB: beam.initialEnergyB,
        timeSeconds: performance.now() / 1000,
        orbitCorrectionActive: state.startupSystems.orbitCorrected,
        vacuumPressureMbar: state.startupSystems.vacuumPressure,
        cryogenicTemperatureK: state.startupSystems.cryoTemperature,
      })
      setState({
        beam,
        beamEnergy: diagnostics.beamA.energyGeV,
        beamEnergyB: diagnostics.beamB.energyGeV,
        beamStability: diagnostics.stabilityPercent,
        beamDiagnostics: diagnostics,
        energyHistory: [{ time: state.time, energy: diagnostics.beamA.energyGeV }],
        energyHistoryB: [{ time: state.time, energy: diagnostics.beamB.energyGeV }],
        telemetryHistory: [],
      })
    },
  }
}
