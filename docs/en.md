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
- `i18n.duration(value, options)`
- `i18n.compare(a, b, options)`
- `i18n.mergeMessages(messages)` — merge translations at runtime
- `i18n.has(key)` — check if translation exists
- `validateMessages(messages, options)` — lint ICU message syntax
- `validateMessage(message, options)` — lint a single message
- `assertValidMessages(messages, options)` — throw when a catalog is invalid
- `formatIssues(issues)` — render issues as readable lines
- `isRTL(locale)`

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locale` | `string` | — | Active locale |
| `fallbackLocale` | `string \| string[]` | `locale` | Fallback chain (deduped, base locale auto-appended). After `setLocale('es-MX')`, `es` is tried right after `es-MX` unless your list already orders it |
| `messages` | `Messages \| Record<string, Messages>` | — | Initial translations |
| `loaders` | `Record<string, () => Promise<Messages>>` | — | Lazy locale loaders |
| `warnOnMissingKey` | `boolean` | `false` | Log missing keys to console (dev) |
| `onMissingKey` | `(key, locale) => string` | — | Custom missing-key value |
| `loaderTimeout` | `number` (ms) | `0` (disabled) | Timeout for slow loaders |
| `formats` | `CustomFormats` | — | Named `number`/`date`/`time`/`duration` formats usable inside messages |
| `defaultCurrency` | `string` | `'USD'` | Currency used by the `currency` number style |
| `timeZone` | `string` | — | Default time zone for `date`/`time` arguments and `i18n.date()` |
| `localeMap` | `boolean` | auto-detected | Force `messages` to be read as a locale map (`true`) or a flat catalog (`false`) |

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
// `#` is formatted with the locale's number format: 1500 renders as "1,500" in en and "1.500" in de.
// Use \# for a literal "#".
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

### Plural offset

`offset:N` subtracts `N` from the count before choosing a category and before rendering `#`. Exact matches (`=0`, `=1`) still compare against the raw count:

```ts
const msg = '{n, plural, offset:1 =0 {Nobody} =1 {Just you} one {You and # other} other {You and # others}}'
// n = 0 → "Nobody", n = 1 → "Just you", n = 2 → "You and 1 other", n = 5 → "You and 4 others"
```

### Quoting and escaping literal text

Both ICU apostrophe quoting and backslash escapes are supported:

| Write | Renders |
|-------|---------|
| `It's` | `It's` (a lone apostrophe is literal) |
| `It''s` | `It's` |
| `'{'name'}'` | `{name}` |
| `\{name\}` | `{name}` |
| `{n, plural, other {'#' is #}}` | `# is 3` (when `n` is 3) |

An apostrophe directly before `{` or `}` opens a quoted section that ends at the next single `'`. To put an apostrophe right before a placeholder, double it: `l''{name}`.

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

### Number, date and time arguments

Values can be formatted directly inside a message, so translators keep control of the whole sentence instead of receiving pre-formatted fragments:

```ts
const i18n = createI18n({
  locale: 'en',
  defaultCurrency: 'USD',
  timeZone: 'UTC',
  messages: {
    en: {
      receipt: 'You paid {total, number, currency} on {when, date, long}',
      meeting: 'Starts at {when, time, short}'
    }
  }
})

const when = new Date('2026-06-20T15:00:00Z')

console.log(i18n.t('receipt', { total: 42.5, when })) // You paid $42.50 on June 20, 2026
console.log(i18n.t('meeting', { when })) // Starts at 3:00 PM
```

The argument syntax is `{name, type, style}` where `type` is `number`, `date`, `time` or `duration`. The `style` is optional.

#### Built-in styles

| Type | Styles | Default |
|------|--------|---------|
| `number` | `integer`, `percent`, `currency` | plain locale-formatted number |
| `date` | `short`, `medium`, `long`, `full` | `medium` |
| `time` | `short`, `medium`, `long`, `full` | `medium` |
| `duration` | `digital`, `narrow`, `short`, `long` | `digital` |

The `currency` style uses the `defaultCurrency` option (`USD` when unset).

#### Skeletons

Prefix a style with `::` to use an ICU-style skeleton:

```ts
const i18n = createI18n({
  locale: 'en',
  timeZone: 'UTC',
  messages: {
    en: {
      price: '{value, number, ::currency/EUR}',
      views: '{value, number, ::compact-short}',
      exact: '{value, number, ::.00}',
      day: '{when, date, ::yyyyMMdd}',
      clock: '{when, time, ::HHmm}'
    }
  }
})

i18n.t('price', { value: 9.5 })   // €9.50
i18n.t('views', { value: 12500 }) // 13K
i18n.t('exact', { value: 3.1 })   // 3.10
```

Supported number skeleton tokens include `percent`, `currency/XXX`, `unit/xxx`, `compact-short`, `compact-long`, `scientific`, `engineering`, `precision-integer`, `group-off`, `group-auto`, `sign-always`, `sign-never`, `sign-except-zero`, `sign-accounting`, `integer-width/000` and fraction patterns such as `.00` or `.0#`. Multiple tokens can be combined with spaces (`::currency/JPY precision-integer`).

Date and time skeletons accept the usual field symbols: `y`, `M`/`MMM`/`MMMM`, `d`, `E`/`EEEE`, `h`/`H`, `m`, `s`, `z`.

#### Named formats

Register reusable styles once with the `formats` option and reference them by name. Named formats take precedence over the built-in style names, so you can customise `currency` or `short` globally:

```ts
const i18n = createI18n({
  locale: 'en',
  formats: {
    number: { budget: { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 } },
    date: { compact: { year: 'numeric', month: 'short' } },
    time: { tokyo: { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' } }
  },
  messages: {
    en: {
      budget: 'Budget: {value, number, budget}',
      period: 'Period: {when, date, compact}'
    }
  }
})

i18n.t('budget', { value: 1999.4 }) // Budget: £1,999
```

Arguments also work inside `plural` and `select` branches, and `#` can be formatted like any other value:

```ts
const i18n = createI18n({
  locale: 'en',
  defaultCurrency: 'USD',
  messages: {
    en: {
      cart: '{count, plural, one {# item for {total, number, currency}} other {# items for {total, number, currency}}}',
      views: '{count, plural, other {{#, number, ::compact-short} views}}'
    }
  }
})

i18n.t('cart', { count: 3, total: 28.25 }) // 3 items for $28.25
i18n.t('views', { count: 12500 })          // 13K views
```

Formatting is resilient: a missing value renders an empty string, an unknown style name falls back to the plain locale format, and a value that cannot be parsed as a number or date is rendered verbatim. No exception is thrown at render time.

Escape the braces to show the syntax literally:

```ts
i18n.t('doc') // from 'Write \\{price, number, currency\\} to format money'
```

### Durations

Durations accept either a number of seconds or an explicit record of `days`, `hours`, `minutes` and `seconds`:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      eta: 'Ready in {time, duration}',
      elapsed: 'Took {time, duration, long}'
    }
  }
})

console.log(i18n.t('eta', { time: 90 }))                       // Ready in 0:01:30
console.log(i18n.t('elapsed', { time: 3661 }))                 // Took 1 hour, 1 minute, 1 second
console.log(i18n.t('eta', { time: { hours: 2, minutes: 5 } })) // Ready in 2:05:00
```

The same formatting is available directly:

```ts
i18n.duration(3661)                     // 1:01:01
i18n.duration(90, { style: 'long' })    // 1 minute, 30 seconds
i18n.duration(90, { style: 'narrow' })  // 1m 30s
i18n.duration({ hours: 1 }, { style: 'long' }, 'es') // 1 hora
```

`i18n.duration(value, options?, locale?)` mirrors the other formatting helpers. Negative values are prefixed with `-`, a zero duration renders explicitly (`0:00:00`), and non-finite input returns an empty string.

Duration formatting uses `Intl.DurationFormat` where the runtime provides it (Node 23+, recent browsers) and otherwise falls back to `Intl.NumberFormat` unit styles combined with `Intl.ListFormat`. Both paths are verified to produce identical output, so behaviour does not change with the runtime.

Named duration formats work like the other types:

```ts
const i18n = createI18n({
  locale: 'en',
  formats: { duration: { verbose: { style: 'long' } } },
  messages: { en: { elapsed: '{time, duration, verbose}' } }
})
```

## Validating messages

A malformed ICU message is easy to introduce and, by design, the runtime never throws for one — it degrades gracefully. `validateMessages` lets you catch these problems in CI or a build step instead:

```ts
import { validateMessages } from '@paternina/intlayer'

const result = validateMessages({
  en: {
    items: '{count, plural, one {# item}}',
    price: '{value, number, monetary}'
  }
})

console.log(result.valid) // false
console.log(result.issues)
// [
//   { code: 'missing-other', key: 'items', locale: 'en', offset: 0, message: '...' },
//   { code: 'unknown-style', key: 'price', locale: 'en', offset: 0, message: '...' }
// ]
```

Locale maps are detected automatically, so `issues[].locale` is populated for `{ en: {...}, es: {...} }` catalogs and omitted for flat ones. Nested keys are reported as dotted paths (`auth.login.title`) and array items with indices (`items[1]`).

### Failing a build

```ts
import { assertValidMessages } from '@paternina/intlayer'
import messages from './locales/en.json'

assertValidMessages(messages) // throws an Error listing every issue
```

Or format the issues yourself:

```ts
import { validateMessages, formatIssues } from '@paternina/intlayer'

const { valid, issues } = validateMessages(messages)

if (!valid) {
  console.error(formatIssues(issues))
  process.exit(1)
}
```

### Detected problems

| Code | Description |
|------|-------------|
| `unbalanced-brace` | Unclosed `{`, or an unescaped stray `}` |
| `empty-placeholder` | `{}` with no content |
| `invalid-argument-name` | Missing name, or a name containing whitespace |
| `unknown-argument-type` | Type other than `number`, `date`, `time`, `duration`, `plural`, `select`, `selectordinal` |
| `malformed-argument` | Argument that cannot be parsed |
| `malformed-block` | Block with no branches, a missing comma, or a branch without a body |
| `invalid-branch` | Plural branch that is not a CLDR category or a valid `=` exact match |
| `duplicate-branch` | Same branch declared twice |
| `missing-other` | `plural`, `select` or `selectordinal` without the required `other` branch |
| `unknown-style` | Style name that is neither built-in nor a registered named format |
| `empty-style` | Trailing comma with no style |
| `empty-skeleton` | `::` with nothing after it |
| `unknown-skeleton-token` | Unrecognised skeleton token |
| `hash-outside-plural` | `#` used outside a plural block (only with `strictHash`) |

### Options

Pass the same `formats` you give `createI18n` so named formats are recognised, and enable `strictHash` to flag a literal `#` outside plural blocks:

```ts
validateMessages(messages, {
  formats: { number: { budget: { style: 'currency', currency: 'GBP' } } },
  strictHash: true
})
```

`validateMessage(message, options)` validates a single string and returns the issue list directly, which is useful in unit tests.

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

Patches are merged deeply and may be partial — you only pass the keys you want to change, even when using typed keys:

```ts
const i18n = createI18n<'auth.login.title' | 'auth.login.button'>({
  locale: 'en',
  messages: { en: { auth: { login: { title: 'Login', button: 'Go' } } } }
})

// Only `title` is replaced; `button` is preserved.
i18n.mergeMessages({ en: { auth: { login: { title: 'Sign in' } } } })
```

Unknown keys are still rejected at compile time, so partial patches do not weaken key safety.

### Flat catalogs vs locale maps

`messages` accepts either a flat catalog for the active locale or a map of locales:

```ts
// flat - belongs to `locale`
createI18n({ locale: 'en', messages: { hello: 'Hello' } })

// locale map
createI18n({ locale: 'en', messages: { en: { hello: 'Hello' }, es: { hello: 'Hola' } } })
```

The two shapes are distinguished by checking whether the top-level keys look like locale codes **and** at least one of them is a locale the instance actually knows about — that is, the active locale, an entry in the fallback chain, or a declared loader.

This matters because plenty of ordinary namespaces are also valid language codes (`id`, `no`, `it`, `is`, `as`, `ok`). A catalog like the following is correctly treated as flat:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { id: { label: 'Identifier' } }
})

i18n.t('id.label') // Identifier
```

If your catalog is genuinely ambiguous, set `localeMap` explicitly:

```ts
// Force locale-map interpretation
createI18n({ locale: 'id', messages: { id: { label: 'Nilai' } }, localeMap: true })

// Force flat interpretation, even though `en` matches the active locale
createI18n({ locale: 'en', messages: { en: { nested: 'Value' } }, localeMap: false })
```

Locales may also be partially translated — that is the purpose of `fallbackLocale`, and the types allow it:

```ts
createI18n<'hello' | 'bye'>({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hello', bye: 'Bye' },
    es: { hello: 'Hola' } // `bye` falls back to English
  }
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

## Supported environments

- Node.js 18 or newer (the built package is smoke-tested on 18, 20, 22 and 24 in CI).
- Evergreen browsers, via ESM or the `dist/index.global.js` IIFE bundle (`Intlayer` global).
- It relies on the runtime's `Intl` (`NumberFormat`, `DateTimeFormat`, `PluralRules`, `ListFormat`, `RelativeTimeFormat`, `Collator`). `Intl.DurationFormat` is used when available.
- Zero runtime dependencies. About 5.5 KB min+gzip for `createI18n`; `isRTL` and `validateMessages` can be imported on their own and tree-shake.

## Errors

- `createI18n` throws a `TypeError` when `locale` is missing or empty, and a `RangeError` when it is not a valid BCP 47 tag. Underscore forms such as `en_US` are accepted.
- `setLocale` rejects with the same `RangeError` for an invalid tag. A loader that fails or times out does not reject: the locale stays unchanged and a warning is logged.
- Concurrent `setLocale` calls resolve to the most recently requested locale, regardless of the order in which loaders finish.
- A subscriber that throws is logged with `console.error` and does not stop other subscribers.
- `i18n.date()` throws a `RangeError` for an invalid date; inline `{value, date}` arguments render the raw value instead.

## Known limitations

- **ICU quoting gotcha:** an apostrophe directly before `{` or `}` starts a quoted section, as in ICU. To write `l'` before a placeholder, double it: `l''{name}`.
- `offset:` is supported on `plural` only (not `selectordinal`).
- A malformed plural/select block is rendered as its source text (like an unclosed `{`), never thrown. A well-formed block with no matching branch and no `other` renders nothing. Run `validateMessages` in CI to catch both.
- `mergeMessages` ignores the keys `__proto__`, `constructor` and `prototype`.
- Parsed messages and path resolvers are cached once per process (10,000 entries each, shared by all instances). Catalogs cycling through more distinct messages than that keep working but re-parse the least recently used ones.

## Migrating from 0.x

1.0.0 keeps the 0.7 public API. Behaviour changes to be aware of:

- `#` in plural branches is now locale-formatted (`1,500` instead of `1500`).
- After `setLocale('es-MX')`, the base language (`es`) is tried before the fallback list.
- Invalid or empty `locale` values now throw (constructor) or reject (`setLocale`) instead of being accepted silently.
- `{x, select, ...}` no longer throws when `x` is `constructor`, `toString` and similar.
- Overlapping `setLocale` calls: the latest call wins.
- `getFallbackLocale()` returns a copy.
- ICU apostrophe quoting is now interpreted (`''` renders `'`; `'{'` renders `{`). Backslash escapes still work.
- `offset:` is supported in `plural` blocks.
- A malformed plural/select block renders its source text instead of an empty string.
