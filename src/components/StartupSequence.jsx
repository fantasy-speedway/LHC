import { useEffect, useState } from 'react'

const startupSteps = ['Loading simulation engine...', 'Loading detector...', 'Loading beam systems...', 'Loading event database...', 'Loading analysis engine...']

export default function StartupSequence({ onComplete }) {
  const [step, setStep] = useState(-1)
  useEffect(() => { const timer = window.setInterval(() => setStep((current) => { if (current >= startupSteps.length - 1) { window.clearInterval(timer); window.setTimeout(onComplete, 420); return current }; return current + 1 }), 250); return () => window.clearInterval(timer) }, [onComplete])
  return <div className="startup-overlay"><div className="startup-mark"><span /><span /><span /></div><div className="startup-eyebrow">LHC / CONTROL ROOM 04 / BOOT SEQUENCE</div><h2>PARTICLE COLLIDER SIMULATOR</h2><div className="startup-status">{step >= startupSteps.length - 1 ? 'SYSTEM READY' : 'INITIALISING...'}</div><div className="startup-steps">{startupSteps.map((label, index) => <div className={index <= step ? 'startup-step complete' : 'startup-step'} key={label}><i />{label}{index < step && <b>OK</b>}</div>)}</div><div className="startup-progress"><i style={{ width: `${Math.max(0, ((step + 1) / startupSteps.length) * 100)}%` }} /></div><span className="startup-build">EDUCATIONAL SIMULATION / BUILD 0.1.0-ALPHA</span></div>
}