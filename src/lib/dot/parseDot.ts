import type { DotEdge, DotGraph, DotNode } from './types'

type ParseResult<T> = {
  value: T
  next: number
}

const SKIP_NODE_IDS = new Set(['digraph', 'graph', 'subgraph', 'strict', 'node', 'edge'])

function isWhitespace(char: string): boolean {
  return /\s/.test(char)
}

function isQuotedStart(char: string): boolean {
  return char === '"'
}

function decodeEscapedChar(char: string): string {
  switch (char) {
    case 'n':
      return '\n'
    case 't':
      return '\t'
    case 'r':
      return '\r'
    case '"':
      return '"'
    case '\\':
      return '\\'
    default:
      return char
  }
}

function skipWhitespace(source: string, from: number): number {
  let index = from
  while (index < source.length && isWhitespace(source[index])) {
    index += 1
  }
  return index
}

function isIdTerminator(source: string, index: number): boolean {
  const char = source[index]
  if (!char) {
    return true
  }

  if (isWhitespace(char)) {
    return true
  }

  if (char === '-' && source[index + 1] === '>') {
    return true
  }

  return char === '[' || char === ']' || char === '{' || char === '}' || char === '=' || char === ',' || char === ';'
}

function parseQuotedValue(source: string, from: number): ParseResult<string> | null {
  if (!isQuotedStart(source[from])) {
    return null
  }

  let index = from + 1
  let value = ''

  while (index < source.length) {
    const char = source[index]
    if (char === '\\') {
      const next = source[index + 1]
      if (next === undefined) {
        value += '\\'
        index += 1
      } else {
        value += decodeEscapedChar(next)
        index += 2
      }
      continue
    }

    if (char === '"') {
      return { value, next: index + 1 }
    }

    value += char
    index += 1
  }

  return { value, next: index }
}

function parseBareValue(source: string, from: number): ParseResult<string> {
  let index = from
  while (index < source.length) {
    const char = source[index]
    if (char === ',' || char === ']') {
      break
    }
    index += 1
  }

  return { value: source.slice(from, index).trim(), next: index }
}

function parseDotId(source: string, from: number): ParseResult<string> | null {
  const index = skipWhitespace(source, from)
  if (index >= source.length) {
    return null
  }

  if (isQuotedStart(source[index])) {
    return parseQuotedValue(source, index)
  }

  let end = index
  while (end < source.length && !isIdTerminator(source, end)) {
    end += 1
  }

  if (end <= index) {
    return null
  }

  return { value: source.slice(index, end), next: end }
}

function parseAttributeBlock(
  source: string,
  from: number
): ParseResult<Record<string, string>> | null {
  const index = skipWhitespace(source, from)
  if (source[index] !== '[') {
    return null
  }

  const attrs: Record<string, string> = {}
  let cursor = index + 1

  while (cursor < source.length) {
    cursor = skipWhitespace(source, cursor)
    if (source[cursor] === ',') {
      cursor += 1
      continue
    }
    if (source[cursor] === ']') {
      return { value: attrs, next: cursor + 1 }
    }

    const keyParsed = parseDotId(source, cursor)
    if (!keyParsed) {
      cursor += 1
      continue
    }

    const key = keyParsed.value
    cursor = skipWhitespace(source, keyParsed.next)

    if (source[cursor] !== '=') {
      attrs[key] = ''
      continue
    }

    cursor = skipWhitespace(source, cursor + 1)
    const quotedValue = parseQuotedValue(source, cursor)
    if (quotedValue) {
      attrs[key] = quotedValue.value
      cursor = quotedValue.next
      continue
    }

    const bareValue = parseBareValue(source, cursor)
    attrs[key] = bareValue.value
    cursor = bareValue.next
  }

  return { value: attrs, next: cursor }
}

function parseAttributeBlocks(
  source: string,
  from: number
): ParseResult<Record<string, string>> {
  const attrs: Record<string, string> = {}
  let cursor = from

  while (true) {
    const parsed = parseAttributeBlock(source, cursor)
    if (!parsed) {
      break
    }

    Object.assign(attrs, parsed.value)
    cursor = parsed.next
  }

  return { value: attrs, next: cursor }
}

function stripComments(dot: string): string {
  let out = ''
  let index = 0
  let inQuote = false
  let inLineComment = false
  let inBlockComment = false

  while (index < dot.length) {
    const char = dot[index]
    const next = dot[index + 1]

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false
        out += '\n'
      }
      index += 1
      continue
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false
        index += 2
        continue
      }
      if (char === '\n') {
        out += '\n'
      }
      index += 1
      continue
    }

    if (!inQuote && char === '/' && next === '/') {
      inLineComment = true
      index += 2
      continue
    }

    if (!inQuote && char === '/' && next === '*') {
      inBlockComment = true
      index += 2
      continue
    }

    if (char === '"' && dot[index - 1] !== '\\') {
      inQuote = !inQuote
    }

    out += char
    index += 1
  }

  return out
}

function splitStatements(dot: string): string[] {
  const cleaned = stripComments(dot)
  const statements: string[] = []
  let inQuote = false
  let current = ''

  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index]
    if (char === '"' && cleaned[index - 1] !== '\\') {
      inQuote = !inQuote
    }

    if (char === ';' && !inQuote) {
      const trimmed = current.trim()
      if (trimmed.length > 0) {
        statements.push(trimmed)
      }
      current = ''
      continue
    }

    current += char
  }

  const trailing = current.trim()
  if (trailing.length > 0) {
    statements.push(trailing)
  }

  return statements
}

function parseEdgeStatement(statement: string): DotEdge[] {
  const firstId = parseDotId(statement, 0)
  if (!firstId) {
    return []
  }

  let cursor = firstId.next
  const ids = [firstId.value]

  while (true) {
    cursor = skipWhitespace(statement, cursor)
    if (statement[cursor] !== '-' || statement[cursor + 1] !== '>') {
      break
    }

    const nextId = parseDotId(statement, cursor + 2)
    if (!nextId) {
      return []
    }

    ids.push(nextId.value)
    cursor = nextId.next
  }

  if (ids.length < 2) {
    return []
  }

  const attrsParsed = parseAttributeBlocks(statement, cursor)
  const attrs = attrsParsed.value

  const edges: DotEdge[] = []
  for (let index = 0; index < ids.length - 1; index += 1) {
    edges.push({
      from: ids[index],
      to: ids[index + 1],
      attrs: { ...attrs },
    })
  }

  return edges
}

function parseNodeStatement(statement: string): DotNode | null {
  const idParsed = parseDotId(statement, 0)
  if (!idParsed) {
    return null
  }

  const id = idParsed.value
  const loweredId = id.trim().toLowerCase()
  let cursor = skipWhitespace(statement, idParsed.next)

  if (SKIP_NODE_IDS.has(loweredId)) {
    return null
  }

  if (statement[cursor] === '{') {
    return null
  }

  if (statement[cursor] === '=') {
    return null
  }

  const attrsParsed = parseAttributeBlocks(statement, cursor)
  cursor = skipWhitespace(statement, attrsParsed.next)

  if (cursor < statement.length && !statement.slice(cursor).startsWith('}')) {
    return null
  }

  const attrs = attrsParsed.value
  const label = attrs.label

  return {
    id,
    label: label !== undefined ? label : undefined,
    attrs,
  }
}

export function parseDot(dot: string): DotGraph {
  const statements = splitStatements(dot)
  const nodeById = new Map<string, DotNode>()
  const edges: DotEdge[] = []

  for (const statement of statements) {
    const edgeCandidates = parseEdgeStatement(statement)
    if (edgeCandidates.length > 0) {
      edges.push(...edgeCandidates)
      continue
    }

    const nodeCandidate = parseNodeStatement(statement)
    if (!nodeCandidate) {
      continue
    }

    const existing = nodeById.get(nodeCandidate.id)
    if (!existing) {
      nodeById.set(nodeCandidate.id, nodeCandidate)
      continue
    }

    const mergedAttrs = { ...existing.attrs, ...nodeCandidate.attrs }
    nodeById.set(nodeCandidate.id, {
      id: existing.id,
      attrs: mergedAttrs,
      label: mergedAttrs.label ?? existing.label,
    })
  }

  return {
    nodes: [...nodeById.values()],
    edges,
  }
}

