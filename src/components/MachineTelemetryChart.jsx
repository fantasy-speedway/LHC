function chartValue(sample, metric) {
  const value = sample[metric.key]
  if (!Number.isFinite(value)) return null
  return metric.logarithmic ? Math.log10(Math.max(value, 1e-15)) : value
}

export default function MachineTelemetryChart({ history, metric }) {
  const samples = history
    .map((sample) => ({ sample, value: chartValue(sample, metric) }))
    .filter(({ value }) => Number.isFinite(value))
  const current = samples.at(-1)
  const rawValues = samples.map(({ value }) => value)
  const rawMinimum = rawValues.length ? Math.min(...rawValues) : 0
  const rawMaximum = rawValues.length ? Math.max(...rawValues) : 1
  const padding = rawMaximum === rawMinimum ? Math.max(Math.abs(rawMaximum) * 0.05, 0.1) : (rawMaximum - rawMinimum) * 0.08
  const minimum = rawMinimum - padding
  const maximum = rawMaximum + padding
  const plot = { left: 44, right: 310, top: 12, bottom: 76 }
  const coordinates = samples.map(({ value }, index) => {
    const x = samples.length > 1
      ? plot.left + (index / (samples.length - 1)) * (plot.right - plot.left)
      : (plot.left + plot.right) / 2
    const y = plot.bottom - ((value - minimum) / (maximum - minimum)) * (plot.bottom - plot.top)
    return { x, y }
  })
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const formatAxis = (value) => metric.logarithmic
    ? metric.format(10 ** value)
    : metric.format(value)

  return (
    <article className="machine-telemetry-chart">
      <header>
        <span>{metric.label}</span>
        <strong>{current ? metric.format(current.sample[metric.key]) : 'NO SAMPLE'}</strong>
      </header>
      <svg viewBox="0 0 320 108" role="img" aria-label={`${metric.label} history chart; vertical axis in ${metric.unit}`}>
        {[0, 0.5, 1].map((fraction) => {
          const y = plot.bottom - fraction * (plot.bottom - plot.top)
          const value = minimum + fraction * (maximum - minimum)
          return (
            <g key={fraction}>
              <line x1={plot.left} x2={plot.right} y1={y} y2={y} className="machine-chart-grid" />
              <text x="40" y={y + 3} textAnchor="end" className="machine-chart-axis">{formatAxis(value)}</text>
            </g>
          )
        })}
        <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} className="machine-chart-axis-line" />
        <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} className="machine-chart-axis-line" />
        {points && <polyline points={points} className="machine-chart-line" />}
        {current && coordinates.length > 0 && <circle cx={coordinates.at(-1).x} cy={coordinates.at(-1).y} r="2.5" className="machine-chart-current" />}
        {!current && <text x="177" y="49" textAnchor="middle" className="machine-chart-empty">FILL TELEMETRY APPEARS DURING A RUN</text>}
        <text x="177" y="101" textAnchor="middle" className="machine-chart-axis">{samples.length ? `${samples[0].sample.time.toFixed(1)}–${samples.at(-1).sample.time.toFixed(1)} s` : 'Fill time (s)'}</text>
        <text x="10" y="47" transform="rotate(-90 10 47)" textAnchor="middle" className="machine-chart-axis">{metric.unit}</text>
      </svg>
    </article>
  )
}
