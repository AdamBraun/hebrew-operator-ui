type VerseTextSource = 'json' | 'txt' | 'none'

export function extractVerseText(
  traceJson: any,
  traceTxt: string
): { text: string; source: VerseTextSource } {
  const jsonCandidates = [
    traceJson?.cleaned,
    traceJson?.cleaned_text,
    traceJson?.verse,
    traceJson?.text,
    traceJson?.final_state?.cont?.report?.cleaned,
  ] as const

  for (const candidate of jsonCandidates) {
    if (typeof candidate !== 'string') {
      continue
    }

    const value = candidate.trim()
    if (value.length > 0) {
      return { text: value, source: 'json' }
    }
  }

  const lines = traceTxt.split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^\s*cleaned\s*:\s*(.+)\s*$/i)
    if (match && match[1].trim().length > 0) {
      return { text: match[1].trim(), source: 'txt' }
    }
  }

  return { text: '(verse text unavailable)', source: 'none' }
}
