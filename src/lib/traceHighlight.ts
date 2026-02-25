type OpTarget = {
  tau: number
  op: number
}

type OpBlockRange = {
  start: number
  end: number
}

const OP_HEADER_LINE_PATTERN = /^\s*τ\s*=\s*(\d+)\s*│\s*OP_(\d+)\b/u
const SECTION_BOUNDARY_PATTERN = /^\s*[═─-]{3,}/u

function toPositiveInt(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null
  }

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function pushUniqueTarget(targets: OpTarget[], target: OpTarget) {
  if (targets.some((candidate) => candidate.tau === target.tau && candidate.op === target.op)) {
    return
  }

  targets.push(target)
}

function parseOpTargetsFromToken(token: string): OpTarget[] {
  const trimmed = token.trim()
  if (trimmed.length === 0) {
    return []
  }

  const targets: OpTarget[] = []

  const colonMatch = trimmed.match(/:(\d+):(\d+)\b/u)
  if (colonMatch) {
    const tau = toPositiveInt(colonMatch[1])
    const op = toPositiveInt(colonMatch[2])
    if (tau && op) {
      pushUniqueTarget(targets, { tau, op })
    }
  }

  const alphaNumericMatch = trimmed.match(/^[A-Za-z]{1,12}(\d{2,})$/)
  if (alphaNumericMatch) {
    const digits = alphaNumericMatch[1]

    // Prefer shorter OP suffixes (e.g., V71 -> tau=7, op=1).
    for (let split = digits.length - 1; split >= 1; split -= 1) {
      const tau = toPositiveInt(digits.slice(0, split))
      const op = toPositiveInt(digits.slice(split))
      if (tau && op) {
        pushUniqueTarget(targets, { tau, op })
      }
    }
  }

  return targets
}

function findOpHeaderIndex(lines: string[], target: OpTarget): number {
  const headerPattern = new RegExp(
    `^\\s*τ\\s*=\\s*${target.tau}\\s*│\\s*OP_${target.op}\\b`,
    'u'
  )

  return lines.findIndex((line) => headerPattern.test(line))
}

function findOpBlockRange(lines: string[], highlightTokens: string[]): OpBlockRange | null {
  for (const token of highlightTokens) {
    const targets = parseOpTargetsFromToken(token)
    for (const target of targets) {
      const start = findOpHeaderIndex(lines, target)
      if (start < 0) {
        continue
      }

      let end = lines.length - 1
      for (let index = start + 1; index < lines.length; index += 1) {
        const line = lines[index]
        if (OP_HEADER_LINE_PATTERN.test(line) || SECTION_BOUNDARY_PATTERN.test(line)) {
          end = index - 1
          break
        }
      }

      return { start, end: Math.max(start, end) }
    }
  }

  return null
}

function hasCandidateMatch(line: string, matchCandidates: string[]): boolean {
  if (matchCandidates.length === 0) {
    return false
  }

  return matchCandidates.some((candidate) => candidate.length > 0 && line.includes(candidate))
}

export function computeTraceLineHighlights(
  lines: string[],
  highlightTokens: string[],
  matchCandidates: string[]
): boolean[] {
  const opBlockRange = findOpBlockRange(lines, highlightTokens)
  if (opBlockRange) {
    return lines.map(
      (_, index) => index >= opBlockRange.start && index <= opBlockRange.end
    )
  }

  return lines.map((line) => hasCandidateMatch(line, matchCandidates))
}
