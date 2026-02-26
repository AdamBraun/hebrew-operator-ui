import { useEffect, useMemo, useRef } from 'react'
import { getEventSequence } from '../lib/trace/getEventSequence'
import type { TraceLocation } from '../lib/trace/types'
import './TraceEventViewer.css'

type TraceEventViewerProps = {
  traceJson: unknown
  primary?: TraceLocation
  alternatives?: TraceLocation[]
}

type Primitive = string | number | boolean | null
type UnknownRecord = Record<string, unknown>

const ROOT_PRIORITY_KEYS = [
  'type',
  'tau',
  'wordIndex',
  'word_index',
  'phase',
  'step',
  'index',
]

const DATA_PRIORITY_KEYS = [
  'id',
  'boundaryId',
  'target',
  'source',
  'focus',
  'activeConstruct',
  'beforeFocus',
  'afterFocus',
  'from',
  'to',
  'C0',
  'F0',
  'wordText',
]

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPrimitive(value: unknown): value is Primitive {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  )
}

function compactText(value: string, maxLength = 80): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1)}…`
}

function primitivePreview(value: Primitive): string {
  if (typeof value === 'string') {
    return compactText(value, 64)
  }

  return String(value)
}

function toPreviewJson(value: unknown, maxLength = 360): string {
  try {
    const raw = JSON.stringify(value)
    if (!raw) {
      return String(value)
    }

    if (raw.length <= maxLength) {
      return raw
    }

    return `${raw.slice(0, maxLength - 1)}…`
  } catch {
    try {
      return String(value)
    } catch {
      return '[unserializable]'
    }
  }
}

function pushField(
  fields: Array<{ key: string; value: string }>,
  seen: Set<string>,
  key: string,
  value: Primitive
): void {
  if (seen.has(key)) {
    return
  }

  seen.add(key)
  fields.push({ key, value: primitivePreview(value) })
}

function eventFields(event: unknown): Array<{ key: string; value: string }> {
  if (!isRecord(event)) {
    return [{ key: 'value', value: compactText(String(event), 64) }]
  }

  const fields: Array<{ key: string; value: string }> = []
  const seen = new Set<string>()

  for (const key of ROOT_PRIORITY_KEYS) {
    const value = event[key]
    if (!isPrimitive(value)) {
      continue
    }
    pushField(fields, seen, key, value)
  }

  const data = event.data
  if (isRecord(data)) {
    for (const key of DATA_PRIORITY_KEYS) {
      const value = data[key]
      if (!isPrimitive(value)) {
        continue
      }
      pushField(fields, seen, `data.${key}`, value)
    }
  }

  if (fields.length < 6) {
    for (const key of Object.keys(event).sort()) {
      const value = event[key]
      if (!isPrimitive(value)) {
        continue
      }

      pushField(fields, seen, key, value)
      if (fields.length >= 6) {
        break
      }
    }
  }

  return fields.slice(0, 6)
}

function eventTau(event: unknown): number | null {
  if (!isRecord(event)) {
    return null
  }

  const tau = event.tau
  if (typeof tau === 'number' && Number.isFinite(tau)) {
    return tau
  }

  return null
}

function eventWordIndex(event: unknown): number | null {
  if (!isRecord(event)) {
    return null
  }

  const direct = event.wordIndex
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct
  }

  const data = event.data
  if (!isRecord(data)) {
    return null
  }

  const fromData = data.wordIndex
  if (typeof fromData === 'number' && Number.isFinite(fromData)) {
    return fromData
  }

  const fromDataSnake = data.word_index
  if (typeof fromDataSnake === 'number' && Number.isFinite(fromDataSnake)) {
    return fromDataSnake
  }

  return null
}

function toEventIndex(
  location: TraceLocation | undefined,
  events: readonly unknown[]
): number | null {
  if (!location) {
    return null
  }

  if (location.kind === 'event') {
    if (!Number.isInteger(location.index) || location.index < 0) {
      return null
    }
    return location.index < events.length ? location.index : null
  }

  if (location.tau !== undefined) {
    const tauMatch = events.findIndex((event) => eventTau(event) === location.tau)
    if (tauMatch >= 0) {
      return tauMatch
    }
  }

  if (location.wordIndex !== undefined) {
    const wordIndexMatch = events.findIndex(
      (event) => eventWordIndex(event) === location.wordIndex
    )
    if (wordIndexMatch >= 0) {
      return wordIndexMatch
    }
  }

  if (!Number.isInteger(location.index) || location.index < 0 || location.index >= events.length) {
    return null
  }

  return location.index
}

function eventIndices(locations: readonly TraceLocation[], events: readonly unknown[]): number[] {
  const out: number[] = []
  const seen = new Set<number>()

  for (const location of locations) {
    const index = toEventIndex(location, events)
    if (index === null || seen.has(index)) {
      continue
    }

    seen.add(index)
    out.push(index)
  }

  return out
}

function TraceEventViewer({
  traceJson,
  primary,
  alternatives = [],
}: TraceEventViewerProps) {
  const sequence = useMemo(() => getEventSequence(traceJson), [traceJson])
  const events = sequence.events ?? []
  const selectedEventIndex = useMemo(() => {
    const direct = toEventIndex(primary, events)
    if (direct !== null) {
      return direct
    }

    return eventIndices(alternatives, events)[0] ?? null
  }, [alternatives, events, primary])
  const alternativeEventIndexSet = useMemo(() => {
    const out = new Set<number>(eventIndices(alternatives, events))
    if (selectedEventIndex !== null) {
      out.delete(selectedEventIndex)
    }
    return out
  }, [alternatives, events, selectedEventIndex])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (selectedEventIndex === null) {
      return
    }

    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-event-index="${selectedEventIndex}"]`
    )
    el?.scrollIntoView({ block: 'center', inline: 'nearest' })
  }, [selectedEventIndex])

  if (!sequence.events) {
    return (
      <section className="trace-event-viewer" aria-label="Trace events">
        <header className="trace-event-viewer__header">
          <h2 className="trace-event-viewer__title">Trace events</h2>
        </header>
        <div className="trace-event-viewer__error-panel" role="alert">
          <p className="trace-event-viewer__error-message">No events array detected</p>
          <p className="trace-event-viewer__error-keys">
            Top-level keys:{' '}
            {sequence.topLevelKeys.length > 0 ? sequence.topLevelKeys.join(', ') : '(none)'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="trace-event-viewer" aria-label="Trace events">
      <header className="trace-event-viewer__header">
        <h2 className="trace-event-viewer__title">Trace events</h2>
        <p className="trace-event-viewer__meta">
          Source: <code>{sequence.sourcePath ?? 'unknown'}</code> | count: {events.length}
        </p>
      </header>

      <div ref={scrollRef} className="trace-event-viewer__scroll" role="region" aria-label="Event cards">
        {events.map((event, index) => {
          const fields = eventFields(event)
          const isSelected = selectedEventIndex === index
          const isAlternative = alternativeEventIndexSet.has(index)

          return (
            <article
              key={index}
              data-event-index={index}
              className={[
                'trace-event-viewer__card',
                isSelected ? 'trace-event-viewer__card--selected' : '',
                isAlternative ? 'trace-event-viewer__card--alternative' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <header className="trace-event-viewer__card-header">
                <span className="trace-event-viewer__index">#{index}</span>
                {isSelected ? <span className="trace-event-viewer__badge">primary</span> : null}
                {!isSelected && isAlternative ? (
                  <span className="trace-event-viewer__badge trace-event-viewer__badge--alt">
                    alternative
                  </span>
                ) : null}
              </header>

              {fields.length > 0 ? (
                <dl className="trace-event-viewer__fields">
                  {fields.map((field) => (
                    <div key={field.key} className="trace-event-viewer__field">
                      <dt>{field.key}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <pre className="trace-event-viewer__preview">{toPreviewJson(event)}</pre>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default TraceEventViewer
