import './injector-chain.css'

const stages = [
  {
    name: 'Linac4',
    kind: 'LINEAR',
    particle: 'H− ions',
    energy: '160 MeV',
    detail: 'Negative hydrogen ions enter the PS Booster; their electrons are stripped during injection.',
  },
  {
    name: 'PS Booster',
    kind: 'BOOSTER',
    particle: 'protons',
    energy: '2 GeV',
    detail: 'Four superimposed synchrotron rings accelerate the protons for transfer to the PS.',
  },
  {
    name: 'PS',
    kind: 'RING',
    particle: 'protons',
    energy: '26 GeV',
    detail: 'The Proton Synchrotron accelerates the beam before injection into the SPS.',
  },
  {
    name: 'SPS',
    kind: 'RING',
    particle: 'protons',
    energy: '450 GeV',
    detail: 'The Super Proton Synchrotron prepares the proton beam for transfer to the LHC.',
  },
  {
    name: 'LHC',
    kind: 'RING',
    particle: 'protons',
    energy: '6.8 TeV / beam',
    detail: 'The LHC receives two counter-circulating beams; 6.8 TeV per beam corresponds to 13.6 TeV total collision energy.',
  },
]

function StageIcon({ kind }) {
  if (kind === 'LINEAR') {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 24h38M9 17h6v14H9zm12 0h6v14h-6zm12 0h6v14h-6z" /></svg>
  }

  const radii = kind === 'BOOSTER' ? [19, 14, 9, 4] : [17]
  return <svg viewBox="0 0 48 48" aria-hidden="true">{radii.map((radius) => <circle key={radius} cx="24" cy="24" r={radius} />)}</svg>
}

export default function InjectorChain({ stage, onStageChange }) {
  const activeStage = Math.min(Math.max(stage, 0), stages.length - 1)
  const selected = stages[activeStage]

  return (
    <section className="injector-chain" aria-label="Educational CERN proton injector sequence">
      <header className="injector-chain-header">
        <div>
          <span className="section-kicker">CERN PROTON INJECTOR CHAIN</span>
          <h3>From Linac4 to the LHC</h3>
        </div>
        <span className="injector-reference-badge">REFERENCE ENERGIES / NOT LIVE TELEMETRY</span>
      </header>
      <ol className="injector-stages">
        {stages.map((item, index) => (
          <li className={`injector-stage ${index === activeStage ? 'active' : ''} ${index < activeStage ? 'passed' : ''}`} key={item.name}>
            <button type="button" onClick={() => onStageChange(index)} aria-pressed={index === activeStage} aria-label={`${item.name}, ${item.energy}, ${item.particle}`}>
              <StageIcon kind={item.kind} />
              <span className="injector-stage-name">{item.name}</span>
              <span className="injector-stage-energy">{item.energy}</span>
              <span className="injector-stage-particle">{item.particle}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="injector-chain-footer">
        <p><strong>{selected.name}:</strong> {selected.detail}</p>
        <div className="injector-chain-controls">
          <span>EDUCATIONAL SEQUENCE / STAGE {activeStage + 1} OF {stages.length}</span>
          <button type="button" onClick={() => onStageChange(0)} disabled={activeStage === 0}>↺ RESTART</button>
          <button type="button" onClick={() => onStageChange(Math.min(activeStage + 1, stages.length - 1))} disabled={activeStage === stages.length - 1}>ADVANCE STAGE →</button>
        </div>
      </div>
    </section>
  )
}
