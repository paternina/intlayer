# intlayer

A lightweight, framework-agnostic internationalization runtime for JavaScript and TypeScript.

## Features

- Nested translation lookup
- Cached path resolvers
- Interpolation templates
- ICU-style plural support
- Locale switching with subscriptions
- Lazy locale loading with cache
- Fallback locale resolution
- RTL locale utility
- Native `Intl` formatting APIs
- ESM + CJS support

## Quick start

```bash
npm install @paternina/intlayer
```

```ts
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      welcome: 'Hello {name}',
      items: '{count, plural, one {# item} other {# items}}'
    }
  }
})

console.log(i18n.t('welcome', { name: 'Jane' }))
console.log(i18n.t('items', { count: 2 }))
```

## API

- `createI18n(options)`
- `i18n.t(key, values)`
- `i18n.setLocale(locale)`
- `i18n.getLocale()`
- `i18n.getFallbackLocale()`
- `i18n.subscribe(listener)`
- `i18n.destroy()`
- `i18n.number(value, options)`
- `i18n.date(value, options)`
- `i18n.relativeTime(value, unit, options)`
- `isRTL(locale)`

## Examples

### Lazy loading

```ts
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: { hello: 'Hello' } },
  loaders: {
    es: async () => ({ hello: 'Hola' })
  }
})

await i18n.setLocale('es')
console.log(i18n.t('hello'))
```

### Fallback locale

```ts
const i18n = createI18n({
  locale: 'es',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hello' }
  }
})

console.log(i18n.t('hello'))
```

## Development

```bash
npm install
npm test
npm run build
```

## Documentation

More detailed usage and publishing guidance is available in `docs/en.md`.

For Spanish documentation, see `docs/es.md`.
