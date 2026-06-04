# intlayer

A lightweight, framework-agnostic internationalization runtime for JavaScript and TypeScript.

## Features

- Nested translation lookup with object and array support (`users[0].name`)
- Cached path resolvers (LRU cache prevents memory leaks)
- Interpolation templates with character escaping (`\\{`, `\\}`)
- ICU-style plural support with exact matches (`=0`) and locale-aware rules
- Locale switching with subscriptions
- Lazy locale loading with cache
- Fallback locale resolution with automatic base-locale fallback (e.g. `en-US` → `en`) and deduplication
- RTL locale utility (`getDirection()` method)
- Native `Intl` formatting APIs with caching
- ESM + CJS support
- Performance optimizations for high-frequency translation scenarios
- Runtime message merging (`mergeMessages`)
- Optional missing-key warnings during development (`warnOnMissingKey`)
- Loader timeout support (`loaderTimeout`) to prevent hangs on slow networks
- Instance-level caches for memory isolation

## Quick start

```bash
npm install @paternina/intlayer
```

```ts
import { createI18n } from '@paternina/intlayer'

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
```

## API

- `createI18n(options)`
- `i18n.t(key, values)`
- `i18n.setLocale(locale)`
- `i18n.getLocale()`
- `i18n.getFallbackLocale()`
- `i18n.getDirection()`
- `i18n.subscribe(listener)`
- `i18n.destroy()`
- `i18n.number(value, options)`
- `i18n.date(value, options)`
- `i18n.relativeTime(value, unit, options)`
- `i18n.mergeMessages(messages)` — merge translations at runtime
- `i18n.has(key)` — check if translation exists
- `isRTL(locale)`
- `setRTL(locales)` — replace the RTL language list
- `addRTL(...locales)` — add locales to RTL list
- `removeRTL(...locales)` — remove locales from RTL list

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locale` | `string` | — | Active locale |
| `fallbackLocale` | `string \| string[]` | `locale` | Fallback chain (deduped, base locale auto-appended) |
| `messages` | `Messages \| Record<string, Messages>` | — | Initial translations |
| `loaders` | `Record<string, () => Promise<Messages>>` | — | Lazy locale loaders |
| `warnOnMissingKey` | `boolean` | `false` | Log missing keys to console (dev) |
| `loaderTimeout` | `number` (ms) | `0` (disabled) | Timeout for slow loaders |

## Examples

See the [`examples/`](https://github.com/paternina/intlayer/tree/main/examples) directory for a progressive set of examples demonstrating usage from basic to advanced scenarios:

- `examples/basic/` - Introduction to core features: simple translation, interpolation, pluralization.
- `examples/advanced/` - Fallback chains, async loading, locale switching, formatting, nested messages.
- `examples/ssr/` - Server-side rendering examples with Express and React.
- `examples/framework/` - Bindings for popular frameworks: React hook, Vue composable, Svelte store.
- `examples/testing/` - Guidance on unit testing with intlayer.

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

### Runtime message merging

Use `mergeMessages` to inject or extend translations after initialization:

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

### Check if translation exists

Use `has()` to verify if a translation key exists:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: { hello: 'Hello' } }
})

i18n.has('hello') // true
i18n.has('missing') // false
```

## Documentation

More detailed usage and publishing guidance is available in `docs/en.md`.

For Spanish documentation, see `docs/es.md`.
