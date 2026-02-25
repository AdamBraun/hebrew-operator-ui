import { fetchJson, fetchText } from './fetcher'
import { extractVerseText } from './extractVerseText'
import type { Manifest, VerseArtifacts, VerseRef } from './types'
import { graphDotUrl, manifestUrl, traceJsonUrl, traceTxtUrl } from './urls'

export async function fetchManifest(): Promise<Manifest> {
  return fetchJson<Manifest>(manifestUrl())
}

export async function fetchVerseArtifacts(
  ref: VerseRef
): Promise<VerseArtifacts> {
  const [traceJson, traceTxt, graphDot] = await Promise.all([
    fetchJson(traceJsonUrl(ref)),
    fetchText(traceTxtUrl(ref)),
    fetchText(graphDotUrl(ref)),
  ])

  return {
    traceJson,
    traceTxt,
    graphDot,
    verseText: extractVerseText(traceJson, traceTxt),
  }
}
