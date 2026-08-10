import { afterEach, describe, expect, it } from 'vitest'
import { createI18n } from '../src/index'
import { formatDuration, normalizeDuration } from '../src/core/duration'
import { LRUCache } from '../src/utils/lru'
import type { DurationInput, DurationStyle } from '../src/types'

const normalize = (value: string) => value.replace(/\u00a0|\u202f/g, ' ')

describe('duration normalization', () => {
  it('splits a number of seconds into units', () => {
    expect(normalizeDuration(90).record).toEqual({ minutes: 1, seconds: 30 })
    expect(normalizeDuration(3661).record).toEqual({ hours: 1, minutes: 1, seconds: 1 })
    expect(normalizeDuration(90061).record).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 })
  })

  it('keeps zero as a seconds value rather than an empty record', () => {
    expect(normalizeDuration(0).record).toEqual({ seconds: 0 })
    expect(normalizeDuration({}).record).toEqual({ seconds: 0 })
  })

  it('tracks the sign separately and stores absolute amounts', () => {
    const negative = normalizeDuration(-90)

    expect(negative.negative).toBe(true)
    expect(negative.record).toEqual({ minutes: 1, seconds: 30 })
    expect(normalizeDuration(90).negative).toBe(false)
  })

  it('drops zero-valued units from an explicit record', () => {
    expect(normalizeDuration({ hours: 2, minutes: 0, seconds: 5 }).record).toEqual({ hours: 2, seconds: 5 })
  })

  it('ignores non-finite input', () => {
    expect(normalizeDuration(Number.NaN).record).toEqual({})
    expect(normalizeDuration(Number.POSITIVE_INFINITY).record).toEqual({})
  })

  it('preserves fractional seconds', () => {
    expect(normalizeDuration(1.5).record).toEqual({ seconds: 1.5 })
  })
})

describe('i18n.duration()', () => {
  it('formats seconds in digital style by default', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(i18n.duration(90)).toBe('0:01:30')
    expect(i18n.duration(3661)).toBe('1:01:01')
    expect(i18n.duration(5)).toBe('0:00:05')
  })

  it('accepts an explicit unit record', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(i18n.duration({ hours: 2, minutes: 5 })).toBe('2:05:00')
  })

  it('includes a days component when present', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(normalize(i18n.duration(90061))).toBe('1 day, 1:01:01')
  })

  it('renders a zero duration explicitly instead of an empty string', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(i18n.duration(0)).toBe('0:00:00')
    expect(normalize(i18n.duration(0, { style: 'long' }))).toBe('0 seconds')
  })

  it('supports narrow, short and long styles', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })
    const value = { hours: 1, minutes: 30 }

    expect(normalize(i18n.duration(value, { style: 'narrow' }))).toContain('1h')
    expect(normalize(i18n.duration(value, { style: 'short' }))).toMatch(/1\s*hr/)
    expect(normalize(i18n.duration(value, { style: 'long' }))).toMatch(/1 hour/)
  })

  it('prefixes negative durations with a minus sign', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(i18n.duration(-90)).toBe('-0:01:30')
  })

  it('accepts a locale override', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(normalize(i18n.duration({ hours: 1 }, { style: 'long' }, 'es'))).toMatch(/hora/)
  })

  it('returns an empty string for non-finite input', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(i18n.duration(Number.NaN)).toBe('')
  })

  it('keeps working after destroy clears the caches', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(i18n.duration(90)).toBe('0:01:30')
    i18n.destroy()
    expect(i18n.duration(90)).toBe('0:01:30')
  })
})

describe('{value, duration} message argument', () => {
  it('formats durations inside a message', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { elapsed: 'Elapsed: {time, duration}' } }
    })

    expect(i18n.t('elapsed', { time: 3661 })).toBe('Elapsed: 1:01:01')
  })

  it('supports built-in duration styles', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          digital: '{time, duration, digital}',
          long: '{time, duration, long}'
        }
      }
    })

    expect(i18n.t('digital', { time: 90 })).toBe('0:01:30')
    expect(normalize(i18n.t('long', { time: 3600 }))).toMatch(/1 hour/)
  })

  it('supports named duration formats', () => {
    const i18n = createI18n({
      locale: 'en',
      formats: { duration: { verbose: { style: 'long' } } },
      messages: { en: { elapsed: '{time, duration, verbose}' } }
    })

    expect(normalize(i18n.t('elapsed', { time: 3600 }))).toMatch(/1 hour/)
  })

  it('accepts records, numeric strings and numbers', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { elapsed: '{time, duration}' } }
    })

    expect(i18n.t('elapsed', { time: 90 })).toBe('0:01:30')
    expect(i18n.t('elapsed', { time: '90' })).toBe('0:01:30')
    expect(i18n.t('elapsed', { time: { minutes: 1, seconds: 30 } })).toBe('0:01:30')
  })

  it('renders an empty string when the value is missing', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { elapsed: '[{time, duration}]' } }
    })

    expect(i18n.t('elapsed')).toBe('[]')
  })

  it('renders unusable values verbatim', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { elapsed: '{time, duration}' } }
    })

    expect(i18n.t('elapsed', { time: 'soon' })).toBe('soon')
  })

  it('falls back to digital for an unknown style', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { elapsed: '{time, duration, bogus}' } }
    })

    expect(i18n.t('elapsed', { time: 90 })).toBe('0:01:30')
  })

  it('works inside plural branches', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { retry: '{count, plural, one {Retry in {wait, duration}} other {# retries, next in {wait, duration}}}' }
      }
    })

    expect(i18n.t('retry', { count: 1, wait: 90 })).toBe('Retry in 0:01:30')
    expect(i18n.t('retry', { count: 3, wait: 45 })).toBe('3 retries, next in 0:00:45')
  })
})


describe('native / fallback parity', () => {
  const holder = Intl as unknown as { DurationFormat?: unknown }
  const native = holder.DurationFormat

  afterEach(() => {
    holder.DurationFormat = native
  })

  const makeCaches = () => ({
    duration: new LRUCache<string, { format: (value: Record<string, number>) => string }>(50),
    number: new LRUCache<string, Intl.NumberFormat>(50),
    list: new LRUCache<string, Intl.ListFormat>(50)
  })

  it('produces identical output with and without Intl.DurationFormat', () => {
    if (typeof native !== 'function') {
      return
    }

    const cases: DurationInput[] = [0, 5, 90, 3661, 90061, { hours: 2, minutes: 5 }, { hours: 1, minutes: 30 }]
    const styles: DurationStyle[] = ['digital', 'narrow', 'short', 'long']
    const mismatches: string[] = []

    for (const locale of ['en', 'es', 'de', 'ja']) {
      for (const style of styles) {
        for (const value of cases) {
          holder.DurationFormat = native
          const withNative = formatDuration(value, locale, style, makeCaches())

          holder.DurationFormat = undefined
          const withFallback = formatDuration(value, locale, style, makeCaches())

          if (withNative !== withFallback) {
            mismatches.push(`${locale}/${style}/${JSON.stringify(value)}: ${withNative} !== ${withFallback}`)
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })

  it('still formats when Intl.DurationFormat is unavailable', () => {
    holder.DurationFormat = undefined

    const i18n = createI18n({ locale: 'en', messages: { en: { d: '{time, duration}' } } })

    expect(i18n.duration(90)).toBe('0:01:30')
    expect(i18n.t('d', { time: 3661 })).toBe('1:01:01')
  })
})
