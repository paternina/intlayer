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
- `i18n.mergeMessages(messages)` — fusiona traducciones en runtime
- `i18n.has(key)` — verifica si existe una traducción
- `validateMessages(messages, options)` — valida la sintaxis ICU
- `validateMessage(message, options)` — valida un solo mensaje
- `assertValidMessages(messages, options)` — lanza un error si el catálogo es inválido
- `formatIssues(issues)` — formatea los problemas como texto legible
- `isRTL(locale)`

### Opciones

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `locale` | `string` | — | Locale activo |
| `fallbackLocale` | `string \| string[]` | `locale` | Cadena de fallback (deduplicada, base locale auto-agregada) |
| `messages` | `Messages \| Record<string, Messages>` | — | Traducciones iniciales |
| `loaders` | `Record<string, () => Promise<Messages>>` | — | Carga perezosa por locale |
| `warnOnMissingKey` | `boolean` | `false` | Log de keys faltantes en consola (dev) |
| `onMissingKey` | `(key, locale) => string` | — | Valor custom para keys faltantes |
| `loaderTimeout` | `number` (ms) | `0` (disabled) | Timeout para loaders lentos |
| `formats` | `CustomFormats` | — | Formatos `number`/`date`/`time`/`duration` con nombre, usables dentro de los mensajes |
| `defaultCurrency` | `string` | `'USD'` | Moneda usada por el estilo `currency` |
| `timeZone` | `string` | — | Zona horaria por defecto para argumentos `date`/`time` e `i18n.date()` |
| `localeMap` | `boolean` | autodetectado | Fuerza a leer `messages` como mapa de locales (`true`) o catálogo plano (`false`) |

## Mensajes y pluralización

Soporta lookup de claves anidadas (incluyendo notación de arreglos) y plantillas con interpolación.

### Rutas de arreglos y escapado

Puedes usar índices de arreglos para resolver elementos, y escapar caracteres reservados (`{`, `}`, `#`) anteponiendo una barra invertida (`\\`) o con comillas simples de ICU: `It''s` produce `It's` y `'{'name'}'` produce `{name}`. En un plural, `offset:1` resta 1 al conteo antes de elegir la categoría y de mostrar `#` (`=N` compara con el valor original).

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    users: [
      { name: 'John' },
      { name: 'Jane' }
    ],
    escaped: 'Usa \\{variable\\} para mostrar las llaves'
  }
})

console.log(i18n.t('users[0].name')) // John
console.log(i18n.t('escaped')) // Usa {variable} para mostrar las llaves
```

### Valores default con interpolación

Pasa valores y fallback en la misma llamada:

```ts
console.log(i18n.t('missing', { name: 'Jane' }, 'Hello {name}')) // Hello Jane
```

Si la key existe, el default se ignora. Si falta, intlayer usa el default como mensaje y aplica interpolación.

### Plurales

Los plurales soportan coincidencias exactas (ej. `=0`) además de las categorías estándar (`zero`, `one`, `two`, `few`, `many`, `other`):

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    items: '{count, plural, =0 {Sin items} =1 {Un item} other {# items}}'
  }
})

console.log(i18n.t('items', { count: 0 })) // Sin items
console.log(i18n.t('items', { count: 1 })) // Un item
console.log(i18n.t('items', { count: 5 })) // 5 items
```

Las reglas de plural se aplican automáticamente según el locale donde se encontró la traducción (no el locale activo):

```ts
const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {
    en: { items: '{count, plural, one {# item} other {# items}}' },
    ru: { items: '{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}' }
  }
})

// Usa reglas de plural ruso cuando el locale activo es ruso
console.log(i18n.t('items', { count: 1 })) // 1 товар
console.log(i18n.t('items', { count: 2 })) // 2 товара
console.log(i18n.t('items', { count: 5 })) // 5 товаров
```

### Select y selectordinal

Usa `select` para género u otros valores discretos:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    owner: '{gender, select, male {He owns it} female {She owns it} other {They own it}}'
  }
})

console.log(i18n.t('owner', { gender: 'female' })) // She owns it
```

Usa `selectordinal` para ordinales según locale:

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

### Argumentos de número, fecha y hora

Los valores pueden formatearse dentro del mensaje, de modo que los traductores controlen la frase completa en lugar de recibir fragmentos ya formateados:

```ts
const i18n = createI18n({
  locale: 'es',
  defaultCurrency: 'EUR',
  timeZone: 'UTC',
  messages: {
    es: {
      recibo: 'Pagaste {total, number, currency} el {when, date, long}',
      reunion: 'Comienza a las {when, time, short}'
    }
  }
})

const when = new Date('2026-06-20T15:00:00Z')

console.log(i18n.t('recibo', { total: 42.5, when })) // Pagaste 42,50 € el 20 de junio de 2026
console.log(i18n.t('reunion', { when })) // Comienza a las 15:00
```

La sintaxis es `{nombre, tipo, estilo}`, donde `tipo` es `number`, `date`, `time` o `duration`. El `estilo` es opcional.

#### Estilos integrados

| Tipo | Estilos | Default |
|------|---------|---------|
| `number` | `integer`, `percent`, `currency` | número formateado según el locale |
| `date` | `short`, `medium`, `long`, `full` | `medium` |
| `time` | `short`, `medium`, `long`, `full` | `medium` |
| `duration` | `digital`, `narrow`, `short`, `long` | `digital` |

El estilo `currency` usa la opción `defaultCurrency` (`USD` si no se define).

#### Skeletons

Prefija el estilo con `::` para usar un skeleton estilo ICU:

```ts
const i18n = createI18n({
  locale: 'es',
  timeZone: 'UTC',
  messages: {
    es: {
      precio: '{value, number, ::currency/EUR}',
      vistas: '{value, number, ::compact-short}',
      exacto: '{value, number, ::.00}',
      dia: '{when, date, ::yyyyMMdd}',
      hora: '{when, time, ::HHmm}'
    }
  }
})
```

Tokens numéricos soportados: `percent`, `currency/XXX`, `unit/xxx`, `compact-short`, `compact-long`, `scientific`, `engineering`, `precision-integer`, `group-off`, `group-auto`, `sign-always`, `sign-never`, `sign-except-zero`, `sign-accounting`, `integer-width/000` y patrones de fracción como `.00` o `.0#`. Se pueden combinar separados por espacios (`::currency/JPY precision-integer`).

Los skeletons de fecha y hora aceptan los símbolos habituales: `y`, `M`/`MMM`/`MMMM`, `d`, `E`/`EEEE`, `h`/`H`, `m`, `s`, `z`.

#### Formatos con nombre

Registra estilos reutilizables con la opción `formats` y úsalos por nombre. Los formatos con nombre tienen prioridad sobre los estilos integrados, así que puedes personalizar `currency` o `short` globalmente:

```ts
const i18n = createI18n({
  locale: 'es',
  formats: {
    number: { presupuesto: { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 } },
    date: { compacta: { year: 'numeric', month: 'short' } }
  },
  messages: {
    es: { presupuesto: 'Presupuesto: {value, number, presupuesto}' }
  }
})
```

Los argumentos también funcionan dentro de bloques `plural` y `select`, y `#` puede formatearse como cualquier otro valor:

```ts
const i18n = createI18n({
  locale: 'es',
  defaultCurrency: 'EUR',
  messages: {
    es: {
      carrito: '{count, plural, one {# artículo por {total, number, currency}} other {# artículos por {total, number, currency}}}'
    }
  }
})
```

El formateo es tolerante a errores: un valor ausente produce una cadena vacía, un estilo desconocido cae al formato simple del locale, y un valor que no puede interpretarse como número o fecha se muestra tal cual. Nunca se lanza una excepción al renderizar.

### Duraciones

Las duraciones aceptan un número de segundos o un registro explícito con `days`, `hours`, `minutes` y `seconds`:

```ts
const i18n = createI18n({
  locale: 'es',
  messages: {
    es: {
      eta: 'Listo en {time, duration}',
      transcurrido: 'Tomó {time, duration, long}'
    }
  }
})

console.log(i18n.t('eta', { time: 90 }))        // Listo en 0:01:30
console.log(i18n.t('transcurrido', { time: 3661 })) // Tomó 1 hora, 1 minuto y 1 segundo
```

El mismo formateo está disponible como método:

```ts
i18n.duration(3661)                    // 1:01:01
i18n.duration(90, { style: 'long' })   // 1 minuto y 30 segundos
i18n.duration(90, { style: 'narrow' }) // 1 min 30 s
```

Los valores negativos llevan el prefijo `-`, una duración cero se muestra explícitamente (`0:00:00`) y un valor no finito devuelve una cadena vacía.

Se usa `Intl.DurationFormat` cuando el runtime lo provee (Node 23+, navegadores recientes); en caso contrario se recurre a `Intl.NumberFormat` con estilos de unidad más `Intl.ListFormat`. Ambos caminos producen exactamente la misma salida, así que el comportamiento no cambia según el runtime.

## Validación de mensajes

Un mensaje ICU mal formado es fácil de introducir y, por diseño, el runtime nunca lanza una excepción por ello. `validateMessages` permite detectar estos problemas en CI o en un paso de build:

```ts
import { validateMessages } from '@paternina/intlayer'

const result = validateMessages({
  es: {
    items: '{count, plural, one {# artículo}}',
    precio: '{value, number, monetario}'
  }
})

console.log(result.valid) // false
console.log(result.issues)
// [
//   { code: 'missing-other', key: 'items', locale: 'es', offset: 0, message: '...' },
//   { code: 'unknown-style', key: 'precio', locale: 'es', offset: 0, message: '...' }
// ]
```

Los mapas de locales se detectan automáticamente, por lo que `issues[].locale` se completa en catálogos `{ es: {...}, en: {...} }` y se omite en catálogos planos. Las claves anidadas se reportan como rutas con puntos (`auth.login.title`) y los elementos de arreglos con índices (`items[1]`).

### Fallar el build

```ts
import { assertValidMessages } from '@paternina/intlayer'
import messages from './locales/es.json'

assertValidMessages(messages) // lanza un Error con todos los problemas
```

### Problemas detectados

| Código | Descripción |
|--------|-------------|
| `unbalanced-brace` | `{` sin cerrar, o `}` suelta sin escapar |
| `empty-placeholder` | `{}` sin contenido |
| `invalid-argument-name` | Nombre ausente o con espacios |
| `unknown-argument-type` | Tipo distinto de `number`, `date`, `time`, `duration`, `plural`, `select`, `selectordinal` |
| `malformed-argument` | Argumento que no se puede parsear |
| `malformed-block` | Bloque sin ramas, sin coma, o con una rama sin cuerpo |
| `invalid-branch` | Rama de plural que no es categoría CLDR ni coincidencia exacta `=` válida |
| `duplicate-branch` | Rama declarada dos veces |
| `missing-other` | `plural`, `select` o `selectordinal` sin la rama `other` requerida |
| `unknown-style` | Estilo que no es integrado ni un formato con nombre registrado |
| `empty-style` | Coma final sin estilo |
| `empty-skeleton` | `::` sin nada después |
| `unknown-skeleton-token` | Token de skeleton no reconocido |
| `hash-outside-plural` | `#` fuera de un bloque plural (solo con `strictHash`) |

### Opciones

Pasa los mismos `formats` que usas en `createI18n` para que los formatos con nombre sean reconocidos, y activa `strictHash` para marcar un `#` literal fuera de bloques plural:

```ts
validateMessages(messages, {
  formats: { number: { presupuesto: { style: 'currency', currency: 'GBP' } } },
  strictHash: true
})
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

### Gestión de locales

Precarga locales sin cambiar el locale activo, inspecciona locales cargados y lee mensajes raw:

```ts
await i18n.loadLocale('fr')
await i18n.loadLocales(['es', 'de'])

console.log(i18n.getLoadedLocales()) // ['en', 'fr', 'es']
console.log(i18n.getMessages('fr')) // { greet: 'Salut' }
console.log(i18n.getMessages()) // mensajes del locale activo
```

`loadLocale()` y `loadLocales()` devuelven `false` cuando un locale no tiene loader o el loader hace timeout.

### Fusión de traducciones en runtime

Usa `mergeMessages` para inyectar o extender traducciones después de la inicialización. Los suscriptores activos serán notificados automáticamente para re-renderizar la UI:

```ts
i18n.mergeMessages({
  common: { save: 'Guardar' }
})

// o fusionar en un locale existente
i18n.mergeMessages({
  en: { newKey: 'Nueva traducción' }
})
```

Los parches se fusionan en profundidad y pueden ser parciales: solo envías las claves que quieres cambiar, incluso con claves tipadas.

```ts
const i18n = createI18n<'auth.login.title' | 'auth.login.button'>({
  locale: 'es',
  messages: { es: { auth: { login: { title: 'Entrar', button: 'Ir' } } } }
})

// Solo se reemplaza `title`; `button` se conserva.
i18n.mergeMessages({ es: { auth: { login: { title: 'Iniciar sesión' } } } })
```

Las claves desconocidas se siguen rechazando en tiempo de compilación, así que los parches parciales no debilitan la seguridad de tipos.

### Catálogos planos vs mapas de locales

`messages` acepta un catálogo plano para el locale activo o un mapa de locales:

```ts
// plano - pertenece a `locale`
createI18n({ locale: 'es', messages: { hola: 'Hola' } })

// mapa de locales
createI18n({ locale: 'es', messages: { es: { hola: 'Hola' }, en: { hola: 'Hello' } } })
```

Ambas formas se distinguen comprobando si las claves de primer nivel parecen códigos de locale **y** si al menos una es un locale que la instancia realmente conoce: el locale activo, una entrada de la cadena de fallback, o un loader declarado.

Esto importa porque muchos namespaces normales también son códigos de idioma válidos (`id`, `no`, `it`, `is`, `as`, `ok`). Un catálogo como este se trata correctamente como plano:

```ts
const i18n = createI18n({
  locale: 'es',
  messages: { id: { label: 'Identificador' } }
})

i18n.t('id.label') // Identificador
```

Si tu catálogo es genuinamente ambiguo, define `localeMap` de forma explícita:

```ts
createI18n({ locale: 'id', messages: { id: { label: 'Nilai' } }, localeMap: true })
createI18n({ locale: 'es', messages: { es: { anidado: 'Valor' } }, localeMap: false })
```

Los locales también pueden estar traducidos parcialmente — para eso existe `fallbackLocale`, y los tipos lo permiten:

```ts
createI18n<'hola' | 'adios'>({
  locale: 'es',
  fallbackLocale: 'es',
  messages: {
    es: { hola: 'Hola', adios: 'Adiós' },
    en: { hola: 'Hello' } // `adios` cae al español
  }
})
```

### Advertencias en desarrollo

Habilita `warnOnMissingKey` para loguear keys faltantes durante desarrollo:

```ts
const i18n = createI18n({
  locale: 'en',
  warnOnMissingKey: true,
  messages: { en: { hello: 'Hello' } }
})

i18n.t('missing') // console.warn: [intlayer] Missing translation key: "missing"
```

Usa `onMissingKey` para devolver un valor custom antes de fallback a la key:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: {} },
  onMissingKey: (key) => `Missing ${key}`
})

i18n.t('missing') // Missing missing
```

### Timeout de loaders

Usa `loaderTimeout` para evitar cuelgues con loaders lentos:

```ts
const i18n = createI18n({
  locale: 'en',
  loaders: {
    fr: async () => ({ hello: 'Bonjour' })
  },
  loaderTimeout: 5000 // 5 segundos
})

await i18n.setLocale('fr')
```

### Verificar existencia de traducciones

Usa `has()` para verificar si una clave de traducción existe en el locale activo o la cadena de fallback:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: { hello: 'Hello', missing: undefined } }
})

i18n.has('hello') // true
i18n.has('missing') // false
i18n.has('nonexistent') // false
```

### Tipado opcional de seguridad en TypeScript

Para autocompletado y verificación en tiempo de compilación, proporciona tus claves de traducción:

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

i18n.t('hello')     // ✅ OK - autocompletado
i18n.t('missing')   // ❌ Error de TypeScript
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
i18n.date(new Date('2026-06-20T23:30:00Z'), {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit'
})
i18n.relativeTime(-1, 'day')
i18n.list(['Ana', 'Bob', 'Cara'])
i18n.compare('b', 'a')
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

## Entornos soportados

- Node.js 18 o superior (el paquete compilado se prueba en 18, 20, 22 y 24 en CI).
- Navegadores modernos, mediante ESM o el bundle IIFE `dist/index.global.js` (global `Intlayer`).
- Usa el `Intl` del entorno. `Intl.DurationFormat` se usa cuando está disponible.
- Sin dependencias en runtime. Unos 5,5 KB min+gzip para `createI18n`.

## Errores

- `createI18n` lanza `TypeError` si `locale` falta o está vacío, y `RangeError` si no es una etiqueta BCP 47 válida (`en_US` se acepta).
- `setLocale` rechaza con `RangeError` ante una etiqueta inválida. Si un loader falla o expira, el locale no cambia y se registra una advertencia.
- Varias llamadas simultáneas a `setLocale` terminan en el último locale solicitado.
- Un suscriptor que lanza un error se registra con `console.error` y no impide que los demás se ejecuten.

## Limitaciones conocidas

- Un apóstrofo justo antes de `{` o `}` abre una sección entrecomillada (como en ICU). Para escribir `l'` antes de un placeholder, duplícalo: `l''{name}`.
- `offset:` está soportado solo en `plural` (no en `selectordinal`).
- Un bloque plural/select mal formado se muestra como su texto fuente (como una `{` sin cerrar) y nunca lanza; un bloque válido sin rama coincidente ni `other` no muestra nada. Usa `validateMessages` en CI.
- Los mensajes parseados y los resolvedores de ruta se cachean una vez por proceso (10.000 entradas cada uno, compartidos entre instancias).
- `mergeMessages` ignora las claves `__proto__`, `constructor` y `prototype`.

## Migración desde 0.x

La API pública de 0.7 se mantiene. Cambios de comportamiento en 1.0.0:

- `#` en plurales se formatea según el locale (`1,500` en lugar de `1500`).
- Tras `setLocale('es-MX')`, se prueba `es` antes de la lista de fallback.
- Un `locale` inválido o vacío ahora lanza (constructor) o rechaza (`setLocale`).
- `select` ya no falla con valores como `constructor` o `toString`.
- Ante llamadas solapadas a `setLocale`, gana la última.
- `getFallbackLocale()` devuelve una copia.
- Las comillas simples de ICU ahora se interpretan (`''` produce `'`; `'{'` produce `{`).
- `offset:` está soportado en bloques `plural`.
- Un bloque plural/select mal formado muestra su texto fuente en lugar de una cadena vacía.
