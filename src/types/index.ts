export interface Messages {
  [key: string]: string | Messages
}

export type LocaleLoader = () => Promise<Messages>

export type LoaderMap = Record<string, LocaleLoader>

export interface I18nOptions<M extends Messages = Messages> {
  locale: string
  fallbackLocale?: string | string[]
  messages?: M | Record<string, M>
  loaders?: LoaderMap
  warnOnMissingKey?: boolean
  loaderTimeout?: number
}

export interface I18nInstance<M extends Messages = Messages> {
  t: (key: string, values?: Record<string, unknown>) => string
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
}
