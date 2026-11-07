import type { CustomFormats } from '../types'

const numberStyleCache = new Map<string, Intl.NumberFormatOptions>()
const dateSkeletonCache = new Map<string, Intl.DateTimeFormatOptions>()

const builtinDateStyles: Record<string, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short' },
  medium: { dateStyle: 'medium' },
  long: { dateStyle: 'long' },
  full: { dateStyle: 'full' }
}

const builtinTimeStyles: Record<string, Intl.DateTimeFormatOptions> = {
  short: { timeStyle: 'short' },
  medium: { timeStyle: 'medium' },
  long: { timeStyle: 'long' },
  full: { timeStyle: 'full' }
}

const dateFieldPatterns: Array<[RegExp, (length: number) => Intl.DateTimeFormatOptions]> = [
  [/^G+/, (length) => ({ era: length >= 4 ? 'long' : length === 5 ? 'narrow' : 'short' })],
  [/^y+/, (length) => ({ year: length === 2 ? '2-digit' : 'numeric' })],
  [/^M+/, (length) => ({ month: length >= 4 ? (length === 5 ? 'narrow' : 'long') : length === 3 ? 'short' : length === 2 ? '2-digit' : 'numeric' })],
  [/^L+/, (length) => ({ month: length >= 4 ? (length === 5 ? 'narrow' : 'long') : length === 3 ? 'short' : length === 2 ? '2-digit' : 'numeric' })],
  [/^d+/, (length) => ({ day: length === 2 ? '2-digit' : 'numeric' })],
  [/^E+/, (length) => ({ weekday: length >= 4 ? 'long' : length === 5 ? 'narrow' : 'short' })],
  [/^e+/, (length) => ({ weekday: length >= 4 ? 'long' : 'short' })],
  [/^h+/, (length) => ({ hour: length === 2 ? '2-digit' : 'numeric', hour12: true })],
  [/^H+/, (length) => ({ hour: length === 2 ? '2-digit' : 'numeric', hour12: false })],
  [/^K+/, (length) => ({ hour: length === 2 ? '2-digit' : 'numeric', hour12: true })],
  [/^k+/, (length) => ({ hour: length === 2 ? '2-digit' : 'numeric', hour12: false })],
  [/^m+/, (length) => ({ minute: length === 2 ? '2-digit' : 'numeric' })],
  [/^s+/, (length) => ({ second: length === 2 ? '2-digit' : 'numeric' })],
  [/^S+/, (length) => ({ fractionalSecondDigits: Math.min(length, 3) as 1 | 2 | 3 })],
  [/^z+/, (length) => ({ timeZoneName: length >= 4 ? 'long' : 'short' })],
  [/^v+/, (length) => ({ timeZoneName: length >= 4 ? 'long' : 'short' })],
  [/^a+/, () => ({ hour12: true })]
]

function parseFractionPattern(token: string): Intl.NumberFormatOptions | undefined {
  const match = token.match(/^\.(0*)(#*)$/)

  if (!match) {
    return undefined
  }

  const min = match[1]?.length ?? 0
  const max = min + (match[2]?.length ?? 0)

  return { minimumFractionDigits: min, maximumFractionDigits: max }
}

function parseNumberSkeletonToken(token: string): Intl.NumberFormatOptions | undefined {
  const [head = '', argument] = token.split('/')

  switch (head) {
    case 'percent':
      return { style: 'percent' }
    case 'currency':
      return argument ? { style: 'currency', currency: argument.toUpperCase() } : undefined
    case 'unit':
      return argument ? { style: 'unit', unit: argument } : undefined
    case 'compact-short':
      return { notation: 'compact', compactDisplay: 'short' }
    case 'compact-long':
      return { notation: 'compact', compactDisplay: 'long' }
    case 'scientific':
      return { notation: 'scientific' }
    case 'engineering':
      return { notation: 'engineering' }
    case 'precision-integer':
      return { maximumFractionDigits: 0, minimumFractionDigits: 0 }
    case 'group-off':
      return { useGrouping: false }
    case 'group-auto':
      return { useGrouping: true }
    case 'sign-always':
      return { signDisplay: 'always' }
    case 'sign-never':
      return { signDisplay: 'never' }
    case 'sign-except-zero':
      return { signDisplay: 'exceptZero' }
    case 'sign-accounting':
      return { currencySign: 'accounting' }
    case 'integer-width': {
      const digits = argument?.match(/0+$/)?.[0]?.length
      return digits ? { minimumIntegerDigits: digits } : undefined
    }
    default:
      return parseFractionPattern(head)
  }
}

/** Tells whether a single `::` number skeleton token (e.g. `percent`, `currency/EUR`, `.00`) is supported. */
export function isKnownNumberSkeletonToken(token: string): boolean {
  return parseNumberSkeletonToken(token) !== undefined
}

/** Converts a number skeleton (the text after `::`) into `Intl.NumberFormat` options; unknown tokens are ignored. */
export function parseNumberSkeleton(skeleton: string): Intl.NumberFormatOptions {
  const cached = numberStyleCache.get(skeleton)

  if (cached) {
    return cached
  }

  const options: Intl.NumberFormatOptions = {}

  for (const token of skeleton.split(/\s+/)) {
    if (!token) {
      continue
    }

    const parsed = parseNumberSkeletonToken(token)

    if (parsed) {
      Object.assign(options, parsed)
    }
  }

  numberStyleCache.set(skeleton, options)
  return options
}

/** Converts a date/time skeleton (the text after `::`, e.g. `yyyyMMdd`) into `Intl.DateTimeFormat` options. */
export function parseDateSkeleton(skeleton: string): Intl.DateTimeFormatOptions {
  const cached = dateSkeletonCache.get(skeleton)

  if (cached) {
    return cached
  }

  const options: Intl.DateTimeFormatOptions = {}
  let cursor = 0

  while (cursor < skeleton.length) {
    const rest = skeleton.slice(cursor)
    let matched = false

    for (const [pattern, build] of dateFieldPatterns) {
      const match = rest.match(pattern)

      if (match) {
        Object.assign(options, build(match[0].length))
        cursor += match[0].length
        matched = true
        break
      }
    }

    if (!matched) {
      cursor += 1
    }
  }

  dateSkeletonCache.set(skeleton, options)
  return options
}

/** Resolves a message's number style (custom name, `::` skeleton, `integer`, `percent`, `currency`) to `Intl` options. */
export function resolveNumberOptions(
  style: string | undefined,
  formats: CustomFormats | undefined,
  defaultCurrency: string | undefined
): Intl.NumberFormatOptions | undefined {
  if (!style) {
    return undefined
  }

  const custom = formats?.number?.[style]

  if (custom) {
    return custom
  }

  if (style.startsWith('::')) {
    return parseNumberSkeleton(style.slice(2))
  }

  switch (style) {
    case 'integer':
      return { maximumFractionDigits: 0 }
    case 'percent':
      return { style: 'percent' }
    case 'currency':
      return { style: 'currency', currency: defaultCurrency ?? 'USD' }
    default:
      return undefined
  }
}

/** Resolves a message's date or time style (custom name, `::` skeleton, short/medium/long/full) to `Intl` options; defaults to `medium`. */
export function resolveDateOptions(
  style: string | undefined,
  formats: CustomFormats | undefined,
  kind: 'date' | 'time'
): Intl.DateTimeFormatOptions | undefined {
  const table = kind === 'date' ? formats?.date : formats?.time
  const defaults = kind === 'date' ? builtinDateStyles.medium : builtinTimeStyles.medium

  if (!style) {
    return defaults
  }

  const custom = table?.[style]

  if (custom) {
    return custom
  }

  if (style.startsWith('::')) {
    return parseDateSkeleton(style.slice(2))
  }

  const builtin = kind === 'date' ? builtinDateStyles[style] : builtinTimeStyles[style]

  return builtin ?? defaults
}
