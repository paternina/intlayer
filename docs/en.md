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
  fallbackLocale: ['en'], // can be string or string[]
  messages: {
    en: {
      welcome: 'Hello {name}',
      items: '{count, plural, one {# item} other {# items}}'
    }
  }
})

console.log(i18n.t('welcome', { name: 'Jane' }))
console.log(i18n.t('items', { count: 2 }))
console.log(i18n.getDirection()) // 'ltr' or 'rtl'
console.log(isRTL('ar'))
```

## Public API

- `createI18n(options)`
- `i18n.t(key, values)`
- `i18n.setLocale(locale)`
- `i18n.getLocale()`
- `i18n.getFallbackLocale()`
- `i18n.getLoadedLocales()`
- `i18n.getMessages(locale?)`
- `i18n.loadLocale(locale)`
- `i18n.loadLocales(locales)`
- `i18n.getDirection()`
- `i18n.subscribe(listener)`
- `i18n.destroy()`
- `i18n.number(value, options)`
- `i18n.date(value, options)`
- `i18n.relativeTime(value, unit, options)`
- `i18n.list(value, options)`
- `i18n.compare(a, b, options)`
- `i18n.mergeMessages(messages)` — merge translations at runtime
- `i18n.has(key)` — check if translation exists
- `isRTL(locale)`

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locale` | `string` | — | Active locale |
| `fallbackLocale` | `string \| string[]` | `locale` | Fallback chain (deduped, base locale auto-appended) |
| `messages` | `Messages \| Record<string, Messages>` | — | Initial translations |
| `loaders` | `Record<string, () => Promise<Messages>>` | — | Lazy locale loaders |
| `warnOnMissingKey` | `boolean` | `false` | Log missing keys to console (dev) |
| `onMissingKey` | `(key, locale) => string` | — | Custom missing-key value |
| `loaderTimeout` | `number` (ms) | `0` (disabled) | Timeout for slow loaders |

## Messages and pluralization

Supports nested key lookup (including array notation) and template interpolation.

### Array paths and escaping

You can use array indices to resolve elements, and escape reserved characters (`{`, `}`, `#`) by prefixing them with a backslash (`\\`).

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    users: [
      { name: 'John' },
      { name: 'Jane' }
    ],
    escaped: 'Use \\{variable\\} to show curly braces'
  }
})

console.log(i18n.t('users[0].name')) // John
console.log(i18n.t('escaped')) // Use {variable} to show curly braces
```

### Default values with interpolation

Pass values and a fallback value in the same call:

```ts
console.log(i18n.t('missing', { name: 'Jane' }, 'Hello {name}')) // Hello Jane
```

If the key exists, the default value is ignored. If the key is missing, intlayer uses the default value as the message and still applies interpolation.

### Plurals

Plurals support exact value matching (e.g. `=0`) in addition to the standard categories (`zero`, `one`, `two`, `few`, `many`, `other`):

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    items: '{count, plural, =0 {No items} =1 {A single item} other {# items}}'
  }
})

console.log(i18n.t('items', { count: 0 })) // No items
console.log(i18n.t('items', { count: 1 })) // A single item
console.log(i18n.t('items', { count: 5 })) // 5 items
```

Plural rules are automatically applied based on the locale where the translation is found (not the active locale):

```ts
const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {
    en: { items: '{count, plural, one {# item} other {# items}}' },
    ru: { items: '{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}' }
  }
})

// Uses Russian plural rules when Russian locale is active
console.log(i18n.t('items', { count: 1 })) // 1 товар
console.log(i18n.t('items', { count: 2 })) // 2 товара
console.log(i18n.t('items', { count: 5 })) // 5 товаров
```

### Select and ordinal select

Use `select` for gender or other discrete values:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    owner: '{gender, select, male {He owns it} female {She owns it} other {They own it}}'
  }
})

console.log(i18n.t('owner', { gender: 'female' })) // She owns it
```

Use `selectordinal` for locale-aware ordinal forms:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    rank: '{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}'
  }
})

console.log(i18n.t('rank', { place: 1 })) // 1st
console.log(i18n.t('rank', { place: 2 })) // 2nd
console.log(i18n.t('rank', { place: 3 })) // 3rd
```

## Locale switching and subscriptions

```ts
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: ['en'],
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
  fallbackLocale: ['en'],
  messages: { en: { greet: 'Hello' } },
  loaders: {
    fr: async () => ({ greet: 'Salut' })
  }
})

await i18n.setLocale('fr')
console.log(i18n.t('greet'))
```

### Locale management

Preload locales without switching, inspect loaded locales, and read raw messages:

```ts
await i18n.loadLocale('fr')
await i18n.loadLocales(['es', 'de'])

console.log(i18n.getLoadedLocales()) // ['en', 'fr', 'es']
console.log(i18n.getMessages('fr')) // { greet: 'Salut' }
console.log(i18n.getMessages()) // active locale messages
```

`loadLocale()` and `loadLocales()` return `false` when a locale has no loader or the loader times out.

### Runtime message merging

Use `mergeMessages` to inject or extend translations after initialization. Active subscribers are automatically notified to re-render the UI:

```ts
i18n.mergeMessages({
  common: { save: 'Save' }
})

// or merge into an existing locale
i18n.mergeMessages({
  en: { newKey: 'New translation' }
})
```

### Development warnings

Enable `warnOnMissingKey` to log missing keys during development:

```ts
const i18n = createI18n({
  locale: 'en',
  warnOnMissingKey: true,
  messages: { en: { hello: 'Hello' } }
})

i18n.t('missing') // console.warn: [intlayer] Missing translation key: "missing"
```

Use `onMissingKey` to return a custom value before falling back to the key:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: {} },
  onMissingKey: (key) => `Missing ${key}`
})

i18n.t('missing') // Missing missing
```

### Loader timeout

Use `loaderTimeout` to avoid hanging on slow locale loaders:

```ts
const i18n = createI18n({
  locale: 'en',
  loaders: {
    fr: async () => ({ hello: 'Bonjour' })
  },
  loaderTimeout: 5000 // 5 seconds
})

await i18n.setLocale('fr')
```

### Check translation existence

Use `has()` to check if a translation key exists in the current locale or fallback chain:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: { hello: 'Hello', missing: undefined } }
})

i18n.has('hello') // true
i18n.has('missing') // false
i18n.has('nonexistent') // false
```

### Optional TypeScript key safety

For better autocomplete and compile-time checking, provide your translation keys:

```ts
type AppKeys = 'hello' | 'items' | 'greeting'

const i18n = createI18n<AppKeys>({
  locale: 'en',
  messages: {
    en: {
      hello: 'Hello',
      items: '{count, plural, one {# item} other {# items}}'
    }
  }
})

i18n.t('hello')     // ✅ OK - autocompleted
i18n.t('missing')   // ❌ TypeScript error
```

### RTL language configuration

The RTL language list is configurable at runtime:

```ts
import { setRTL, addRTL, removeRTL } from '@paternina/intlayer'

// Replace the entire list
setRTL(['ar', 'he'])

// Add additional RTL languages
addRTL('ja', 'zh')

// Remove languages from RTL list
removeRTL('yi')
```

## Translation files

You can load translations from JavaScript, TypeScript or JSON imports as long as they provide an object of keys and values.

```ts
import enTranslation from './locales/en.json'
import esTranslation from './locales/es.js'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: ['en'],
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
  fallbackLocale: ['en'],
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
  fallbackLocale: ['en'],
  messages: resources
})
```

The engine does not require the translations to come from `.ts` or `.js` files — it only needs a plain object with translation keys.

## Native formatting

```ts
i18n.number(1234567.89)
i18n.date(new Date())
i18n.date(new Date('2026-06-20T23:30:00Z'), {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit'
})
i18n.relativeTime(-1, 'day')
i18n.list(['Ana', 'Bob', 'Cara'])
i18n.compare('b', 'a')
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
