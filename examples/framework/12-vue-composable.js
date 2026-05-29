// examples/framework/12-vue-composable.js
// Vue 3 composable for intlayer (conceptual)
import { reactive } from 'vue'
import { createI18n } from '@paternina/intlayer'

function useI18n(options) {
  const state = reactive({
    i18n: createI18n(options),
    t: (key, values) => state.i18n.t(key, values)
  })

  // Update locale reactively
  function setLocale(locale) {
    state.i18n.setLocale(locale)
  }

  return {
    ...state,
    setLocale
  }
}

// Usage in Vue component:
// setup() {
//   const { t, setLocale } = useI18n({
//     locale: 'en',
//     messages: { en: { hello: 'Hello' } }
//   })
//   return { t, setLocale }
// }