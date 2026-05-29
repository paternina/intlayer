// examples/advanced/7-formatters.js
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'de',
  messages: {
    de: {}
  }
})

console.log('Number:', i18n.number(1234567.89)) // 1.234.567,89
console.log('Date:', i18n.date(new Date(2026, 4, 29))) // 29.5.2026
console.log('Relative time:', i18n.relativeTime(-1, 'day')) // vor einem Tag