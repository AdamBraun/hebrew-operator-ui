export type ClickedGraphEntity = {
  kind: 'node' | 'edge'
  id: string
  label?: string
}

type ElementLike = {
  tagName: string
  parentElement: ElementLike | null
  children?: unknown
  textContent?: string | null
  getAttribute?: (name: string) => string | null
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
  return isElementLike(parentElement) ? parentElement : null
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

function classTokens(element: ElementLike): Set<string> {
  const raw = element.getAttribute?.('class') ?? ''
  return new Set(raw.split(/\s+/).map((token) => token.trim()).filter(Boolean))
}

function entityKindFromClass(element: ElementLike): 'node' | 'edge' | null {
  const tokens = classTokens(element)
  if (tokens.has('node')) {
    return 'node'
  }
  if (tokens.has('edge')) {
    return 'edge'
  }
  return null
}

function toChildrenArray(element: ElementLike): ElementLike[] {
  const rawChildren = element.children
  if (!rawChildren) {
    return []
  }

  if (Array.isArray(rawChildren)) {
    return rawChildren.filter(isElementLike)
  }

  if (typeof rawChildren === 'object' && rawChildren !== null) {
    const arrayLike = rawChildren as { length?: unknown; [k: number]: unknown }
    if (typeof arrayLike.length === 'number' && Number.isFinite(arrayLike.length)) {
      const out: ElementLike[] = []
      for (let index = 0; index < arrayLike.length; index += 1) {
        const child = arrayLike[index]
        if (isElementLike(child)) {
          out.push(child)
        }
      }
      return out
    }
  }

  return []
}

function findEntityGroup(start: ElementLike | null): {
  kind: 'node' | 'edge'
  group: ElementLike
} | null {
  let current = start

  while (current) {
    if (current.tagName.toLowerCase() === 'g') {
      const kind = entityKindFromClass(current)
      if (kind) {
        return { kind, group: current }
      }
    }

    if (current.tagName.toLowerCase() === 'svg') {
      return null
    }

    current = current.parentElement
  }

  return null
}

function collectDescendantsByTag(root: ElementLike, tagName: string): ElementLike[] {
  const target = tagName.toLowerCase()
  const out: ElementLike[] = []
  const queue = toChildrenArray(root)

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }

    if (current.tagName.toLowerCase() === target) {
      out.push(current)
    }

    queue.push(...toChildrenArray(current))
  }

  return out
}

function trimOrEmpty(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function extractTitle(group: ElementLike): string {
  const title = collectDescendantsByTag(group, 'title')
    .map((element) => trimOrEmpty(element.textContent))
    .find((value) => value.length > 0)
  return title ?? ''
}

function extractLabel(group: ElementLike): string | undefined {
  const textLines = collectDescendantsByTag(group, 'text')
    .map((element) => trimOrEmpty(element.textContent))
    .filter((value) => value.length > 0)

  if (textLines.length === 0) {
    return undefined
  }

  return textLines.join('\n')
}

function documentFromEvent(event: MouseEvent): DocumentLike | null {
  const fromTarget = toDocumentLike(
    (event.target as { ownerDocument?: unknown } | null)?.ownerDocument
  )
  if (fromTarget) {
    return fromTarget
  }

  const fromView = toDocumentLike((event as { view?: { document?: unknown } }).view?.document)
  if (fromView) {
    return fromView
  }

  if (typeof document !== 'undefined') {
    return toDocumentLike(document)
  }

  return null
}

function gatherStartElements(event: MouseEvent): ElementLike[] {
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

  push(event.target)

  const composedPath = (event as { composedPath?: () => unknown[] }).composedPath?.()
  if (Array.isArray(composedPath)) {
    for (const entry of composedPath) {
      push(entry)
    }
  }

  const doc = documentFromEvent(event)
  if (
    doc &&
    typeof event.clientX === 'number' &&
    Number.isFinite(event.clientX) &&
    typeof event.clientY === 'number' &&
    Number.isFinite(event.clientY)
  ) {
    push(doc.elementFromPoint?.(event.clientX, event.clientY))
  }

  return starts
}

export function getClickedGraphEntity(event: MouseEvent): ClickedGraphEntity | null {
  for (const startElement of gatherStartElements(event)) {
    const entity = findEntityGroup(startElement)
    if (!entity) {
      continue
    }

    const id = extractTitle(entity.group)
    if (id.length === 0) {
      continue
    }

    return {
      kind: entity.kind,
      id,
      label: extractLabel(entity.group),
    }
  }

  return null
}

