// examples/advanced/6-locale-switch.js
import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hello' },
    es: { hello: 'Hola' }
  }
})

const unsubscribe = i18n.subscribe((locale) => {
  console.log('Locale changed to:', locale)
})

console.log('Initial locale:', i18n.getLocale()) // en
console.log(i18n.t('hello')) // Hello

async function switchLocale() {
  await i18n.setLocale('es')
  console.log('New locale:', i18n.getLocale()) // es
  console.log(i18n.t('hello')) // Hola
  unsubscribe()
}

switchLocale().catch(console.error)