import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../src/index'
import { buildIntlCacheKey, getCachedFormatter } from '../src/utils/intl'
import { LRUCache } from '../src/utils/lru'

const nbsp = /\u00a0|\u202f/g
const normalize = (value: string) => value.replace(nbsp, ' ')

describe('ICU argument formatting', () => {
  it('formats plain number arguments with locale grouping', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { total: 'Total: {value, number}' } }
    })

    expect(i18n.t('total', { value: 1234567.891 })).toBe('Total: 1,234,567.891')
  })

  it('uses the locale of the resolved message, not the active locale', () => {
    const i18n = createI18n({
      locale: 'fr',
      fallbackLocale: 'de',
      messages: { de: { total: '{value, number}' } }
    })

    expect(normalize(i18n.t('total', { value: 1234.5 }))).toBe('1.234,5')
  })

  it('supports the integer, percent and currency built-in styles', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          rounded: '{value, number, integer}',
          share: '{value, number, percent}',
          price: '{value, number, currency}'
        }
      }
    })

    expect(i18n.t('rounded', { value: 1234.67 })).toBe('1,235')
    expect(i18n.t('share', { value: 0.256 })).toBe('26%')
    expect(i18n.t('price', { value: 12.5 })).toBe('$12.50')
  })

  it('honours defaultCurrency for the currency style', () => {
    const i18n = createI18n({
      locale: 'de',
      defaultCurrency: 'EUR',
      messages: { de: { price: '{value, number, currency}' } }
    })

    expect(normalize(i18n.t('price', { value: 1234.5 }))).toBe('1.234,50 €')
  })

  it('supports number skeletons', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          money: '{value, number, ::currency/EUR}',
          compact: '{value, number, ::compact-short}',
          fraction: '{value, number, ::.00}',
          signed: '{value, number, ::sign-always}',
          grouped: '{value, number, ::group-off}',
          combined: '{value, number, ::currency/JPY precision-integer}'
        }
      }
    })

    expect(normalize(i18n.t('money', { value: 9.5 }))).toBe('€9.50')
    expect(i18n.t('compact', { value: 12500 })).toBe('13K')
    expect(i18n.t('fraction', { value: 3.1 })).toBe('3.10')
    expect(i18n.t('signed', { value: 4 })).toBe('+4')
    expect(i18n.t('grouped', { value: 12345 })).toBe('12345')
    expect(normalize(i18n.t('combined', { value: 1234.6 }))).toBe('¥1,235')
  })

  it('formats date and time arguments with built-in styles', () => {
    const i18n = createI18n({
      locale: 'en',
      timeZone: 'UTC',
      messages: {
        en: {
          short: '{when, date, short}',
          long: '{when, date, long}',
          clock: '{when, time, short}'
        }
      }
    })

    const when = new Date('2026-06-20T23:30:00Z')

    expect(i18n.t('short', { when })).toBe('6/20/26')
    expect(i18n.t('long', { when })).toBe('June 20, 2026')
    expect(normalize(i18n.t('clock', { when }))).toBe('11:30 PM')
  })

  it('defaults to the medium style when no style is given', () => {
    const i18n = createI18n({
      locale: 'en',
      timeZone: 'UTC',
      messages: { en: { when: '{when, date}' } }
    })

    expect(i18n.t('when', { when: new Date('2026-06-20T12:00:00Z') })).toBe('Jun 20, 2026')
  })

  it('supports date skeletons', () => {
    const i18n = createI18n({
      locale: 'en',
      timeZone: 'UTC',
      messages: {
        en: {
          ymd: '{when, date, ::yyyyMMdd}',
          monthYear: '{when, date, ::MMMMy}',
          weekday: '{when, date, ::EEEE}',
          hm: '{when, time, ::HHmm}'
        }
      }
    })

    const when = new Date('2026-06-20T23:30:00Z')

    expect(i18n.t('ymd', { when })).toBe('06/20/2026')
    expect(i18n.t('monthYear', { when })).toBe('June 2026')
    expect(i18n.t('weekday', { when })).toBe('Saturday')
    expect(i18n.t('hm', { when })).toBe('23:30')
  })

  it('accepts Date, timestamp and ISO string values', () => {
    const i18n = createI18n({
      locale: 'en',
      timeZone: 'UTC',
      messages: { en: { when: '{when, date, short}' } }
    })

    const iso = '2026-06-20T12:00:00Z'
    const expected = '6/20/26'

    expect(i18n.t('when', { when: new Date(iso) })).toBe(expected)
    expect(i18n.t('when', { when: Date.parse(iso) })).toBe(expected)
    expect(i18n.t('when', { when: iso })).toBe(expected)
  })

  it('applies the instance timeZone and lets explicit styles keep their own zone', () => {
    const i18n = createI18n({
      locale: 'en',
      timeZone: 'UTC',
      formats: {
        time: { tokyo: { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' } }
      },
      messages: {
        en: {
          utc: '{when, time, ::HHmm}',
          tokyo: '{when, time, tokyo}'
        }
      }
    })

    const when = new Date('2026-06-20T23:30:00Z')

    expect(i18n.t('utc', { when })).toBe('23:30')
    expect(i18n.t('tokyo', { when })).toBe('08:30')
  })

  it('supports user-defined named formats', () => {
    const i18n = createI18n({
      locale: 'en',
      timeZone: 'UTC',
      formats: {
        number: { budget: { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 } },
        date: { compact: { year: 'numeric', month: 'short' } }
      },
      messages: {
        en: {
          budget: '{value, number, budget}',
          when: '{when, date, compact}'
        }
      }
    })

    expect(normalize(i18n.t('budget', { value: 1999.4 }))).toBe('£1,999')
    expect(i18n.t('when', { when: new Date('2026-06-20T12:00:00Z') })).toBe('Jun 2026')
  })

  it('lets named formats override the built-in style names', () => {
    const i18n = createI18n({
      locale: 'en',
      formats: { number: { percent: { style: 'percent', minimumFractionDigits: 1 } } },
      messages: { en: { share: '{value, number, percent}' } }
    })

    expect(i18n.t('share', { value: 0.256 })).toBe('25.6%')
  })

  it('formats arguments nested inside plural and select branches', () => {
    const i18n = createI18n({
      locale: 'en',
      defaultCurrency: 'USD',
      messages: {
        en: {
          cart: '{count, plural, one {# item for {total, number, currency}} other {# items for {total, number, currency}}}',
          owner: '{gender, select, female {She paid {total, number, currency}} other {They paid {total, number, currency}}}'
        }
      }
    })

    expect(i18n.t('cart', { count: 1, total: 9.5 })).toBe('1 item for $9.50')
    expect(i18n.t('cart', { count: 3, total: 28.25 })).toBe('3 items for $28.25')
    expect(i18n.t('owner', { gender: 'female', total: 5 })).toBe('She paid $5.00')
  })

  it('formats the plural count itself via {#, number, style}', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { items: '{count, plural, other {{#, number, ::compact-short} items}}' } }
    })

    expect(i18n.t('items', { count: 12500 })).toBe('13K items')
  })

  it('formats arguments used in a default value', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    })

    expect(i18n.t('missing', { value: 1234.5 }, '{value, number}')).toBe('1,234.5')
  })

  it('keeps whitespace around style names tolerant', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { price: 'Cost {  value , number ,  ::currency/USD  }' } }
    })

    expect(normalize(i18n.t('price', { value: 3 }))).toBe('Cost $3.00')
  })
})

describe('ICU argument formatting edge cases', () => {
  it('renders an empty string for missing or nullish values', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          number: '[{value, number}]',
          date: '[{when, date, short}]'
        }
      }
    })

    expect(i18n.t('number')).toBe('[]')
    expect(i18n.t('number', { value: null })).toBe('[]')
    expect(i18n.t('date', { when: undefined })).toBe('[]')
  })

  it('formats zero rather than treating it as missing', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { value: '{value, number, ::.00}' } }
    })

    expect(i18n.t('value', { value: 0 })).toBe('0.00')
  })

  it('coerces numeric strings and preserves non-numeric input verbatim', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { value: '{value, number}' } }
    })

    expect(i18n.t('value', { value: '1234.5' })).toBe('1,234.5')
    expect(i18n.t('value', { value: 'not-a-number' })).toBe('not-a-number')
    expect(i18n.t('value', { value: Number.NaN })).toBe('NaN')
  })

  it('preserves unparsable date input verbatim', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { when: '{when, date, short}' } }
    })

    expect(i18n.t('when', { when: 'yesterday' })).toBe('yesterday')
    expect(i18n.t('when', { when: new Date('nope') })).toBe('Invalid Date')
  })

  it('falls back to a plain locale format for unknown style names', () => {
    const i18n = createI18n({
      locale: 'en',
      timeZone: 'UTC',
      messages: {
        en: {
          value: '{value, number, bogus}',
          when: '{when, date, bogus}'
        }
      }
    })

    expect(i18n.t('value', { value: 1234.5 })).toBe('1,234.5')
    expect(i18n.t('when', { when: new Date('2026-06-20T12:00:00Z') })).toBe('Jun 20, 2026')
  })

  it('ignores unknown skeleton tokens instead of throwing', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { value: '{value, number, ::mystery percent}' } }
    })

    expect(i18n.t('value', { value: 0.5 })).toBe('50%')
  })

  it('escapes braces so a literal argument block can be rendered', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { doc: 'Write \\{price, number, currency\\} to format money' } }
    })

    expect(i18n.t('doc')).toBe('Write {price, number, currency} to format money')
  })

  it('reuses cached Intl instances instead of rebuilding them', () => {
    const cache = new LRUCache<string, Intl.NumberFormat>(10)
    const create = vi.fn(() => new Intl.NumberFormat('en', { style: 'percent' }))

    const first = getCachedFormatter(cache, 'en', { style: 'percent' }, create)
    const second = getCachedFormatter(cache, 'en', { style: 'percent' }, create)

    expect(create).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)

    getCachedFormatter(cache, 'en', { style: 'decimal' }, create)
    getCachedFormatter(cache, 'de', { style: 'percent' }, create)

    expect(create).toHaveBeenCalledTimes(3)
  })

  it('builds order-independent cache keys for equivalent options', () => {
    const cache = new LRUCache<string, Intl.NumberFormat>(10)
    const create = vi.fn(() => new Intl.NumberFormat('en'))

    getCachedFormatter(cache, 'en', { style: 'currency', currency: 'USD' }, create)
    getCachedFormatter(cache, 'en', { currency: 'USD', style: 'currency' }, create)

    expect(create).toHaveBeenCalledTimes(1)
    expect(buildIntlCacheKey('en', {})).toBe('en')
    expect(buildIntlCacheKey('en')).toBe('en')
  })

  it('isolates format configuration between instances sharing a message', () => {
    const message = { price: '{value, number, currency}' }
    const usd = createI18n({ locale: 'en', defaultCurrency: 'USD', messages: { en: { ...message } } })
    const eur = createI18n({ locale: 'en', defaultCurrency: 'EUR', messages: { en: { ...message } } })

    expect(normalize(usd.t('price', { value: 5 }))).toBe('$5.00')
    expect(normalize(eur.t('price', { value: 5 }))).toBe('€5.00')
  })

  it('keeps working after destroy clears the caches', () => {
    const i18n = createI18n({
      locale: 'en',
      defaultCurrency: 'USD',
      messages: { en: { price: '{value, number, currency}' } }
    })

    expect(normalize(i18n.t('price', { value: 5 }))).toBe('$5.00')
    i18n.destroy()
    expect(normalize(i18n.t('price', { value: 5 }))).toBe('$5.00')
  })
})

describe('backwards compatibility', () => {
  it('treats a bare variable containing a comma as a plain variable name', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { odd: '{a, b}' } }
    })

    expect(i18n.t('odd', { 'a, b': 'value' })).toBe('value')
  })

  it('does not format when the argument type is unknown', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { odd: '{value, spellout}' } }
    })

    expect(i18n.t('odd', { 'value, spellout': 'raw' })).toBe('raw')
  })

  it('still renders plural, select and selectordinal blocks unchanged', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          items: '{count, plural, =0 {No items} one {# item} other {# items}}',
          owner: '{gender, select, male {He} female {She} other {They}}',
          rank: '{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}'
        }
      }
    })

    expect(i18n.t('items', { count: 0 })).toBe('No items')
    expect(i18n.t('items', { count: 1 })).toBe('1 item')
    expect(i18n.t('items', { count: 4 })).toBe('4 items')
    expect(i18n.t('owner', { gender: 'male' })).toBe('He')
    expect(i18n.t('rank', { place: 3 })).toBe('3rd')
  })

  it('keeps plural rules bound to their own instance cache', () => {
    const message = { items: '{count, plural, one {# item} few {# items} many {# items} other {# items}}' }
    const en = createI18n({ locale: 'en', messages: { en: { ...message } } })
    const ru = createI18n({ locale: 'ru', messages: { ru: { ...message } } })

    expect(en.t('items', { count: 1 })).toBe('1 item')
    expect(ru.t('items', { count: 1 })).toBe('1 item')
    expect(ru.t('items', { count: 5 })).toBe('5 items')
  })

  it('leaves i18n.date() unaffected when no timeZone option is configured', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })

    expect(normalize(i18n.date(new Date('2026-06-20T23:30:00Z'), { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }))).toBe('11:30 PM')
  })

  it('applies a configured timeZone to i18n.date() while explicit options win', () => {
    const i18n = createI18n({ locale: 'en', timeZone: 'UTC', messages: { en: {} } })
    const when = new Date('2026-06-20T23:30:00Z')

    expect(normalize(i18n.date(when, { hour: '2-digit', minute: '2-digit', hour12: false }))).toBe('23:30')
    expect(normalize(i18n.date(when, { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false }))).toBe('08:30')
  })
})
