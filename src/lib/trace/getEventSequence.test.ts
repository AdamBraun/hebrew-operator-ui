import { describe, expect, it } from 'vitest'
import { FIXTURE_REGISTRY, getFixtureData } from '../../fixtures/fixtures'
import { getEventSequence } from './getEventSequence'

describe('getEventSequence', () => {
  it('detects a non-empty event sequence for each fixture trace', () => {
    for (const entry of FIXTURE_REGISTRY) {
      const fixture = getFixtureData(entry.ref)
      expect(fixture).not.toBeNull()

      const result = getEventSequence(fixture!.traceJsonData)
      expect(result.events).not.toBeNull()
      expect(result.events?.length ?? 0).toBeGreaterThan(0)
      expect(result.sourcePath).toBeTruthy()
    }
  })

  it('returns a schema-safe no-events result and top-level keys', () => {
    const traceJson = {
      foo: 'bar',
      final_state: { vm: {} },
      deep_trace: [{ no_events_here: true }],
    }

    const result = getEventSequence(traceJson)
    expect(result.events).toBeNull()
    expect(result.sourcePath).toBeNull()
    expect(result.topLevelKeys).toEqual(['deep_trace', 'final_state', 'foo'])
  })

  it('falls back to flattened deep_trace events when direct paths are missing', () => {
    const traceJson = {
      deep_trace: [
        { index: 0, events: [{ type: 'a' }] },
        { index: 1, events: [] },
        { index: 2, events: [{ type: 'b' }, { type: 'c' }] },
      ],
    }

    const result = getEventSequence(traceJson)
    expect(result.sourcePath).toBe('deep_trace[].events (flattened)')
    expect(result.events).toEqual([{ type: 'a' }, { type: 'b' }, { type: 'c' }])
  })
})
