// examples/advanced/9-icu-plural-languages.js
// Demonstrates locale-aware pluralization across different languages

import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {
    en: {
      items: '{count, plural, one {# item} other {# items}}'
    },
    ru: {
      items: '{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}'
    },
    ar: {
      items: '{count, plural, one {# عنصر} few {# عناصر} other {# عناصر}}'
    }
  }
})

console.log('Russian (ru):')
console.log('  1 item:', i18n.t('items', { count: 1 })) // 1 товар
console.log('  2 items:', i18n.t('items', { count: 2 })) // 2 товара
console.log('  5 items:', i18n.t('items', { count: 5 })) // 5 товаров

// Switch to Arabic
await i18n.setLocale('ar')
console.log('Arabic (ar):')
console.log('  1 item:', i18n.t('items', { count: 1 })) // 1 عنصر
console.log('  2 items:', i18n.t('items', { count: 2 })) // 2 عناصر
console.log('  5 items:', i18n.t('items', { count: 5 })) // 5 عناصر

// Switch back to English
await i18n.setLocale('en')
console.log('English (en):')
console.log('  1 item:', i18n.t('items', { count: 1 })) // 1 item
console.log('  2 items:', i18n.t('items', { count: 2 })) // 2 items

const switchLocale = async () => {
  await i18n.setLocale('ar')
  await i18n.setLocale('en')
}

switchLocale().catch(console.error)