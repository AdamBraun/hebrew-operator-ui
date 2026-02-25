import type { TraceEvent, TraceObject } from './types'

export type WordGroup = {
  // 1-based index for direct display parity with "word #N" in the UI.
  wordIndex: number
  wordText: string
  tau: number
  eventRange: [number, number]
}

function wordTextFromData(data: TraceObject): string {
  const value = data.wordText
  return typeof value === 'string' ? value : ''
}

export function buildWordGroups(events: TraceEvent[]): WordGroup[] {
  const groups: WordGroup[] = []

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    if (event.type !== 'WORD_START') {
      continue
    }

    const nextStartIndex = (() => {
      for (let j = index + 1; j < events.length; j += 1) {
        if (events[j].type === 'WORD_START') {
          return j
        }
      }

      return -1
    })()

    const endIndex = nextStartIndex >= 0 ? nextStartIndex - 1 : events.length - 1

    groups.push({
      wordIndex: groups.length + 1,
      wordText: wordTextFromData(event.data),
      tau: event.tau,
      eventRange: [index, endIndex],
    })
  }

  return groups
}
