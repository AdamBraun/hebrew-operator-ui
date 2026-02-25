export class LruCache<K, V> {
  private readonly maxEntries: number
  private readonly store = new Map<K, V>()

  constructor(maxEntries = 20) {
    this.maxEntries = maxEntries
  }

  get(key: K): V | undefined {
    const value = this.store.get(key)
    if (value === undefined) {
      return undefined
    }

    this.store.delete(key)
    this.store.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.store.has(key)) {
      this.store.delete(key)
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey)
      }
    }

    this.store.set(key, value)
  }
}
