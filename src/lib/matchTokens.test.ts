import { describe, expect, it } from 'vitest'
import { normalizeToken } from './matchTokens'

describe('normalizeToken', () => {
  it('keeps original token first and includes stripped quote variant', () => {
    expect(normalizeToken('"Alpha Beta"')).toEqual(['"Alpha Beta"', 'Alpha Beta'])
  })

  it('adds first segment for pipe/newline tokens', () => {
    expect(normalizeToken('Title | metadata')).toEqual([
      'Title | metadata',
      'Title',
    ])
    const newlineCandidates = normalizeToken('Line one\nLine two')
    expect(newlineCandidates[0]).toBe('Line one\nLine two')
    expect(newlineCandidates).toContain('Line one')
  })

  it('adds compact whitespace variants', () => {
    expect(normalizeToken('Alpha    Beta')).toEqual(['Alpha    Beta', 'Alpha Beta'])
  })

  it('deduplicates and drops empty candidates', () => {
    const candidates = normalizeToken('   "   "   ')
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((candidate) => candidate.trim().length > 0)).toBe(true)
  })

  it('adds graph-style id variations for better trace matching', () => {
    const candidates = normalizeToken('Th12')
    expect(candidates).toContain('Th12')
    expect(candidates).toContain('th12')
    expect(candidates).toContain('Th 12')
  })

  it('caps candidate list to avoid over-broad highlighting', () => {
    const candidates = normalizeToken(' "A   B|C   D\nE F" ')
    expect(candidates.length).toBeLessThanOrEqual(5)
  })
})
