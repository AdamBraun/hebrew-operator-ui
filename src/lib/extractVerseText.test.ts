import { describe, expect, it } from 'vitest'
import { extractVerseText } from './extractVerseText'

describe('extractVerseText', () => {
  it('uses traceJson.cleaned first', () => {
    expect(extractVerseText({ cleaned: 'שמע' }, '')).toBe('שמע')
  })

  it('falls back to traceJson.verse when cleaned is missing', () => {
    expect(extractVerseText({ verse: 'ואהבת' }, '')).toBe('ואהבת')
  })

  it('falls back to traceJson.text when cleaned/verse are missing', () => {
    expect(extractVerseText({ text: 'ישראל' }, '')).toBe('ישראל')
  })

  it('parses cleaned from trace.txt line', () => {
    const traceTxt = ['ref: deuteronomy/006/004', 'cleaned: שְׁמַע יִשְׂרָאֵל'].join('\n')
    expect(extractVerseText({}, traceTxt)).toBe('שְׁמַע יִשְׂרָאֵל')
  })

  it('returns undefined when no candidate exists', () => {
    const traceTxt = ['PASUK TRACE REPORT', 'book: deuteronomy'].join('\n')
    expect(extractVerseText({}, traceTxt)).toBeUndefined()
  })
})
