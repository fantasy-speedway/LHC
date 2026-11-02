import './settings-view.css'

function PreferenceToggle({ checked, onChange, title, description }) {
  return (
    <label className="settings-toggle">
      <span><strong>{title}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

export default function SettingsView({ telemetryVisible, onTelemetryVisibilityChange, reducedMotion, onReducedMotionChange }) {
  return (
    <div className="settings-page">
      <header className="settings-header">
        <div><span className="section-kicker">CONSOLE / PREFERENCES</span><h3>Settings</h3><p>Adjust this browser session’s display and accessibility preferences.</p></div>
        <span className="settings-session-badge">SESSION ONLY</span>
      </header>

      <section className="settings-section">
        <div className="section-heading">CONTROL ROOM LAYOUT <span>DISPLAY</span></div>
        <PreferenceToggle
          checked={telemetryVisible}
          onChange={onTelemetryVisibilityChange}
          title="Show system telemetry sidebar"
          description="Show or hide the right-side summary cards and event counters. The detailed operation pages remain available from the navigation."
        />
      </section>

      <section className="settings-section">
        <div className="section-heading">ACCESSIBILITY <span>MOTION</span></div>
        <PreferenceToggle
          checked={reducedMotion}
          onChange={onReducedMotionChange}
          title="Reduce interface motion"
          description="Disable decorative interface transitions and pulsing effects. Simulation timelines and physics-state changes are unaffected."
        />
      </section>

      <section className="settings-note">
        <span className="section-kicker">SIMULATION SAFETY</span>
        <h4>Local educational model</h4>
        <p>These preferences only change this page’s presentation. They do not change CERN Open Data records, beam settings, or accelerator hardware. This app has no connection to CERN control systems.</p>
      </section>
    </div>
  )
}
