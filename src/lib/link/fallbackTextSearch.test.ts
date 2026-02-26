import { describe, expect, it } from 'vitest'
import { fallbackTextSearch } from './fallbackTextSearch'

describe('fallbackTextSearch', () => {
  it('uses label terms first and finds bounded context', () => {
    const lines = [
      'header',
      'alpha',
      'beta marker',
      'gamma',
      'delta marker',
      'footer',
    ]
    const traceText = lines.join('\n')

    const result = fallbackTextSearch(
      traceText,
      { kind: 'node', id: 'C:2:2', label: 'marker node' },
      4
    )

    expect(result).not.toBeNull()
    expect(result?.terms.includes('marker')).toBe(true)
    expect(result?.matchedLineIndices).toEqual([2])
    expect((result?.contextEnd ?? -1) - (result?.contextStart ?? 0) + 1).toBeLessThanOrEqual(4)
  })

  it('falls back to id token variants when label has no matches', () => {
    const traceText = ['x', 'C:2:2 appears', 'y'].join('\n')

    const result = fallbackTextSearch(traceText, {
      kind: 'node',
      id: '"C:2:2"',
      label: 'not-present-label',
    })

    expect(result).not.toBeNull()
    expect(result?.terms).toContain('C:2:2')
    expect(result?.matchedLineIndices).toEqual([1])
  })

  it('keeps context bounded to at most 200 lines', () => {
    const lines: string[] = []
    for (let i = 0; i < 1000; i += 1) {
      lines.push(i === 700 ? `line ${i} has H:1:3` : `line ${i}`)
    }

    const result = fallbackTextSearch(lines.join('\n'), { kind: 'node', id: 'H:1:3' })
    expect(result).not.toBeNull()

    const span = (result!.contextEnd - result!.contextStart + 1)
    expect(span).toBeLessThanOrEqual(200)
    expect(result?.matchedLineIndices).toEqual([700])
    expect(result!.contextStart).toBeLessThanOrEqual(700)
    expect(result!.contextEnd).toBeGreaterThanOrEqual(700)
  })

  it('returns null for empty or missing selection', () => {
    expect(fallbackTextSearch('', { kind: 'node', id: 'A:1:1' })).not.toBeNull()
    expect(fallbackTextSearch('line', null)).toBeNull()
    expect(fallbackTextSearch('line', undefined)).toBeNull()
  })
})
