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

  it('returns fallback locale as provided (string or array)', () => {
    // string fallback
    const i18n1 = createI18n({ locale: 'en', fallbackLocale: 'fr', messages: { en: {} } })
    expect(i18n1.getFallbackLocale()).toBe('fr')
    // array fallback
    const i18n2 = createI18n({ locale: 'en', fallbackLocale: ['fr', 'de'], messages: { en: {} } })
    expect(i18n2.getFallbackLocale()).toEqual(['fr', 'de'])
    // undefined fallback (defaults to locale)
    const i18n3 = createI18n({ locale: 'en', messages: { en: {} } })
    expect(i18n3.getFallbackLocale()).toBe('en')
  })

  it('getDirection returns rtl for arabic and ltr for english', () => {
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })
    expect(i18n.getDirection()).toBe('ltr')
    // change locale to arabic
    // Note: setLocale is async, but we can test sync by setting locale directly? We'll just test with a new instance.
    const i18nAr = createI18n({ locale: 'ar', messages: { ar: {} } })
    expect(i18nAr.getDirection()).toBe('rtl')
  })
})