// examples/basic/1-hello.js
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      hello: 'Hello World'
    }
  }
})

console.log(i18n.t('hello')) // Hello World