import { describe, expect, it } from 'vitest'
import { buildScopeLanesModel } from './buildModel'

describe('buildScopeLanesModel', () => {
  it('extracts words and boundaries for a normal verse snippet', () => {
    const traceTxt = [
      'ref: genesis/001/001',
      'cleaned: בְּרֵאשִׁית בָּרָא אֱלֹהִים',
      'WORD 1 │ בְּרֵאשִׁית │ exit_kind=cut │ exit=□cut(1)',
      'WORD 2 │ בָּרָא │ exit_kind=glue │ exit=□glue',
      'WORD 3 │ אֱלֹהִים │ exit_kind=cut │ exit=□cut(2)',
    ].join('\n')

    const model = buildScopeLanesModel(
      { book: 'genesis', chapter3: '001', verse3: '001' },
      traceTxt
    )

    expect(model.words.map((word) => word.text)).toEqual([
      'בְּרֵאשִׁית',
      'בָּרָא',
      'אֱלֹהִים',
    ])
    expect(model.boundariesAfter.map((boundary) => boundary.kind)).toEqual([
      'cut_1',
      'glue',
      'cut_2',
    ])
  })

  it('handles long verse and prefers explicit trace.json boundary data', () => {
    const traceTxt = [
      'ref: long/001/001',
      'cleaned: א ב ג ד ה ו ז ח ט י',
      'WORD 1 │ א │ incoming_D=Ω',
      'WORD 2 │ ב │ incoming_D=Ω',
      'WORD 3 │ ג │ incoming_D=Ω',
      'WORD 4 │ ד │ incoming_D=Ω',
      'WORD 5 │ ה │ incoming_D=Ω',
      'WORD 6 │ ו │ incoming_D=Ω',
      'WORD 7 │ ז │ incoming_D=Ω',
      'WORD 8 │ ח │ incoming_D=Ω',
      'WORD 9 │ ט │ incoming_D=Ω',
      'WORD 10 │ י │ incoming_D=Ω',
    ].join('\n')

    const traceJson = {
      word_sections: [
        { word_index: 1, exit_kind: 'hard' },
        { word_index: 2, exit_boundary: { boundary_mode: 'glue_maqqef' } },
        { word_index: 3, exit_boundary: { boundary_mode: 'cut', rank: 1 } },
        { word_index: 4, exit_boundary: { boundary_mode: 'cut', rank: 2 } },
        { word_index: 5, exit_boundary: { boundary_mode: 'cut', rank: 3 } },
        { word_index: 6, exit_kind: 'glue' },
      ],
    }

    const model = buildScopeLanesModel(
      { book: 'long', chapter3: '001', verse3: '001' },
      traceTxt,
      traceJson
    )

    expect(model.words).toHaveLength(10)
    expect(model.boundariesAfter.map((boundary) => boundary.kind)).toEqual([
      'hard',
      'glue_maqqef',
      'cut_1',
      'cut_2',
      'cut_3',
      'glue',
      'unknown',
      'unknown',
      'unknown',
      'unknown',
    ])
  })

  it('returns words and unknown boundaries when boundary info is missing', () => {
    const traceTxt = [
      'ref: deuteronomy/006/004',
      'cleaned: שְׁמַע יִשְׂרָאֵל יְהֹוָה',
    ].join('\n')

    const model = buildScopeLanesModel(
      { book: 'deuteronomy', chapter3: '006', verse3: '004' },
      traceTxt,
      { unrelated: true }
    )

    expect(model.words.map((word) => word.text)).toEqual([
      'שְׁמַע',
      'יִשְׂרָאֵל',
      'יְהֹוָה',
    ])
    expect(model.boundariesAfter).toHaveLength(3)
    expect(model.boundariesAfter.every((boundary) => boundary.kind === 'unknown')).toBe(true)
  })

  it('prefers WORD rows over cleaned whitespace splits (maqqef-safe indexing)', () => {
    const traceTxt = [
      'ref: exodus/029/034',
      'cleaned: וְאִם־יִוָּתֵר מִבְּשַׂר הַמִּלֻּאִים',
      'WORD 1 │ וְאִם │ exit_kind=glue_maqqef │ exit=□glue_maqqef',
      'WORD 2 │ יִוָּתֵר │ exit_kind=cut │ exit=□cut(1)',
      'WORD 3 │ מִבְּשַׂר │ exit_kind=glue │ exit=□glue',
      'WORD 4 │ הַמִּלֻּאִים │ exit_kind=cut │ exit=□cut(1)',
    ].join('\n')

    const model = buildScopeLanesModel(
      { book: 'exodus', chapter3: '029', verse3: '034' },
      traceTxt
    )

    expect(model.words.map((word) => word.text)).toEqual([
      'וְאִם',
      'יִוָּתֵר',
      'מִבְּשַׂר',
      'הַמִּלֻּאִים',
    ])
    expect(model.boundariesAfter.map((boundary) => boundary.kind)).toEqual([
      'glue_maqqef',
      'cut_1',
      'glue',
      'cut_1',
    ])
  })

  it('preserves trailing pasuk punctuation when using WORD rows', () => {
    const traceTxt = [
      'ref: exodus/029/034',
      'cleaned: א ב ג׃',
      'WORD 1 │ א │ exit_kind=glue │ exit=□glue',
      'WORD 2 │ ב │ exit_kind=glue │ exit=□glue',
      'WORD 3 │ ג │ exit_kind=cut │ exit=□cut(3)',
    ].join('\n')

    const model = buildScopeLanesModel(
      { book: 'exodus', chapter3: '029', verse3: '034' },
      traceTxt
    )

    expect(model.words.map((word) => word.text)).toEqual(['א', 'ב', 'ג׃'])
  })
})
