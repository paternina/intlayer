// examples/basic/4-has-check.js
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      hello: 'Hello',
      items: '{count, plural, one {# item} other {# items}}'
    }
  }
})

console.log(i18n.has('hello')) // true
console.log(i18n.has('missing')) // false

// With fallback
i18n.t('hello')
console.log(i18n.has('hello')) // true (exists in fallback)