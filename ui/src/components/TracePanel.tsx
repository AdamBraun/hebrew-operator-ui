import { useEffect, useMemo, useState } from 'react'
import { formatEvent } from '../lib/trace/format_event'
import type { TraceEvent, TraceJson, TraceJsonState, TraceObject } from '../lib/trace/types'
import type { WordGroup } from '../lib/trace/words'
import './TracePanel.css'

type TracePanelProps = {
  trace: TraceJson
  selectedHandleId?: string
  refsByHandleId: Map<string, number[]>
  wordGroups: WordGroup[]
}

function isObject(value: unknown): value is TraceObject {
  return typeof value === 'object' && value !== null
}

function isTraceJsonState(value: unknown): value is TraceJsonState {
  if (!isObject(value)) {
    return false
  }

  return (
    Array.isArray(value.handles) &&
    Array.isArray(value.boundaries) &&
    Array.isArray(value.links) &&
    Array.isArray(value.rules) &&
    isObject(value.vm) &&
    Array.isArray(value.vm.H)
  )
}

function resolveEvents(trace: TraceJson): TraceEvent[] {
  if (isTraceJsonState(trace)) {
    return trace.vm.H
  }

  if (isObject(trace) && isTraceJsonState(trace.final_state)) {
    return trace.final_state.vm.H
  }

  return []
}

function refsSetForHandle(
  refsByHandleId: Map<string, number[]>,
  selectedHandleId?: string
): Set<number> {
  if (!selectedHandleId) {
    return new Set<number>()
  }

  const refs = refsByHandleId.get(selectedHandleId) ?? []
  return new Set(refs)
}

function wordContainingEvent(groups: WordGroup[], eventIndex: number): number | null {
  for (const group of groups) {
    const [start, end] = group.eventRange
    if (eventIndex >= start && eventIndex <= end) {
      return group.wordIndex
    }
  }

  return null
}

function isHandleLikeLabel(label: string): boolean {
  return /(?:^|_)(?:id|focus|left|right|inside|outside|target|domain|endpoint|spine|exemplar|c0|f0)$/i.test(
    label
  )
}

function EventDetails({ lines }: { lines: string[] }) {
  return (
    <ul className="trace-panel__detail-list">
      {lines.map((line, i) => {
        const equalIndex = line.indexOf('=')
        if (equalIndex < 0) {
          return (
            <li key={i} className="trace-panel__detail trace-panel__detail--mono">
              {line}
            </li>
          )
        }

        const label = line.slice(0, equalIndex)
        const value = line.slice(equalIndex + 1)
        const mono = isHandleLikeLabel(label)

        return (
          <li key={i} className="trace-panel__detail">
            <span className="trace-panel__detail-label">{label}=</span>
            <span
              className={[
                'trace-panel__detail-value',
                mono ? 'trace-panel__detail-value--mono' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {value}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function TracePanel({ trace, selectedHandleId, refsByHandleId, wordGroups }: TracePanelProps) {
  const events = useMemo(() => resolveEvents(trace), [trace])
  const selectedRefs = useMemo(
    () => refsSetForHandle(refsByHandleId, selectedHandleId),
    [refsByHandleId, selectedHandleId]
  )
  const currentWordIndex = useMemo(() => {
    if (selectedRefs.size === 0) {
      return null
    }

    const refs = [...selectedRefs].sort((a, b) => a - b)
    for (const ref of refs) {
      const match = wordContainingEvent(wordGroups, ref)
      if (match !== null) {
        return match
      }
    }

    return null
  }, [selectedRefs, wordGroups])
  const defaultWordIndex = currentWordIndex ?? wordGroups[0]?.wordIndex ?? null
  const [expandedWordIndices, setExpandedWordIndices] = useState<Set<number>>(() =>
    defaultWordIndex === null ? new Set<number>() : new Set<number>([defaultWordIndex])
  )

  useEffect(() => {
    if (defaultWordIndex === null) {
      return
    }

    setExpandedWordIndices((current) => {
      if (current.size === 0) {
        return new Set<number>([defaultWordIndex])
      }

      if (currentWordIndex !== null && !current.has(currentWordIndex)) {
        const next = new Set(current)
        next.add(currentWordIndex)
        return next
      }

      return current
    })
  }, [currentWordIndex, defaultWordIndex])

  function toggleWord(wordIndex: number) {
    setExpandedWordIndices((current) => {
      const next = new Set(current)
      if (next.has(wordIndex)) {
        next.delete(wordIndex)
      } else {
        next.add(wordIndex)
      }

      return next
    })
  }

  return (
    <section className="trace-panel" aria-label="Trace panel">
      <header className="trace-panel__header">
        <h2 className="trace-panel__title">Trace</h2>
        {selectedHandleId ? (
          <p className="trace-panel__selected">
            selected=<span className="trace-panel__selected-id">{selectedHandleId}</span>
          </p>
        ) : null}
      </header>

      <div className="trace-panel__scroll" role="region" aria-label="Trace by word">
        {wordGroups.length === 0 ? (
          <p className="trace-panel__empty">No WORD_START events found.</p>
        ) : (
          wordGroups.map((group) => {
            const isExpanded = expandedWordIndices.has(group.wordIndex)
            const [start, end] = group.eventRange
            const startIndex = Math.max(0, start)
            const endIndex = Math.min(end, events.length - 1)
            const groupEventIndices: number[] = []

            for (let i = startIndex; i <= endIndex; i += 1) {
              groupEventIndices.push(i)
            }

            return (
              <section key={group.wordIndex} className="trace-panel__word">
                <button
                  type="button"
                  className="trace-panel__word-toggle"
                  onClick={() => toggleWord(group.wordIndex)}
                  aria-expanded={isExpanded}
                >
                  <span className="trace-panel__word-meta">
                    word {group.wordIndex} · τ={group.tau} · events {start}-{end}
                  </span>
                  <span className="trace-panel__word-text" dir="rtl">
                    {group.wordText}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="trace-panel__events">
                    {groupEventIndices.map((eventIndex) => {
                      const event = events[eventIndex]
                      if (!event) {
                        return null
                      }

                      const formatted = formatEvent(event)
                      const isHit = selectedRefs.has(eventIndex)

                      return (
                        <article
                          key={eventIndex}
                          className={[
                            'trace-panel__event',
                            isHit ? 'trace-panel__event--highlight' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <div className="trace-panel__event-meta">
                            <span className="trace-panel__event-index">#{eventIndex}</span>
                            <span className="trace-panel__event-tau">τ={event.tau}</span>
                          </div>
                          <h3 className="trace-panel__event-title">{formatted.title}</h3>
                          <EventDetails lines={formatted.detailLines} />
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </section>
            )
          })
        )}
      </div>
    </section>
  )
}

export default TracePanel
