export default function HelpModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="section-kicker">CONTROL ROOM / REFERENCE</span>
            <h2 id="help-title">Quick Guide</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close help">×</button>
        </div>
        <p className="help-intro">
          Collision tracks use measured muon kinematics from a public CMS dataset.
          Beam controls, telemetry, and detector animations are educational models,
          not live CERN systems. Open the Help page for instructions, units, and
          the source citation.
        </p>
        <div className="help-grid">
          <div>
            <h3>GET STARTED</h3>
            <dl>
              <dt>Operations</dt><dd>Use the named, interlocked controls on Overview: power, cryogenics, vacuum, magnets, injectors, beams, detectors, and collision start. Configure local beam targets in Beam Control; inspect the accelerator map in Collider.</dd>
              <dt>Detectors</dt><dd>Choose ATLAS or CMS on Detector to inspect each experiment’s subsystems. Only CMS records are included in the bundled event sample.</dd>
              <dt>Events</dt><dd>Collision shows the playback chamber; Event Display is for saved source-event review and priority labels.</dd>
              <dt>Data</dt><dd>Analysis plots records; Data manages saved records and exports; Discovery is the particle reference library.</dd>
              <dt>Full guide</dt><dd>Choose Help in the sidebar for field definitions and CERN links.</dd>
            </dl>
          </div>
          <div>
            <h3>KEYBOARD SHORTCUTS</h3>
            <dl>
              <dt><kbd>F</kbd></dt><dd>Toggle fullscreen control room.</dd>
              <dt><kbd>?</kbd></dt><dd>Open this quick guide.</dd>
              <dt><kbd>1 - 4</kbd></dt><dd>Switch Overview, Detector, Event Display, or Experiments.</dd>
            </dl>
          </div>
        </div>
        <div className="help-footer">
          <span><i /> CMS OPEN DATA / EVENT REFERENCES</span>
          <button className="primary-control" onClick={onClose}>RETURN TO CONSOLE</button>
        </div>
      </section>
    </div>
  )
}
