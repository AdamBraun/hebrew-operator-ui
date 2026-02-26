import { describe, expect, it } from 'vitest'
import { FIXTURE_REGISTRY, getFixtureData } from '../../fixtures/fixtures'
import { parseDot } from '../dot/parseDot'
import { buildTraceIndex } from '../trace/buildTraceIndex'
import { resolveGraphSelection } from './resolveGraphSelection'

import deuteronomy006004ExpectationsRaw from '../../fixtures/expectations/deuteronomy-006-004.json?raw'
import genesis001001ExpectationsRaw from '../../fixtures/expectations/genesis-001-001.json?raw'
import leviticus001001ExpectationsRaw from '../../fixtures/expectations/leviticus-001-001.json?raw'

type ExpectationPrimary = {
  kind: 'event' | 'snapshot' | 'word'
  index: number
}

type ExpectationEntry = {
  graphNodeId: string
  expectedPrimary: ExpectationPrimary
}

type ExpectationFile = {
  links: ExpectationEntry[]
}

const EXPECTATIONS_BY_KEY = new Map<string, ExpectationFile>([
  ['genesis/001/001', JSON.parse(genesis001001ExpectationsRaw) as ExpectationFile],
  ['deuteronomy/006/004', JSON.parse(deuteronomy006004ExpectationsRaw) as ExpectationFile],
  ['leviticus/001/001', JSON.parse(leviticus001001ExpectationsRaw) as ExpectationFile],
])

describe('linking golden regression', () => {
  it('matches expected GraphSelection -> primary TraceLocation pairs for each fixture', () => {
    for (const fixtureEntry of FIXTURE_REGISTRY) {
      const fixture = getFixtureData(fixtureEntry.ref)
      expect(fixture, `missing fixture data for ${fixtureEntry.key}`).not.toBeNull()

      const expectation = EXPECTATIONS_BY_KEY.get(fixtureEntry.key)
      expect(expectation, `missing expectation file for ${fixtureEntry.key}`).toBeDefined()
      expect(
        Array.isArray(expectation!.links),
        `invalid links array in ${fixtureEntry.key}`
      ).toBe(true)
      expect(expectation!.links.length, `empty links in ${fixtureEntry.key}`).toBeGreaterThan(0)

      const parsedDot = parseDot(fixture!.graphDotData)
      const dotNodeIdSet = new Set(parsedDot.nodes.map((node) => node.id))
      const traceIndex = buildTraceIndex(fixture!.traceJsonData)

      for (const link of expectation!.links) {
        expect(
          dotNodeIdSet.has(link.graphNodeId),
          `graph node ${link.graphNodeId} missing in ${fixtureEntry.key}`
        ).toBe(true)

        const resolved = resolveGraphSelection(
          { kind: 'node', id: link.graphNodeId },
          traceIndex
        )

        expect(
          resolved.primary,
          `no primary for ${fixtureEntry.key} node ${link.graphNodeId}`
        ).toBeDefined()

        expect(
          {
            kind: resolved.primary?.kind,
            index: resolved.primary?.index,
          },
          `unexpected primary for ${fixtureEntry.key} node ${link.graphNodeId}`
        ).toEqual(link.expectedPrimary)
      }
    }
  })
})
