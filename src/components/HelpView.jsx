import './help-view.css'

const sourceRecord = 'https://opendata.cern.ch/record/301'
const sourceCsv = 'https://opendata.cern.ch/record/301/files/dimuon-Jpsi.csv'
const acceleratorComplex = 'https://home.cern/science/accelerators/accelerator-complex'
const boosterReference = 'https://home.cern/science/accelerators/proton-synchrotron-booster'
const lhcReference = 'https://home.cern/science/accelerators/large-hadron-collider'

export default function HelpView({ onNavigate = () => {} }) {
  return (
    <div className="help-page">
      <header className="help-page-header">
        <div>
          <span className="section-kicker">HELP / USER GUIDE</span>
          <h3>Collision Lab Guide</h3>
          <p>Follow a guided path, learn what the plots and readouts mean, and tell recorded CERN measurements apart from simulator estimates.</p>
        </div>
        <span className="help-data-badge"><i /> CERN OPEN DATA SAMPLE · NOT LIVE</span>
      </header>

      <nav className="help-contents" aria-label="Help page contents">
        <strong>JUMP TO</strong>
        <a href="#first-visit">Start here</a>
        <a href="#read-analysis">Read the analysis</a>
        <a href="#read-events">Read an event</a>
        <a href="#quick-start">Quick start</a>
        <a href="#machine-physics">Machine physics</a>
        <a href="#startup-guide">Start-up</a>
        <a href="#incidents">Warnings and faults</a>
        <a href="#detectors">Detectors</a>
        <a href="#measurements">Measurements</a>
        <a href="#data-provenance">Data and limitations</a>
        <a href="#event-priorities">Event priorities</a>
      </nav>

      <section className="help-page-card" id="first-visit">
        <div className="help-card-heading">
          <div><span className="section-kicker">NEW HERE? CHOOSE A STARTING POINT</span><h4>You do not need to start the machine to learn from the recorded data</h4></div>
          <span className="help-units">SUGGESTED FIRST VISIT</span>
        </div>
        <p className="help-important-note"><strong>Important:</strong> The accelerator controls are an educational simulation. Recorded CMS measurements are available in Analysis independently of the simulated start-up sequence.</p>
        <div className="help-route-grid">
          <article>
            <span className="help-route-number">01 / BEST FIRST STEP</span>
            <h5>Explore real recorded measurements</h5>
            <ol>
              <li>Open <strong>Analysis</strong>.</li>
              <li>In <strong>INPUT DATASET</strong>, choose <strong>CMS 2010 J/psi dimuon reference</strong>.</li>
              <li>Change one cut at a time and watch the cutflow, mass histogram, and selected count update.</li>
            </ol>
            <p>This uses the 2,000-event CERN Open Data sample. It does not require starting the simulated collider.</p>
            <button type="button" onClick={() => onNavigate('Analysis')}>OPEN ANALYSIS</button>
          </article>
          <article>
            <span className="help-route-number">02 / WATCH THE SIMULATION</span>
            <h5>Run a modeled fill</h5>
            <ol>
              <li>Open <strong>Overview</strong> and follow the operator controls in order.</li>
              <li>Wait for each timed step; resolve any warning before continuing.</li>
              <li>When collisions are active, inspect the event in <strong>Collision</strong> or <strong>Event Display</strong>.</li>
            </ol>
            <p>Each simulated event resamples a recorded CMS template and adds modeled detector response. It is not a new CERN measurement.</p>
            <button type="button" onClick={() => onNavigate('Overview')}>OPEN OVERVIEW</button>
          </article>
          <article>
            <span className="help-route-number">03 / SAVE YOUR RESEARCH</span>
            <h5>Keep notes and results</h5>
            <ol>
              <li>Save interesting events from <strong>Event Display</strong>.</li>
              <li>Save an analysis report and optionally link it to a project.</li>
              <li>Use <strong>Data</strong> to organize notes, collections, and export a backup.</li>
            </ol>
            <p>Research records stay in this browser profile; export an archive to move or back them up.</p>
            <button type="button" onClick={() => onNavigate('Data')}>OPEN DATA &amp; RESEARCH</button>
          </article>
        </div>
      </section>

      <section className="help-page-card" id="read-analysis">
        <div className="help-card-heading">
          <div><span className="section-kicker">ANALYSIS / WHAT TO LOOK AT</span><h4>A simple guide to the CMS dimuon analysis</h4></div>
          <span className="help-units">COUNTS ARE NOT CROSS-SECTIONS</span>
        </div>
        <div className="help-topic">
          <h5>Try this in order</h5>
          <ol className="help-reading-steps">
            <li><strong>Confirm the input.</strong> The <strong>INPUT DATASET</strong> selector controls the CMS-style selection panel. Start with the CMS 2010 reference option to analyze the recorded 2,000-event sample.</li>
            <li><strong>Read the cutflow from top to bottom.</strong> Each row counts how many events remain after that requirement. Counts normally stay the same or decrease. If few events remain, loosen a cut; if none remain, relax the cuts until candidates return.</li>
            <li><strong>Change one cut at a time.</strong> The pT and |η| sliders apply to both muons; the mass limits select the pair-mass range; the charge checkbox requires one positive and one negative muon. Watching the counts change shows which requirement removes events.</li>
            <li><strong>Read the mass histogram.</strong> Horizontal position is dimuon mass in GeV; each bar is the number of candidates in that mass interval. A concentration near 3.1 GeV is consistent with the J/ψ resonance this sample was selected to study. It is not evidence of a new particle or a discovery.</li>
            <li><strong>Check the candidate table.</strong> Run/event identifies the source record. Recomputed mass is rebuilt from the stored four-momenta; recorded mass is the separate value in the source CSV. Small differences can arise from rounding or reconstruction details.</li>
            <li><strong>Save a report when useful.</strong> Select a project if you want to file the report there, then press <strong>SAVE ANALYSIS REPORT</strong>. The report stores the chosen cuts, counts, histogram, and selected records.</li>
          </ol>
        </div>
        <div className="help-reading-grid">
          <article>
            <h5>What the summary numbers mean</h5>
            <p><strong>Input events</strong> is the starting sample size. <strong>Selected candidates</strong> is the number passing all current requirements. <strong>Selection efficiency</strong> is selected divided by input for this sample and these cuts; it is not detector efficiency or a physical production rate.</p>
            <p><strong>Mean selected mass</strong> is the average reconstructed mass of selected pairs. <strong>Mass RMS</strong> describes their spread; it is not an uncertainty on a discovery claim.</p>
          </article>
          <article>
            <h5>Use the other charts carefully</h5>
            <p>Bars in the particle and observable charts show counts per category or bin. Their labels give the particle type or the lower edge of a bin; they are summaries, not one dot per collision. The Analysis page’s general workspace charts summarize current and archived simulator runs, separately from the CMS reference selection panel.</p>
            <p>For recorded CMS events, raw calorimeter hits and missing transverse momentum are not in this CSV. A detector layer marked <strong>NOT IN CSV</strong> means the source does not supply that information—not that the detector measured zero.</p>
          </article>
          <article>
            <h5>Do not over-interpret estimates</h5>
            <p>The sideband background, S/B, and S/√B figures use a simplified flat-background assumption and unweighted counts. They are teaching aids, not official CMS statistical results or discovery significance. Model-flagged events are heuristic prompts to inspect, not confirmed unusual physics.</p>
          </article>
        </div>
        <button className="help-route-button" type="button" onClick={() => onNavigate('Analysis')}>OPEN ANALYSIS</button>
      </section>

      <section className="help-page-card" id="read-events">
        <div className="help-card-heading">
          <div><span className="section-kicker">EVENT DISPLAY / WHAT YOU ARE SEEING</span><h4>Read one collision without mistaking the illustration for detector data</h4></div>
          <span className="help-units">SIMPLIFIED VISUALIZATION</span>
        </div>
        <div className="help-reading-grid">
          <article>
            <h5>Understand the picture</h5>
            <p>The bright center marks the modeled interaction point. Concentric colored rings represent detector layers; colored lines represent particle tracks, and points show the displayed detector response. The view is a simplified schematic, not a photograph, a scale drawing, or a full reconstruction of raw CMS detector hits.</p>
            <p>Select a track in the picture or the muon-track buttons to open its inspector. Use play, replay, zoom, and rotate to explore the visualization; these controls change the display, not the underlying recorded event.</p>
          </article>
          <article>
            <h5>Check the event label before interpreting it</h5>
            <p><strong>CERN DATA REFERENCE</strong> identifies a recorded source event. Its CMS run and event numbers point back to the dataset. <strong>DATA-INFORMED SIMULATION</strong> means the event was resampled from a listed CMS template and given modeled response; it is not a recorded collision.</p>
            <p>Configured beam energy belongs to the machine model. It does not change or rescale the recorded template muon momenta. The bundled CSV does not provide collision energy or a source timestamp.</p>
          </article>
          <article>
            <h5>Use measurements in context</h5>
            <p>Energy (GeV) and momentum (GeV/c) are different quantities. pT is momentum perpendicular to the beam; η describes direction relative to the beam; φ is the angle around the beam axis; charge tells whether the muon is positive or negative. The glossary below explains each field in more detail.</p>
            <p>A missing or unavailable value means it was not supplied by the source or model—it should not be read as zero.</p>
          </article>
        </div>
        <button className="help-route-button" type="button" onClick={() => onNavigate('Event Display')}>OPEN EVENT DISPLAY</button>
      </section>

      <section className="help-page-card" id="quick-start">
        <span className="section-kicker">QUICK REFERENCE / WHERE EACH PAGE LEADS</span>
        <div className="help-steps">
          <article><b>01</b><div><h4>Operate and configure</h4><p><strong>Overview</strong> contains staged machine controls; <strong>Beam Control</strong> configures Beam A and B; <strong>Collider</strong> is the accelerator map. None of these pages controls CERN equipment.</p></div></article>
          <article><b>02</b><div><h4>Inspect detectors and events</h4><p><strong>Detector</strong> shows ATLAS or CMS subsystem references. <strong>Collision</strong> plays the current event; <strong>Event Display</strong> provides source identifiers, particle inspection, priority review, and saving.</p></div></article>
          <article><b>03</b><div><h4>Study and keep results</h4><p><strong>Analysis</strong> provides the CMS selection and workspace summaries. <strong>Data</strong> organizes projects, notes, collections, reports, and exports.</p></div></article>
        </div>
      </section>

      <section className="help-page-card" id="page-guide">
        <span className="section-kicker">PAGE GUIDE / DISTINCT WORKSPACES</span>
        <div className="help-steps">
          <article><b>01</b><div><h4>Operate and configure</h4><p><strong>Overview</strong> summarizes the run and owns the staged procedure. <strong>Collider</strong> is the interactive accelerator map. <strong>Beam Control</strong> provides separate Beam A/B configuration banks; stage values and press each channel’s load button for its timed apply.</p></div></article>
          <article><b>02</b><div><h4>Inspect detector and events</h4><p><strong>Detector</strong> lets you switch between separate ATLAS and CMS subsystem views. <strong>Collision</strong> shows the event playback chamber. <strong>Event Display</strong> is for source-event review, priority labels, and saved records.</p></div></article>
          <article><b>03</b><div><h4>Study and manage data</h4><p><strong>Analysis</strong> provides plots and comparisons; <strong>Data</strong> manages saved records and exports; <strong>Discovery</strong> is the particle reference library; <strong>Experiments</strong> configures local runs; <strong>Settings</strong> changes session display preferences.</p></div></article>
        </div>
      </section>

      <section className="help-page-card" id="machine-physics">
        <div className="help-card-heading">
          <div><span className="section-kicker">PHYSICS / DIAGNOSTICS / ANALYSIS</span><h4>How to interpret the modeled beams and CMS workflow</h4></div>
          <span className="help-units">EDUCATIONAL CALCULATIONS</span>
        </div>
        <div className="help-topic">
          <h5>Beam settings and machine diagnostics</h5>
          <p>Beam Control derives relativistic momentum from E² = p² + m² and uses magnetic rigidity Bρ = p [GeV/c] / (0.299792458 × |q/e|). Particle mass and charge, dipole field, beam energy, and direction affect the machine diagnostics. The console displays the derived energy, momentum, rigidity, emittance, beam size, divergence, orbit, and centre-of-mass energy.</p>
          <p>RF voltage and charge set the modeled energy-gain rate. At 16 MV, the requested ramp takes the model’s 60-second reference; lower voltage takes longer and may leave the beam below target. The ramp is a simplified linear model, not a detailed RF cavity simulation. Quadrupole gradient and magnetic rigidity affect the modeled beta-star and beam optics. Vacuum pressure, cryogenic temperature, and orbit correction affect the stability estimate. These are educational relationships, not validated predictions.</p>
          <p>Bunch spacing affects the number of bunches that fit in a modeled revolution, which changes bunch-crossing frequency and estimated luminosity. Luminosity assumes Gaussian head-on proton bunches and is available only for counter-circulating proton beams. Machine Physics Telemetry shows local simulated fill history, not live CERN readings.</p>
        </div>
        <div className="help-topic">
          <h5>Detector response and reconstructed vertex</h5>
          <p>For data-informed simulated events, the detector model creates smeared track measurements and fits an educational vertex. These impact-parameter measurements are synthetic, not present in the CMS source file. Recorded CMS events do not include the raw hits or impact parameters needed for that fit, so their vertex is shown as unavailable.</p>
        </div>
        <div className="help-topic">
          <h5>Analyze the CMS dimuon sample</h5>
          <p>In <strong>Analysis</strong>, choose the CMS 2010 reference dataset or the current/archived workspace. Adjust the opposite-charge, pT, |eta|, and mass-window cuts; review the cutflow, histogram, and candidate table. Pair masses are recomputed from recorded four-vectors and shown separately from source CSV masses. The available plots cover pT, eta, azimuth, and dimuon candidates.</p>
          <p>The recorded CSV has no missing-pT measurement. Simulated pT imbalance uses selected muon tracks only; it is not full-event missing transverse momentum. The sideband S/B and S/√B estimates assume an unweighted, flat background and are not a validated CMS analysis or discovery significance.</p>
        </div>
        <div className="help-topic">
          <h5>Keep research records</h5>
          <p>Save an Analysis report and optionally link it to a research project. In <strong>Data</strong>, create projects and event collections, save collisions to a collection, and connect notes to projects, experiments, and datasets. The research timeline joins projects, notes, reports, and completed runs. Records persist in this browser profile; export the complete research archive for a backup. Import merges by record ID and does not synchronize between browsers or devices.</p>
        </div>
      </section>

      <section className="help-page-card" id="startup-guide">
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
        <p>The operator panel exposes individual pushbuttons, latched switches, readiness indicators, and timed accelerated gauges rather than a generic “next stage” command. Switching off a completed control resets dependent later steps; reverse the procedure before disabling upstream equipment. Displayed seconds are deliberately compressed and do not represent actual LHC timings: real commissioning, machine protection, cryogenics, beam transfer, detector coordination, and approvals require dedicated CERN systems and qualified operators. The listed 13.6 TeV Run 3 energy is a reference only; beam controls drive an educational machine model, while resampled event kinematics remain those of their recorded CMS templates. This app has no CERN connection and cannot operate hardware.</p>
        <div className="help-source-links">
          <a href={acceleratorComplex} target="_blank" rel="noreferrer">CERN ACCELERATOR COMPLEX ↗</a>
          <a href={lhcReference} target="_blank" rel="noreferrer">CERN LARGE HADRON COLLIDER ↗</a>
        </div>
      </section>

      <section className="help-page-card" id="control-timing">
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

      <section className="help-page-card" id="incidents">
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

      <section className="help-page-card injector-guide" id="injector-chain">
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
        <p className="injector-guide-note">Use <strong>Advance Stage</strong> or select a stage in the injector-chain panel on <strong>Collider</strong> to move the educational marker. This control is only a visual walkthrough: it does not operate CERN equipment, change the simulator’s beam-energy controls, or alter the original recorded CMS dataset. The listed values describe CERN’s accelerator chain, not live readings from this app.</p>
        <div className="help-source-links">
          <a href={acceleratorComplex} target="_blank" rel="noreferrer">CERN ACCELERATOR COMPLEX ↗</a>
          <a href={boosterReference} target="_blank" rel="noreferrer">CERN PS BOOSTER ↗</a>
        </div>
      </section>

      <section className="help-page-card" id="detectors">
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

      <section className="help-page-card" id="measurements">
        <div className="help-card-heading">
          <div><span className="section-kicker">READING AN EVENT</span><h4>What the measurements mean</h4></div>
          <span className="help-units">UNITS SHOWN IN GeV</span>
        </div>
        <dl className="help-glossary">
          <div><dt>Run / Event</dt><dd>Original CMS run and event identifiers. Use these to find the recorded event in its source dataset.</dd></div>
          <div><dt>E</dt><dd>Energy of one reconstructed muon, in GeV. Do not compare it as though it were momentum; they are related but distinct quantities.</dd></div>
          <div><dt>pT</dt><dd>Transverse momentum: momentum perpendicular to the beam direction, in GeV/c. It is often used to select energetic particles.</dd></div>
          <div><dt>px, py, pz</dt><dd>Momentum components along the detector x, y, and beam (z) axes, in GeV/c. The components are used to reconstruct pair quantities.</dd></div>
          <div><dt>eta (η)</dt><dd>Pseudorapidity describes direction relative to the beam. η near zero is transverse; larger |η| points closer to the beam line. It is not energy.</dd></div>
          <div><dt>phi (φ)</dt><dd>Azimuthal angle around the beam axis, in radians. A full turn is about 6.28 radians.</dd></div>
          <div><dt>Q</dt><dd>Electric charge in units of the positron charge: +1 or −1 for these muons. The dimuon selection can require opposite signs.</dd></div>
          <div><dt>M</dt><dd>Invariant mass of the muon pair, in GeV/c². The selected sample is focused on J/ψ→μ⁺μ⁻ events; a mass near 3.1 GeV is expected.</dd></div>
          <div><dt>GT / GG</dt><dd>Muon reconstruction categories in the source file: T means tracker muon; G means global muon. They are source classifications, not simulated probabilities.</dd></div>
        </dl>
      </section>

      <section className="help-page-card help-provenance" id="data-provenance">
        <div>
          <span className="section-kicker">DATA PROVENANCE / BE HONEST ABOUT THE MODEL</span>
          <h4>Recorded measurements and data-informed simulation</h4>
          <p>The bundled sample contains 2,000 selected real CMS J/ψ→μ⁺μ⁻ records. In the Analysis workflow these records remain unchanged and retain their actual run/event IDs. During a simulated fill, each event resamples one recorded dimuon reconstruction with replacement and applies a simplified detector-response model. Event Display identifies the exact template record used; a resampled event is not itself a recorded CMS collision.</p>
          <p>This empirical resampling reflects only the distributions and event selection present in this one derived dataset. It does not generate other collision channels, model their production rates, or predict how kinematics change at the configured beam energy. Beam settings affect the simulated machine diagnostics and collision timing, but the resampled template momenta are not scaled or presented as measurements at that energy. The CSV lacks collision energy, an original event timestamp, missing transverse momentum, jets, photons, vertices, and detector-quality values. Detector response and these simulator diagnostics are educational models, not CERN measurements or a validated physics prediction.</p>
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

      <section className="help-page-card" id="event-priorities">
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

      <section className="help-page-card help-shortcuts" id="shortcuts">
        <span className="section-kicker">KEYBOARD SHORTCUTS</span>
        <p><kbd>F</kbd> fullscreen · <kbd>?</kbd> open quick help · <kbd>1–4</kbd> Overview, Detector, Event Display, Experiments. Use the staged operator panel for collider start-up and end-of-fill.</p>
      </section>
    </div>
  )
}
