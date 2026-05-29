// examples/advanced/8-nested.js
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      nav: {
        home: 'Home',
        settings: {
          title: 'Settings',
          account: 'Account'
        }
      }
    }
  }
})

console.log(i18n.t('nav.home')) // Home
console.log(i18n.t('nav.settings.title')) // Settings
console.log(i18n.t('nav.settings.account')) // Account