import { createI18n } from '../src/index'

const i18n = createI18n<'hello' | 'auth.login.title' | 'users[0].name'>({
  locale: 'en',
  messages: {
    en: {
      hello: 'Hello',
      auth: {
        login: {
          title: 'Login'
        }
      },
      users: [
        { name: 'Jane' }
      ]
    }
  }
})

i18n.t('hello')
i18n.t('auth.login.title')
i18n.t('users[0].name')

// @ts-expect-error unknown key is rejected when generic keys are provided
i18n.t('missing')

// A locale may be partially translated: fallbackLocale exists precisely for this.
const partial = createI18n<'hello' | 'bye'>({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hello', bye: 'Bye' },
    es: { hello: 'Hola' }
  }
})

partial.t('bye')

// mergeMessages accepts partial patches, both locale-scoped and flat.
partial.mergeMessages({ en: { hello: 'Hi there' } })
partial.mergeMessages({ hello: 'Flat patch' })

const nested = createI18n<'auth.login.title' | 'auth.login.button'>({
  locale: 'en',
  messages: { en: { auth: { login: { title: 'Login', button: 'Go' } } } }
})

nested.mergeMessages({ en: { auth: { login: { title: 'Sign in' } } } })

// Loosening to partials must NOT lose key safety.

// @ts-expect-error unknown key is still rejected in a merge patch
partial.mergeMessages({ en: { totallyUnknown: 'x' } })

// @ts-expect-error unknown nested key is still rejected
nested.mergeMessages({ en: { auth: { login: { bogus: 'x' } } } })

// @ts-expect-error a non-string leaf is still rejected
partial.mergeMessages({ en: { hello: 123 } })

// @ts-expect-error unknown key is still rejected in the messages option
createI18n<'hello'>({ locale: 'en', messages: { en: { nope: 'x' } } })
