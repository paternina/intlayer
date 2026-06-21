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
