import { fetchJson, fetchText } from './fetcher'
import { LruCache } from './lru'
import type { Manifest, VerseArtifacts, VerseRef } from './types'

export const CORPUS_BASE_URL =
  'https://raw.githubusercontent.com/AdamBraun/hebrew-operator-vm/refs/heads/main/outputs/pasuk-trace-corpus/latest'

const verseArtifactsCache = new LruCache<string, VerseArtifacts>(20)

function verseCacheKey(ref: VerseRef): string {
  return `${ref.book}/${ref.chapter3}/${ref.verse3}`
}

function joinUrl(base: string, ...parts: string[]): string {
  const normalizedBase = base.replace(/\/+$/, '')
  const normalizedParts = parts.map((part) => part.replace(/^\/+|\/+$/g, ''))
  return [normalizedBase, ...normalizedParts].join('/')
}

function manifestUrl(): string {
  return joinUrl(CORPUS_BASE_URL, 'manifest.json')
}

function verseDirUrl(ref: VerseRef): string {
  return joinUrl(CORPUS_BASE_URL, 'refs', ref.book, ref.chapter3, ref.verse3)
}

function traceJsonUrl(ref: VerseRef): string {
  return joinUrl(verseDirUrl(ref), 'trace.json')
}

function traceTxtUrl(ref: VerseRef): string {
  return joinUrl(verseDirUrl(ref), 'trace.txt')
}

function graphDotUrl(ref: VerseRef): string {
  return joinUrl(verseDirUrl(ref), 'graph.dot')
}

export async function fetchManifest(): Promise<Manifest> {
  return fetchJson<Manifest>(manifestUrl())
}

export async function fetchVerseArtifacts(
  ref: VerseRef
): Promise<VerseArtifacts> {
  const key = verseCacheKey(ref)
  const cached = verseArtifactsCache.get(key)
  if (cached) {
    return cached
  }

  const [traceJson, traceTxt, graphDot] = await Promise.all([
    fetchJson(traceJsonUrl(ref)),
    fetchText(traceTxtUrl(ref)),
    fetchText(graphDotUrl(ref)),
  ])

  const artifacts: VerseArtifacts = {
    traceJson,
    traceTxt,
    graphDot,
  }

  verseArtifactsCache.set(key, artifacts)
  return artifacts
}
