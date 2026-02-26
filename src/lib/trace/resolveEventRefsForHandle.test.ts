import { describe, expect, it } from 'vitest'
import { resolveEventRefsForHandle } from './resolveEventRefsForHandle'

describe('resolveEventRefsForHandle', () => {
  it('returns direct refs when handle id already maps to events', () => {
    const traceIndex = {
      handleById: new Map<string, unknown>([['A:1:1', { id: 'A:1:1' }]]),
      refsByHandleId: new Map<string, number[]>([['A:1:1', [4, 2, 4, 3]]]),
    }

    expect(resolveEventRefsForHandle('A:1:1', traceIndex)).toEqual([2, 3, 4])
  })

  it('falls back to id-like metadata values when direct refs are missing', () => {
    const traceIndex = {
      handleById: new Map<string, unknown>([
        [
          'י:2:1',
          {
            id: 'י:2:1',
            meta: {
              rep_token: 1,
              seedOf: 'C:2:2',
              align: { target: 'R:2:2' },
            },
          },
        ],
      ]),
      refsByHandleId: new Map<string, number[]>([
        ['C:2:2', [5]],
        ['R:2:2', [6, 7]],
      ]),
    }

    expect(resolveEventRefsForHandle('י:2:1', traceIndex)).toEqual([5, 6, 7])
  })

  it('returns empty when no direct or fallback matches exist', () => {
    const traceIndex = {
      handleById: new Map<string, unknown>([['Z:9:9', { id: 'Z:9:9' }]]),
      refsByHandleId: new Map<string, number[]>(),
    }

    expect(resolveEventRefsForHandle('Z:9:9', traceIndex)).toEqual([])
    expect(resolveEventRefsForHandle('missing', traceIndex)).toEqual([])
    expect(resolveEventRefsForHandle(null, traceIndex)).toEqual([])
  })
})
