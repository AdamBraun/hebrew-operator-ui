import { describe, expect, it } from 'vitest'
import { resolveHandleIdFromGraphSelection } from './graphSelection'

function mockTraceIndex(ids: string[]) {
  return {
    handleById: new Map<string, unknown>(ids.map((id) => [id, { id }])),
  }
}

describe('resolveHandleIdFromGraphSelection', () => {
  it('returns canonical token directly when present', () => {
    const traceIndex = mockTraceIndex(['ש:1:4'])
    expect(resolveHandleIdFromGraphSelection('ש:1:4', undefined, traceIndex)).toBe('ש:1:4')
  })

  it('normalizes quoted canonical ids', () => {
    const traceIndex = mockTraceIndex(['ש:1:4'])
    expect(resolveHandleIdFromGraphSelection(' "ש:1:4" ', undefined, traceIndex)).toBe('ש:1:4')
  })

  it('falls back to first label line when title is synthetic', () => {
    const traceIndex = mockTraceIndex(['ש:1:4'])
    expect(
      resolveHandleIdFromGraphSelection(
        'B24',
        ['ש:1:4\nboundary | atomic,hard'],
        traceIndex
      )
    ).toBe('ש:1:4')
  })

  it('falls back to first label line when newline is escaped', () => {
    const traceIndex = mockTraceIndex(['ש:1:4'])
    expect(
      resolveHandleIdFromGraphSelection(
        'B24',
        ['ש:1:4\\nboundary | atomic,hard'],
        traceIndex
      )
    ).toBe('ש:1:4')
  })

  it('resolves endpoint handles from edge token candidates', () => {
    const traceIndex = mockTraceIndex(['ש:1:4'])
    expect(
      resolveHandleIdFromGraphSelection(
        'B24->R22',
        ['ש:1:4->ר:2:2'],
        traceIndex
      )
    ).toBe('ש:1:4')
  })

  it('returns null when no candidate resolves to a known handle', () => {
    const traceIndex = mockTraceIndex(['ש:1:4'])
    expect(resolveHandleIdFromGraphSelection('legend', ['Legend node'], traceIndex)).toBeNull()
  })
})
