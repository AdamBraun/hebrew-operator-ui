import type { TraceHandle, TraceObject } from '../lib/trace/types'

type HandleInspectorProps = {
  selectedHandleId?: string
  handle?: TraceHandle
  referenceCount: number
}

const PREFERRED_META_KEYS = [
  'owner',
  'word_text',
  'construct_role',
  'mode',
  'inside',
  'outside',
  'target',
  'closedBy',
] as const

function isObject(value: unknown): value is TraceObject {
  return typeof value === 'object' && value !== null
}

function truncate(text: string, max = 140): string {
  if (text.length <= max) {
    return text
  }

  return `${text.slice(0, max)}...`
}

function formatMetaValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return truncate(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return truncate(JSON.stringify(value) ?? '<unserializable>')
}

function selectMetaEntries(meta: TraceObject | undefined): Array<[string, string]> {
  if (!meta || !isObject(meta)) {
    return []
  }

  const entries: Array<[string, string]> = []
  const used = new Set<string>()

  for (const key of PREFERRED_META_KEYS) {
    if (!(key in meta)) {
      continue
    }

    entries.push([key, formatMetaValue(meta[key])])
    used.add(key)
  }

  const extras = Object.keys(meta)
    .filter((key) => !used.has(key))
    .sort()
    .slice(0, Math.max(0, 6 - entries.length))

  for (const key of extras) {
    entries.push([key, formatMetaValue(meta[key])])
  }

  return entries
}

function HandleInspector({ selectedHandleId, handle, referenceCount }: HandleInspectorProps) {
  if (!selectedHandleId) {
    return (
      <section className="trace-panel__inspector" aria-label="Handle inspector">
        <p className="trace-panel__inspector-empty">No handle selected.</p>
      </section>
    )
  }

  const metaEntries = selectMetaEntries(handle?.meta)

  return (
    <section className="trace-panel__inspector" aria-label="Handle inspector">
      <h3 className="trace-panel__inspector-title">Handle Inspector</h3>
      <p className="trace-panel__inspector-line">
        id=<span className="trace-panel__inspector-id">{selectedHandleId}</span>
      </p>
      <p className="trace-panel__inspector-line">kind={handle?.kind ?? '<missing>'}</p>
      <p className="trace-panel__inspector-line">Referenced in {referenceCount} events</p>

      {metaEntries.length > 0 ? (
        <ul className="trace-panel__inspector-list">
          {metaEntries.map(([key, value]) => (
            <li key={key} className="trace-panel__inspector-item">
              <span className="trace-panel__inspector-key">{key}=</span>
              <span className="trace-panel__inspector-value">{value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="trace-panel__inspector-empty">No meta fields available.</p>
      )}
    </section>
  )
}

export default HandleInspector
