function GraphUsageLegend() {
  return (
    <aside className="graph-usage-legend" aria-label="Color usage legend">
      <strong className="graph-usage-legend__title">Usage Rules</strong>

      <div className="graph-usage-legend__row">
        <span className="graph-usage-legend__sample graph-usage-legend__sample--node" />
        <span className="graph-usage-legend__text">
          Default nodes: neutral fill, semantic border only.
        </span>
      </div>

      <div className="graph-usage-legend__row">
        <span className="graph-usage-legend__sample graph-usage-legend__sample--anchor">Ω</span>
        <span className="graph-usage-legend__text">
          Rare anchors may be filled (for example, scope or Ω).
        </span>
      </div>

      <div className="graph-usage-legend__row">
        <svg
          className="graph-usage-legend__sample-line"
          viewBox="0 0 44 10"
          aria-hidden="true"
        >
          <line
            x1="2"
            y1="5"
            x2="42"
            y2="5"
            stroke="var(--neutral-text-muted)"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        </svg>
        <span className="graph-usage-legend__text">
          Trope edges: always dashed and muted.
        </span>
      </div>

      <div className="graph-usage-legend__row">
        <span className="graph-usage-legend__chips">
          <span className="graph-usage-legend__chip graph-usage-legend__chip--cut-1">C1</span>
          <span className="graph-usage-legend__chip graph-usage-legend__chip--cut-2">C2</span>
          <span className="graph-usage-legend__chip graph-usage-legend__chip--cut-3">C3</span>
        </span>
        <span className="graph-usage-legend__text">
          Cut colors are markers only, never panel backgrounds.
        </span>
      </div>

      <div className="graph-usage-legend__row">
        <span className="graph-usage-legend__selection" aria-hidden="true">
          <span className="graph-usage-legend__hebrew">בְּרֵאשִׁית</span>
        </span>
        <span className="graph-usage-legend__text">
          Selection uses outline + glow; Hebrew text color stays neutral.
        </span>
      </div>
    </aside>
  )
}

export default GraphUsageLegend
