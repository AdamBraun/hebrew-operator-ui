import { describe, expect, it } from 'vitest'
import { FIXTURE_REGISTRY, getFixtureData } from '../../fixtures/fixtures'
import { parseDot } from './parseDot'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function appearsVerbatimAsId(dot: string, id: string): boolean {
  if (dot.includes(`"${id}"`)) {
    return true
  }

  const bareIdPattern = new RegExp(
    `(?:^|[\\s{;,[\\]])${escapeRegExp(id)}(?=$|[\\s;,[\\]}])`,
    'u'
  )
  return bareIdPattern.test(dot)
}

describe('parseDot', () => {
  it('parses bare and quoted ids, attrs, labels, and edge chains', () => {
    const dot = [
      'digraph G {',
      '  rankdir=TB;',
      '  node [fontname="Helvetica"];',
      '  edge [color="#333333"];',
      '  A33 [label="node A", shape=box];',
      '  "A:3:3" [label="quoted\\nid", style="filled,rounded"];',
      '  A33 -> "A:3:3" [label="edge-1", weight=2];',
      '  A33 -> B44 -> C55 [color="blue"];',
      '}',
    ].join('\n')

    const parsed = parseDot(dot)

    expect(parsed.nodes.some((node) => node.id === 'A33')).toBe(true)
    expect(parsed.nodes.some((node) => node.id === 'A:3:3')).toBe(true)

    const quotedNode = parsed.nodes.find((node) => node.id === 'A:3:3')
    expect(quotedNode?.label).toBe('quoted\nid')
    expect(quotedNode?.attrs.style).toBe('filled,rounded')

    expect(parsed.edges).toContainEqual({
      from: 'A33',
      to: 'A:3:3',
      attrs: { label: 'edge-1', weight: '2' },
    })
    expect(parsed.edges).toContainEqual({
      from: 'A33',
      to: 'B44',
      attrs: { color: 'blue' },
    })
    expect(parsed.edges).toContainEqual({
      from: 'B44',
      to: 'C55',
      attrs: { color: 'blue' },
    })
  })

  it('returns non-empty node/edge sets for each fixture graph and preserves node ids', () => {
    for (const fixtureEntry of FIXTURE_REGISTRY) {
      const fixture = getFixtureData(fixtureEntry.ref)
      expect(fixture).not.toBeNull()
      const dot = fixture!.graphDotData
      const parsed = parseDot(dot)

      expect(parsed.nodes.length).toBeGreaterThan(0)
      expect(parsed.edges.length).toBeGreaterThan(0)

      for (const node of parsed.nodes) {
        expect(appearsVerbatimAsId(dot, node.id)).toBe(true)
      }
    }
  })
})
