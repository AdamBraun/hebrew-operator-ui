import { describe, expect, it } from 'vitest'
import { extractGraphTokenFromEvent } from './graphToken'

class FixtureElement {
  tagName: string
  private className: string
  textContent: string | null = null
  parentElement: FixtureElement | null = null
  children: FixtureElement[] = []

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

function clickEvent(target: unknown): MouseEvent {
  return { target } as MouseEvent
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
})
