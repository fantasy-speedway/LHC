const initialRun = { phase: 'IDLE', progress: 0, processed: 0, target: 0, collisions: 0, detected: 0, averageEnergy: 0, currentEvent: null, eventHistory: [], startedAt: null }

export function createExperimentRunner(engine) {
  let state = { ...initialRun }
  let frame = null
  let config = null
  let previousTimestamp = null
  let baseline = { collisions: 0, detected: 0 }
  const listeners = new Set()
  const notify = () => listeners.forEach((listener) => listener({ ...state }))
  const setState = (next) => { state = { ...state, ...next }; notify() }
  const loop = (timestamp) => {
    const simulation = engine.snapshot()
    if (state.phase === 'RUNNING' && simulation.status === 'RUNNING') {
      if (previousTimestamp === null) previousTimestamp = timestamp
      const elapsed = Math.min(timestamp - previousTimestamp, 100); previousTimestamp = timestamp
      const processed = Math.min(state.target, state.processed + elapsed * 2.4 * config.speed)
      const collisions = Math.max(0, simulation.collisions - baseline.collisions)
      const detected = Math.max(0, simulation.detectedParticles - baseline.detected)
      setState({ progress: processed / state.target, processed, collisions, detected, averageEnergy: simulation.averageEventEnergy, currentEvent: simulation.latestCollision, eventHistory: simulation.eventHistory })
      if (processed >= state.target) { engine.stopStandalone(); setState({ phase: 'COMPLETED', progress: 1, processed: state.target }) }
    }
    if (state.phase !== 'STOPPED' && state.phase !== 'COMPLETED') frame = requestAnimationFrame(loop)
  }
  return {
    snapshot: () => ({ ...state }),
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    start: (nextConfig) => { config = nextConfig; const simulation = engine.snapshot(); baseline = { collisions: simulation.collisions, detected: simulation.detectedParticles }; previousTimestamp = null; setState({ ...initialRun, phase: 'RUNNING', target: nextConfig.events, startedAt: Date.now() }); engine.setBeamConfig({ particleType: nextConfig.beamA, initialEnergy: nextConfig.initialEnergy, targetEnergy: nextConfig.targetEnergy, intensity: nextConfig.intensity }); engine.setSpeed(nextConfig.speed); engine.start(); cancelAnimationFrame(frame); frame = requestAnimationFrame(loop) },
    pause: () => { if (state.phase !== 'RUNNING') return; engine.pause(); setState({ phase: 'PAUSED' }) },
    resume: () => { if (state.phase !== 'PAUSED') return; engine.start(); setState({ phase: 'RUNNING', startedAt: state.startedAt }); previousTimestamp = null; frame = requestAnimationFrame(loop) },
    stop: () => { engine.stopStandalone(); cancelAnimationFrame(frame); setState({ phase: 'STOPPED' }) },
  }
}