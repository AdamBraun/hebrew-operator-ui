import { CORPUS_BASE_URL } from '../config/corpus'
import type { VerseRef } from './types'

function joinUrl(base: string, ...parts: string[]): string {
  const normalizedBase = base.replace(/\/+$/, '')
  const normalizedParts = parts.map((part) => part.replace(/^\/+|\/+$/g, ''))
  return [normalizedBase, ...normalizedParts].join('/')
}

export function manifestUrl(): string {
  return joinUrl(CORPUS_BASE_URL, 'manifest.json')
}

export function verseDirUrl(ref: VerseRef): string {
  return joinUrl(CORPUS_BASE_URL, 'refs', ref.book, ref.chapter3, ref.verse3)
}

export function traceJsonUrl(ref: VerseRef): string {
  return joinUrl(verseDirUrl(ref), 'trace.json')
}

export function traceTxtUrl(ref: VerseRef): string {
  return joinUrl(verseDirUrl(ref), 'trace.txt')
}

export function graphDotUrl(ref: VerseRef): string {
  return joinUrl(verseDirUrl(ref), 'graph.dot')
}
