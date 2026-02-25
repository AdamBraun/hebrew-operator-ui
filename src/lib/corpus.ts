import { fetchJson } from './fetcher'
import type { Manifest } from './types'
import { manifestUrl } from './urls'

export async function fetchManifest(): Promise<Manifest> {
  return fetchJson<Manifest>(manifestUrl())
}
