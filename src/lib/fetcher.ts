const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_CACHE: RequestCache = 'force-cache'

type FetchOptions = {
  timeoutMs?: number
  cache?: RequestCache
}

export class FetchError extends Error {
  url: string
  status?: number

  constructor(msg: string, url: string, status?: number) {
    super(msg)
    this.name = 'FetchError'
    this.url = url
    this.status = status
  }
}

async function fetchWithHandling(
  url: string,
  opts?: FetchOptions
): Promise<Response> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const cache = opts?.cache ?? DEFAULT_CACHE

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      cache,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new FetchError(
        `Request failed (${response.status}) for ${url}`,
        url,
        response.status
      )
    }

    return response
  } catch (error: unknown) {
    if (error instanceof FetchError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new FetchError(`Request timeout after ${timeoutMs}ms for ${url}`, url)
    }

    const message =
      error instanceof Error ? error.message : 'Unknown network error'
    throw new FetchError(`Request failed for ${url}: ${message}`, url)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchText(
  url: string,
  opts?: FetchOptions
): Promise<string> {
  const response = await fetchWithHandling(url, opts)
  return response.text()
}

export async function fetchJson<T = any>(
  url: string,
  opts?: FetchOptions
): Promise<T> {
  const text = await fetchText(url, opts)

  try {
    return JSON.parse(text) as T
  } catch {
    throw new FetchError(`Invalid JSON response from ${url}`, url)
  }
}
