// examples/basic/2-interpolation.js
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      welcome: 'Hello {name}'
    }
  }
})

console.log(i18n.t('welcome', { name: 'Jane' })) // Hello Jane