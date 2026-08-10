# intlayer

A lightweight, framework-agnostic internationalization runtime for JavaScript and TypeScript.

## Features

- Nested translation lookup with object and array support (`users[0].name`)
- Cached path resolvers (LRU cache prevents memory leaks)
- Interpolation templates with character escaping (`\\{`, `\\}`)
- ICU-style plural support with exact matches (`=0`) and locale-aware rules
- ICU number/date/time/duration arguments inside messages (`{price, number, currency}`), with skeletons and named formats
- Duration formatting (`i18n.duration()`) with an automatic fallback when `Intl.DurationFormat` is unavailable
- Build-time ICU message validation (`validateMessages`)
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
- `i18n.duration(value, options)` — format a duration
- `i18n.mergeMessages(messages)` — merge translations at runtime
- `i18n.has(key)` — check if translation exists
- `validateMessages(messages, options)` — lint ICU syntax
- `assertValidMessages(messages, options)` — throw on invalid ICU syntax
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
| `formats` | `CustomFormats` | — | Named `number`/`date`/`time`/`duration` formats usable inside messages |
| `defaultCurrency` | `string` | `'USD'` | Currency used by the `currency` number style |
| `timeZone` | `string` | — | Default time zone for `date`/`time` arguments and `i18n.date()` |
| `localeMap` | `boolean` | auto-detected | Force `messages` to be read as a locale map (`true`) or a flat catalog (`false`) |

### Inline number, date and time formatting

Format values inside a message so the whole sentence stays translatable:

```ts
const i18n = createI18n({
  locale: 'en',
  defaultCurrency: 'USD',
  timeZone: 'UTC',
  messages: {
    en: {
      receipt: 'You paid {total, number, currency} on {when, date, long}',
      stats: '{views, number, ::compact-short} views ({rate, number, percent})'
    }
  }
})

i18n.t('receipt', { total: 42.5, when: new Date('2026-06-20T12:00:00Z') })
// You paid $42.50 on June 20, 2026

i18n.t('stats', { views: 12500, rate: 0.256 })
// 13K views (26%)
```

Built-in styles are `integer`, `percent` and `currency` for numbers, and `short`, `medium`, `long`, `full` for dates and times. `::` prefixes an ICU skeleton (`::currency/EUR`, `::compact-long`, `::yyyyMMdd`). Define your own reusable styles with `formats`:

```ts
const i18n = createI18n({
  locale: 'en',
  formats: {
    number: { budget: { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 } }
  },
  messages: { en: { budget: 'Budget: {value, number, budget}' } }
})

i18n.t('budget', { value: 1999.4 }) // Budget: £1,999
```

### Durations

Format a number of seconds or an explicit unit record, either standalone or inside a message:

```ts
i18n.duration(3661)                        // 1:01:01
i18n.duration(90, { style: 'long' })       // 1 minute, 30 seconds
i18n.t('eta', { time: 90 })                // from '{time, duration}'
```

Styles are `digital` (default), `narrow`, `short` and `long`. `Intl.DurationFormat` is used when the runtime provides it, with a locale-aware fallback that produces identical output elsewhere.

### Validating messages

Catch malformed ICU syntax in CI or a build step instead of at render time:

```ts
import { validateMessages, assertValidMessages } from '@paternina/intlayer'

const { valid, issues } = validateMessages({
  en: { items: '{count, plural, one {# item}}' }
})

// valid === false
// issues[0] === { code: 'missing-other', key: 'items', locale: 'en', ... }

assertValidMessages(messages) // throws when invalid
```

It reports unbalanced braces, unknown argument types and styles, invalid or duplicate plural branches, a missing `other` branch, and bad skeleton tokens.

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
