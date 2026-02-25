import { fetchJson, fetchText } from './fetcher'
import { extractVerseText } from './extractVerseText'
import { LruCache } from './lru'
import type { Manifest, VerseArtifacts, VerseRef } from './types'
import { graphDotUrl, manifestUrl, traceJsonUrl, traceTxtUrl } from './urls'

const verseArtifactsCache = new LruCache<string, VerseArtifacts>(20)

function verseCacheKey(ref: VerseRef): string {
  return `${ref.book}/${ref.chapter3}/${ref.verse3}`
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
    verseText: extractVerseText(traceJson, traceTxt),
  }

  verseArtifactsCache.set(key, artifacts)
  return artifacts
}
