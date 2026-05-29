// examples/basic/3-plural.js
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      items: '{count, plural, one {# item} other {# items}}'
    }
  }
})

console.log(i18n.t('items', { count: 0 })) // 0 items
console.log(i18n.t('items', { count: 1 })) // 1 item
console.log(i18n.t('items', { count: 5 })) // 5 items