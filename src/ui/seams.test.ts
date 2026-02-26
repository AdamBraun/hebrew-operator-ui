import { describe, expect, it } from 'vitest'
import { getSeamMarkerProps } from './seams'

describe('getSeamMarkerProps', () => {
  it('maps glue and cut markers to distinct glyphs', () => {
    expect(getSeamMarkerProps('glue').glyph).toBe('•')
    expect(getSeamMarkerProps('cut_2').glyph).toBe('»')
  })

  it('returns unknown fallback for unknown seam kind', () => {
    const result = getSeamMarkerProps('unknown')
    expect(result.glyph).toBe('·')
    expect(result.className).toContain('--unknown')
    expect(result.ariaLabel).toContain('unknown')
  })
})

