// examples/advanced/4-fallback.js
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'es',
  fallbackLocale: ['en', 'fr'], // try English, then French
  messages: {
    en: {
      greeting: 'Hello'
    },
    fr: {
      greeting: 'Bonjour'
    }
    // es missing greeting intentionally
  }
})

console.log(i18n.t('greeting')) // Should fall back to English -> 'Hello'