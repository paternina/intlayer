import { LRUCache } from '../utils/lru'

const resolverCache = new LRUCache<string, (target: unknown) => unknown>(1000)

export function resolve(path: string, obj: unknown): unknown {
  if (!path) {
    return obj
  }

  let getter = resolverCache.get(path)

  if (!getter) {
    const parts = path.split('.')

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
