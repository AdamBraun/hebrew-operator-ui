import { CORPUS_BASE_URL } from '../config/corpus'

let corpusIndexPromise: Promise<any> | null = null

function corpusIndexUrl(): string {
  return `${CORPUS_BASE_URL.replace(/\/+$/, '')}/refs/index.json`
}

export function fetchCorpusIndex(): Promise<any> {
  if (corpusIndexPromise) {
    return corpusIndexPromise
  }

  const url = corpusIndexUrl()

  corpusIndexPromise = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch refs/index.json (status ${response.status})`)
    }

    return response.json()
  })

  corpusIndexPromise = corpusIndexPromise.catch((error: unknown) => {
    corpusIndexPromise = null
    throw error
  })

  return corpusIndexPromise
}
