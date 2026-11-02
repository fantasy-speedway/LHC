export default function BeamEnergyGraph({ history }) {
  const values = history.map((point) => point.energy); const min = Math.min(...values, 0); const max = Math.max(...values, 1); const range = Math.max(max - min, 1); const points = history.map((point, index) => `${(index / Math.max(history.length - 1, 1)) * 100},${34 - ((point.energy - min) / range) * 28}`).join(' ')
  return <div className="energy-graph"><svg viewBox="0 0 100 38" preserveAspectRatio="none" role="img" aria-label="Simplified beam energy over time"><path className="graph-grid" d="M0 7H100M0 20H100M0 33H100" /><polyline points={points} /></svg><div className="graph-axis"><span>{min.toFixed(1)} GeV</span><span>{max.toFixed(1)} GeV</span></div></div>
}
