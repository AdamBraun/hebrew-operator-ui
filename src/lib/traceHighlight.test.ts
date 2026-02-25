import { describe, expect, it } from 'vitest'
import { computeTraceLineHighlights } from './traceHighlight'

describe('computeTraceLineHighlights', () => {
  it('highlights only the inferred OP block for alpha-numeric graph ids', () => {
    const lines = [
      'τ=7 │ OP_1  [sof:shva]  (וְ)',
      '    │ Select : {"args":["⊥","Ω"],"prefs":{}}',
      '    │ Seal   : {"sealed_handle":"ו:7:1"}',
      'τ=7 │ OP_2  [sof:tzere]  (אֵ)',
      '    │ Bound  : {"base":"ו:7:1"}',
      'τ=7 │ OP_3  (ת)',
      '    │ Select : {"args":["ו:7:1"],"prefs":{}}',
    ]

    expect(computeTraceLineHighlights(lines, ['V71'], ['ו:7:1'])).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ])
  })

  it('highlights only the inferred OP block for colon ids', () => {
    const lines = [
      'τ=7 │ OP_1  [sof:shva]  (וְ)',
      '    │ Seal   : {"sealed_handle":"ו:7:1"}',
      'τ=7 │ OP_2  [sof:tzere]  (אֵ)',
      '    │ Bound  : {"base":"ו:7:1"}',
      '  ─── □glue ───────────────────────────────────────────────────',
    ]

    expect(computeTraceLineHighlights(lines, ['ו:7:1'], ['ו:7:1'])).toEqual([
      true,
      true,
      false,
      false,
      false,
    ])
  })

  it('falls back to substring matching when no OP block can be inferred', () => {
    const lines = ['foo', 'bar token', 'baz token']

    expect(computeTraceLineHighlights(lines, ['token'], ['token'])).toEqual([
      false,
      true,
      true,
    ])
  })

  it('returns no highlights when no tokens/candidates exist', () => {
    expect(computeTraceLineHighlights(['a', 'b'], [], [])).toEqual([false, false])
  })
})
