export type MessageValue = string | Messages | MessageValue[]

export interface Messages {
  [key: string]: MessageValue
}

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never

type MergeUnion<T> = UnionToIntersection<T>

type SegmentName<S extends string> = S extends `${infer Base}[${number}]` ? Base : S

type ArrayPathMessages<T, Tail extends string> =
  Tail extends `.${infer Rest}`
    ? Array<PathToMessages<T, Rest>>
    : Tail extends ''
      ? T[]
      : Array<PathToMessages<T, Tail>>

type PathToMessages<T, P extends string> =
  P extends `${infer Head}[${number}]${infer Tail}`
    ? { [K in SegmentName<Head>]: ArrayPathMessages<T, Tail> }
    : P extends `${infer Head}.${infer Tail}`
      ? { [K in SegmentName<Head>]: PathToMessages<T, Tail> }
      : { [K in P]: T }

export type MessagesFromKeys<T extends string = string> = string extends T ? Messages : MergeUnion<PathToMessages<string, T>>

export type LocaleLoader = () => Promise<Messages>

export type LoaderMap = Record<string, LocaleLoader>

export type MissingKeyHandler = (key: string, locale: string) => string

export interface I18nOptions<T extends string = string> {
  locale: string
  fallbackLocale?: string | string[]
  messages?: MessagesFromKeys<T> | Record<string, MessagesFromKeys<T>>
  loaders?: LoaderMap
  warnOnMissingKey?: boolean
  onMissingKey?: MissingKeyHandler
  loaderTimeout?: number
}

export type TranslateFunction<T extends string = string> = {
  (key: T, values?: Record<string, unknown>): string
  (key: T, defaultValue: string): string
  (key: T, values: Record<string, unknown>, defaultValue: string): string
}

export interface I18nInstance<T extends string = string> {
  t: TranslateFunction<T>
  setLocale: (locale: string) => Promise<void>
  getLocale: () => string
  getFallbackLocale: () => string[]
  getDirection: () => 'rtl' | 'ltr'
  subscribe: (listener: (locale: string) => void) => () => void
  destroy: () => void
  number: (value: number, options?: Intl.NumberFormatOptions, locale?: string) => string
  date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions, locale?: string) => string
  relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions, locale?: string) => string
  list: (value: readonly string[], options?: Intl.ListFormatOptions, locale?: string) => string
  compare: (a: string, b: string, options?: Intl.CollatorOptions, locale?: string) => number
  mergeMessages: (messages: MessagesFromKeys<T> | Record<string, MessagesFromKeys<T>>) => void
  has: (key: T) => boolean
  loadLocale: (locale: string) => Promise<boolean>
  loadLocales: (locales: readonly string[]) => Promise<boolean[]>
  getLoadedLocales: () => string[]
  getMessages: (locale?: string) => Messages | undefined
}
