import { compileMessage } from '../core/compile'
import { resolve } from '../core/resolve'
import { isRTL } from '../utils/rtl'
import type { I18nInstance, I18nOptions, LoaderMap, Messages, MessagesFromKeys } from '../types'
import { LRUCache } from '../utils/lru'

type IntlOptions = Record<string, unknown> | Intl.NumberFormatOptions | Intl.DateTimeFormatOptions | Intl.RelativeTimeFormatOptions | Intl.ListFormatOptions | Intl.CollatorOptions

const localeKey = /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i
const normalizeLocaleName = (locale: string) => locale.trim().replace(/_/g, '-').toLowerCase()

function buildIntlCacheKey(locale: string, options?: IntlOptions): string {
  if (!options || Object.keys(options as Record<string, unknown>).length === 0) {
    return locale
  }
  const keys = Object.keys(options as Record<string, unknown>).sort()
  const parts: string[] = [locale]
  for (const key of keys) {
    parts.push(`${key}=${(options as Record<string, unknown>)[key]}`)
  }
  return parts.join('&')
}

function deepMerge(target: Messages, source: Messages): Messages {
  const result: Messages = { ...target }
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = result[key]
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) && targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
      result[key] = deepMerge(targetValue as Messages, sourceValue as Messages)
    } else {
      result[key] = sourceValue as string | Messages
    }
  }
  return result
}

function normalizeFallback(raw: string | string[], primary: string): string[] {
  const items = Array.isArray(raw) ? [...raw] : [raw]
  const primaryLower = normalizeLocaleName(primary)
  const base = primary.split(/[-_]/)[0] ?? primary
  const baseLower = normalizeLocaleName(base)
  const result: string[] = []
  const seen = new Set<string>()

  for (const loc of items) {
    const lower = normalizeLocaleName(loc)
    if (lower === primaryLower) continue
    if (seen.has(lower)) continue
    seen.add(lower)
    result.push(loc)
  }

  if (baseLower !== primaryLower && !seen.has(baseLower)) {
    result.push(base)
  }

  return result.length > 0 ? result : [primary]
}

export function createI18n<T extends string = string>(options: I18nOptions<T>): I18nInstance<T> {
  const locale = options.locale
  const fallbackLocaleRaw = options.fallbackLocale ?? locale
  const fallbackLocale = normalizeFallback(fallbackLocaleRaw, locale)
  const warnOnMissingKey = options.warnOnMissingKey ?? false
  const onMissingKey = options.onMissingKey
  const loaderTimeout = options.loaderTimeout ?? 0
  const loaders: LoaderMap = options.loaders ?? {}
  const loaded = new Map<string, Messages>()
  const pending = new Map<string, Promise<boolean>>()
  const listeners = new Set<(locale: string) => void>()
  let currentLocale = locale
  let destroyed = false

  const numberFormatCache = new LRUCache<string, Intl.NumberFormat>(1000)
  const dateTimeFormatCache = new LRUCache<string, Intl.DateTimeFormat>(1000)
  const relativeTimeFormatCache = new LRUCache<string, Intl.RelativeTimeFormat>(1000)
  const listFormatCache = new LRUCache<string, Intl.ListFormat>(1000)
  const collatorCache = new LRUCache<string, Intl.Collator>(1000)
  const pluralRulesCache = new LRUCache<string, Intl.PluralRules>(1000)

  function isLocaleMap(value: unknown): value is Record<string, MessagesFromKeys<T>> {
    return (
      typeof value === 'object' &&
      value !== null &&
      Object.keys(value).length > 0 &&
      Object.keys(value).every((key) => localeKey.test(key)) &&
      Object.values(value).every((item) => typeof item === 'object' && item !== null)
    )
  }

  const initialMessages = options.messages ?? {}
  const isInitialLocaleMap = isLocaleMap(initialMessages)
  const initialLocaleMap = isInitialLocaleMap ? initialMessages : undefined

  if (isInitialLocaleMap) {
    for (const [name, messages] of Object.entries(initialMessages)) {
      if (typeof messages === 'object' && messages !== null) {
        loaded.set(name, messages as Messages)
      }
    }
  } else if (typeof initialMessages === 'object' && initialMessages !== null) {
    loaded.set(locale, initialMessages as Messages)
  }

  function findLocaleKey(targetLocale: string): string | undefined {
    const exact = loaded.get(targetLocale)
    if (exact) {
      return targetLocale
    }

    const normalized = normalizeLocaleName(targetLocale)
    for (const key of loaded.keys()) {
      if (normalizeLocaleName(key) === normalized) {
        return key
      }
    }

    return undefined
  }

  function findInitialLocaleKey(targetLocale: string): string | undefined {
    if (!initialLocaleMap) {
      return undefined
    }

    const exact = initialLocaleMap[targetLocale]
    if (exact) {
      return targetLocale
    }

    const normalized = normalizeLocaleName(targetLocale)
    for (const key of Object.keys(initialLocaleMap)) {
      if (normalizeLocaleName(key) === normalized) {
        return key
      }
    }

    return undefined
  }

  function getMessagesFor(targetLocale: string): Messages | undefined {
    const loadedKey = findLocaleKey(targetLocale)
    if (loadedKey) {
      return loaded.get(loadedKey)
    }

    const initialKey = findInitialLocaleKey(targetLocale)
    if (initialKey && initialLocaleMap) {
      return initialLocaleMap[initialKey] as Messages
    }

    return undefined
  }

  function resolveText(key: string, localeToUse: string): string | undefined {
    const messages = getMessagesFor(localeToUse)
    const result = resolve(key, messages)

    if (typeof result === 'string') {
      return result
    }

    return undefined
  }

  function resolveTextWithLocale(key: string, localeToUse: string): { text?: string; locale: string } {
    const messages = getMessagesFor(localeToUse)
    const result = resolve(key, messages)

    if (typeof result === 'string') {
      return { text: result, locale: localeToUse }
    }

    return { text: undefined, locale: localeToUse }
  }

  async function loadLocale(localeToLoad: string): Promise<boolean> {
    if (getMessagesFor(localeToLoad)) {
      return true
    }

    const pendingLoad = pending.get(localeToLoad)
    if (pendingLoad) {
      await pendingLoad
      return getMessagesFor(localeToLoad) !== undefined
    }

    const loader = loaders[localeToLoad]
    if (!loader) {
      return false
    }

    const promise = (async () => {
      const loaderPromise = Promise.resolve(loader())

      try {
        const messages = loaderTimeout > 0
          ? await Promise.race([
              loaderPromise,
              new Promise<never>((_, reject) => {
                setTimeout(() => {
                  reject(new Error(`[intlayer] Loader timeout for locale "${localeToLoad}" after ${loaderTimeout}ms`))
                }, loaderTimeout)
              })
            ])
          : await loaderPromise

        if (typeof messages === 'object' && messages !== null) {
          loaded.set(localeToLoad, messages)
          return true
        }

        return false
      } catch (error) {
        console.warn(`[intlayer] Failed to load locale "${localeToLoad}":`, error)
        return false
      }
    })().finally(() => {
      pending.delete(localeToLoad)
    })

    pending.set(localeToLoad, promise)
    return promise
  }

  async function loadLocales(locales: readonly string[]): Promise<boolean[]> {
    return Promise.all(locales.map((localeToLoad) => loadLocale(localeToLoad)))
  }

  function notify() {
    if (destroyed) {
      return
    }

    for (const listener of Array.from(listeners)) {
      listener(currentLocale)
    }
  }

  function translate(key: T, valuesOrDefault?: Record<string, unknown> | string, defaultValue?: string): string {
    let values: Record<string, unknown> = {}

    if (typeof valuesOrDefault === 'string') {
      defaultValue = valuesOrDefault
    } else {
      values = valuesOrDefault ?? {}
    }

    const locales = [currentLocale, ...fallbackLocale]
    let source: string | undefined
    let sourceLocale = currentLocale

    for (const locale of locales) {
      const result = resolveTextWithLocale(key, locale)
      if (typeof result.text === 'string') {
        source = result.text
        sourceLocale = result.locale
        break
      }
    }

    if (!source) {
      const missingValue = onMissingKey
        ? onMissingKey(String(key), currentLocale)
        : warnOnMissingKey
          ? (console.warn(`[intlayer] Missing translation key: "${key}" for locale "${currentLocale}"`), undefined)
          : undefined
      return defaultValue ?? missingValue ?? key
    }

    return compileMessage(source, pluralRulesCache)(values, sourceLocale)
  }

  function hasTranslation(key: T): boolean {
    const locales = [currentLocale, ...fallbackLocale]
    for (const locale of locales) {
      const messages = getMessagesFor(locale)
      const result = resolve(key, messages)
      if (typeof result === 'string') {
        return true
      }
    }
    return false
  }

  async function setLocale(newLocale: string): Promise<void> {
    if (newLocale === currentLocale) {
      return
    }

    if (loaders[newLocale] && !getMessagesFor(newLocale)) {
      const loadedLocale = await loadLocale(newLocale)
      if (!loadedLocale) {
        return
      }
    }

    currentLocale = newLocale
    notify()
  }

  function getLocale() {
    return currentLocale
  }

  function getFallbackLocale() {
    return fallbackLocale
  }

  function subscribe(listener: (locale: string) => void) {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  }

  function destroy() {
    listeners.clear()
    pending.clear()
    numberFormatCache.clear()
    dateTimeFormatCache.clear()
    relativeTimeFormatCache.clear()
    listFormatCache.clear()
    collatorCache.clear()
    pluralRulesCache.clear()
    destroyed = true
  }

  function getDirection() {
    return isRTL(getLocale()) ? 'rtl' : 'ltr'
  }

  function formatNumber(value: number, options?: Intl.NumberFormatOptions, localeOverride?: string) {
    const locale = localeOverride ?? currentLocale
    const key = buildIntlCacheKey(locale, options)
    let formatter = numberFormatCache.get(key)
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, options)
      numberFormatCache.set(key, formatter)
    }
    return formatter.format(value)
  }

  function formatDate(value: Date | number | string, options?: Intl.DateTimeFormatOptions, localeOverride?: string) {
    const locale = localeOverride ?? currentLocale
    const key = buildIntlCacheKey(locale, options)
    let formatter = dateTimeFormatCache.get(key)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, options)
      dateTimeFormatCache.set(key, formatter)
    }
    const date = typeof value === 'string' ? new Date(value) : value
    return formatter.format(date)
  }

  function formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
    localeOverride?: string
  ) {
    const locale = localeOverride ?? currentLocale
    const key = buildIntlCacheKey(locale, options)
    let formatter = relativeTimeFormatCache.get(key)
    if (!formatter) {
      formatter = new Intl.RelativeTimeFormat(locale, options)
      relativeTimeFormatCache.set(key, formatter)
    }
    return formatter.format(value, unit)
  }

  function formatList(value: readonly string[], options?: Intl.ListFormatOptions, localeOverride?: string) {
    const locale = localeOverride ?? currentLocale
    const key = buildIntlCacheKey(locale, options)
    let formatter = listFormatCache.get(key)
    if (!formatter) {
      formatter = new Intl.ListFormat(locale, options)
      listFormatCache.set(key, formatter)
    }
    return formatter.format(value)
  }

  function compareValues(a: string, b: string, options?: Intl.CollatorOptions, localeOverride?: string) {
    const locale = localeOverride ?? currentLocale
    const key = buildIntlCacheKey(locale, options)
    let formatter = collatorCache.get(key)
    if (!formatter) {
      formatter = new Intl.Collator(locale, options)
      collatorCache.set(key, formatter)
    }
    return formatter.compare(a, b)
  }

  function mergeMessages(messages: MessagesFromKeys<T> | Record<string, MessagesFromKeys<T>>) {
    if (isLocaleMap(messages)) {
      for (const [name, msgs] of Object.entries(messages)) {
        if (typeof msgs === 'object' && msgs !== null) {
          const existing = loaded.get(name) ?? {}
          loaded.set(name, deepMerge(existing, msgs as Messages))
        }
      }
    } else if (typeof messages === 'object' && messages !== null) {
      const existing = loaded.get(currentLocale) ?? {}
      loaded.set(currentLocale, deepMerge(existing, messages as Messages))
    }
    notify()
  }

  function getLoadedLocales() {
    return Array.from(loaded.keys())
  }

  function getMessages(targetLocale?: string) {
    return getMessagesFor(targetLocale ?? currentLocale)
  }

  return {
    t: translate,
    setLocale,
    getLocale,
    getFallbackLocale,
    getDirection,
    subscribe,
    destroy,
    number: formatNumber,
    date: formatDate,
    relativeTime: formatRelativeTime,
    list: formatList,
    compare: compareValues,
    mergeMessages,
    has: hasTranslation,
    loadLocale,
    loadLocales,
    getLoadedLocales,
    getMessages
  }
}
