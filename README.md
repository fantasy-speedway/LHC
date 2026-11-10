# Large Hadron Collider Hypersim

An educational, browser-based particle-collider simulator built with React and Vite. The app combines a simplified, interactive accelerator/detector simulation with a bundled reference sample of recorded CMS dimuon events from CERN Open Data.

> **Important:** This is not an operational LHC control system and does not create real collisions. The recorded CMS events are replayed as references. Priority markers are heuristics, and the optional local reviewed-event ranking is a small similarity aid—not a validated machine-learning model or physics result.

## Requirements

- Node.js **20.19 or newer in the 20.x line**, or **22.12 or newer**. These versions meet the Vite 8 runtime requirement.
- npm, which is included with the standard Node.js installation.
- A modern browser.

Check that Node.js and npm are available in a terminal:

```powershell
node --version
npm --version
```

### Install Node.js on Windows

If PowerShell says `node` or `npm` is not recognized:

1. Download the Windows installer from the official [Node.js download page](https://nodejs.org/en/download/). Choose an LTS release that meets the version requirement above.
2. Run the `.msi` installer. Keep the option to add Node.js to `PATH` enabled, and include npm (the standard installer includes it).
3. Close and reopen PowerShell. If you use the VS Code integrated terminal, close and reopen VS Code too, so it picks up the updated `PATH`.
4. Verify the installation:

   ```powershell
   node --version
   npm --version
   ```

   Both commands should print version numbers. If they still are not recognized, restart Windows once and try again. If the problem persists, check that `C:\Program Files\nodejs\` exists and is on your Windows `PATH`, or rerun the Node.js installer and choose **Repair**.

## Install and run

In PowerShell, change to the project directory (adjust the path if you put the project elsewhere), install the exact dependency versions from the lockfile, and start Vite:

```powershell
cd "C:\Users\cauley leighton\OneDrive\Desktop\LARGE HADRON COLLIDER HYPERSIM"
npm ci
npm run dev
```

Open the **Local** URL printed by Vite, usually `http://localhost:5173/`. Keep the terminal open while using the development server. Press **Ctrl+C** in that terminal to stop it.

For access from other devices on the same network, you can start Vite with:

```powershell
npm run dev -- --host 0.0.0.0
```

Only expose a development server to a network you trust.

## Useful commands

Run these from the project directory:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with hot module replacement. |
| `npm run lint` | Run Oxlint on the project. |
| `npm run build` | Create the optimized production build in `dist\`. |
| `npm run preview` | Serve the existing production build locally; run `npm run build` first. |

To build and preview the production version:

```powershell
npm run build
npm run preview
```

Open the **Local** URL printed by Vite Preview, usually `http://localhost:4173/`. The preview server is for local verification, not a production hosting service. To deploy, publish the contents of `dist\` using a static web host.

## Using the app

1. Open **Overview** and use the explicitly named controls in order: grid power, emergency-stop reset, status-light verification, cryogenics, vacuum pumps, magnet power, dipole and quadrupole ramps, Linac4/Booster/SPS readiness, separate Beam A and Beam B injection, RF enable, beam ramp, orbit correction, collimation, ATLAS and CMS readiness, data acquisition, beam squeeze, collision-mode arm, and start collisions. Persistent systems use switches; operator commands use pushbuttons. Each control has a visible model transition and is interlocked; there is no generic next-stage button. Turning off a completed switch resets dependent later steps, so unwind the sequence before disabling an upstream system. The cooling, vacuum, magnet, and energy gauges are accelerated model outputs, not live readings.
   To finish a fill, request end-of-fill (collisions stop at the next event boundary) and explicitly extract beams to the modeled dump. For another fill, the model retains cryogenic, vacuum, magnet, and injector readiness. The optional **technical stop** path ramps the modeled magnets down; cooldown and warm-up are not simulated. Beam configuration controls unlock in standby/technical-stop states.
   The **Collider** map shows CERN's proton injector chain. Select a machine or use **Advance Stage** to move an educational walkthrough marker; **Restart** returns it to Linac4. This walkthrough is independent of the simulated beam controls and does not change collision events. Accelerator schematics are not to scale.
   The Overview panel displays CERN's 13.6 TeV Run 3 collision-energy figure as a reference only. Beam settings drive educational machine diagnostics; generated event kinematics are resampled from the measured CMS dimuon dataset and are not recalculated at the configured energy.
   On **Beam Control**, edit Beam A and Beam B configuration independently while the collider is in standby or technical stop. Press the matching **LOAD BEAM A CONFIGURATION** or **LOAD BEAM B CONFIGURATION** pushbutton to apply the staged particle type, target energy, intensity, particle count, and direction. Each load takes five modeled seconds; configuration is interlocked during startup and operation. Beam injection, RF enable, energy ramping, and alignment remain part of the Overview operator sequence.
2. Visit **Collision** for the animated chamber view, **Detector** to switch between separate ATLAS and CMS subsystem references, or **Event Display** to inspect data-informed simulated events. Each simulated event identifies the recorded CMS run/event template it resampled; it is not itself a recorded CMS collision. Only CMS records are bundled; ATLAS is not associated with measurements in this dataset. Save events from Event Display to persist their provenance and automatic priority tag.
3. Review saved labels in Event Display: confirm or correct a tag to add it to local training examples. Unreviewed automatic labels are never used for ranking. After four reviewed events across two or more categories, the app shows a nearest-profile similarity ranking for the current event; every reviewed category is included, and categories with fewer than two examples are marked provisional.
4. Use **Analysis** for plots and comparisons. Its CMS-style dimuon workflow applies editable opposite-charge, muon pT, |eta|, and invariant-mass cuts to either the bundled 2,000-event CMS reference sample or the selected simulator/archived workspace; inspect the cutflow, mass histogram, and recomputed candidates. Use **Data** to browse the saved-event archive and export records.
5. Open **Help** for a page-by-page guide, the individual start-up controls, detector descriptions, priority rules, source-field limitations, and CERN source links. **Settings** contains session-only display and accessibility preferences.
6. Open **Discovery** for the particle library. Search by name, symbol, class, antiparticle, or decay clue, then select an entry for its approximate properties, production and decay information, detector signature, and interpretation notes. The page also explains tracks, calorimeters, muons, missing transverse momentum, jets, and displaced vertices.
7. **Experiments** lets you configure and run the local simulator. Events are resampled from the bundled CMS dimuon records and passed through an educational detector-response model; beam settings do not rescale the measured template kinematics.

Experiments, saved collisions, and research notes are saved in the current browser's local storage, not to a server. They are browser/device-specific and can be removed by clearing that browser's site data. The app no longer applies a fixed experiment-count limit, but browser storage is finite. In **Data**, export the complete versioned JSON research archive regularly; importing an archive merges records by ID and keeps existing local records when IDs conflict. This is a backup/restore aid, not cloud synchronization.

### Physics and analysis scope

The simulator calculates relativistic momentum and energy with `E² = p² + m²` and magnetic rigidity with `p [GeV/c] = 0.299792458 × B [T] × rho [m]`, using a modeled LHC bending radius of 2,803.95 m. The configured dipole field limits the modeled beam energy. Beam A/B energies, species, directions, intensities, orbit offset, and field setting feed the displayed centre-of-mass energy and diagnostic model. Same-direction beams do not produce the modeled head-on luminosity estimate. The estimate assumes Gaussian, head-on proton beams, one bunch, nominal population 1.15×10¹¹ scaled by the intensity settings, normalized emittance 2.5 μm, and beta-star 0.4 m. It is an educational estimate—not a machine measurement or prediction. Stability and orbit readings are also simulated.

Simulated events use a non-parametric empirical resampling approach: each event starts from one of the bundled 2,000 selected CMS 2010 J/ψ→μ⁺μ⁻ records, sampled uniformly with replacement, and then passes through a simplified detector-response model. The exact template run/event is retained for provenance, while the generated event is separately labeled as a simulation. This method reflects only the selected dimuon sample; it does not represent other processes, measured production cross-sections, or energy-dependent changes. The model does not extrapolate or rescale the recorded particle momenta to match the configured beam energy. The bundled CSV is a derived educational sample, not the complete CMS open-data record.

The CMS-style Analysis workflow operates on the bundled selected CMS 2010 J/ψ dimuon CSV or local workspace events. It recomputes dimuon mass from recorded four-vectors, reports a sequential cutflow, plots the candidate-mass histogram, and lists source and recomputed masses separately. Default cuts are opposite charge, muon pT ≥ 0.5 GeV, |eta| ≤ 2.4, and 2.6 ≤ m(μμ) ≤ 3.5 GeV. Workspace observables include pT, pseudorapidity, azimuth, and dimuon candidates; the CSV has no missing-pT field. Simulated pT imbalance is calculated from the selected muon tracks only, not the complete event, and is not full-event missing transverse momentum. The reference workflow also displays an explicitly educational, unweighted sideband S/B and S/√B estimate with a flat-background assumption. Neither the estimate nor the overall workflow is a validated CMS analysis or discovery significance: the bundled derived data do not include complete detector objects, trigger decisions, event weights, pileup, luminosity certification, or every ingredient required for a publishable result.

On **Analysis**, save a report with its selection cuts, cutflow, histogram, result summaries, and selected run/event references; reports can be linked to a research project. On **Data**, create projects and event collections, add saved collisions to the selected collection, and create notes linked to projects, completed experiments, and datasets (the CMS reference, saved-collision archive, or an experiment dataset). The dated research timeline joins projects, notes, reports, and completed experiments and lists the available dataset identities. Local storage persists when returning to the site in the same browser profile; it does not automatically sync between devices.

### Particle library scope and interpretation

The **Discovery** page contains the Standard Model particles and a practical selection of common collider hadrons and resonances, including antiparticle information. It is an educational reference, not an exhaustive listing of every known hadron or resonance. Masses are rounded reference values; light-quark masses depend on the convention used, and individual neutrino masses have not been measured. Lifetime and decay descriptions are approximate where indicated.

Detector signatures are clues reconstructed from tracks, calorimeter deposits, muon chambers, and event-wide momentum balance; they are not direct photographs of most particles. Quarks and gluons are confined and are inferred from hadrons and jets. Neutrinos are typically inferred through missing transverse momentum rather than individually detected. The app labels hypothetical particles such as the graviton or dark-matter candidates as unconfirmed rather than established discoveries.

The reference content is maintained in [`src/physics/catalogue.js`](src/physics/catalogue.js) and links to [CERN's Standard Model overview](https://home.cern/science/physics/standard-model), the [Particle Data Group 2025 Review and update](https://pdg.lbl.gov/2025/), and [CMS detector information](https://cms.cern/detector).

### Simulated accelerator procedure

The Overview panel provides individual controls in this order: grid power, emergency-stop reset, status verification, cryogenics, vacuum pumps, magnet power, dipole ramp, quadrupole ramp, Linac4, Booster, SPS transfer, Beam A injection, Beam B injection, RF, beam-energy ramp, orbit correction, collimation, ATLAS readiness, CMS readiness, data acquisition, beam squeeze, collision-mode arm, and start collisions. Persistent equipment uses latched switches; procedural commands use pushbuttons. Every action displays a progress indicator and waits for its modeled transition before unlocking the next interlock. Cryogenic and vacuum startup take longer than simple enable commands; all time scales are intentionally compressed. Turning off an enabled switch resets its dependent later controls so the procedure can be repeated safely in reverse order.

At 1.9 K the modeled cryogenic gauge reflects the approximate operating temperature of LHC superconducting magnets, but the app does not simulate the real cooldown process, which is much longer. Likewise, the 13.6 TeV Run 3 collision energy is shown as CERN context; this app's local beam settings remain in GeV and do not produce 13.6 TeV events. The bundled event stream replays measured CMS dimuon records.

Requesting end-of-fill stops replayed collisions at the next event boundary, after which the beam-dump action ends the fill. For another fill, modeled cryogenic, vacuum, magnet, and injector readiness is retained and the process resumes at beam injection. Alternatively, choose the separate technical-stop path to ramp the modeled magnet circuits down; cooldown and warm-up are not simulated.

These are educational controls, not a faithful timing, interlock, or machine-protection implementation. Real LHC operation requires qualified operators and extensive hardware/software protections. This project has no live CERN connection and must not be used to control or operate accelerator equipment. The standalone **Experiments** runner remains a separate local batch simulation.

### Startup timing and incident simulation

The following transition times are the simulator's configured waits. A group duration applies to **each individual control** in that group, so the three main-power controls each take 5 seconds; injector-chain controls each take 15 seconds; and ATLAS, CMS, and data-acquisition readiness each take 10 seconds. Collision-mode arm is an additional modeled 5-second interlock step. These accelerated waits are not CERN operating timings.

| Control or stage | Modeled wait |
| --- | ---: |
| Grid power, emergency-stop reset, status-light verification | 5 seconds each |
| Cryogenics / vacuum pumps | 30 / 20 seconds |
| Magnet power / dipole ramp / quadrupole ramp | 15 / 30 / 20 seconds |
| Linac / Booster / SPS transfer readiness | 15 seconds each |
| Beam A injection / Beam B injection | 10 seconds each |
| RF system / beam ramp | 5 / 60 seconds |
| Orbit correction / collimation | 20 / 15 seconds |
| ATLAS ready / CMS ready / data acquisition | 10 seconds each |
| Beam squeeze / collision-mode arm / start collisions | 30 / 5 / 5 seconds |

Each startup attempt draws one weighted outcome from these user-configured probabilities:

| Startup outcome | Chance | Effect |
| --- | ---: | --- |
| Cryogenic cooling delay | 8% | Fault at CRYO START |
| Vacuum instability | 5% | Fault at VACUUM PUMPS ON |
| Power fluctuation | 3% | Fault at GRID POWER |
| Magnet power supply fault | 2% | Fault at MAGNET POWER ENABLE |
| RF system tuning error | 4% | Fault at RF SYSTEM ON |
| Detector not responding | 3% | Fault at ATLAS READY |
| Injection timing fault | 2% | Fault at INJECT BEAM A |
| No startup failure | 73% | Startup continues without a startup fault |

During a running fill, one mutually exclusive weighted outcome is checked every 10 minutes of simulator run time. The speed setting scales this interval. A warning (minor beam loss 5%, detector data drop-out 3%, vacuum warning 1%, or cooling warning 1%) opens an on-screen popup but does not stop operations. A fault (detector trip 0.05%) pauses operations until the user starts a modeled 1–3 minute recovery. A critical event automatically initiates beam protection and extraction at the next event boundary: magnet quench 0.1%, emergency beam dump 0.2%, major vacuum leak 0.02%, or power-grid interruption 0.01%. The no-incident outcome is 89.62% per interval. Magnet quench is listed once; its separate mention as a rare event does not add another 0.1% chance.

These are educational model assumptions supplied for this simulator, **not measured CERN failure rates or a prediction of real machine behavior**. Popups are also recorded in system notifications. Warnings must be acknowledged, faults require recovery, and critical incidents begin an automatic beam-dump sequence.

### ATLAS and CMS detector views

The **Detector** page has separate ATLAS and CMS selectors and describes each experiment's tracker, electromagnetic and hadronic calorimeters, muon system, and magnet system. The bundled sample contains CMS reconstructed dimuon records only. CMS track classifications are shown where available; raw detector hits, calorimeter deposits, and ATLAS measurements are not present in the sample and are reported as unavailable rather than estimated. Responses for locally generated events are labeled as educational model output.

## CERN accelerator-chain references

The map adds context for where an LHC proton beam comes from. The small PS Booster symbol represents its **four superimposed synchrotron rings**. The map is a conceptual schematic and is not to scale:

| CERN machine | Beam at this stage | Reference energy |
| --- | --- | --- |
| Linac4 | Negative hydrogen ions (H⁻) | 160 MeV |
| PS Booster (PSB) | Protons, after the H⁻ electrons are stripped during injection | 2 GeV |
| Proton Synchrotron (PS) | Protons | 26 GeV |
| Super Proton Synchrotron (SPS) | Protons | 450 GeV |
| Large Hadron Collider (LHC) | Two counter-circulating proton beams | Up to 6.8 TeV per beam |

At 6.8 TeV per beam, the total centre-of-mass collision energy is 13.6 TeV. These figures describe CERN's accelerator chain; they are reference values, **not live machine readings or the values used by this simulator**. Stage selection and advance/restart controls only move the illustrative walkthrough marker. They do not operate accelerator hardware, adjust the simulator's separate beam settings, or change the bundled CMS event replay.

- CERN: [The accelerator complex](https://home.cern/science/accelerators/accelerator-complex)
- CERN: [Proton Synchrotron Booster](https://home.cern/science/accelerators/proton-synchrotron-booster)
- CERN: [Linear Accelerator 4](https://home.cern/science/accelerators/linear-accelerator-4)
- CERN: [Large Hadron Collider](https://home.cern/science/accelerators/large-hadron-collider)

## CERN reference data

The app bundles a CSV of **2,000 selected events** from the CMS 2010 educational **J/ψ → μ⁺μ⁻** sample:

- CERN Open Data record: [CMS 2010 J/ψ → μ⁺μ⁻](https://opendata.cern.ch/record/301)
- Original CSV: [dimuon-Jpsi.csv](https://opendata.cern.ch/record/301/files/dimuon-Jpsi.csv)
- DOI: `10.7483/OPENDATA.CMS.SW96.PFX3`
- License: `CC0-1.0`
- Bundled file: [`src/data/cms-2010-jpsi-dimuon.csv`](src/data/cms-2010-jpsi-dimuon.csv)

The app loads the CSV bundled with the source/build; it does not download the data when a user opens the app. Each displayed collision takes the next record in the sample and wraps back to the first record after the last one. The record's CMS run and event IDs, two muons' recorded energies, momentum components, transverse momenta, pseudorapidities, azimuthal angles, charges, reconstruction category, and pair invariant mass are shown as source data.

The bundled derived CSV does **not** contain the source event timestamp, collision energy, missing transverse momentum, jets, photons, vertices, or detector-quality values. Saved events preserve these fields as unavailable/null, with reasons; the app does not infer a missing-momentum value from the selected muons or fill unavailable source fields with simulation values. The saved-at timestamp is the local browser time when the record was saved, not the original collision timestamp.

## Collision priorities and reviewed-event ranking

When an event is saved from **Event Display**, deterministic rules apply these markers in precedence order:

| Marker | Category | Configured rules |
| --- | --- | --- |
| ▲ Black | Higgs candidate | Invariant mass within 125 ± 2 GeV. This is only a candidate window, not a discovery claim. |
| ▲ Red | High priority | Any reconstructed particle pT > 100 GeV/c; recorded missing pT > 100 GeV; invariant mass within 3.0969 ± 0.15 GeV of the investigated J/ψ mass; or an explicit rare-combination/background-disagreement flag. |
| ▲ Amber | Medium priority | At least two leptons or photons above 50 GeV; three or four reconstructed leptons; or explicit interesting-dijet, displaced/non-prompt, or unusual-pT-imbalance flags. |
| ▲ Blue | Research sample | Known decay/control/research examples, including source events from the bundled CERN sample, unless a higher-priority rule applies. |
| — | Unmarked | No configured rule matched the available measurements. |

These are screening heuristics, not validated physics classifications. Rules requiring absent data do not fire. Save an event, then confirm or correct its category in Event Display to review it. Only reviewed categories become training examples. The browser-local ranking starts after four reviewed events across two or more categories; it includes every reviewed category, while categories with fewer than two examples are treated as provisional. It compares available measured mass, particle pT, energy, and counts and reports a nearest-profile similarity. It does not update source measurements, generate collisions, or claim calibrated confidence. Saved records and reviewed labels are stored in that browser's local storage; use **Data** to inspect and export the archive.

This distinction matters when interpreting results:

- Changing beam species, beam energy, intensity, collision settings, detector configuration, or simulation speed does **not** alter the recorded CMS event.
- Accelerator telemetry, beam motion, timing, detector geometry/animation, and experiment-run counters/statistics are simulated.
- The sample contains selected dimuon records, not complete detector readouts. Calorimeter deposits and other values absent from the source CSV must not be interpreted as measured CERN data.
- This small educational sample is not a general-purpose CMS dataset and is not sufficient for a full physics analysis.

## Project layout

```text
src/
  collision/engine.js                 Parses the bundled sample and maps records to displayed events.
  collision/classification.js         Priority heuristics and reviewed-event similarity ranking.
  collision/storage.js                Saved collision metadata and reviewed labels in browser storage.
  components/                          React views, injector-chain map, Help, and Data.
  physics/catalogue.js                Particle reference records, detector guide, and source links.
  simulation/engine.js                Simulated operator phases and collision lifecycle.
  simulation/operation-sequence.css   Shared staged start-up and shutdown panel.
  components/OperationSequence.jsx    Operator sequence displayed across control views.
  data/cms-2010-jpsi-dimuon.csv        Bundled CERN Open Data reference sample.
  experiments/                         Presets, local runner, and browser storage.
  simulation/                          Simplified interactive simulator.
```

## Troubleshooting

- **`node` or `npm` is not recognized:** Install a supported Node.js version, then open a fresh terminal.
- **The development port is already in use:** Use the alternate port printed by Vite, or specify one, for example `npm run dev -- --port 5174`.
- **Dependencies do not install cleanly:** Confirm the Node.js version, then run `npm ci` again. This command installs from `package-lock.json`; it does not update the dependency manifest.
- **Preview does not show the latest edits:** Run `npm run build` again before `npm run preview`.
- **Production build reports a large-chunk warning:** The bundled reference CSV contributes to the client bundle. This is a warning, not a build failure.
#   L H C  
 #   L H C  
 