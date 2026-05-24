# intlayer Documentation

## Quick start

Install the package:

```bash
npm install @paternina/intlayer
```

Import the runtime in an ESM project:

```ts
import { createI18n, isRTL } from '@paternina/intlayer'

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
console.log(isRTL('ar'))
```

## Public API

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

## Messages and pluralization

Supports nested key lookup and template interpolation. Example plural usage:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    items: '{count, plural, one {# item} other {# items}}'
  }
})

console.log(i18n.t('items', { count: 1 })) // 1 item
console.log(i18n.t('items', { count: 5 })) // 5 items
```

## Locale switching and subscriptions

```ts
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hello' },
    es: { hello: 'Hola' }
  }
})

const unsubscribe = i18n.subscribe((locale) => {
  console.log('Locale changed to', locale)
})

await i18n.setLocale('es')
console.log(i18n.t('hello'))
unsubscribe()
```

## Lazy locale loading

Use `loaders` to fetch locale data only when needed:

```ts
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: { greet: 'Hello' } },
  loaders: {
    fr: async () => ({ greet: 'Salut' })
  }
})

await i18n.setLocale('fr')
console.log(i18n.t('greet'))
```

## Translation files

You can load translations from JavaScript, TypeScript or JSON imports as long as they provide an object of keys and values.

```ts
import enTranslation from './locales/en.json'
import esTranslation from './locales/es.js'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: enTranslation,
    es: esTranslation
  }
})

console.log(i18n.t('welcome', { name: 'Jane' }))
```

If you prefer lazy loading, use a loader that imports the JSON or module when needed:

```ts
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: enTranslation },
  loaders: {
    es: async () => {
      const module = await import('./locales/es.json')
      return module.default ?? module
    }
  }
})
```

### Resources-style usage

You can also build a simple `resources` object from imported translation files:

```ts
import enTranslation from './locales/en.json'
import esTranslation from './locales/es.json'

const resources = {
  en: enTranslation,
  es: esTranslation
}

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: resources
})
```

The engine does not require the translations to come from `.ts` or `.js` files — it only needs a plain object with translation keys.

## Native formatting

```ts
i18n.number(1234567.89)
i18n.date(new Date())
i18n.relativeTime(-1, 'day')
```

## CDN usage

The package is available on npm as `@paternina/intlayer` and can be loaded from a CDN such as `jsdelivr` or `unpkg`.

ESM import example in a browser:

```html
<script type="module">
  import { createI18n } from 'https://cdn.jsdelivr.net/npm/@paternina/intlayer/dist/index.mjs'

  const i18n = createI18n({
    locale: 'en',
    messages: { en: { hello: 'Hello' } }
  })

  console.log(i18n.t('hello'))
</script>
```

Browser global example using the IIFE build:

```html
<script src="https://cdn.jsdelivr.net/npm/@paternina/intlayer/dist/index.global.js"></script>
<script>
  const i18n = Intlayer.createI18n({
    locale: 'en',
    messages: { en: { hello: 'Hello' } }
  })

  console.log(i18n.t('hello'))
</script>
```
