export class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;
  private usage: K[];

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.usage = [];
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Update usage: move key to the end (most recently used)
      this.usage = this.usage.filter(k => k !== key);
      this.usage.push(key);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update value and usage
      this.cache.set(key, value);
      this.usage = this.usage.filter(k => k !== key);
      this.usage.push(key);
    } else {
      this.cache.set(key, value);
      this.usage.push(key);
      if (this.usage.length > this.maxSize) {
        // Remove the least recently used (the first in the usage array)
        const lruKey = this.usage.shift();
        if (lruKey !== undefined) {
          this.cache.delete(lruKey);
        }
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.usage = [];
  }

  size(): number {
    return this.cache.size;
  }
}