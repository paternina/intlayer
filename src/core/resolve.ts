import { LRUCache } from '../utils/lru'

const resolverCache = new LRUCache<string, (target: unknown) => unknown>(10000)

/**
 * Reads a nested value by path, supporting dots and array indexes (`"users[0].name"`).
 *
 * @param path - Dotted/bracket path. An empty path returns `obj`.
 * @param obj - Object to read from.
 * @returns The value, or `undefined` if any segment is missing.
 */
export function resolve(path: string, obj: unknown): unknown {
  if (!path) {
    return obj
  }

  let getter = resolverCache.get(path)

  if (!getter) {
    const parts = path.split(/\.|\[|\]|'|"/).filter(Boolean)

    getter = (target) => {
      let current = target as any

      for (const part of parts) {
        current = current?.[part]

        if (current == null) {
          return undefined
        }
      }

      return current
    }

    resolverCache.set(path, getter)
  }

  return getter(obj)
}
