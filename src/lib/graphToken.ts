export type GraphTokenSource = 'title' | 'label'

export type GraphTokenResult = {
  token: string
  source: GraphTokenSource
}

type ElementLike = {
  tagName: string
  parentElement: ElementLike | null
  getAttribute?: (name: string) => string | null
  querySelector?: (selector: string) => ElementLike | null
  textContent?: string | null
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

function toElementFromTarget(target: EventTarget | null): ElementLike | null {
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

export function extractGraphTokenFromEvent(e: MouseEvent): GraphTokenResult | null {
  const startElement = toElementFromTarget(e.target)
  const graphGroup = findGraphGroup(startElement)
  if (!graphGroup) {
    return null
  }

  const titleText = graphGroup.querySelector?.('title')?.textContent
  const normalizedTitle = typeof titleText === 'string' ? normalizeToken(titleText) : ''
  if (normalizedTitle.length > 0) {
    return { token: normalizedTitle, source: 'title' }
  }

  const labelText = graphGroup.querySelector?.('text')?.textContent
  const normalizedLabel = typeof labelText === 'string' ? normalizeToken(labelText) : ''
  if (normalizedLabel.length > 0) {
    return { token: normalizedLabel, source: 'label' }
  }

  return null
}
