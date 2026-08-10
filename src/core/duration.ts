import { LRUCache } from '../utils/lru'
import { getCachedFormatter } from '../utils/intl'
import type { CustomFormats, DurationInput, DurationOptions, DurationRecord, DurationStyle } from '../types'

interface NativeDurationFormat {
  format: (value: Record<string, number>) => string
}

type NativeDurationFormatConstructor = new (
  locale: string,
  options: { style: DurationStyle }
) => NativeDurationFormat

const unitOrder = ['days', 'hours', 'minutes', 'seconds'] as const

const unitNames: Record<(typeof unitOrder)[number], string> = {
  days: 'day',
  hours: 'hour',
  minutes: 'minute',
  seconds: 'second'
}

const secondsPerUnit: Record<(typeof unitOrder)[number], number> = {
  days: 86400,
  hours: 3600,
  minutes: 60,
  seconds: 1
}

export const durationStyles: readonly DurationStyle[] = ['digital', 'narrow', 'short', 'long']

function getNativeDurationFormat(): NativeDurationFormatConstructor | undefined {
  const candidate = (Intl as unknown as { DurationFormat?: NativeDurationFormatConstructor }).DurationFormat
  return typeof candidate === 'function' ? candidate : undefined
}

export function normalizeDuration(value: DurationInput): { record: DurationRecord; negative: boolean } {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { record: {}, negative: false }
    }

    const negative = value < 0
    let remaining = Math.abs(value)
    const record: DurationRecord = {}

    for (const unit of unitOrder) {
      if (unit === 'seconds') {
        const seconds = Math.round(remaining * 1000) / 1000
        if (seconds > 0 || Object.keys(record).length === 0) {
          record.seconds = seconds
        }
        continue
      }

      const size = secondsPerUnit[unit]
      const amount = Math.floor(remaining / size)

      if (amount > 0) {
        record[unit] = amount
        remaining -= amount * size
      }
    }

    return { record, negative }
  }

  const record: DurationRecord = {}
  let negative = false

  for (const unit of unitOrder) {
    const amount = value[unit]

    if (typeof amount === 'number' && Number.isFinite(amount) && amount !== 0) {
      if (amount < 0) {
        negative = true
      }
      record[unit] = Math.abs(amount)
    }
  }

  if (Object.keys(record).length === 0) {
    record.seconds = 0
  }

  return { record, negative }
}

function formatDigital(
  record: DurationRecord,
  locale: string,
  cache: LRUCache<string, Intl.NumberFormat>,
  listCache: LRUCache<string, Intl.ListFormat>
): string {
  const plain: Intl.NumberFormatOptions = { useGrouping: false, maximumFractionDigits: 3 }
  const padded: Intl.NumberFormatOptions = { useGrouping: false, minimumIntegerDigits: 2, maximumFractionDigits: 3 }

  const plainFormatter = getCachedFormatter(cache, locale, plain, () => new Intl.NumberFormat(locale, plain))
  const paddedFormatter = getCachedFormatter(cache, locale, padded, () => new Intl.NumberFormat(locale, padded))

  const days = record.days ?? 0
  const hours = record.hours ?? 0
  const minutes = record.minutes ?? 0
  const seconds = record.seconds ?? 0
  const clock = `${plainFormatter.format(hours)}:${paddedFormatter.format(minutes)}:${paddedFormatter.format(seconds)}`

  if (days > 0) {
    const dayOptions: Intl.NumberFormatOptions = { style: 'unit', unit: 'day', unitDisplay: 'short' }
    const dayFormatter = getCachedFormatter(cache, locale, dayOptions, () => new Intl.NumberFormat(locale, dayOptions))
    const listOptions: Intl.ListFormatOptions = { style: 'short', type: 'unit' }
    const listFormatter = getCachedFormatter(listCache, locale, listOptions, () => new Intl.ListFormat(locale, listOptions))

    return listFormatter.format([dayFormatter.format(days), clock])
  }

  return clock
}

function formatUnits(
  record: DurationRecord,
  locale: string,
  style: Exclude<DurationStyle, 'digital'>,
  numberCache: LRUCache<string, Intl.NumberFormat>,
  listCache: LRUCache<string, Intl.ListFormat>
): string {
  const unitDisplay = style === 'narrow' ? 'narrow' : style === 'short' ? 'short' : 'long'
  const parts: string[] = []

  for (const unit of unitOrder) {
    const amount = record[unit]

    if (amount === undefined) {
      continue
    }

    const options: Intl.NumberFormatOptions = {
      style: 'unit',
      unit: unitNames[unit],
      unitDisplay,
      maximumFractionDigits: 3
    }

    const formatter = getCachedFormatter(numberCache, locale, options, () => new Intl.NumberFormat(locale, options))
    parts.push(formatter.format(amount))
  }

  if (parts.length === 0) {
    return ''
  }

  const listOptions: Intl.ListFormatOptions = { style, type: 'unit' }
  const listFormatter = getCachedFormatter(listCache, locale, listOptions, () => new Intl.ListFormat(locale, listOptions))

  return listFormatter.format(parts)
}

export function formatDuration(
  value: DurationInput,
  locale: string,
  style: DurationStyle,
  caches: {
    duration: LRUCache<string, NativeDurationFormat>
    number: LRUCache<string, Intl.NumberFormat>
    list: LRUCache<string, Intl.ListFormat>
  }
): string {
  const { record, negative } = normalizeDuration(value)

  if (Object.keys(record).length === 0) {
    return ''
  }

  let text: string
  const Native = getNativeDurationFormat()
  const isZero = unitOrder.every((unit) => (record[unit] ?? 0) === 0)

  if (Native && !isZero) {
    const options = { style }
    const formatter = getCachedFormatter(caches.duration, locale, options, () => new Native(locale, options))
    text = formatter.format(record as Record<string, number>)
  } else if (style === 'digital') {
    text = formatDigital(record, locale, caches.number, caches.list)
  } else {
    text = formatUnits(record, locale, style, caches.number, caches.list)
  }

  return negative && text ? `-${text}` : text
}

export function resolveDurationOptions(
  style: string | undefined,
  formats: CustomFormats | undefined
): DurationOptions {
  if (!style) {
    return { style: 'digital' }
  }

  const custom = formats?.duration?.[style]

  if (custom) {
    return { style: custom.style ?? 'digital' }
  }

  return { style: (durationStyles as readonly string[]).includes(style) ? (style as DurationStyle) : 'digital' }
}
