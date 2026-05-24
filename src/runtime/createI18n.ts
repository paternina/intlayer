import { compileMessage } from '../core/compile'
import { resolve } from '../core/resolve'
import type { I18nInstance, I18nOptions, LoaderMap, Messages } from '../types'

const localeKey = /^[a-z]{2,3}(?:[-_][A-Za-z0-9]+)?$/

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
  const fallbackLocale = options.fallbackLocale ?? locale
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

    const promise = Promise.resolve()
      .then(() => loader())
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
    const fromLocale = currentLocale
    const source = resolveText(key, fromLocale) ?? resolveText(key, fallbackLocale)

    if (!source) {
      return key
    }

    return compileMessage(source)(values, fromLocale)
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
    destroyed = true
  }

  function formatNumber(value: number, options?: Intl.NumberFormatOptions, localeOverride?: string) {
    return new Intl.NumberFormat(localeOverride ?? currentLocale, options).format(value)
  }

  function formatDate(value: Date | number | string, options?: Intl.DateTimeFormatOptions, localeOverride?: string) {
    const date = typeof value === 'string' ? new Date(value) : value
    return new Intl.DateTimeFormat(localeOverride ?? currentLocale, options).format(date)
  }

  function formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
    localeOverride?: string
  ) {
    return new Intl.RelativeTimeFormat(localeOverride ?? currentLocale, options).format(value, unit)
  }

  return {
    t: translate,
    setLocale,
    getLocale,
    getFallbackLocale,
    subscribe,
    destroy,
    number: formatNumber,
    date: formatDate,
    relativeTime: formatRelativeTime
  }
}
