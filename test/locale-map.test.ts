import { describe, expect, it } from 'vitest'
import { createI18n } from '../src/index'

describe('flat catalogs with locale-shaped keys', () => {
  // Regression: `isLocaleMap` used a bare /^[a-z]{2,3}/ regex, so a flat
  // catalog whose top-level keys happen to be valid language codes was
  // misread as a locale map and every lookup under it silently failed.
  it.each(['id', 'no', 'it', 'ok', 'as', 'is', 'be', 'do', 'in', 'my', 'so', 'to'])(
    'resolves keys under a namespace named "%s"',
    (namespace) => {
      const i18n = createI18n({
        locale: 'en',
        messages: { [namespace]: { label: 'Value' } }
      })

      expect(i18n.t(`${namespace}.label`)).toBe('Value')
    }
  )

  it('resolves when every top-level key is locale-shaped', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        id: { label: 'Identifier' },
        no: { label: 'Number' }
      }
    })

    expect(i18n.t('id.label')).toBe('Identifier')
    expect(i18n.t('no.label')).toBe('Number')
  })

  it('resolves a namespace that collides with the active locale name', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { nested: 'Value' } }
    })

    // `en` matches the active locale, so this IS treated as a locale map.
    expect(i18n.t('nested')).toBe('Value')
  })

  it('keeps working when a locale-shaped namespace is mixed with normal keys', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        id: { label: 'Identifier' },
        title: { main: 'Main' }
      }
    })

    expect(i18n.t('id.label')).toBe('Identifier')
    expect(i18n.t('title.main')).toBe('Main')
  })

  it('does not treat arrays as locale maps', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { users: [{ name: 'Jane' }] }
    })

    expect(i18n.t('users[0].name')).toBe('Jane')
  })
})

describe('genuine locale maps still resolve', () => {
  it('selects the active locale', () => {
    const i18n = createI18n({
      locale: 'es',
      messages: { en: { hello: 'Hello' }, es: { hello: 'Hola' } }
    })

    expect(i18n.t('hello')).toBe('Hola')
  })

  it('recognises a locale map via the fallback chain', () => {
    const i18n = createI18n({
      locale: 'es',
      fallbackLocale: 'en',
      messages: { en: { hello: 'Hello' } }
    })

    expect(i18n.t('hello')).toBe('Hello')
    expect(i18n.getLoadedLocales()).toEqual(['en'])
  })

  it('recognises a locale map via declared loaders', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
      loaders: { fr: async () => ({}) }
    })

    expect(i18n.getLoadedLocales()).toEqual(['en', 'fr'])
    expect(i18n.t('hello')).toBe('Hello')
  })

  it('supports BCP 47 tags with script and region subtags', () => {
    const i18n = createI18n({
      locale: 'zh-Hans-CN',
      fallbackLocale: 'zh',
      messages: { 'zh-Hans-CN': { hello: 'A' }, zh: { hello: 'B' } }
    })

    expect(i18n.t('hello')).toBe('A')
  })

  it('treats a single-locale map as a locale map when it matches the active locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' } }
    })

    expect(i18n.getLoadedLocales()).toEqual(['en'])
    expect(i18n.t('hello')).toBe('Hello')
  })
})

describe('localeMap option', () => {
  it('forces locale-map interpretation when true', () => {
    const i18n = createI18n({
      locale: 'id',
      messages: { id: { label: 'Value' } },
      localeMap: true
    })

    expect(i18n.t('label')).toBe('Value')
    expect(i18n.getLoadedLocales()).toEqual(['id'])
  })

  it('forces flat interpretation when false', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { nested: 'Value' } },
      localeMap: false
    })

    expect(i18n.t('en.nested')).toBe('Value')
  })

  it('applies to mergeMessages as well', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { greeting: 'Hi' },
      localeMap: false
    })

    i18n.mergeMessages({ en: { nested: 'Value' } })

    expect(i18n.t('en.nested')).toBe('Value')
  })
})

describe('mergeMessages with locale-shaped keys', () => {
  it('merges a flat namespace that looks like a locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { id: { label: 'Value' } }
    })

    i18n.mergeMessages({ id: { other: 'Second' } })

    expect(i18n.t('id.label')).toBe('Value')
    expect(i18n.t('id.other')).toBe('Second')
  })

  it('still merges into a real locale map', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, es: { hello: 'Hola' } }
    })

    i18n.mergeMessages({ es: { bye: 'Adios' } })

    expect(i18n.getMessages('es')).toEqual({ hello: 'Hola', bye: 'Adios' })
  })
})
