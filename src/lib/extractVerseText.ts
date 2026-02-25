function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function cleanedValueFromLine(line: string): string | undefined {
  const prefix = 'cleaned:'
  if (!line.startsWith(prefix)) {
    return undefined
  }

  const value = line.slice(prefix.length).trim()
  return value.length > 0 ? value : undefined
}

export function extractVerseText(
  traceJson: any,
  traceTxt: string
): string | undefined {
  const jsonCandidates = [
    traceJson?.cleaned,
    traceJson?.verse,
    traceJson?.text,
  ] as const

  for (const candidate of jsonCandidates) {
    const value = toNonEmptyString(candidate)
    if (value) {
      return value
    }
  }

  const lines = traceTxt.split(/\r?\n/)

  for (const line of lines) {
    const value = cleanedValueFromLine(line)
    if (value) {
      return value
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const isHeader =
      line.startsWith('ref:') || line.startsWith('PASUK TRACE REPORT')

    if (!isHeader) {
      continue
    }

    for (let j = i + 1; j < lines.length; j += 1) {
      const value = cleanedValueFromLine(lines[j])
      if (value) {
        return value
      }
    }
  }

  return undefined
}
