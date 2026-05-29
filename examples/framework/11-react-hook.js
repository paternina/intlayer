// examples/framework/11-react-hook.js
// Custom React hook for intlayer (conceptual)
import { useState, useEffect, useCallback } from 'react'
import { createI18n } from '@paternina/intlayer'

function useI18n(options) {
  const [i18n, setI18n] = useState(null)

  useEffect(() => {
    const instance = createI18n(options)
    setI18n(instance)
    return () => instance.destroy()
  }, [JSON.stringify(options)]) // Recreate if options change

  const t = useCallback((key, values) => {
    if (!i18n) return key
    return i18n.t(key, values)
  }, [i18n])

  return { t, i18n }
}

// Usage example:
// function MyComponent() {
//   const { t } = useI18n({
//     locale: 'en',
//     fallbackLocale: ['en'],
//     messages: { en: { hello: 'Hello' } }
//   })
//   return <div>{t('hello')}</div>
// }