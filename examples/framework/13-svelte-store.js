// examples/framework/13-svelte-store.js
// Svelte store for intlayer (conceptual)
import { writable } from 'svelte/store'
import { createI18n } from '@paternina/intlayer'

function createI18nStore(options) {
  const i18n = createI18n(options)
  const { subscribe, set, update } = writable(i18n)

  return {
    subscribe,
    // Helper to get translation directly from store instance
    getTranslation: (key, values) => i18n.t(key, values),
    setLocale: (locale) => {
      i18n.setLocale(locale)
    },
    destroy: () => {
      i18n.destroy()
    }
  }
}

// Usage in .svelte file:
// import { i18nStore } from './i18nStore.js'
// $: translation = i18nStore.getTranslation('hello', {})
// Or use await i18nStore.setLocale('es')