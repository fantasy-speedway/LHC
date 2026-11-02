import { useEffect, useRef } from 'react'

export default function IncidentPopup({ incident, onResolve }) {
  const dialogRef = useRef(null)
  const actionRef = useRef(null)
  const incidentId = incident?.id
  const recovering = incident?.status === 'RECOVERING'
  useEffect(() => {
    if (!incidentId) return
    const target = recovering ? dialogRef.current : actionRef.current
    target?.focus()
  }, [incidentId, recovering])
  if (!incident) return null

  const recoverySeconds = Math.ceil(incident.recoveryDurationMs / 1000)
  const remainingSeconds = Math.ceil(recoverySeconds * (1 - incident.recoveryProgress))

  return (
    <div className="incident-overlay">
      <section
        ref={dialogRef}
        tabIndex="-1"
        className={`incident-dialog ${incident.severity.toLowerCase()}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="incident-title"
        aria-describedby="incident-description"
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault()
            const target = recovering ? dialogRef.current : actionRef.current
            target?.focus()
          }
        }}
      >
        <span className="section-kicker">SIMULATED INCIDENT / {incident.system}</span>
        <h2 id="incident-title">{incident.severity}: {incident.name}</h2>
        <p id="incident-description">{incident.description}</p>
        {recovering ? (
          <div className="incident-recovery" role="status" aria-live="polite">
            <span>RECOVERY IN PROGRESS · ABOUT {remainingSeconds} SEC REMAINING</span>
            <progress max="1" value={incident.recoveryProgress} aria-label="Incident recovery progress" />
          </div>
        ) : incident.severity === 'FAULT' ? (
          <p className="incident-guidance">Operations are paused. Start the modeled recovery to continue; the 1–3 minute recovery interval runs in real time.</p>
        ) : incident.severity === 'CRITICAL' ? (
          <p className="incident-guidance">Automatic beam protection is active. The model will stop at the next event boundary and extract the beams.</p>
        ) : (
          <p className="incident-guidance">This warning does not stop operations. Acknowledge it and monitor the system.</p>
        )}
        <button
          ref={actionRef}
          className="incident-action"
          disabled={recovering}
          onClick={() => onResolve(incident.id)}
        >
          {recovering
            ? 'RECOVERY RUNNING'
            : incident.severity === 'FAULT'
              ? 'START 1–3 MIN RECOVERY'
              : incident.severity === 'CRITICAL'
                ? 'ACKNOWLEDGE · AUTO DUMP ACTIVE'
                : 'ACKNOWLEDGE WARNING'}
        </button>
        <small>Educational model only · no CERN hardware is connected.</small>
      </section>
    </div>
  )
}
