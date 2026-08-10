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

export type DeepPartial<T> = T extends string
  ? T
  : T extends readonly (infer U)[]
    ? ReadonlyArray<DeepPartial<U>> | Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

export type PartialMessagesFromKeys<T extends string = string> = string extends T
  ? Messages
  : DeepPartial<MessagesFromKeys<T>>

export type LocaleLoader = () => Promise<Messages>

export type LoaderMap = Record<string, LocaleLoader>

export type MissingKeyHandler = (key: string, locale: string) => string

export type DurationStyle = 'digital' | 'narrow' | 'short' | 'long'

export interface DurationRecord {
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
}

export type DurationInput = number | DurationRecord

export interface DurationOptions {
  style?: DurationStyle
}

export interface CustomFormats {
  number?: Record<string, Intl.NumberFormatOptions>
  date?: Record<string, Intl.DateTimeFormatOptions>
  time?: Record<string, Intl.DateTimeFormatOptions>
  duration?: Record<string, DurationOptions>
}

export type MessageIssueCode =
  | 'unbalanced-brace'
  | 'empty-placeholder'
  | 'invalid-argument-name'
  | 'unknown-argument-type'
  | 'malformed-argument'
  | 'malformed-block'
  | 'invalid-branch'
  | 'duplicate-branch'
  | 'missing-other'
  | 'unknown-style'
  | 'empty-style'
  | 'empty-skeleton'
  | 'unknown-skeleton-token'
  | 'hash-outside-plural'

export interface MessageIssue {
  code: MessageIssueCode
  message: string
  key: string
  locale?: string
  offset: number
}

export interface ValidateMessagesOptions {
  formats?: CustomFormats
  strictHash?: boolean
}

export interface ValidationResult {
  valid: boolean
  issues: MessageIssue[]
}

export interface I18nOptions<T extends string = string> {
  locale: string
  fallbackLocale?: string | string[]
  messages?: MessagesFromKeys<T> | Record<string, PartialMessagesFromKeys<T>>
  loaders?: LoaderMap
  warnOnMissingKey?: boolean
  onMissingKey?: MissingKeyHandler
  loaderTimeout?: number
  formats?: CustomFormats
  defaultCurrency?: string
  timeZone?: string
  localeMap?: boolean
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
  duration: (value: DurationInput, options?: DurationOptions, locale?: string) => string
  compare: (a: string, b: string, options?: Intl.CollatorOptions, locale?: string) => number
  mergeMessages: (messages: PartialMessagesFromKeys<T> | Record<string, PartialMessagesFromKeys<T>>) => void
  has: (key: T) => boolean
  loadLocale: (locale: string) => Promise<boolean>
  loadLocales: (locales: readonly string[]) => Promise<boolean[]>
  getLoadedLocales: () => string[]
  getMessages: (locale?: string) => Messages | undefined
}
