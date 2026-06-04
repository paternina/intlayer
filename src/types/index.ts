export type MessageValue = string | Messages | MessageValue[]

export interface Messages {
  [key: string]: MessageValue
}

export type LocaleLoader = () => Promise<Messages>

export type LoaderMap = Record<string, LocaleLoader>

export interface I18nOptions {
  locale: string
  fallbackLocale?: string | string[]
  messages?: Messages | Record<string, Messages>
  loaders?: LoaderMap
  warnOnMissingKey?: boolean
  loaderTimeout?: number
}

export type TranslateFunction<T extends string = string> = {
  (key: T, values?: Record<string, unknown>): string
  (key: T, defaultValue: string): string
}

export interface I18nInstance<T extends string = string> {
  t: TranslateFunction<T>
  setLocale: (locale: string) => Promise<void>
  getLocale: () => string
  getFallbackLocale: () => string | string[]
  getDirection: () => 'rtl' | 'ltr'
  subscribe: (listener: (locale: string) => void) => () => void
  destroy: () => void
  number: (value: number, options?: Intl.NumberFormatOptions, locale?: string) => string
  date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions, locale?: string) => string
  relativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
    locale?: string
  ) => string
  mergeMessages: (messages: Messages | Record<string, Messages>) => void
  has: (key: T) => boolean
}
