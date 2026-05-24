const resolverCache = new Map<string, (target: unknown) => unknown>()

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
