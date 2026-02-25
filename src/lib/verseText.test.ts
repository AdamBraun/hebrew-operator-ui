import { describe, expect, it } from 'vitest'
import { extractVerseText } from './verseText'

describe('verseText.extractVerseText', () => {
  it('prefers traceJson.cleaned', () => {
    expect(extractVerseText({ cleaned: 'שמע' }, '')).toEqual({
      text: 'שמע',
      source: 'json',
    })
  })

  it('falls back to traceJson.verse then traceJson.text', () => {
    expect(extractVerseText({ verse: 'ואהבת' }, '')).toEqual({
      text: 'ואהבת',
      source: 'json',
    })
    expect(extractVerseText({ text: 'ישראל' }, '')).toEqual({
      text: 'ישראל',
      source: 'json',
    })
  })

  it('uses traceJson.cleaned_text when present', () => {
    expect(extractVerseText({ cleaned_text: 'בְּרֵאשִׁית' }, '')).toEqual({
      text: 'בְּרֵאשִׁית',
      source: 'json',
    })
  })

  it('falls back to cleaned line in trace.txt', () => {
    const traceTxt = ['ref: deuteronomy/006/004', 'cleaned: שְׁמַע יִשְׂרָאֵל'].join('\n')
    expect(extractVerseText({}, traceTxt)).toEqual({
      text: 'שְׁמַע יִשְׂרָאֵל',
      source: 'txt',
    })
  })

  it('returns unavailable fallback when no text is found', () => {
    const traceTxt = ['PASUK TRACE REPORT', 'book: deuteronomy'].join('\n')
    expect(extractVerseText({}, traceTxt)).toEqual({
      text: '(verse text unavailable)',
      source: 'none',
    })
  })
})
