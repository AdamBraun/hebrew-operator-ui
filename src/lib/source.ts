import {
  FIXTURE_MANIFEST,
  FIXTURE_NAV_MODEL,
  cloneFixtureNavModel,
  fixtureKeyForRef,
  getFixtureData,
} from '../fixtures/fixtures'
import { FetchError, fetchJson, fetchText } from './fetcher'
import type { NavModel } from './navModel'
import type { VerseRef } from './ref'
import type { Manifest } from './types'
import { graphDotUrl, manifestUrl, traceJsonUrl, traceTxtUrl } from './urls'

export type SourceFetchOptions = {
  timeoutMs?: number
  cache?: RequestCache
}

export type VerseSourceUrls = {
  mode: 'fixture' | 'remote'
  manifest: string
  traceJson: string
  graphDot: string
  traceTxt: string
}

function normalizeBook(book: string): string {
  return book.trim().toLowerCase()
}

function normalizeChapter(chapter3: string): string {
  return chapter3.trim().padStart(3, '0')
}

export function isFixtureSourceEnabled(): boolean {
  return import.meta.env.VITE_USE_FIXTURES === '1'
}

function missingFixtureError(ref: VerseRef, fileName: string): FetchError {
  const key = fixtureKeyForRef(ref)
  const localPath = `src/fixtures/refs/${key}/${fileName}`
  return new FetchError(`Missing fixture ${fileName} for ${key}`, localPath, 404)
}

function fixtureUrls(ref: VerseRef): VerseSourceUrls {
  const fixture = getFixtureData(ref)
  const key = fixtureKeyForRef(ref)

  return {
    mode: 'fixture',
    manifest: 'src/fixtures/fixtures.ts#FIXTURE_MANIFEST',
    traceJson: fixture?.traceJson.localPath ?? `src/fixtures/refs/${key}/trace.json`,
    graphDot: fixture?.graphDot.localPath ?? `src/fixtures/refs/${key}/graph.dot`,
    traceTxt: fixture?.traceTxt?.localPath ?? `src/fixtures/refs/${key}/trace.txt`,
  }
}

function remoteUrls(ref: VerseRef): VerseSourceUrls {
  return {
    mode: 'remote',
    manifest: manifestUrl(),
    traceJson: traceJsonUrl(ref),
    graphDot: graphDotUrl(ref),
    traceTxt: traceTxtUrl(ref),
  }
}

export function sourceUrlsForRef(ref: VerseRef): VerseSourceUrls {
  return isFixtureSourceEnabled() ? fixtureUrls(ref) : remoteUrls(ref)
}

export async function loadManifest(
  options?: SourceFetchOptions
): Promise<Manifest> {
  if (isFixtureSourceEnabled()) {
    return FIXTURE_MANIFEST
  }

  return fetchJson<Manifest>(manifestUrl(), options)
}

export async function loadTraceJson<T = unknown>(
  ref: VerseRef,
  options?: SourceFetchOptions
): Promise<T> {
  if (isFixtureSourceEnabled()) {
    const fixture = getFixtureData(ref)
    if (!fixture) {
      throw missingFixtureError(ref, 'trace.json')
    }
    return fixture.traceJsonData as T
  }

  return fetchJson<T>(traceJsonUrl(ref), options)
}

export async function loadGraphDot(
  ref: VerseRef,
  options?: SourceFetchOptions
): Promise<string> {
  if (isFixtureSourceEnabled()) {
    const fixture = getFixtureData(ref)
    if (!fixture) {
      throw missingFixtureError(ref, 'graph.dot')
    }
    return fixture.graphDotData
  }

  return fetchText(graphDotUrl(ref), options)
}

export async function loadTraceTxt(
  ref: VerseRef,
  options?: SourceFetchOptions
): Promise<string> {
  if (isFixtureSourceEnabled()) {
    const fixture = getFixtureData(ref)
    if (!fixture) {
      throw missingFixtureError(ref, 'trace.txt')
    }
    return fixture.traceTxtData
  }

  return fetchText(traceTxtUrl(ref), options)
}

export function initialNavModelForSource(): NavModel | null {
  if (!isFixtureSourceEnabled()) {
    return null
  }

  return cloneFixtureNavModel()
}

export function fixtureChaptersForBook(book: string): string[] {
  const normalizedBook = normalizeBook(book)
  return [...(FIXTURE_NAV_MODEL.chaptersByBook[normalizedBook] ?? [])]
}

export function fixtureVersesForChapter(book: string, chapter3: string): string[] {
  const normalizedBook = normalizeBook(book)
  const normalizedChapter = normalizeChapter(chapter3)
  return [
    ...(FIXTURE_NAV_MODEL.versesByBookChapter[normalizedBook]?.[normalizedChapter] ??
      []),
  ]
}

