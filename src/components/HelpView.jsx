import './help-view.css'

const sourceRecord = 'https://opendata.cern.ch/record/301'
const sourceCsv = 'https://opendata.cern.ch/record/301/files/dimuon-Jpsi.csv'
const acceleratorComplex = 'https://home.cern/science/accelerators/accelerator-complex'
const boosterReference = 'https://home.cern/science/accelerators/proton-synchrotron-booster'
const lhcReference = 'https://home.cern/science/accelerators/large-hadron-collider'

export default function HelpView() {
  return (
    <div className="help-page">
      <header className="help-page-header">
        <div>
          <span className="section-kicker">HELP / USER GUIDE</span>
          <h3>Using the Collision Lab</h3>
          <p>Explore the controls, inspect a collision, and understand which numbers come from CERN.</p>
        </div>
        <span className="help-data-badge"><i /> CERN DATA REFERENCES LOADED</span>
      </header>

      <section className="help-page-card">
        <span className="section-kicker">QUICK START</span>
        <div className="help-steps">
          <article><b>01</b><div><h4>Follow the operator sequence</h4><p>Use the staged procedure on <strong>Overview</strong>. Configure beam channels in <strong>Beam Control</strong>; inspect the accelerator and injector schematic in <strong>Collider</strong>. Controls are an educational model, not machine controls.</p></div></article>
          <article><b>02</b><div><h4>Inspect an experiment</h4><p>Open <strong>Detector</strong> and select <strong>ATLAS</strong> or <strong>CMS</strong>. The bundled recorded event sample is CMS-only; ATLAS is shown as a detector reference.</p></div></article>
          <article><b>03</b><div><h4>Open a collision</h4><p>Go to <strong>Collision</strong> or <strong>Event Display</strong> to inspect an event. Select a muon track in Event Display to see its recorded kinematics.</p></div></article>
          <article><b>04</b><div><h4>Compare and export</h4><p>Use <strong>Analysis</strong> for simple plots and <strong>Data</strong> to browse or export event and particle records.</p></div></article>
        </div>
      </section>

      <section className="help-page-card">
        <span className="section-kicker">PAGE GUIDE / DISTINCT WORKSPACES</span>
        <div className="help-steps">
          <article><b>01</b><div><h4>Operate and configure</h4><p><strong>Overview</strong> summarizes the run and owns the staged procedure. <strong>Collider</strong> is the interactive accelerator map. <strong>Beam Control</strong> provides separate Beam A/B configuration banks; stage values and press each channel’s load button for its timed apply.</p></div></article>
          <article><b>02</b><div><h4>Inspect detector and events</h4><p><strong>Detector</strong> lets you switch between separate ATLAS and CMS subsystem views. <strong>Collision</strong> shows the event playback chamber. <strong>Event Display</strong> is for source-event review, priority labels, and saved records.</p></div></article>
          <article><b>03</b><div><h4>Study and manage data</h4><p><strong>Analysis</strong> provides plots and comparisons; <strong>Data</strong> manages saved records and exports; <strong>Discovery</strong> is the particle reference library; <strong>Experiments</strong> configures local runs; <strong>Settings</strong> changes session display preferences.</p></div></article>
        </div>
      </section>

      <section className="help-page-card">
        <div className="help-card-heading">
          <div><span className="section-kicker">OPERATIONS / EDUCATIONAL SEQUENCE</span><h4>Start-up and normal end-of-fill</h4></div>
          <span className="help-units">MODEL ONLY / NO LIVE CONNECTION</span>
        </div>
        <ol className="help-operation-steps">
          <li><b>Main power</b><span>Use the grid-power switch, press emergency-stop reset, then acknowledge the status panel. Completed switches stay latched; switching one off resets dependent later steps.</span></li>
          <li><b>Cooling system</b><span>Switch cryogenics on and wait through its visible progress until the accelerated model gauge reaches 1.9 K. Real LHC cooldown is a long machine process, not a short UI step.</span></li>
          <li><b>Vacuum system</b><span>Switch the modeled beam-pipe pumps on and wait for the illustrative pressure gauge to stabilize.</span></li>
          <li><b>Magnet system</b><span>Switch magnet power on, then run the timed dipole and quadrupole ramp pushbuttons. Their progress readouts are simulated.</span></li>
          <li><b>Injector chain</b><span>Start the Linac4 model, enable the PS Booster model, and confirm the SPS transfer-ready state.</span></li>
          <li><b>Inject beams</b><span>Inject Beam A and Beam B separately. The second injection control unlocks after Beam A.</span></li>
          <li><b>Accelerate beams</b><span>Enable the modeled RF system, then ramp from each configured injection energy to its Beam Control target.</span></li>
          <li><b>Beam alignment</b><span>Run the illustrative automatic orbit correction and enable the modeled collimation-ready state.</span></li>
          <li><b>Detector preparation</b><span>Toggle ATLAS and CMS ready independently, then switch on the local data-acquisition path.</span></li>
          <li><b>Begin collisions</b><span>Run the squeeze pushbutton, arm collision mode with its switch, then press start collisions. Each control takes modeled time and is interlocked.</span></li>
          <li><b>End of fill</b><span>Request the end of fill; the simulator stops collisions at the next event boundary, then explicitly extract beams to the modeled dump.</span></li>
        </ol>
        <p>Beam-channel configuration is handled separately on <strong>Beam Control</strong>. In standby or technical-stop, edit the Beam A or Beam B settings and press that channel’s LOAD CONFIGURATION pushbutton; each channel loads independently over a five-second simulated transition. Settings are interlocked during startup and operation. Injection, RF, energy ramping, and beam alignment still use the staged Overview controls.</p>
        <p>The operator panel exposes individual pushbuttons, latched switches, readiness indicators, and timed accelerated gauges rather than a generic “next stage” command. Switching off a completed control resets dependent later steps; reverse the procedure before disabling upstream equipment. Displayed seconds are deliberately compressed and do not represent actual LHC timings: real commissioning, machine protection, cryogenics, beam transfer, detector coordination, and approvals require dedicated CERN systems and qualified operators. The listed 13.6 TeV Run 3 energy is a reference only; this app’s GeV beam sliders drive a local illustrative replay. This app has no CERN connection and cannot operate hardware.</p>
        <div className="help-source-links">
          <a href={acceleratorComplex} target="_blank" rel="noreferrer">CERN ACCELERATOR COMPLEX ↗</a>
          <a href={lhcReference} target="_blank" rel="noreferrer">CERN LARGE HADRON COLLIDER ↗</a>
        </div>
      </section>

      <section className="help-page-card">
        <div className="help-card-heading">
          <div><span className="section-kicker">OPERATIONS / MODEL TIMING</span><h4>Control transition times</h4></div>
          <span className="help-units">ACCELERATED SIMULATOR TIME</span>
        </div>
        <p>Each control displays its own timed transition. For grouped stages, the listed duration is applied to each individual control in that group; the collision-arm interlock is modeled as a separate 5-second step.</p>
        <table className="incident-rates-table">
          <thead><tr><th>Stage/control</th><th>Modeled wait</th></tr></thead>
          <tbody>
            <tr><td>Grid power, emergency-stop reset, status-light verification</td><td>5 sec each</td></tr>
            <tr><td>Cryogenics / vacuum pumps</td><td>30 sec / 20 sec</td></tr>
            <tr><td>Magnet power / dipole ramp / quadrupole ramp</td><td>15 sec / 30 sec / 20 sec</td></tr>
            <tr><td>Linac / Booster / SPS transfer readiness</td><td>15 sec each</td></tr>
            <tr><td>Beam A injection / Beam B injection</td><td>10 sec each</td></tr>
            <tr><td>RF system / beam energy ramp</td><td>5 sec / 60 sec</td></tr>
            <tr><td>Orbit correction / collimation</td><td>20 sec / 15 sec</td></tr>
            <tr><td>ATLAS ready / CMS ready / data acquisition</td><td>10 sec each</td></tr>
            <tr><td>Beam squeeze / collision-mode arm / start collisions</td><td>30 sec / 5 sec / 5 sec</td></tr>
          </tbody>
        </table>
      </section>

      <section className="help-page-card">
        <div className="help-card-heading">
          <div><span className="section-kicker">OPERATIONS / INCIDENT MODEL</span><h4>Warnings, faults, and automatic beam dumps</h4></div>
          <span className="help-units">SIMULATED PROBABILITIES</span>
        </div>
        <p>Startup draws one weighted outcome per attempt. While a run is active, one weighted outcome is drawn every 10 minutes of simulator run time; changing the speed setting scales this interval. Outcomes are mutually exclusive within each interval, so multiple listed incidents cannot occur in the same interval. These rates are user-configured educational assumptions, not measured CERN reliability data.</p>
        <h5 className="incident-table-heading">Startup outcome per attempt</h5>
        <table className="incident-rates-table">
          <thead><tr><th>Outcome</th><th>Chance</th><th>Behavior</th></tr></thead>
          <tbody>
            <tr><td>Cryogenic cooling delay</td><td>8%</td><td>Fault; startup pauses at CRYO START.</td></tr>
            <tr><td>Vacuum instability</td><td>5%</td><td>Fault; startup pauses at VACUUM PUMPS ON.</td></tr>
            <tr><td>Power fluctuation</td><td>3%</td><td>Fault; startup pauses at GRID POWER.</td></tr>
            <tr><td>Magnet power supply fault</td><td>2%</td><td>Fault; startup pauses at MAGNET POWER ENABLE.</td></tr>
            <tr><td>RF system tuning error</td><td>4%</td><td>Fault; startup pauses at RF SYSTEM ON.</td></tr>
            <tr><td>Detector not responding</td><td>3%</td><td>Fault; startup pauses at ATLAS READY.</td></tr>
            <tr><td>Injection timing fault</td><td>2%</td><td>Fault; startup pauses at INJECT BEAM A.</td></tr>
            <tr><td>No startup failure</td><td>73%</td><td>Startup continues without a modeled startup fault.</td></tr>
          </tbody>
        </table>
        <h5 className="incident-table-heading">Running outcome per 10-minute interval</h5>
        <table className="incident-rates-table">
          <thead><tr><th>Outcome</th><th>Chance</th><th>Severity and response</th></tr></thead>
          <tbody>
            <tr><td>Minor beam loss</td><td>5%</td><td>Warning popup; acknowledge and monitor.</td></tr>
            <tr><td>Detector data drop-out</td><td>3%</td><td>Warning popup; acknowledge and monitor.</td></tr>
            <tr><td>Vacuum warning / cooling warning</td><td>1% each</td><td>Warning popup; operations continue.</td></tr>
            <tr><td>Magnet quench</td><td>0.1%</td><td>Critical popup; automatic beam dump.</td></tr>
            <tr><td>Emergency beam dump</td><td>0.2%</td><td>Critical popup; automatic beam dump.</td></tr>
            <tr><td>Major vacuum leak</td><td>0.02%</td><td>Rare critical popup; automatic beam dump.</td></tr>
            <tr><td>Detector trip</td><td>0.05%</td><td>Rare fault popup; recovery required before resuming.</td></tr>
            <tr><td>Power grid interruption</td><td>0.01%</td><td>Rare critical popup; automatic beam dump.</td></tr>
            <tr><td>No running incident</td><td>89.62%</td><td>No incident is selected for that interval.</td></tr>
          </tbody>
        </table>
        <p>Warnings do not stop operations and require acknowledgment. Faults pause operations until the recovery is started; recovery takes a random 1–3 minutes in real time. Critical incidents request an automatic beam dump at the next event boundary. Incident alerts appear in a keyboard-accessible on-screen dialog and are also added to system notifications.</p>
        <p className="incident-model-note">The running probability list includes magnet quench once (0.1%); its separate mention as a very rare event does not add a second chance. The model uses a mutually exclusive weighted draw, so the no-incident chance is the remainder after all listed running outcomes.</p>
      </section>

      <section className="help-page-card injector-guide">
        <div className="help-card-heading">
          <div><span className="section-kicker">ACCELERATOR MAP / CERN REFERENCE</span><h4>Why there is a smaller ring</h4></div>
          <span className="help-units">SCHEMATIC / NOT TO SCALE</span>
        </div>
        <p>CERN does not inject protons straight from a single small ring into the LHC. A chain of accelerators raises their energy in stages. The PS Booster (PSB) is made of four superimposed synchrotron rings; the map’s four nested circles represent that arrangement.</p>
        <ol className="injector-guide-stages">
          <li><b>Linac4</b><span>H− ions · 160 MeV</span><small>Linear accelerator; electrons are stripped during injection into the PSB.</small></li>
          <li><b>PS Booster</b><span>protons · 2 GeV</span><small>Four stacked rings accelerate protons for transfer to the PS.</small></li>
          <li><b>PS</b><span>protons · 26 GeV</span><small>Proton Synchrotron boosts the beam before the SPS.</small></li>
          <li><b>SPS</b><span>protons · 450 GeV</span><small>Super Proton Synchrotron transfers the beam to the LHC.</small></li>
          <li><b>LHC</b><span>up to 6.8 TeV per beam</span><small>Two counter-circulating beams; 13.6 TeV total collision energy at this beam energy.</small></li>
        </ol>
        <p className="injector-guide-note">Use <strong>Advance Stage</strong> or select a stage in the injector-chain panel on <strong>Collider</strong> to move the educational marker. This control is only a visual walkthrough: it does not operate CERN equipment, change the simulator’s beam-energy controls, or alter the recorded CMS events. The listed values describe CERN’s accelerator chain, not live readings from this app.</p>
        <div className="help-source-links">
          <a href={acceleratorComplex} target="_blank" rel="noreferrer">CERN ACCELERATOR COMPLEX ↗</a>
          <a href={boosterReference} target="_blank" rel="noreferrer">CERN PS BOOSTER ↗</a>
        </div>
      </section>

      <section className="help-page-card">
        <div className="help-card-heading">
          <div><span className="section-kicker">DETECTOR / EXPERIMENT SELECTOR</span><h4>ATLAS and CMS are separate experiments</h4></div>
          <span className="help-units">INDIVIDUAL SUBSYSTEM VIEWS</span>
        </div>
        <p>Choose ATLAS or CMS on the Detector page to inspect that experiment’s tracking, calorimeter, muon, and magnet systems individually. Their detector designs are not interchangeable. The bundled event sample contains CMS reconstructed dimuon records only, so ATLAS is presented as a reference and has no event measurements loaded. CMS calorimeter deposits and raw detector hits are also absent from the bundled CSV.</p>
        <div className="help-source-links">
          <a href="https://atlas.cern/Discover/Detector" target="_blank" rel="noreferrer">ATLAS DETECTOR ↗</a>
          <a href="https://cms.cern/detector" target="_blank" rel="noreferrer">CMS DETECTOR ↗</a>
        </div>
      </section>

      <section className="help-page-card">
        <div className="help-card-heading">
          <div><span className="section-kicker">READING AN EVENT</span><h4>What the measurements mean</h4></div>
          <span className="help-units">UNITS SHOWN IN GeV</span>
        </div>
        <dl className="help-glossary">
          <div><dt>Run / Event</dt><dd>Original CMS run and event identifiers. Use these to find the recorded event in its source dataset.</dd></div>
          <div><dt>E</dt><dd>Measured energy of one reconstructed muon, in GeV.</dd></div>
          <div><dt>pT</dt><dd>Transverse momentum, perpendicular to the beam direction, in GeV/c.</dd></div>
          <div><dt>px, py, pz</dt><dd>Momentum components along the detector's x, y, and beam (z) axes, in GeV/c.</dd></div>
          <div><dt>eta (η)</dt><dd>Pseudorapidity, a direction coordinate. Values near zero point across the detector; larger absolute values point closer to the beam.</dd></div>
          <div><dt>phi (φ)</dt><dd>Azimuthal direction around the beam axis, in radians.</dd></div>
          <div><dt>Q</dt><dd>Electric charge in units of the positron charge: +1 or −1 for these muons.</dd></div>
          <div><dt>M</dt><dd>Recorded invariant mass of the muon pair, in GeV. This educational sample selects J/ψ candidates in the 2–5 GeV mass range.</dd></div>
          <div><dt>GT / GG</dt><dd>Muon reconstruction categories in the source file: T means tracker muon; G means global muon. They are source classifications, not simulated probabilities.</dd></div>
        </dl>
      </section>

      <section className="help-page-card help-provenance">
        <div>
          <span className="section-kicker">DATA PROVENANCE / BE HONEST ABOUT THE MODEL</span>
          <h4>Recorded CMS events, not newly generated collisions</h4>
          <p>Each collision shown by the app references the next event in a bundled sample of 2,000 real CMS dimuon records. The muon energies, momenta, directions, charges, invariant mass, run, and event IDs come from that dataset.</p>
          <p>The app does not create real LHC collisions. It replays this sample in order, then starts again from its first row. Changing the simulated beam settings does not change the recorded event. Beam controls, timing, accelerator telemetry, and the animated detector view remain simplified simulations. This derived CSV does not contain collision energy, an original event timestamp, missing transverse momentum, jets, photons, vertices, or detector-quality values; saved records leave these fields unavailable instead of estimating them. The sample is selected for education and is not a general-purpose dataset or suitable for a full physics analysis.</p>
          <p>Priority colors are transparent heuristic flags, not scientific conclusions. Users can confirm or correct a saved event's label. Only reviewed labels are kept as training examples; after four reviewed events across two or more categories, the app displays a local nearest-profile similarity ranking from recorded mass, particle pT, energy, and counts. Every reviewed category is included, with categories under two examples marked provisional. This small, user-labeled ranking is not a validated machine-learning model and never alters the CERN measurements.</p>
          <div className="help-citation">
            <strong>CMS Open Data · 2010 J/ψ → μ⁺μ⁻</strong>
            <span>2,000 selected events · CC0-1.0 · DOI: 10.7483/OPENDATA.CMS.SW96.PFX3</span>
          </div>
          <div className="help-source-links">
            <a href={sourceRecord} target="_blank" rel="noreferrer">OPEN CERN DATASET RECORD ↗</a>
            <a href={sourceCsv} target="_blank" rel="noreferrer">VIEW ORIGINAL CSV ↗</a>
          </div>
        </div>
      </section>

      <section className="help-page-card">
        <div className="help-card-heading">
          <div><span className="section-kicker">EVENT ARCHIVE / REVIEWED LABELS</span><h4>Priority markers and how they are assigned</h4></div>
          <span className="help-units">RULE-BASED / LOCAL STORAGE</span>
        </div>
        <p className="priority-help-intro">The marker appears when you save an event. Rules only run when the required measured value or explicit reconstruction flag exists. Precedence is BLACK → RED → AMBER → BLUE → unmarked.</p>
        <div className="priority-help-grid">
          <article className="priority-help-card priority-black"><b>▲ BLACK / HIGGS CANDIDATE</b><span>Invariant-mass candidate in 125 ± 2 GeV. A mass-window match is only a candidate, not a discovery.</span></article>
          <article className="priority-help-card priority-red"><b>▲ RED / HIGH PRIORITY</b><span>Particle pT above 100 GeV/c, recorded missing pT above 100 GeV, mass within 3.0969 ± 0.15 GeV of the investigated J/ψ, or an explicit rare-combination/background-disagreement flag.</span></article>
          <article className="priority-help-card priority-amber"><b>▲ AMBER / MEDIUM PRIORITY</b><span>At least two leptons or photons above 50 GeV; three or four leptons; or explicit interesting-dijet, displaced/non-prompt, or unusual-pT-imbalance flags.</span></article>
          <article className="priority-help-card priority-blue"><b>▲ BLUE / RESEARCH SAMPLE</b><span>Known decay, control/research sample, or a CERN source event. Higher-priority rules take precedence; other events remain unmarked.</span></article>
        </div>
        <p className="priority-help-intro">To teach the local ranking, save the event, select the reviewed category, and confirm or correct it in Event Display. Automatic tags are never training labels. The ranking needs at least four reviewed events across two or more categories and includes each reviewed category; categories with fewer than two examples are marked provisional. It reports similarity to reviewed events, not calibrated confidence.</p>
        <p className="priority-help-intro">Saved events keep the source run/event, app save time, reconstructed-particle values and directions, mass candidates, reconstruction categories, and all other available event fields. Source timestamp, collision energy, missing pT, and detector quality stay null/unavailable when absent from the bundled CSV; the app does not synthesize them.</p>
      </section>

      <section className="help-page-card help-shortcuts">
        <span className="section-kicker">KEYBOARD SHORTCUTS</span>
        <p><kbd>F</kbd> fullscreen · <kbd>?</kbd> open quick help · <kbd>1–4</kbd> Overview, Detector, Event Display, Experiments. Use the staged operator panel for collider start-up and end-of-fill.</p>
      </section>
    </div>
  )
}
