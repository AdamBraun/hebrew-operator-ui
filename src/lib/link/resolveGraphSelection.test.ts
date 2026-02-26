import { describe, expect, it } from 'vitest'
import { FIXTURE_REGISTRY, getFixtureData } from '../../fixtures/fixtures'
import { parseDot } from '../dot/parseDot'
import { buildTraceIndex } from '../trace/buildTraceIndex'
import type { TraceIndex, TraceLocation } from '../trace/types'
import { resolveGraphSelection } from './resolveGraphSelection'
import type { GraphSelection } from './types'

function makeTraceIndex(byIdEntries: Array<[string, TraceLocation[]]>): TraceIndex {
  return {
    byId: new Map<string, TraceLocation[]>(byIdEntries),
    summary: {
      eventCount: 0,
      idCount: byIdEntries.length,
    },
  }
}

describe('resolveGraphSelection', () => {
  it('produces at least one high-confidence node resolution in fixture corpus', () => {
    let foundHigh = false

    for (const fixtureEntry of FIXTURE_REGISTRY) {
      const fixture = getFixtureData(fixtureEntry.ref)
      expect(fixture).not.toBeNull()

      const dot = parseDot(fixture!.graphDotData)
      const traceIndex = buildTraceIndex(fixture!.traceJsonData)

      for (const node of dot.nodes) {
        const selection: GraphSelection = { kind: 'node', id: node.id, label: node.label }
        const resolved = resolveGraphSelection(selection, traceIndex)
        if (resolved.confidence === 'high' && resolved.primary) {
          foundHigh = true
          break
        }
      }

      if (foundHigh) {
        break
      }
    }

    expect(foundHigh).toBe(true)
  })

  it('ranks multiple exact matches deterministically', () => {
    const traceIndex = makeTraceIndex([
      [
        'X',
        [
          { kind: 'snapshot', index: 6 },
          { kind: 'event', index: 4 },
          { kind: 'event', index: 2, tau: 4 },
          { kind: 'event', index: 1, tau: 4, wordIndex: 3 },
          { kind: 'word', index: 0, tau: 1, wordIndex: 1 },
        ],
      ],
    ])

    const resolved = resolveGraphSelection({ kind: 'node', id: 'X' }, traceIndex)

    expect(resolved.primary).toEqual({ kind: 'event', index: 1, tau: 4, wordIndex: 3 })
    expect(resolved.confidence).toBe('medium')
    expect(resolved.alternatives).toEqual([
      { kind: 'event', index: 2, tau: 4 },
      { kind: 'event', index: 4 },
      { kind: 'word', index: 0, tau: 1, wordIndex: 1 },
      { kind: 'snapshot', index: 6 },
    ])
  })

  it('uses deterministic normalized id variants when exact lookup misses', () => {
    const traceIndex = makeTraceIndex([
      ['C:1:1', [{ kind: 'event', index: 9, tau: 1 }]],
      ['1:3', [{ kind: 'event', index: 3, tau: 3 }]],
    ])

    const quoted = resolveGraphSelection({ kind: 'node', id: '  "C:1:1"  ' }, traceIndex)
    expect(quoted.primary).toEqual({ kind: 'event', index: 9, tau: 1 })
    expect(quoted.confidence).toBe('medium')
    expect(quoted.alternatives).toEqual([])

    const suffix = resolveGraphSelection({ kind: 'node', id: 'H:1:3' }, traceIndex)
    expect(suffix.primary).toEqual({ kind: 'event', index: 3, tau: 3 })
    expect(suffix.confidence).toBe('medium')
    expect(suffix.alternatives).toEqual([])
  })

  it('never throws and returns low-confidence when unresolved', () => {
    expect(resolveGraphSelection({ kind: 'node', id: 'missing' }, null)).toEqual({
      alternatives: [],
      confidence: 'low',
    })

    const brokenIndex = {
      get byId(): never {
        throw new Error('boom')
      },
    } as unknown as TraceIndex

    expect(resolveGraphSelection({ kind: 'node', id: 'anything' }, brokenIndex)).toEqual({
      alternatives: [],
      confidence: 'low',
    })
  })
})
