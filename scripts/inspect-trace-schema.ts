#!/usr/bin/env node
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

type Primitive = string | number | boolean | null

type ArrayStats = {
  occurrences: number
  minLength: number
  maxLength: number
  objectElements: number
  elementKeyUnion: Set<string>
  elementKeyIntersection: Set<string> | null
  idLikeFields: Map<string, Set<string>>
  signalFields: Map<string, Set<string>>
}

type FileReport = {
  fixturePath: string
  refKey: string
  topLevelKeys: string[]
  arrays: Map<string, ArrayStats>
}

const MAX_FIELD_EXAMPLES = 6
const INLINE_LIST_LIMIT = 8

const SIGNAL_KEYWORDS = new Set([
  'word',
  'wordindex',
  'token',
  'τ',
  'tau',
  'step',
  'i',
  'index',
])

const CANDIDATE_ARRAY_NAMES = new Set([
  'events',
  'steps',
  'snapshots',
  'ops',
  'op_entries',
  'deep_trace',
  'verse_snapshots',
  'word_sections',
  'prepared_tokens',
  'phases',
  'handles',
  'boundaries',
  'rules',
  'links',
])

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COLON_NUMERIC_RE = /^[\p{L}\p{N}_+\-⊥Ω]+(?::\d+){1,}$/u
const ALPHA_NUM_RE = /^[A-Za-z]+[0-9]+$/

const REPO_ROOT = process.cwd()
const FIXTURE_ROOT = path.join(REPO_ROOT, 'src', 'fixtures', 'refs')
const REPORT_PATH = path.join(REPO_ROOT, 'docs', 'TRACE_SCHEMA_REPORT.md')

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPrimitive(value: unknown): value is Primitive {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  )
}

function toPosixRelative(absPath: string): string {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/')
}

function createArrayStats(): ArrayStats {
  return {
    occurrences: 0,
    minLength: Number.POSITIVE_INFINITY,
    maxLength: Number.NEGATIVE_INFINITY,
    objectElements: 0,
    elementKeyUnion: new Set<string>(),
    elementKeyIntersection: null,
    idLikeFields: new Map<string, Set<string>>(),
    signalFields: new Map<string, Set<string>>(),
  }
}

function formatPath(parts: string[]): string {
  if (parts.length === 0) {
    return '<root>'
  }

  let out = ''
  for (const part of parts) {
    if (part === '[]') {
      out += '[]'
      continue
    }

    out += out.length > 0 ? `.${part}` : part
  }

  return out
}

function primitiveToExample(value: Primitive): string {
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, ' ').trim()
    if (normalized.length <= 60) {
      return normalized
    }
    return `${normalized.slice(0, 57)}...`
  }

  return String(value)
}

function addExample(
  map: Map<string, Set<string>>,
  fieldPath: string,
  example: string
): void {
  const existing = map.get(fieldPath)
  if (existing) {
    if (existing.size < MAX_FIELD_EXAMPLES) {
      existing.add(example)
    }
    return
  }

  map.set(fieldPath, new Set<string>([example]))
}

function isLikelySignalKey(key: string): boolean {
  const normalized = key.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  if (SIGNAL_KEYWORDS.has(normalized)) {
    return true
  }

  return (
    normalized.includes('tau') ||
    normalized.includes('word') ||
    normalized.includes('token') ||
    normalized.endsWith('index')
  )
}

function isIdLikePrimitive(value: Primitive): boolean {
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  return (
    UUID_RE.test(normalized) ||
    COLON_NUMERIC_RE.test(normalized) ||
    ALPHA_NUM_RE.test(normalized)
  )
}

function intersectSets(base: Set<string>, other: Iterable<string>): Set<string> {
  const otherSet = new Set(other)
  return new Set<string>([...base].filter((item) => otherSet.has(item)))
}

function firstPrimitiveInArray(value: unknown[]): Primitive | null {
  for (const item of value) {
    if (isPrimitive(item)) {
      return item
    }
    if (Array.isArray(item)) {
      const nested = firstPrimitiveInArray(item)
      if (nested !== null) {
        return nested
      }
    }
  }

  return null
}

function inspectElementObject(
  value: Record<string, unknown>,
  pathParts: string[],
  stats: ArrayStats
): void {
  for (const [key, child] of Object.entries(value)) {
    const childPathParts = [...pathParts, key]
    const fieldPath = formatPath(childPathParts)

    if (isPrimitive(child)) {
      const example = primitiveToExample(child)
      if (isLikelySignalKey(key)) {
        addExample(stats.signalFields, fieldPath, example)
      }

      if (/id$/i.test(key) || isIdLikePrimitive(child)) {
        addExample(stats.idLikeFields, fieldPath, example)
      }
      continue
    }

    if (Array.isArray(child)) {
      if (isLikelySignalKey(key)) {
        const firstPrimitive = firstPrimitiveInArray(child)
        if (firstPrimitive !== null) {
          addExample(stats.signalFields, fieldPath, primitiveToExample(firstPrimitive))
        }
      }

      for (const item of child) {
        if (isPlainObject(item)) {
          inspectElementObject(item, [...childPathParts, '[]'], stats)
        }
      }
      continue
    }

    if (isPlainObject(child)) {
      inspectElementObject(child, childPathParts, stats)
    }
  }
}

function inspectArrayOccurrence(arrayValue: unknown[], stats: ArrayStats): void {
  stats.occurrences += 1
  stats.minLength = Math.min(stats.minLength, arrayValue.length)
  stats.maxLength = Math.max(stats.maxLength, arrayValue.length)

  for (const entry of arrayValue) {
    if (!isPlainObject(entry)) {
      continue
    }

    stats.objectElements += 1

    const keys = Object.keys(entry)
    for (const key of keys) {
      stats.elementKeyUnion.add(key)
    }

    const keySet = new Set(keys)
    if (stats.elementKeyIntersection === null) {
      stats.elementKeyIntersection = keySet
    } else {
      stats.elementKeyIntersection = intersectSets(stats.elementKeyIntersection, keySet)
    }

    inspectElementObject(entry, [], stats)
  }
}

function collectArrayStats(
  value: unknown,
  pathParts: string[],
  map: Map<string, ArrayStats>
): void {
  if (Array.isArray(value)) {
    const arrayPath = formatPath(pathParts)
    let stats = map.get(arrayPath)
    if (!stats) {
      stats = createArrayStats()
      map.set(arrayPath, stats)
    }

    inspectArrayOccurrence(value, stats)

    for (const item of value) {
      collectArrayStats(item, [...pathParts, '[]'], map)
    }
    return
  }

  if (!isPlainObject(value)) {
    return
  }

  for (const [key, child] of Object.entries(value)) {
    collectArrayStats(child, [...pathParts, key], map)
  }
}

function isCandidateArray(pathKey: string, stats: ArrayStats): boolean {
  if (stats.objectElements === 0) {
    return false
  }

  if (stats.idLikeFields.size > 0 || stats.signalFields.size > 0) {
    return true
  }

  const cleaned = pathKey.replace(/\[\]/g, '')
  const segments = cleaned.split('.').map((segment) => segment.toLowerCase())
  return segments.some((segment) => CANDIDATE_ARRAY_NAMES.has(segment))
}

function parseRefKey(fixturePath: string): string {
  const match = fixturePath.match(/src\/fixtures\/refs\/([^/]+\/\d{3}\/\d{3})\/trace\.json$/)
  if (!match) {
    return fixturePath
  }

  return match[1]
}

function formatInlineCodeList(values: string[], limit = INLINE_LIST_LIMIT): string {
  if (values.length === 0) {
    return '_none_'
  }

  const sliced = values.slice(0, limit)
  const items = sliced.map((value) => `\`${value}\``).join(', ')
  const remaining = values.length - sliced.length
  if (remaining > 0) {
    return `${items} (+${remaining} more)`
  }

  return items
}

function sortedMapEntries(map: Map<string, Set<string>>): Array<[string, string[]]> {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, valueSet]) => [key, [...valueSet].sort()])
}

function classifyIdFamily(example: string): string {
  if (UUID_RE.test(example)) {
    return 'uuid'
  }
  if (COLON_NUMERIC_RE.test(example)) {
    return 'colon-numeric'
  }
  if (ALPHA_NUM_RE.test(example)) {
    return 'alpha-numeric'
  }
  if (/^[\p{L}⊥Ω]$/u.test(example)) {
    return 'symbol'
  }
  return 'other'
}

async function findTraceFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of sortedEntries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await findTraceFiles(fullPath)
      out.push(...nested)
      continue
    }

    if (entry.isFile() && entry.name === 'trace.json') {
      out.push(fullPath)
    }
  }

  return out
}

async function inspectTraceFile(absPath: string): Promise<FileReport> {
  const raw = await fs.readFile(absPath, 'utf8')
  const parsed: unknown = JSON.parse(raw)
  if (!isPlainObject(parsed)) {
    throw new Error(`Expected object at top-level: ${toPosixRelative(absPath)}`)
  }

  const allArrays = new Map<string, ArrayStats>()
  collectArrayStats(parsed, [], allArrays)

  const candidateArrays = new Map<string, ArrayStats>(
    [...allArrays.entries()].filter(([pathKey, stats]) => isCandidateArray(pathKey, stats))
  )

  const fixturePath = toPosixRelative(absPath)
  return {
    fixturePath,
    refKey: parseRefKey(fixturePath),
    topLevelKeys: Object.keys(parsed).sort(),
    arrays: candidateArrays,
  }
}

function aggregateFieldExamples(
  statsByRef: Map<string, ArrayStats>,
  kind: 'idLikeFields' | 'signalFields',
  fieldPath: string
): string[] {
  const merged = new Set<string>()
  for (const stats of statsByRef.values()) {
    const fieldMap = stats[kind]
    const examples = fieldMap.get(fieldPath)
    if (!examples) {
      continue
    }
    for (const example of examples) {
      merged.add(example)
    }
  }
  return [...merged].sort()
}

function intersectionOfStringArrays(values: string[][]): string[] {
  if (values.length === 0) {
    return []
  }

  let current = new Set(values[0])
  for (const next of values.slice(1)) {
    current = intersectSets(current, next)
  }

  return [...current].sort()
}

async function main(): Promise<void> {
  const traceFiles = await findTraceFiles(FIXTURE_ROOT)
  if (traceFiles.length < 3) {
    throw new Error(
      `Expected at least 3 fixture trace files under ${toPosixRelative(FIXTURE_ROOT)}`
    )
  }

  const reports = await Promise.all(traceFiles.map((traceFile) => inspectTraceFile(traceFile)))
  reports.sort((a, b) => a.refKey.localeCompare(b.refKey))

  const topLevelStable = intersectionOfStringArrays(reports.map((report) => report.topLevelKeys))

  const consolidatedArrays = new Map<
    string,
    {
      statsByRef: Map<string, ArrayStats>
    }
  >()

  for (const report of reports) {
    for (const [arrayPath, stats] of report.arrays.entries()) {
      let bucket = consolidatedArrays.get(arrayPath)
      if (!bucket) {
        bucket = { statsByRef: new Map<string, ArrayStats>() }
        consolidatedArrays.set(arrayPath, bucket)
      }
      bucket.statsByRef.set(report.refKey, stats)
    }
  }

  const allArrayPaths = [...consolidatedArrays.keys()].sort()
  const stableArrayPaths = allArrayPaths.filter(
    (arrayPath) => consolidatedArrays.get(arrayPath)!.statsByRef.size === reports.length
  )

  const idFamilySummary = new Map<
    string,
    {
      fields: Set<string>
      examples: Set<string>
    }
  >()

  type StableIdField = { arrayPath: string; fieldPath: string; examples: string[] }
  const stableIdFields: StableIdField[] = []

  const lines: string[] = []
  lines.push('# TRACE Schema Report')
  lines.push('')
  lines.push(
    'Generated by `scripts/inspect-trace-schema.ts` using only local fixture `trace.json` files.'
  )
  lines.push('')
  lines.push('## Fixture Inputs')
  for (const report of reports) {
    lines.push(`- \`${report.fixturePath}\``)
  }
  lines.push('')
  lines.push('## Per-fixture Discovery')

  for (const report of reports) {
    lines.push('')
    lines.push(`### \`${report.refKey}\``)
    lines.push(
      `- Top-level keys (${report.topLevelKeys.length}): ${formatInlineCodeList(report.topLevelKeys, 30)}`
    )

    const arrayPaths = [...report.arrays.keys()].sort()
    lines.push(`- Candidate object arrays (${arrayPaths.length}):`)
    for (const arrayPath of arrayPaths) {
      const stats = report.arrays.get(arrayPath)!
      const elementKeys = [...stats.elementKeyUnion].sort()
      const idFields = [...stats.idLikeFields.keys()].sort()
      const signalFields = [...stats.signalFields.keys()].sort()
      const lengthLabel =
        stats.minLength === stats.maxLength
          ? String(stats.minLength)
          : `${stats.minLength}-${stats.maxLength}`
      lines.push(
        `  - \`${arrayPath}\` (len ${lengthLabel}, occurrences ${stats.occurrences})`
      )
      lines.push(`    - Element keys: ${formatInlineCodeList(elementKeys)}`)
      lines.push(`    - ID-like fields: ${formatInlineCodeList(idFields)}`)
      lines.push(`    - Word/Tau fields: ${formatInlineCodeList(signalFields)}`)
    }
  }

  lines.push('')
  lines.push('## Consolidated Observations')
  lines.push('')
  lines.push(`- Stable top-level keys across all fixtures (${topLevelStable.length}):`)
  lines.push(`  - ${formatInlineCodeList(topLevelStable, 40)}`)
  lines.push(`- Candidate array paths found: ${allArrayPaths.length}`)
  lines.push(`  - Present in all fixtures: ${stableArrayPaths.length}`)
  lines.push(`  - Only in subset: ${allArrayPaths.length - stableArrayPaths.length}`)
  lines.push('')
  lines.push('### Stable Arrays (All Fixtures)')

  for (const arrayPath of stableArrayPaths) {
    const statsByRef = consolidatedArrays.get(arrayPath)!.statsByRef
    const perRefStats = [...statsByRef.values()]
    const stableElementKeys = intersectionOfStringArrays(
      perRefStats.map((stats) => [...stats.elementKeyUnion])
    )
    const stableIdFieldPaths = intersectionOfStringArrays(
      perRefStats.map((stats) => [...stats.idLikeFields.keys()])
    )
    const stableSignalFieldPaths = intersectionOfStringArrays(
      perRefStats.map((stats) => [...stats.signalFields.keys()])
    )

    const minLength = Math.min(...perRefStats.map((stats) => stats.minLength))
    const maxLength = Math.max(...perRefStats.map((stats) => stats.maxLength))
    const lengthLabel = minLength === maxLength ? String(minLength) : `${minLength}-${maxLength}`

    lines.push('')
    lines.push(`- \`${arrayPath}\` (length range ${lengthLabel})`)
    lines.push(`  - Stable element keys: ${formatInlineCodeList(stableElementKeys)}`)
    lines.push(`  - Stable ID-like fields: ${formatInlineCodeList(stableIdFieldPaths)}`)
    lines.push(`  - Stable Word/Tau fields: ${formatInlineCodeList(stableSignalFieldPaths)}`)

    for (const fieldPath of stableIdFieldPaths) {
      const examples = aggregateFieldExamples(statsByRef, 'idLikeFields', fieldPath)
      stableIdFields.push({ arrayPath, fieldPath, examples })

      for (const example of examples) {
        const family = classifyIdFamily(example)
        let familyBucket = idFamilySummary.get(family)
        if (!familyBucket) {
          familyBucket = { fields: new Set<string>(), examples: new Set<string>() }
          idFamilySummary.set(family, familyBucket)
        }
        familyBucket.fields.add(`${arrayPath}.${fieldPath}`)
        if (familyBucket.examples.size < MAX_FIELD_EXAMPLES) {
          familyBucket.examples.add(example)
        }
      }
    }
  }

  lines.push('')
  lines.push('### Stable Identifier Families')
  const sortedFamilies = [...idFamilySummary.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )
  if (sortedFamilies.length === 0) {
    lines.push('- No stable identifier families detected.')
  } else {
    for (const [family, detail] of sortedFamilies) {
      const fieldList = [...detail.fields].sort()
      const exampleList = [...detail.examples].sort()
      lines.push(`- \`${family}\``)
      lines.push(`  - Fields: ${formatInlineCodeList(fieldList, 6)}`)
      lines.push(`  - Examples: ${formatInlineCodeList(exampleList, 10)}`)
    }
  }

  lines.push('')
  lines.push('### Linking Recommendation')
  const stableHandleId = stableIdFields.find(
    (field) =>
      field.arrayPath.toLowerCase().includes('handles') && field.fieldPath === 'id'
  )
  const stableEventDataId = stableIdFields.find(
    (field) =>
      field.arrayPath.toLowerCase().includes('deep_trace') &&
      field.fieldPath.endsWith('events[].data.id')
  )

  if (stableHandleId) {
    lines.push(
      `- Primary stable link key: \`${stableHandleId.arrayPath}.${stableHandleId.fieldPath}\``
    )
    lines.push(
      `  - Example values: ${formatInlineCodeList(stableHandleId.examples, 8)}`
    )
  } else {
    lines.push('- No stable handle-id field detected across all fixtures.')
  }

  if (stableEventDataId) {
    lines.push(
      `- Trace event ID carrier: \`${stableEventDataId.arrayPath}.${stableEventDataId.fieldPath}\``
    )
    lines.push(
      `  - Example values: ${formatInlineCodeList(stableEventDataId.examples, 8)}`
    )
  }

  lines.push('')
  lines.push(
    'The colon-numeric family (`prefix:number[:number]`) is present across all fixtures and is suitable for deterministic linking.'
  )
  lines.push('')

  const reportBody = lines.join('\n')
  await fs.writeFile(REPORT_PATH, reportBody, 'utf8')

  process.stdout.write(`Wrote ${toPosixRelative(REPORT_PATH)}\n`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`inspect-trace-schema failed: ${message}\n`)
  process.exitCode = 1
})

