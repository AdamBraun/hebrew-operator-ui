import { describe, expect, it } from 'vitest'
import { FIXTURE_REGISTRY, getFixtureData } from '../../fixtures/fixtures'
import { parseDot } from '../dot/parseDot'
import { buildTraceIndex, selectTraceAdapter } from './buildTraceIndex'
import type { TraceAdapter } from './adapters/TraceAdapter'
import type { TraceIndex, TraceLocation } from './types'

function serializeLocations(locations: TraceLocation[]): TraceLocation[] {
  return locations.map((location) => ({ ...location }))
}

function serializeStringKeyedMap(
  map: Map<string, TraceLocation[]>
): Array<[string, TraceLocation[]]> {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, locations]) => [key, serializeLocations(locations)])
}

function serializeNumericKeyedMap(
  map: Map<number, TraceLocation[]> | undefined
): Array<[number, TraceLocation[]]> {
  if (!map) {
    return []
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, locations]) => [key, serializeLocations(locations)])
}

function serializeIndex(index: TraceIndex) {
  return {
    byId: serializeStringKeyedMap(index.byId),
    byTau: serializeNumericKeyedMap(index.byTau),
    byWordIndex: serializeNumericKeyedMap(index.byWordIndex),
    summary: { ...index.summary },
  }
}

describe('buildTraceIndex', () => {
  it('indexes ids, tau, and word-index signals from fixture traces', () => {
    for (const entry of FIXTURE_REGISTRY) {
      const fixture = getFixtureData(entry.ref)
      expect(fixture).not.toBeNull()

      const index = buildTraceIndex(fixture!.traceJsonData)

      expect(index.summary.adapterId).toBe('v1')
      expect(index.summary.eventCount).toBeGreaterThan(0)
      expect(index.summary.idCount).toBe(index.byId.size)
      expect(index.byId.size).toBeGreaterThan(0)
      expect(index.byTau?.size ?? 0).toBeGreaterThan(0)
      expect(index.byWordIndex?.size ?? 0).toBeGreaterThan(0)
    }
  })

  it('is deterministic and does not mutate input traces', () => {
    for (const entry of FIXTURE_REGISTRY) {
      const fixture = getFixtureData(entry.ref)
      expect(fixture).not.toBeNull()

      const baseline = JSON.stringify(fixture!.traceJsonData)
      const first = serializeIndex(buildTraceIndex(fixture!.traceJsonData))
      const afterFirstBuild = JSON.stringify(fixture!.traceJsonData)
      const second = serializeIndex(buildTraceIndex(fixture!.traceJsonData))

      expect(afterFirstBuild).toBe(baseline)
      expect(second).toEqual(first)
    }
  })

  it('overlaps with DOT node ids for at least one fixture', () => {
    let hasOverlap = false

    for (const entry of FIXTURE_REGISTRY) {
      const fixture = getFixtureData(entry.ref)
      expect(fixture).not.toBeNull()

      const dot = parseDot(fixture!.graphDotData)
      const dotNodeIds = new Set(dot.nodes.map((node) => node.id))
      const index = buildTraceIndex(fixture!.traceJsonData)

      for (const id of index.byId.keys()) {
        if (dotNodeIds.has(id)) {
          hasOverlap = true
          break
        }
      }

      if (hasOverlap) {
        break
      }
    }

    expect(hasOverlap).toBe(true)
  })

  it('selects adapters deterministically using first-match-wins order', () => {
    const calls: string[] = []

    const adapters: readonly TraceAdapter[] = [
      {
        id: 'first',
        detect: () => {
          calls.push('first')
          return false
        },
        getEventSequence: () => [],
        extractIds: () => [],
        extractTau: () => undefined,
        extractWordIndex: () => undefined,
      },
      {
        id: 'second',
        detect: () => {
          calls.push('second')
          return true
        },
        getEventSequence: () => [],
        extractIds: () => [],
        extractTau: () => undefined,
        extractWordIndex: () => undefined,
      },
      {
        id: 'third',
        detect: () => {
          calls.push('third')
          return true
        },
        getEventSequence: () => [],
        extractIds: () => [],
        extractTau: () => undefined,
        extractWordIndex: () => undefined,
      },
    ]

    const selected = selectTraceAdapter({ foo: 'bar' }, adapters)
    expect(selected?.id).toBe('second')
    expect(calls).toEqual(['first', 'second'])
  })
})
