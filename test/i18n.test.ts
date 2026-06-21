import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../src/index'
import { isRTL, setRTL, addRTL, removeRTL } from '../src/utils/rtl'

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

  it('allows configuring RTL languages', async () => {
    const { setRTL, addRTL, removeRTL } = await import('../src/utils/rtl')
    
    // Guardar estado original
    const originalAr = isRTL('ar')
    expect(originalAr).toBe(true)
    
    // Reemplazar lista
    setRTL(['ja', 'zh'])
    expect(isRTL('ar')).toBe(false)
    expect(isRTL('ja')).toBe(true)
    
    // Agregar
    addRTL('ar')
    expect(isRTL('ar')).toBe(true)
    
    // Remover
    removeRTL('ar')
    expect(isRTL('ar')).toBe(false)
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

  it('has() returns true for existing translations in current locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        hello: 'Hello'
      }
    })

    expect(i18n.has('hello')).toBe(true)
    expect(i18n.has('missing')).toBe(false)
  })

  it('has() returns true for translations in fallback locale', () => {
    const i18n = createI18n({
      locale: 'es',
      fallbackLocale: 'en',
      messages: {
        en: { hello: 'Hello' }
      }
    })

    expect(i18n.has('hello')).toBe(true)
    expect(i18n.has('missing')).toBe(false)
  })

  it('pluralization uses correct locale from which translation was found', () => {
    const i18n = createI18n({
      locale: 'de',
      fallbackLocale: 'en',
      messages: {
        en: { items: '{count, plural, one {# item} other {# items}}' }
      }
    })

    expect(i18n.t('items', { count: 1 })).toBe('1 item')
    expect(i18n.t('items', { count: 3 })).toBe('3 items')
  })

  it('pluralization uses Russian plural rules for Russian locale', () => {
    const i18n = createI18n({
      locale: 'ru',
      fallbackLocale: 'en',
      messages: {
        ru: {
          items: '{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}'
        }
      }
    })

    expect(i18n.t('items', { count: 1 })).toBe('1 товар')
    expect(i18n.t('items', { count: 2 })).toBe('2 товара')
    expect(i18n.t('items', { count: 5 })).toBe('5 товаров')
    expect(i18n.t('items', { count: 0 })).toBe('0 товаров')
  })

  it('destroy clears instance caches to prevent memory leaks', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        hello: 'Hello',
        items: '{count, plural, one {# item} other {# items}}'
      }
    })

    i18n.t('hello')
    i18n.t('items', { count: 1 })
    i18n.number(123)

    i18n.destroy()

    expect(i18n.getLocale()).toBe('en')
    const t = i18n.t('hello')
    expect(t).toBe('Hello')
  })

  it('t returns translation when exists', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { hello: 'Hello' }
    })

    expect(i18n.t('hello')).toBe('Hello')
  })

  it('t returns defaultValue when key missing', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { hello: 'Hello' }
    })

    expect(i18n.t('missing', 'Default')).toBe('Default')
  })

  it('supports escaping curly braces and hashes in templates', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        escaped: 'Use \\{name\\} for variables.',
        plural_escaped: '{count, plural, one {\\#1 item} other {\\# items}}'
      }
    })

    expect(i18n.t('escaped')).toBe('Use {name} for variables.')
    expect(i18n.t('plural_escaped', { count: 1 })).toBe('#1 item')
  })

  it('supports exact value matching in plurals', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        items: '{count, plural, =0 {No items} =1 {A single item} other {# items}}'
      }
    })

    expect(i18n.t('items', { count: 0 })).toBe('No items')
    expect(i18n.t('items', { count: 1 })).toBe('A single item')
    expect(i18n.t('items', { count: 5 })).toBe('5 items')
  })

  it('resolves advanced array and object paths', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        users: [
          { name: 'John', roles: ['admin'] }
        ]
      }
    })

    expect(i18n.t('users[0].name')).toBe('John')
    expect(i18n.t('users[0].roles[0]')).toBe('admin')
  })

  it('notifies subscribers when mergeMessages is called', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' } }
    })

    const listener = vi.fn()
    i18n.subscribe(listener)

    i18n.mergeMessages({
      en: { world: 'World' } as any
    })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('en')
  })

  it('supports values and default value in the same translation call', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { missing: 'Hello {name}' } }
    })

    expect(i18n.t('missing' as any, { name: 'Ana' }, 'Fallback')).toBe('Hello Ana')
  })

  it('uses onMissingKey before falling back to the key', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} },
      onMissingKey: (key) => `Missing ${key}`
    })

    expect(i18n.t('missing' as any, 'Fallback')).toBe('Fallback')
    expect(i18n.t('missing' as any)).toBe('Missing missing')
  })

  it('loads and exposes locale management helpers', async () => {
    const loader = vi.fn(async () => ({ greet: 'Bonjour' }))
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: { hello: 'Hello' } },
      loaders: { fr: loader }
    })

    await expect(i18n.loadLocale('fr')).resolves.toBe(true)
    await expect(i18n.loadLocale('fr')).resolves.toBe(true)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(i18n.getLoadedLocales()).toEqual(['en', 'fr'])
    expect(i18n.getMessages('fr')).toEqual({ greet: 'Bonjour' })
    expect(i18n.getMessages()).toEqual({ hello: 'Hello' })
  })

  it('loads multiple locales and returns per-locale results', async () => {
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: { hello: 'Hello' } },
      loaders: {
        fr: async () => ({ hello: 'Bonjour' }),
        es: async () => ({ hello: 'Hola' })
      }
    })

    await expect(i18n.loadLocales(['fr', 'es', 'de'])).resolves.toEqual([true, true, false])
    expect(i18n.getLoadedLocales()).toEqual(['en', 'fr', 'es'])
  })

  it('supports BCP 47 locale keys with script and region subtags', () => {
    const i18n = createI18n({
      locale: 'zh-Hans-CN',
      fallbackLocale: 'zh',
      messages: {
        'zh-Hans-CN': { hello: '你好' },
        zh: { hello: '中文' }
      }
    })

    expect(i18n.t('hello' as any)).toBe('你好')
    expect(i18n.getFallbackLocale()).toEqual(['zh'])
  })

  it('supports ICU select blocks', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          owner: '{gender, select, male {He owns it} female {She owns it} other {They own it}}'
        }
      }
    })

    expect(i18n.t('owner' as any, { gender: 'female' })).toBe('She owns it')
    expect(i18n.t('owner' as any, { gender: 'unknown' })).toBe('They own it')
  })

  it('supports ICU selectordinal blocks', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          rank: '{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}'
        }
      }
    })

    expect(i18n.t('rank' as any, { place: 1 })).toBe('1st')
    expect(i18n.t('rank' as any, { place: 2 })).toBe('2nd')
    expect(i18n.t('rank' as any, { place: 3 })).toBe('3rd')
    expect(i18n.t('rank' as any, { place: 4 })).toBe('4th')
  })

  it('formats lists with Intl.ListFormat', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    })

    expect(i18n.list(['Ana', 'Bob', 'Cara'])).toBe('Ana, Bob, and Cara')
  })

  it('compares strings with Intl.Collator', () => {
    const i18n = createI18n({
      locale: 'es',
      messages: { es: {} }
    })

    expect(i18n.compare('b', 'a')).toBeGreaterThan(0)
  })

  it('formats dates with explicit time zones', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    })

    expect(i18n.date(new Date('2026-06-20T23:30:00Z'), { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })).toBe('11:30 PM')
  })
})
