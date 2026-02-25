export type GraphTokenSource = 'title' | 'label'

export type GraphTokenResult = {
  token: string
  source: GraphTokenSource
}

type GraphGroupTokens = {
  title: string
  label: string
}

type ElementLike = {
  tagName: string
  parentElement: ElementLike | null
  getAttribute?: (name: string) => string | null
  querySelector?: (selector: string) => ElementLike | null
  textContent?: string | null
  ownerDocument?: unknown
}

type DocumentLike = {
  elementFromPoint?: (x: number, y: number) => unknown
}

function isElementLike(value: unknown): value is ElementLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { tagName?: unknown; parentElement?: unknown }
  return (
    typeof candidate.tagName === 'string' &&
    (candidate.parentElement === null || typeof candidate.parentElement === 'object')
  )
}

function toElementFromUnknown(target: unknown): ElementLike | null {
  if (!target || typeof target !== 'object') {
    return null
  }

  if (isElementLike(target)) {
    return target
  }

  const parentElement = (target as { parentElement?: unknown }).parentElement
  if (isElementLike(parentElement)) {
    return parentElement
  }

  return null
}

function toDocumentLike(value: unknown): DocumentLike | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as { elementFromPoint?: unknown }
  if (typeof candidate.elementFromPoint !== 'function') {
    return null
  }

  return value as DocumentLike
}

function hasNodeOrEdgeClass(element: ElementLike): boolean {
  const className = element.getAttribute?.('class') ?? ''
  return /(^|\s)(node|edge)(\s|$)/.test(className)
}

function normalizeToken(raw: string): string {
  let token = raw.trim().replace(/\s+/g, ' ')
  const hasDoubleQuotes = token.startsWith('"') && token.endsWith('"')
  const hasSingleQuotes = token.startsWith("'") && token.endsWith("'")

  if (token.length >= 2 && (hasDoubleQuotes || hasSingleQuotes)) {
    token = token.slice(1, -1).trim().replace(/\s+/g, ' ')
  }

  return token
}

function findGraphGroup(start: ElementLike | null): ElementLike | null {
  let current = start

  while (current) {
    if (current.tagName.toLowerCase() === 'g' && hasNodeOrEdgeClass(current)) {
      return current
    }

    if (current.tagName.toLowerCase() === 'svg') {
      return null
    }

    current = current.parentElement
  }

  return null
}

function tokenFromGraphGroup(graphGroup: ElementLike): GraphTokenResult | null {
  const tokens = readGraphGroupTokens(graphGroup)
  if (tokens.title.length > 0) {
    return { token: tokens.title, source: 'title' }
  }
  if (tokens.label.length > 0) {
    return { token: tokens.label, source: 'label' }
  }
  return null
}

function readGraphGroupTokens(graphGroup: ElementLike): GraphGroupTokens {
  const titleText = graphGroup.querySelector?.('title')?.textContent
  const title = typeof titleText === 'string' ? normalizeToken(titleText) : ''
  const labelText = graphGroup.querySelector?.('text')?.textContent
  const label = typeof labelText === 'string' ? normalizeToken(labelText) : ''

  return { title, label }
}

function documentFromEvent(e: MouseEvent): DocumentLike | null {
  const fromTarget = toDocumentLike((e.target as { ownerDocument?: unknown } | null)?.ownerDocument)
  if (fromTarget) {
    return fromTarget
  }

  const fromView = toDocumentLike((e as { view?: { document?: unknown } }).view?.document)
  if (fromView) {
    return fromView
  }

  if (typeof document !== 'undefined') {
    return toDocumentLike(document)
  }

  return null
}

function gatherStartElements(e: MouseEvent): ElementLike[] {
  const starts: ElementLike[] = []
  const seen = new Set<ElementLike>()

  function push(value: unknown) {
    const element = toElementFromUnknown(value)
    if (!element || seen.has(element)) {
      return
    }
    seen.add(element)
    starts.push(element)
  }

  push(e.target)

  const composedPath = (e as { composedPath?: () => unknown[] }).composedPath?.()
  if (Array.isArray(composedPath)) {
    for (const entry of composedPath) {
      push(entry)
    }
  }

  const doc = documentFromEvent(e)
  if (
    doc &&
    typeof e.clientX === 'number' &&
    Number.isFinite(e.clientX) &&
    typeof e.clientY === 'number' &&
    Number.isFinite(e.clientY)
  ) {
    push(doc.elementFromPoint?.(e.clientX, e.clientY))
  }

  return starts
}

export function extractGraphTokenFromEvent(e: MouseEvent): GraphTokenResult | null {
  for (const startElement of gatherStartElements(e)) {
    const graphGroup = findGraphGroup(startElement)
    if (!graphGroup) {
      continue
    }

    const result = tokenFromGraphGroup(graphGroup)
    if (result) {
      return result
    }
  }

  return null
}

export function extractGraphMatchTokensFromEvent(e: MouseEvent): string[] {
  for (const startElement of gatherStartElements(e)) {
    const graphGroup = findGraphGroup(startElement)
    if (!graphGroup) {
      continue
    }

    const tokens = readGraphGroupTokens(graphGroup)
    const matchTokens: string[] = []

    if (tokens.title.length > 0) {
      matchTokens.push(tokens.title)
    }
    if (tokens.label.length > 0 && !matchTokens.includes(tokens.label)) {
      matchTokens.push(tokens.label)
    }

    if (matchTokens.length > 0) {
      return matchTokens
    }
  }

  return []
}
