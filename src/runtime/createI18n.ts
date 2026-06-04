import { compileMessage } from '../core/compile'
import { resolve } from '../core/resolve'
import { isRTL } from '../utils/rtl'
import type { I18nInstance, I18nOptions, LoaderMap, Messages } from '../types'
import { LRUCache } from '../utils/lru'

const localeKey = /^[a-z]{2,3}(?:[-_][A-Za-z0-9]+)?$/

function buildIntlCacheKey(locale: string, options?: Record<string, unknown> | Intl.NumberFormatOptions | Intl.DateTimeFormatOptions | Intl.RelativeTimeFormatOptions): string {
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
  const primaryLower = primary.toLowerCase()
  const base = primary.split(/[-_]/)[0] ?? primary
  const baseLower = base.toLowerCase()
  const result: string[] = []
  const seen = new Set<string>()

  for (const loc of items) {
    const lower = loc.toLowerCase()
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

export function createI18n<T extends string = string>(options: I18nOptions): I18nInstance<T> {
  const locale = options.locale
  const fallbackLocaleRaw = options.fallbackLocale ?? locale
  const fallbackLocale = normalizeFallback(fallbackLocaleRaw, locale)
  const warnOnMissingKey = options.warnOnMissingKey ?? false
  const loaderTimeout = options.loaderTimeout ?? 0
  const loaders: LoaderMap = options.loaders ?? {}
  const loaded = new Map<string, Messages>()
  const pending = new Map<string, Promise<void>>()
  const listeners = new Set<(locale: string) => void>()
  let currentLocale = locale
  let destroyed = false

  const numberFormatCache = new LRUCache<string, Intl.NumberFormat>(1000)
  const dateTimeFormatCache = new LRUCache<string, Intl.DateTimeFormat>(1000)
  const relativeTimeFormatCache = new LRUCache<string, Intl.RelativeTimeFormat>(1000)
  const pluralRulesCache = new LRUCache<string, Intl.PluralRules>(1000)

  function isLocaleMap(value: unknown): value is Record<string, Messages> {
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

  if (isInitialLocaleMap) {
    for (const [name, messages] of Object.entries(initialMessages)) {
      if (typeof messages === 'object' && messages !== null) {
        loaded.set(name, messages)
      }
    }
  } else if (typeof initialMessages === 'object' && initialMessages !== null) {
    loaded.set(locale, initialMessages as Messages)
  }

  function getMessagesFor(targetLocale: string): Messages | undefined {
    const loadedMessages = loaded.get(targetLocale)
    if (loadedMessages) {
      return loadedMessages
    }
    if (isInitialLocaleMap) {
      const map = initialMessages as Record<string, Messages>
      return map[targetLocale]
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

  async function loadLocale(localeToLoad: string): Promise<void> {
    if (loaded.has(localeToLoad)) {
      return
    }

    const pendingLoad = pending.get(localeToLoad)
    if (pendingLoad) {
      return pendingLoad
    }

    const loader = loaders[localeToLoad]
    if (!loader) {
      return
    }

    const promise = (async () => {
      const loaderPromise = Promise.resolve(loader())

      if (loaderTimeout <= 0) {
        const messages = await loaderPromise
        if (typeof messages === 'object' && messages !== null) {
          loaded.set(localeToLoad, messages)
        }
        return
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`[intlayer] Loader timeout for locale "${localeToLoad}" after ${loaderTimeout}ms`))
        }, loaderTimeout)
      })

      try {
        const messages = await Promise.race([loaderPromise, timeoutPromise])
        if (typeof messages === 'object' && messages !== null) {
          loaded.set(localeToLoad, messages)
        }
      } catch (error) {
        console.warn(`[intlayer] Failed to load locale "${localeToLoad}":`, error)
      }
    })().finally(() => {
      pending.delete(localeToLoad)
    })

    pending.set(localeToLoad, promise)
    return promise
  }

  function notify() {
    if (destroyed) {
      return
    }

    for (const listener of Array.from(listeners)) {
      listener(currentLocale)
    }
  }

  function translate(key: T, secondArg?: Record<string, unknown> | string): string {
    let values: Record<string, unknown> = {}
    let defaultValue: string | undefined
    
    if (typeof secondArg === 'string') {
      defaultValue = secondArg
    } else {
      values = secondArg ?? {}
    }
    
    const locales = [currentLocale, ...fallbackLocale]
    let source: string | undefined
    let sourceLocale = currentLocale

    for (const locale of locales) {
      const result = resolveTextWithLocale(key, locale)
      if (result.text) {
        source = result.text
        sourceLocale = result.locale
        break
      }
    }

    if (!source) {
      if (warnOnMissingKey) {
        console.warn(`[intlayer] Missing translation key: "${key}" for locale "${currentLocale}"`)
      }
      return defaultValue ?? key
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

    if (loaders[newLocale] && !loaded.has(newLocale)) {
      await loadLocale(newLocale)
      if (!loaded.has(newLocale)) {
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
    pluralRulesCache.clear()
    destroyed = true
  }

  function getDirection() {
    return isRTL(getLocale()) ? 'rtl' : 'ltr'
  }

  function formatNumber(value: number, options?: Intl.NumberFormatOptions, localeOverride?: string) {
    const locale = localeOverride ?? currentLocale
    const key = buildIntlCacheKey(locale, options as Record<string, unknown> | undefined)
    let formatter = numberFormatCache.get(key)
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, options)
      numberFormatCache.set(key, formatter)
    }
    return formatter.format(value)
  }

  function formatDate(value: Date | number | string, options?: Intl.DateTimeFormatOptions, localeOverride?: string) {
    const locale = localeOverride ?? currentLocale
    const key = buildIntlCacheKey(locale, options as Record<string, unknown> | undefined)
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

  function mergeMessages(messages: Messages | Record<string, Messages>) {
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
    mergeMessages,
    has: hasTranslation
  }
}