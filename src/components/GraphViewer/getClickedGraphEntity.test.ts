import { describe, expect, it } from 'vitest'
import { getClickedGraphEntity } from './getClickedGraphEntity'

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
}

function clickEvent(target: unknown, extras: Partial<MouseEvent> = {}): MouseEvent {
  return { target, ...extras } as MouseEvent
}

function buildNodeFixture(options: {
  title?: string
  labelLines?: string[]
} = {}): { svg: FixtureElement; shape: FixtureElement } {
  const svg = new FixtureElement('svg')
  const group = new FixtureElement('g', { className: 'node selected' })
  const shape = new FixtureElement('path')
  group.append(shape)

  if (options.title !== undefined) {
    group.append(new FixtureElement('title', { textContent: options.title }))
  }

  for (const labelLine of options.labelLines ?? []) {
    group.append(new FixtureElement('text', { textContent: labelLine }))
  }

  svg.append(group)
  return { svg, shape }
}

describe('getClickedGraphEntity', () => {
  it('extracts node id from title and keeps label optional', () => {
    const { shape } = buildNodeFixture({
      title: 'C:3:3',
      labelLines: ['C:3:3', 'scope | convergent'],
    })

    expect(getClickedGraphEntity(clickEvent(shape))).toEqual({
      kind: 'node',
      id: 'C:3:3',
      label: 'C:3:3\nscope | convergent',
    })
  })

  it('extracts edge id from title', () => {
    const svg = new FixtureElement('svg')
    const group = new FixtureElement('g', { className: 'edge active' })
    const path = new FixtureElement('path')
    group.append(path)
    group.append(new FixtureElement('title', { textContent: 'A->B' }))
    group.append(new FixtureElement('text', { textContent: 'transport' }))
    svg.append(group)

    expect(getClickedGraphEntity(clickEvent(path))).toEqual({
      kind: 'edge',
      id: 'A->B',
      label: 'transport',
    })
  })

  it('does not fall back to label for id when title is missing', () => {
    const { shape } = buildNodeFixture({
      labelLines: ['Label only'],
    })

    expect(getClickedGraphEntity(clickEvent(shape))).toBeNull()
  })

  it('returns stable ids for repeated clicks across at least 10 nodes', () => {
    const svg = new FixtureElement('svg')
    const shapes: FixtureElement[] = []

    for (let index = 0; index < 10; index += 1) {
      const group = new FixtureElement('g', { className: 'node' })
      const shape = new FixtureElement('path')
      group.append(shape)
      group.append(new FixtureElement('title', { textContent: `N:${index}:1` }))
      group.append(new FixtureElement('text', { textContent: `Node ${index}` }))
      svg.append(group)
      shapes.push(shape)
    }

    for (let index = 0; index < shapes.length; index += 1) {
      const first = getClickedGraphEntity(clickEvent(shapes[index]))
      const second = getClickedGraphEntity(clickEvent(shapes[index]))
      expect(first?.kind).toBe('node')
      expect(first?.id).toBe(`N:${index}:1`)
      expect(second?.id).toBe(`N:${index}:1`)
    }
  })

  it('supports composedPath and elementFromPoint fallbacks', () => {
    const { svg, shape } = buildNodeFixture({
      title: 'fallback-node',
    })
    svg.ownerDocument = { elementFromPoint: () => shape }

    const viaPath = clickEvent(svg, {
      composedPath: () => [svg, shape],
    } as unknown as Partial<MouseEvent>)
    expect(getClickedGraphEntity(viaPath)?.id).toBe('fallback-node')

    const viaPoint = clickEvent(svg, { clientX: 10, clientY: 10 })
    expect(getClickedGraphEntity(viaPoint)?.id).toBe('fallback-node')
  })
})

