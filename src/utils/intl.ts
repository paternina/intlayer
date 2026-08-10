import { LRUCache } from './lru'

export type IntlFormatOptions =
  | Record<string, unknown>
  | Intl.NumberFormatOptions
  | Intl.DateTimeFormatOptions
  | Intl.RelativeTimeFormatOptions
  | Intl.ListFormatOptions
  | Intl.CollatorOptions

export function buildIntlCacheKey(locale: string, options?: IntlFormatOptions): string {
  if (!options) {
    return locale
  }

  const keys = Object.keys(options as Record<string, unknown>).sort()

  if (keys.length === 0) {
    return locale
  }

  const parts: string[] = [locale]

  for (const key of keys) {
    parts.push(`${key}=${(options as Record<string, unknown>)[key]}`)
  }

  return parts.join('&')
}

export function getCachedFormatter<T>(
  cache: LRUCache<string, T>,
  locale: string,
  options: IntlFormatOptions | undefined,
  create: () => T
): T {
  const key = buildIntlCacheKey(locale, options)
  let formatter = cache.get(key)

  if (!formatter) {
    formatter = create()
    cache.set(key, formatter)
  }

  return formatter
}
