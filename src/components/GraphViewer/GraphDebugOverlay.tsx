import type { ClickedGraphEntity } from './getClickedGraphEntity'

type GraphDebugOverlayProps = {
  entity: ClickedGraphEntity | null
}

function GraphDebugOverlay({ entity }: GraphDebugOverlayProps) {
  if (!import.meta.env.DEV) {
    return null
  }

  return (
    <aside className="graph-debug-overlay" aria-live="polite">
      <strong className="graph-debug-overlay__title">Graph click debug</strong>
      {entity ? (
        <dl className="graph-debug-overlay__list">
          <div>
            <dt>kind</dt>
            <dd>{entity.kind}</dd>
          </div>
          <div>
            <dt>id</dt>
            <dd>
              <code>{entity.id}</code>
            </dd>
          </div>
          {entity.label ? (
            <div>
              <dt>label</dt>
              <dd>{entity.label}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="graph-debug-overlay__empty">Click a graph node or edge.</p>
      )}
    </aside>
  )
}

export default GraphDebugOverlay

