import { CORPUS_BASE_URL } from '../config/corpus'
import { buildNavModel, type NavModel } from '../lib/navModel'
import type { VerseRef } from '../lib/ref'
import type { Manifest } from '../lib/types'

import deuteronomy006004GraphDotRaw from './refs/deuteronomy/006/004/graph.dot?raw'
import deuteronomy006004TraceJsonRaw from './refs/deuteronomy/006/004/trace.json?raw'
import deuteronomy006004TraceTxtRaw from './refs/deuteronomy/006/004/trace.txt?raw'
import genesis001001GraphDotRaw from './refs/genesis/001/001/graph.dot?raw'
import genesis001001TraceJsonRaw from './refs/genesis/001/001/trace.json?raw'
import genesis001001TraceTxtRaw from './refs/genesis/001/001/trace.txt?raw'
import leviticus001001GraphDotRaw from './refs/leviticus/001/001/graph.dot?raw'
import leviticus001001TraceJsonRaw from './refs/leviticus/001/001/trace.json?raw'
import leviticus001001TraceTxtRaw from './refs/leviticus/001/001/trace.txt?raw'

export type FixtureFileRecord = {
  localPath: string
  sourceUrl: string
  sha256: string
}

export type FixtureRegistryEntry = {
  ref: VerseRef
  key: string
  traceJson: FixtureFileRecord
  graphDot: FixtureFileRecord
  traceTxt?: FixtureFileRecord
}

export type FixtureDataEntry = FixtureRegistryEntry & {
  traceJsonData: unknown
  graphDotData: string
  traceTxtData: string
}

function fixtureKey(ref: VerseRef): string {
  return `${ref.book}/${ref.chapter3}/${ref.verse3}`
}

function corpusRefsBaseUrl(): string {
  return `${CORPUS_BASE_URL.replace(/\/+$/, '')}/refs`
}

function fixtureFile(
  refKey: string,
  fileName: 'trace.json' | 'graph.dot' | 'trace.txt',
  sha256: string
): FixtureFileRecord {
  return {
    localPath: `src/fixtures/refs/${refKey}/${fileName}`,
    sourceUrl: `${corpusRefsBaseUrl()}/${refKey}/${fileName}`,
    sha256,
  }
}

function parseTraceJson(raw: string, localPath: string): unknown {
  try {
    return JSON.parse(raw)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'invalid JSON'
    throw new Error(`Failed to parse fixture JSON at ${localPath}: ${message}`)
  }
}

function createFixture(args: {
  ref: VerseRef
  raw: {
    traceJson: string
    graphDot: string
    traceTxt: string
  }
  sha256: {
    traceJson: string
    graphDot: string
    traceTxt: string
  }
}): FixtureDataEntry {
  const key = fixtureKey(args.ref)
  const traceJsonMeta = fixtureFile(key, 'trace.json', args.sha256.traceJson)
  const graphDotMeta = fixtureFile(key, 'graph.dot', args.sha256.graphDot)
  const traceTxtMeta = fixtureFile(key, 'trace.txt', args.sha256.traceTxt)

  return {
    ref: args.ref,
    key,
    traceJson: traceJsonMeta,
    graphDot: graphDotMeta,
    traceTxt: traceTxtMeta,
    traceJsonData: parseTraceJson(args.raw.traceJson, traceJsonMeta.localPath),
    graphDotData: args.raw.graphDot,
    traceTxtData: args.raw.traceTxt,
  }
}

const fixtureDataEntries: readonly FixtureDataEntry[] = [
  createFixture({
    ref: { book: 'genesis', chapter3: '001', verse3: '001' },
    raw: {
      traceJson: genesis001001TraceJsonRaw,
      graphDot: genesis001001GraphDotRaw,
      traceTxt: genesis001001TraceTxtRaw,
    },
    sha256: {
      traceJson:
        '888c4c99bd042ecb834c5ad43479cc5af2a36de90f3f68c0b530442d831dd81d',
      graphDot:
        'c3e1ac5649c7a579df7b7ec8a1c23c4d1dd10cedc7234db80f5e9e57032ba001',
      traceTxt:
        '92eb5599fecf829a553c8859b0a8b7b73b8b465f264a2420da935b7fe581761e',
    },
  }),
  createFixture({
    ref: { book: 'deuteronomy', chapter3: '006', verse3: '004' },
    raw: {
      traceJson: deuteronomy006004TraceJsonRaw,
      graphDot: deuteronomy006004GraphDotRaw,
      traceTxt: deuteronomy006004TraceTxtRaw,
    },
    sha256: {
      traceJson:
        '3fbd3138fcb386a9488450142e827ae184e4bf2c283348cfd1c95f1b108dd870',
      graphDot:
        'e934368d964de43bee63eaab251814ce74847f06fc67b2015bb18468562a97d5',
      traceTxt:
        '36b8cc080fabd13b0d9b93bb725112045b57596f0e553ac288cb199a90504a7d',
    },
  }),
  createFixture({
    ref: { book: 'leviticus', chapter3: '001', verse3: '001' },
    raw: {
      traceJson: leviticus001001TraceJsonRaw,
      graphDot: leviticus001001GraphDotRaw,
      traceTxt: leviticus001001TraceTxtRaw,
    },
    sha256: {
      traceJson:
        '7b2f3bdf81a17452774ced7dcf33e66d127ff2c84a02e7e225ee9dd63806b059',
      graphDot:
        'd337bbb704ef40d519a67d9fbcc8b9eea6ee643e91db03164ca98d8722e52ecd',
      traceTxt:
        'e76048865c9292d5b7eb31771b4e9d76d9120693fd82648213a82114efdf377a',
    },
  }),
]

export const FIXTURE_REGISTRY: readonly FixtureRegistryEntry[] = fixtureDataEntries.map(
  (entry) => ({
    ref: entry.ref,
    key: entry.key,
    traceJson: entry.traceJson,
    graphDot: entry.graphDot,
    traceTxt: entry.traceTxt,
  })
)

export const FIXTURE_MANIFEST: Manifest = {
  generated_at: 'local-fixtures',
  engine_git_sha: 'local-fixtures',
  version: 'fixtures-v1',
  fixture_refs: fixtureDataEntries.map((entry) => entry.key),
}

const FIXTURE_DATA_BY_KEY = new Map<string, FixtureDataEntry>(
  fixtureDataEntries.map((entry) => [entry.key, entry])
)

export const FIXTURE_NAV_MODEL: NavModel = buildNavModel(
  fixtureDataEntries.map((entry) => entry.key)
)

export function fixtureKeyForRef(ref: VerseRef): string {
  return fixtureKey(ref)
}

export function getFixtureData(ref: VerseRef): FixtureDataEntry | null {
  return FIXTURE_DATA_BY_KEY.get(fixtureKey(ref)) ?? null
}

export function hasFixture(ref: VerseRef): boolean {
  return FIXTURE_DATA_BY_KEY.has(fixtureKey(ref))
}

export function cloneFixtureNavModel(): NavModel {
  const chaptersByBook = Object.fromEntries(
    Object.entries(FIXTURE_NAV_MODEL.chaptersByBook).map(([book, chapters]) => [
      book,
      [...chapters],
    ])
  )
  const versesByBookChapter = Object.fromEntries(
    Object.entries(FIXTURE_NAV_MODEL.versesByBookChapter).map(
      ([book, versesByChapter]) => [
        book,
        Object.fromEntries(
          Object.entries(versesByChapter).map(([chapter3, verses]) => [
            chapter3,
            [...verses],
          ])
        ),
      ]
    )
  )

  return {
    books: [...FIXTURE_NAV_MODEL.books],
    chaptersByBook,
    versesByBookChapter,
  }
}
