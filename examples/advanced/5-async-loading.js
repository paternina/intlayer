// examples/advanced/5-async-loading.js
import { createI18n } from '@paternina/intlayer'

// Simulate async loader for French locale
const loadFr = () =>
  new Promise((resolve) => {
    setTimeout(() => resolve({ hello: 'Salut', bye: 'Au revoir' }), 100)
  })

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hi' }
  },
  loaders: {
    fr: loadFr
  }
})

async function run() {
  console.log('Before loading French:', i18n.t('hello')) // Hi
  await i18n.setLocale('fr')
  console.log('After loading French:', i18n.t('hello')) // Salut
  console.log('Another key:', i18n.t('bye')) // Au revoir
}

run().catch(console.error)