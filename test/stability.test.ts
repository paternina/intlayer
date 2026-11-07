// Regression tests for the 1.0.0 stabilisation pass.
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../src/index'

describe('select / plural with hostile values', () => {
  const i18n = createI18n({
    locale: 'en',
    messages: { en: { g: '{x, select, male {He} other {They}}', p: '{n, plural, one {# a} other {# b}}' } }
  })

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('falls back to "other" for %s', (value) => {
    expect(i18n.t('g', { x: value })).toBe('They')
  })

  it('does not match inherited keys in a branch named like a prototype member', () => {
    const odd = createI18n({ locale: 'en', messages: { en: { g: '{x, select, constructor {C} other {O}}' } } })
    expect(odd.t('g', { x: 'constructor' })).toBe('C')
    expect(odd.t('g', { x: 'toString' })).toBe('O')
  })
})

describe('plural "#" formatting', () => {
  it('formats the count with the message locale', () => {
    const en = createI18n({ locale: 'en', messages: { en: { i: '{n, plural, other {# items}}' } } })
    const de = createI18n({ locale: 'de', messages: { de: { i: '{n, plural, other {# Stk}}' } } })

    expect(en.t('i', { n: 1500 })).toBe('1,500 items')
    expect(de.t('i', { n: 1234567 })).toBe('1.234.567 Stk')
  })

  it('replaces every # and keeps \\# literal', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: { i: '{n, plural, other {## and \\#}}' } } })
    expect(i18n.t('i', { n: 5 })).toBe('55 and #')
  })
})

describe('setLocale', () => {
  const delayed = <T,>(value: T, ms: number) => () => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

  it('lets the most recent call win when loaders resolve out of order', async () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { a: 'EN' } },
      loaders: { es: delayed({ a: 'ES' }, 40), fr: delayed({ a: 'FR' }, 5) }
    })

    await Promise.all([i18n.setLocale('es'), i18n.setLocale('fr')])

    expect(i18n.getLocale()).toBe('fr')
    expect(i18n.t('a')).toBe('FR')
  })

  it('cancels a pending switch when the user returns to the current locale', async () => {
    const i18n = createI18n({ locale: 'en', messages: { en: { a: 'EN' } }, loaders: { es: delayed({ a: 'ES' }, 20) } })

    await Promise.all([i18n.setLocale('es'), i18n.setLocale('en')])

    expect(i18n.getLocale()).toBe('en')
  })

  it('rejects an invalid locale tag', async () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })
    await expect(i18n.setLocale('not a locale!!')).rejects.toThrow(/Invalid locale/)
    expect(i18n.getLocale()).toBe('en')
  })

  it('falls back to the base language of a regional locale before the fallback list', async () => {
    const i18n = createI18n({ locale: 'en', messages: { en: { a: 'EN', b: 'EN-b' }, es: { a: 'ES' } } })

    await i18n.setLocale('es-MX')

    expect(i18n.t('a')).toBe('ES')
    expect(i18n.t('b')).toBe('EN-b')
    expect(i18n.has('a')).toBe(true)
  })
})

describe('createI18n locale validation', () => {
  it.each([undefined, '', '   ', 42])('throws a clear error for locale %s', (locale) => {
    expect(() => createI18n({ locale } as never)).toThrow(/\[intlayer\] "locale" must be/)
  })

  it('throws for a malformed locale tag and accepts underscores', () => {
    expect(() => createI18n({ locale: 'not a locale!!' })).toThrow(/Invalid locale/)
    expect(() => createI18n({ locale: 'en_US', messages: { en: {} } })).not.toThrow()
  })
})

describe('subscribers and merging', () => {
  it('isolates a throwing subscriber from the others', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const i18n = createI18n({ locale: 'en', messages: { en: { a: 'x' } } })
    const second = vi.fn()

    i18n.subscribe(() => {
      throw new Error('boom')
    })
    i18n.subscribe(second)
    i18n.mergeMessages({ b: 'y' })

    expect(second).toHaveBeenCalledTimes(1)
    expect(i18n.t('b')).toBe('y')
    error.mockRestore()
  })

  it('ignores prototype-polluting keys when merging', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: { a: 'x' } } })

    i18n.mergeMessages(JSON.parse('{"__proto__":{"polluted":"yes"},"ok":"fine"}'))

    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(i18n.t('__proto__.polluted')).toBe('__proto__.polluted')
    expect(i18n.t('ok')).toBe('fine')
  })

  it('returns a copy from getFallbackLocale', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: ['fr'], messages: { en: {} } })
    i18n.getFallbackLocale().push('xx')
    expect(i18n.getFallbackLocale()).toEqual(['fr'])
  })
})
