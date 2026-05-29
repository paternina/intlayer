# intlayer Documentation

## Uso rápido

Instala el paquete localmente:

```bash
npm install @paternina/intlayer
```

Importa el runtime en un proyecto ESM:

```ts
import { createI18n, isRTL } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: ['en'], // puede ser string o string[]
  messages: {
    en: {
      welcome: 'Hello {name}',
      items: '{count, plural, one {# item} other {# items}}'
    }
  }
})

console.log(i18n.t('welcome', { name: 'Jane' }))
console.log(i18n.t('items', { count: 2 }))
console.log(i18n.getDirection()) // 'ltr' o 'rtl'
console.log(isRTL('ar'))
```

## API principal

- `createI18n(options)`
- `i18n.t(key, values)`
- `i18n.setLocale(locale)`
- `i18n.getLocale()`
- `i18n.getFallbackLocale()` // devuelve string | string[]
- `i18n.getDirection()` // devuelve 'rtl' | 'ltr'
- `i18n.subscribe(listener)`
- `i18n.destroy()`
- `i18n.number(value, options)`
- `i18n.date(value, options)`
- `i18n.relativeTime(value, unit, options)`
- `isRTL(locale)`

## Mensajes y pluralización

Soporta lookup de claves anidadas y plantillas con interpolación. Ejemplo de plural:

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

## Cambio de locale y suscripciones

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

## Carga perezosa de locales

Agrega `loaders` para cargar mensajes solo cuando se necesiten:

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

## Archivos de traducción

Puedes cargar las traducciones desde importaciones JavaScript, TypeScript o JSON siempre que devuelvan un objeto con claves y valores.

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

Si prefieres carga perezosa, usa un loader que importe el JSON o el módulo cuando sea necesario:

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

### Uso tipo resources

También puedes construir un objeto `resources` a partir de archivos de traducción importados:

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

El motor no requiere que las traducciones provengan de archivos `.ts` o `.js`: solo necesita un objeto plano con claves de traducción.

## Formateo nativo

```ts
i18n.number(1234567.89)
i18n.date(new Date())
i18n.relativeTime(-1, 'day')
```

## Uso desde CDN

El paquete está disponible en npm como `@paternina/intlayer` y puede cargarse desde un CDN compatible como `jsdelivr` o `unpkg`.

Ejemplo de importación ESM en un navegador moderno:

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

Ejemplo global para navegador usando la compilación IIFE:

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
