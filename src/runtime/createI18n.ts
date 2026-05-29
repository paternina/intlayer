import { compileMessage } from '../core/compile'
import { resolve } from '../core/resolve'
import { isRTL } from '../browser/rtl'
import type { I18nInstance, I18nOptions, LoaderMap, Messages } from '../types'
import { LRUCache } from '../utils/lru'

const localeKey = /^[a-z]{2,3}(?:[-_][A-Za-z0-9]+)?$/

// Caches for Intl formatters
const numberFormatCache = new LRUCache<string, Intl.NumberFormat>(1000)
const dateTimeFormatCache = new LRUCache<string, Intl.DateTimeFormat>(1000)
const relativeTimeFormatCache = new LRUCache<string, Intl.RelativeTimeFormat>(1000)

function isLocaleMap(value: unknown): value is Record<string, Messages> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((key) => localeKey.test(key)) &&
    Object.values(value).every((item) => typeof item === 'object' && item !== null)
  )
}

export function createI18n(options: I18nOptions): I18nInstance {
  const locale = options.locale
  const fallbackLocaleRaw = options.fallbackLocale ?? locale
  const fallbackLocale = Array.isArray(fallbackLocaleRaw)
    ? fallbackLocaleRaw
    : [fallbackLocaleRaw]
  const loaders: LoaderMap = options.loaders ?? {}
  const loaded = new Map<string, Messages>()
  const pending = new Map<string, Promise<void>>()
  const listeners = new Set<(locale: string) => void>()
  let currentLocale = locale
  let destroyed = false

  const initialMessages = options.messages ?? {}

  if (isLocaleMap(initialMessages)) {
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

    if (isLocaleMap(initialMessages)) {
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

     const promise = Promise.resolve(loader())
       .then((messages) => {
         if (typeof messages === 'object' && messages !== null) {
           loaded.set(localeToLoad, messages)
         }
       })
       .finally(() => {
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

  function translate(key: string, values: Record<string, unknown> = {}): string {
    const locales = [currentLocale, ...fallbackLocale]
    let source: string | undefined
    for (const locale of locales) {
      source = resolveText(key, locale)
      if (source) break
    }

    if (!source) {
      return key
    }

    return compileMessage(source)(values, currentLocale)
  }

  async function setLocale(newLocale: string): Promise<void> {
    if (newLocale === currentLocale) {
      return
    }

    if (loaders[newLocale] && !loaded.has(newLocale)) {
      await loadLocale(newLocale)
    }

    currentLocale = newLocale
    notify()
  }

  function getLocale() {
    return currentLocale
  }

   function getFallbackLocale() {
     return fallbackLocaleRaw
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
     destroyed = true
   }

   function getDirection() {
     return isRTL(getLocale()) ? 'rtl' : 'ltr'
   }

   function formatNumber(value: number, options?: Intl.NumberFormatOptions, localeOverride?: string) {
    const locale = localeOverride ?? currentLocale
    const key = `${locale}-${JSON.stringify(options ?? {})}`
    let formatter = numberFormatCache.get(key)
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, options)
      numberFormatCache.set(key, formatter)
    }
    return formatter.format(value)
  }

  function formatDate(value: Date | number | string, options?: Intl.DateTimeFormatOptions, localeOverride?: string) {
    const locale = localeOverride ?? currentLocale
    const key = `${locale}-${JSON.stringify(options ?? {})}`
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
    const key = `${locale}-${JSON.stringify(options ?? {})}`
    let formatter = relativeTimeFormatCache.get(key)
    if (!formatter) {
      formatter = new Intl.RelativeTimeFormat(locale, options)
      relativeTimeFormatCache.set(key, formatter)
    }
    return formatter.format(value, unit)
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
     relativeTime: formatRelativeTime
   }
}
