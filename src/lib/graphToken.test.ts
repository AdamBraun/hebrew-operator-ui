import { describe, expect, it } from 'vitest'
import {
  extractGraphMatchTokensFromEvent,
  extractGraphTokenFromEvent,
} from './graphToken'

class FixtureElement {
  tagName: string
  private className: string
  textContent: string | null = null
  parentElement: FixtureElement | null = null
  children: FixtureElement[] = []
  ownerDocument: unknown = null

  constructor(tagName: string, options?: { className?: string; textContent?: string }) {
    this.tagName = tagName
    this.className = options?.className ?? ''
    this.textContent = options?.textContent ?? null
  }

  append(...elements: FixtureElement[]) {
    for (const element of elements) {
      element.parentElement = this
      this.children.push(element)
    }
  }

  getAttribute(name: string): string | null {
    if (name === 'class') {
      return this.className
    }
    return null
  }

  querySelector(selector: string): FixtureElement | null {
    const normalized = selector.trim().toLowerCase()
    const queue = [...this.children]

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) {
        continue
      }
      if (current.tagName.toLowerCase() === normalized) {
        return current
      }
      queue.push(...current.children)
    }

    return null
  }
}

function buildNodeFixture(options: {
  className?: string
  titleText?: string
  labelText?: string
} = {}) {
  const svg = new FixtureElement('svg')
  const group = new FixtureElement('g', { className: options.className ?? 'node' })
  const shape = new FixtureElement('path')

  if (options.titleText !== undefined) {
    group.append(new FixtureElement('title', { textContent: options.titleText }))
  }

  if (options.labelText !== undefined) {
    group.append(new FixtureElement('text', { textContent: options.labelText }))
  }

  group.append(shape)
  svg.append(group)

  return { svg, group, shape }
}

function clickEvent(target: unknown, extras: Partial<MouseEvent> = {}): MouseEvent {
  return { target, ...extras } as MouseEvent
}

describe('extractGraphTokenFromEvent', () => {
  it('uses <title> token when present and sanitizes it', () => {
    const { shape } = buildNodeFixture({
      className: 'node selected',
      titleText: '  "Genesis   1:1"  ',
      labelText: 'Should not be used',
    })

    expect(extractGraphTokenFromEvent(clickEvent(shape))).toEqual({
      token: 'Genesis 1:1',
      source: 'title',
    })
  })

  it('falls back to first <text> label when title is missing', () => {
    const { shape } = buildNodeFixture({
      className: 'node',
      labelText: "  'Alpha   Beta'  ",
    })

    expect(extractGraphTokenFromEvent(clickEvent(shape))).toEqual({
      token: 'Alpha Beta',
      source: 'label',
    })
  })

  it('supports edge groups', () => {
    const { shape } = buildNodeFixture({
      className: 'edge',
      titleText: '  edge_001  ',
    })

    expect(extractGraphTokenFromEvent(clickEvent(shape))).toEqual({
      token: 'edge_001',
      source: 'title',
    })
  })

  it('returns null for clicks outside node/edge groups', () => {
    const svg = new FixtureElement('svg')
    const cluster = new FixtureElement('g', { className: 'cluster' })
    const shape = new FixtureElement('path')
    cluster.append(shape)
    svg.append(cluster)

    expect(extractGraphTokenFromEvent(clickEvent(shape))).toBeNull()
  })

  it('returns null when token source exists but is empty after sanitization', () => {
    const { shape } = buildNodeFixture({
      className: 'node',
      titleText: '   "   "   ',
      labelText: '   ',
    })

    expect(extractGraphTokenFromEvent(clickEvent(shape))).toBeNull()
  })

  it('resolves token via composedPath fallback when target is not a node descendant', () => {
    const { shape, svg } = buildNodeFixture({
      className: 'node',
      titleText: 'via-path',
    })

    const event = clickEvent(
      svg,
      {
        composedPath: () => [svg, shape],
      } as unknown as Partial<MouseEvent>
    )

    expect(extractGraphTokenFromEvent(event)).toEqual({
      token: 'via-path',
      source: 'title',
    })
  })

  it('resolves token via elementFromPoint fallback', () => {
    const { shape, svg } = buildNodeFixture({
      className: 'node',
      titleText: 'via-point',
    })

    svg.ownerDocument = {
      elementFromPoint: () => shape,
    }

    const event = clickEvent(svg, {
      clientX: 10,
      clientY: 20,
    })

    expect(extractGraphTokenFromEvent(event)).toEqual({
      token: 'via-point',
      source: 'title',
    })
  })

  it('returns both title and label match tokens when both are present', () => {
    const { shape } = buildNodeFixture({
      className: 'node',
      titleText: 'Th12',
      labelText: 'TH 12',
    })

    expect(extractGraphMatchTokensFromEvent(clickEvent(shape))).toEqual(['Th12', 'TH 12'])
  })

  it('deduplicates match tokens when title and label are equivalent after normalization', () => {
    const { shape } = buildNodeFixture({
      className: 'node',
      titleText: '  \"Alpha   Beta\" ',
      labelText: 'Alpha Beta',
    })

    expect(extractGraphMatchTokensFromEvent(clickEvent(shape))).toEqual(['Alpha Beta'])
  })

  it('treats quoted title as canonical handle id', () => {
    const { shape } = buildNodeFixture({
      className: 'node',
      titleText: '  "ב:2:4"  ',
      labelText: 'ב:2:4\\nboundary | atomic,hard',
    })

    expect(extractGraphTokenFromEvent(clickEvent(shape))).toEqual({
      token: 'ב:2:4',
      source: 'title',
    })
    expect(extractGraphMatchTokensFromEvent(clickEvent(shape))).toEqual([
      'ב:2:4',
      'ב:2:4\\nboundary | atomic,hard',
    ])
  })
})
