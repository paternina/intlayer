/** A message catalog value: a string, a nested catalog, or an array of those. */
export type MessageValue = string | Messages | MessageValue[]

/** A (possibly nested) catalog of messages, addressed by dotted keys such as `"auth.login.title"`. */
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

/**
 * The catalog shape required by a union of message keys. Falls back to {@link Messages} when `T` is a plain `string`.
 *
 * @typeParam T - Union of dotted message keys, e.g. `'hello' | 'auth.title'`.
 */
export type MessagesFromKeys<T extends string = string> = string extends T ? Messages : MergeUnion<PathToMessages<string, T>>

/** Recursively makes every property optional. */
export type DeepPartial<T> = T extends string
  ? T
  : T extends readonly (infer U)[]
    ? ReadonlyArray<DeepPartial<U>> | Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

/** Like {@link MessagesFromKeys}, but every key is optional (useful for partial or per-locale catalogs). */
export type PartialMessagesFromKeys<T extends string = string> = string extends T
  ? Messages
  : DeepPartial<MessagesFromKeys<T>>

/** Function that asynchronously returns the messages of one locale. */
export type LocaleLoader = () => Promise<Messages>

/** Lazy loaders keyed by locale, e.g. `{ es: () => import('./es.json') }`. */
export type LoaderMap = Record<string, LocaleLoader>

/**
 * Called when a key is missing from every locale in the chain.
 *
 * @param key - The missing key.
 * @param locale - The active locale.
 * @returns The text to use in place of the key.
 */
export type MissingKeyHandler = (key: string, locale: string) => string

/** Duration display style. `digital` renders `1:01:01`; the others render unit names. */
export type DurationStyle = 'digital' | 'narrow' | 'short' | 'long'

/** A duration split into units. Negative values mark the whole duration as negative. */
export interface DurationRecord {
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
}

/** A duration given as a number of seconds or as a {@link DurationRecord}. */
export type DurationInput = number | DurationRecord

/** Options for formatting a duration. */
export interface DurationOptions {
  /** Display style. Defaults to `'digital'`. */
  style?: DurationStyle
}

/** Named formats that messages can reference, e.g. `{value, number, budget}`. */
export interface CustomFormats {
  /** Named `Intl.NumberFormat` options. */
  number?: Record<string, Intl.NumberFormatOptions>
  /** Named `Intl.DateTimeFormat` options used by `{value, date, name}`. */
  date?: Record<string, Intl.DateTimeFormatOptions>
  /** Named `Intl.DateTimeFormat` options used by `{value, time, name}`. */
  time?: Record<string, Intl.DateTimeFormatOptions>
  /** Named duration options used by `{value, duration, name}`. */
  duration?: Record<string, DurationOptions>
}

/** Identifies the kind of problem reported by the message validator. */
export type MessageIssueCode =
  /** A `{` or `}` without its pair. */
  | 'unbalanced-brace'
  /** A `{}` placeholder with no name. */
  | 'empty-placeholder'
  /** A placeholder name that is missing or contains whitespace. */
  | 'invalid-argument-name'
  /** An argument type other than number, date, time, duration, plural, select or selectordinal. */
  | 'unknown-argument-type'
  /** A number/date/time/duration argument with a malformed style section. */
  | 'malformed-argument'
  /** A plural/select block with a missing comma, branch name, branch body or no branches. */
  | 'malformed-block'
  /** A plural branch that is not a plural category or an `=N` exact match, or a malformed `offset:`. */
  | 'invalid-branch'
  /** The same branch declared twice in one block. */
  | 'duplicate-branch'
  /** A plural/select block without the required `other` branch. */
  | 'missing-other'
  /** A style that is not built in, a skeleton, or a named format. */
  | 'unknown-style'
  /** An argument with a trailing comma but no style. */
  | 'empty-style'
  /** A `::` skeleton with nothing after it. */
  | 'empty-skeleton'
  /** A skeleton token that is not recognised. */
  | 'unknown-skeleton-token'
  /** A `#` outside a plural block (only reported with `strictHash`). */
  | 'hash-outside-plural'

/** A single problem found in a message. */
export interface MessageIssue {
  /** Machine-readable problem type. */
  code: MessageIssueCode
  /** Human-readable explanation. */
  message: string
  /** Dotted key of the offending message (empty for a bare string). */
  key: string
  /** Locale of the message when validating a locale map. */
  locale?: string
  /** Character offset of the problem inside the message. */
  offset: number
}

/** Options for {@link validateMessages} and the other validators. */
export interface ValidateMessagesOptions {
  /** Named formats to accept as valid styles. */
  formats?: CustomFormats
  /** Also report `#` used outside a plural block. */
  strictHash?: boolean
}

/** Result of validating a catalog. */
export interface ValidationResult {
  /** `true` when no issues were found. */
  valid: boolean
  /** All issues found, in discovery order. */
  issues: MessageIssue[]
}

/**
 * Options for {@link createI18n}.
 *
 * @typeParam T - Optional union of message keys, enabling typed keys and catalogs.
 */
export interface I18nOptions<T extends string = string> {
  /** Initial active locale, a BCP 47 tag such as `"en"` or `"es-MX"` (`_` is accepted). */
  locale: string
  /** Locale or ordered list of locales tried when a key is missing. The base language of `locale` is appended automatically. Defaults to `locale`. */
  fallbackLocale?: string | string[]
  /** Initial messages: a flat catalog for `locale`, or a map of locale to catalog. */
  messages?: MessagesFromKeys<T> | Record<string, PartialMessagesFromKeys<T>>
  /** Lazy loaders keyed by locale, invoked on demand by `setLocale` and `loadLocale`. */
  loaders?: LoaderMap
  /** Log a `console.warn` when a key is missing. Defaults to `false`. */
  warnOnMissingKey?: boolean
  /** Supplies the text returned for a missing key (instead of the key itself). */
  onMissingKey?: MissingKeyHandler
  /** Milliseconds before a loader is abandoned. `0` (default) disables the timeout. */
  loaderTimeout?: number
  /** Named formats usable inside messages. */
  formats?: CustomFormats
  /** ISO 4217 code used by the `currency` number style. Defaults to `'USD'`. */
  defaultCurrency?: string
  /** Default IANA time zone for `date`/`time` arguments and `i18n.date()`. */
  timeZone?: string
  /** Force `messages` to be read as a locale map (`true`) or a flat catalog (`false`). Auto-detected when omitted. */
  localeMap?: boolean
}

/**
 * Translates a key, interpolating ICU-style placeholders.
 * Returns the key (or the `onMissingKey` result) when no translation or default exists.
 *
 * @example
 * i18n.t('greeting', { name: 'Ana' })
 * i18n.t('missing', 'Fallback text')
 */
export type TranslateFunction<T extends string = string> = {
  (key: T, values?: Record<string, unknown>): string
  (key: T, defaultValue: string): string
  (key: T, values: Record<string, unknown>, defaultValue: string): string
}

/**
 * A translation instance returned by {@link createI18n}.
 * Every formatter accepts an optional `locale` that overrides the active one.
 *
 * @typeParam T - Union of known message keys (defaults to any string).
 */
export interface I18nInstance<T extends string = string> {
  /** Translates a key with optional values and/or a default text. */
  t: TranslateFunction<T>
  /**
   * Switches the active locale, loading it first if a loader is configured, then notifies subscribers.
   * If the load fails or times out the locale is unchanged. When calls overlap, the latest call wins.
   *
   * @param locale - BCP 47 tag.
   * @throws {RangeError} If `locale` is not a valid tag (the returned promise rejects).
   */
  setLocale: (locale: string) => Promise<void>
  /** Returns the active locale. */
  getLocale: () => string
  /** Returns a copy of the normalized fallback locale list. */
  getFallbackLocale: () => string[]
  /** Returns `'rtl'` when the active locale's language is registered as right-to-left, otherwise `'ltr'`. */
  getDirection: () => 'rtl' | 'ltr'
  /**
   * Registers a listener called with the active locale after `setLocale` or `mergeMessages`.
   *
   * @returns A function that removes the listener.
   */
  subscribe: (listener: (locale: string) => void) => () => void
  /** Removes listeners and pending loads, clears formatter caches and stops notifications. */
  destroy: () => void
  /** Formats a number with `Intl.NumberFormat`. */
  number: (value: number, options?: Intl.NumberFormatOptions, locale?: string) => string
  /**
   * Formats a date with `Intl.DateTimeFormat`, applying the instance `timeZone` unless `options.timeZone` is set.
   * Strings are parsed with `new Date(value)`.
   *
   * @throws {RangeError} If the value is not a valid date.
   */
  date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions, locale?: string) => string
  /** Formats a relative time such as "in 2 days" with `Intl.RelativeTimeFormat`. */
  relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions, locale?: string) => string
  /** Joins strings into a locale-aware list with `Intl.ListFormat`. */
  list: (value: readonly string[], options?: Intl.ListFormatOptions, locale?: string) => string
  /** Formats a duration given in seconds or as a unit record. Defaults to the `digital` style. */
  duration: (value: DurationInput, options?: DurationOptions, locale?: string) => string
  /** Compares two strings with `Intl.Collator`; returns a negative, zero or positive number. */
  compare: (a: string, b: string, options?: Intl.CollatorOptions, locale?: string) => number
  /**
   * Deep-merges messages and notifies subscribers.
   * A flat catalog is merged into the active locale; a locale map is merged per locale.
   */
  mergeMessages: (messages: PartialMessagesFromKeys<T> | Record<string, PartialMessagesFromKeys<T>>) => void
  /** Returns `true` if the key resolves to a string in the active locale or any fallback. */
  has: (key: T) => boolean
  /**
   * Loads a locale through its loader unless already loaded.
   *
   * @returns `true` if messages are available afterwards; `false` if there is no loader or it failed or timed out.
   */
  loadLocale: (locale: string) => Promise<boolean>
  /** Loads several locales in parallel and returns one `loadLocale` result per locale. */
  loadLocales: (locales: readonly string[]) => Promise<boolean[]>
  /** Returns the locales that currently have messages. */
  getLoadedLocales: () => string[]
  /** Returns the catalog of `locale` (default: the active locale), or `undefined` if not loaded. */
  getMessages: (locale?: string) => Messages | undefined
}
