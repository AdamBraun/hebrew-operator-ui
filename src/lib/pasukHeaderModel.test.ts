import { describe, expect, it } from 'vitest'
import { getFixtureData } from '../fixtures/fixtures'
import {
  buildPasukHeaderModel,
  deriveSeamsFromTraceTxt,
  deriveWordsFromTraceTxt,
} from './pasukHeaderModel'

describe('pasukHeaderModel', () => {
  it('derives words from cleaned line', () => {
    const traceTxt = [
      'ref: test/001/001',
      'cleaned: שְׁמַע יִשְׂרָאֵל יְהֹוָה',
    ].join('\n')

    expect(deriveWordsFromTraceTxt(traceTxt)).toEqual([
      'שְׁמַע',
      'יִשְׂרָאֵל',
      'יְהֹוָה',
    ])
  })

  it('derives glue seams from WORD rows', () => {
    const traceTxt = [
      'WORD 1 │ אָב │ exit_kind=glue │ exit=□glue',
      'WORD 2 │ בֵּן │ exit_kind=glue_maqqef │ exit=□glue_maqqef',
      'WORD 3 │ גִּימֶל │ exit_kind=hard │ exit=□hard',
    ].join('\n')

    expect(deriveSeamsFromTraceTxt(traceTxt, 3)).toEqual([
      'glue',
      'glue_maqqef',
      'hard',
    ])
  })

  it('derives cut ranks from WORD rows', () => {
    const traceTxt = [
      'WORD 1 │ א │ exit_kind=cut │ exit=□cut(1)',
      'WORD 2 │ ב │ exit_kind=cut │ exit=□cut(rank=2)',
      'WORD 3 │ ג │ exit_kind=cut │ exit=□cut_3',
    ].join('\n')

    expect(deriveSeamsFromTraceTxt(traceTxt, 3)).toEqual([
      'cut_1',
      'cut_2',
      'cut_3',
    ])
  })

  it('uses unknown seams when seam data is missing', () => {
    const traceTxt = [
      'ref: test/001/001',
      'cleaned: א ב ג',
      'WORD 1 │ א │ incoming_D=Ω',
      'WORD 2 │ ב │ incoming_D=Ω',
      'WORD 3 │ ג │ incoming_D=Ω',
    ].join('\n')

    expect(deriveSeamsFromTraceTxt(traceTxt, 3)).toEqual([
      'unknown',
      'unknown',
      'unknown',
    ])
  })

  it('builds correct words and seams for Genesis 1:1', () => {
    const fixture = getFixtureData({ book: 'genesis', chapter3: '001', verse3: '001' })
    expect(fixture).not.toBeNull()
    if (!fixture) {
      return
    }

    const model = buildPasukHeaderModel({
      ref: fixture.ref,
      traceTxt: fixture.traceTxtData,
      traceJson: fixture.traceJsonData,
    })

    expect(model.words.map((word) => word.text)).toEqual([
      'בְּרֵאשִׁ֖ית',
      'בָּרָ֣א',
      'אֱלֹהִ֑ים',
      'אֵ֥ת',
      'הַשָּׁמַ֖יִם',
      'וְאֵ֥ת',
      'הָאָרֶץ׃',
    ])

    expect(model.words.map((word) => word.seamAfter)).toEqual([
      'cut_1',
      'glue',
      'cut_2',
      'glue',
      'cut_1',
      'glue',
      'cut_3',
    ])

    expect(model.words).toHaveLength(7)
  })

  it('builds correct words and seams for Deut 6:4', () => {
    const fixture = getFixtureData({
      book: 'deuteronomy',
      chapter3: '006',
      verse3: '004',
    })
    expect(fixture).not.toBeNull()
    if (!fixture) {
      return
    }

    const model = buildPasukHeaderModel({
      ref: fixture.ref,
      traceTxt: fixture.traceTxtData,
      traceJson: fixture.traceJsonData,
    })

    expect(model.words.map((word) => word.text)).toEqual([
      'שְׁמַ֖ע',
      'יִשְׂרָאֵ֑ל',
      'יְהֹוָ֥ה',
      'אֱלֹהֵ֖ינוּ',
      'יְהֹוָ֥ה',
      'אֶחָד׃',
    ])

    expect(model.words.map((word) => word.seamAfter)).toEqual([
      'cut_1',
      'cut_2',
      'glue',
      'cut_1',
      'glue',
      'cut_3',
    ])

    expect(model.words).toHaveLength(6)
  })

  it('does not crash when trace.json keys are missing', () => {
    const traceTxt = ['cleaned: א ב', 'WORD 1 │ א │ incoming_D=Ω'].join('\n')

    expect(() =>
      buildPasukHeaderModel({
        ref: { book: 'test', chapter3: '001', verse3: '001' },
        traceTxt,
        traceJson: { word_sections: [{ wrong_key: 1 }] },
      })
    ).not.toThrow()

    const model = buildPasukHeaderModel({
      ref: { book: 'test', chapter3: '001', verse3: '001' },
      traceTxt,
      traceJson: { broken: true },
    })
    expect(model.words.map((word) => word.seamAfter)).toEqual(['unknown', 'unknown'])
  })
})

