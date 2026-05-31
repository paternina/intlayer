import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../src/index'
import { isRTL } from '../src/browser/rtl'

describe('intlayer', () => {
  it('resolves nested translation keys', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        auth: {
          login: {
            title: 'Login'
          }
        }
      }
    })

    expect(i18n.t('auth.login.title')).toBe('Login')
  })

  it('interpolates values in translation strings', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        welcome: 'Hello {name}'
      }
    })

    expect(i18n.t('welcome', { name: 'Jane' })).toBe('Hello Jane')
  })

  it('formats plural messages with ICU plural syntax', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        items: '{count, plural, one {# item} other {# items}}'
      }
    })

    expect(i18n.t('items', { count: 1 })).toBe('1 item')
    expect(i18n.t('items', { count: 3 })).toBe('3 items')
  })

  it('falls back to fallbackLocale when missing translation', () => {
    const i18n = createI18n({
      locale: 'es',
      fallbackLocale: 'en',
      messages: {
        en: {
          hello: 'Hello'
        },
        es: {
          welcome: 'Bienvenido'
        }
      }
    })

    expect(i18n.t('hello')).toBe('Hello')
    expect(i18n.t('welcome')).toBe('Bienvenido')
  })

  it('supports locale switching and notifies subscribers', async () => {
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: {
        en: { greet: 'Hello' },
        es: { greet: 'Hola' }
      }
    })

    const listener = vi.fn()
    const unsubscribe = i18n.subscribe(listener)

    await i18n.setLocale('es')

    expect(i18n.getLocale()).toBe('es')
    expect(i18n.t('greet')).toBe('Hola')
    expect(listener).toHaveBeenCalledWith('es')

    unsubscribe()
    await i18n.setLocale('en')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('loads locales lazily and avoids duplicate loads', async () => {
    const loader = vi.fn(async () => ({ greet: 'Salut' }))
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: { greet: 'Hello' } },
      loaders: { fr: loader }
    })

    await i18n.setLocale('fr')
    await i18n.setLocale('fr')

    expect(loader).toHaveBeenCalledTimes(1)
    expect(i18n.t('greet')).toBe('Salut')
  })

  it('detects right-to-left locales', () => {
    expect(isRTL('ar')).toBe(true)
    expect(isRTL('en-US')).toBe(false)
    expect(isRTL('he-IL')).toBe(true)
  })

  it('returns fallback locale normalized as array', () => {
    const i18n1 = createI18n({ locale: 'en', fallbackLocale: 'fr', messages: { en: {} } })
    expect(i18n1.getFallbackLocale()).toEqual(['fr'])
    const i18n2 = createI18n({ locale: 'en', fallbackLocale: ['fr', 'de'], messages: { en: {} } })
    expect(i18n2.getFallbackLocale()).toEqual(['fr', 'de'])
    const i18n3 = createI18n({ locale: 'en', messages: { en: {} } })
    expect(i18n3.getFallbackLocale()).toEqual(['en'])
  })

  it('getDirection returns rtl for arabic and ltr for english', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })
    expect(i18n.getDirection()).toBe('ltr')
    const i18nAr = createI18n({ locale: 'ar', messages: { ar: {} } })
    expect(i18nAr.getDirection()).toBe('rtl')
  })

  it('includes newly added RTL languages', () => {
    expect(isRTL('dv')).toBe(true)
    expect(isRTL('ku')).toBe(true)
    expect(isRTL('yi')).toBe(true)
  })

  it('warns on missing translation key when warnOnMissingKey is enabled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      warnOnMissingKey: true
    })
    const result = i18n.t('missing')
    expect(result).toBe('missing')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]!).toContain('Missing translation key')
    expect(warn.mock.calls[0]![0]!).toContain('"missing"')
    warn.mockRestore()
  })

  it('does not warn on missing key when warnOnMissingKey is disabled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      warnOnMissingKey: false
    })
    const result = i18n.t('missing')
    expect(result).toBe('missing')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('merges messages into the active locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { hello: 'Hello', deep: { a: 'A' } }
      }
    })
    expect(i18n.t('hello')).toBe('Hello')

    i18n.mergeMessages({
      en: { world: 'World', deep: { b: 'B' } } as any
    })

    expect(i18n.t('hello')).toBe('Hello')
    expect(i18n.t('world')).toBe('World')
    expect(i18n.t('deep.a')).toBe('A')
    expect(i18n.t('deep.b')).toBe('B')
  })

  it('normalizes fallback locales by deduplicating and appending base locale', () => {
    const i18n = createI18n({
      locale: 'en-US',
      fallbackLocale: ['en-GB', 'en-US', 'fr'],
      messages: {
        'en-GB': { hello: 'Hi' },
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' }
      }
    })
    expect(i18n.getFallbackLocale()).toEqual(['en-GB', 'fr', 'en'])
    expect(i18n.t('hello')).toBe('Hi')
  })

  it('does not change locale when loader times out', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const slowLoader = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { greet: 'Too late' }
    })

    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: { greet: 'Hello' } },
      loaders: { fr: slowLoader },
      loaderTimeout: 50
    })

    await i18n.setLocale('fr')
    expect(i18n.getLocale()).toBe('en')
    expect(i18n.t('greet')).toBe('Hello')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('Failed to load locale "fr"')
    warn.mockRestore()
  })
})
