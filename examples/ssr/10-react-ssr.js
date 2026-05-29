// examples/ssr/10-react-ssr.js
// Conceptual example of React SSR with intlayer
// In a real Next.js app you'd use getServerSideProps or similar.

import React from 'react'
import { renderToString } from 'react-dom/server'
import { createI18n } from '@paternina/intlayer'

// Mock React component that uses i18n via context (simplified)
function App({ locale, messages }) {
  const i18n = createI18n({ locale, messages })
  return (
    <div>
      <h1>{i18n.t('title')}</h1>
      <p>{i18n.t('description')}</p>
    </div>
  )
}

export async function renderPage() {
  const locale = 'es'
  const messages = {
    es: {
      title: 'Hola Mundo',
      description: 'Esta es una descripción de ejemplo.'
    }
  }

  const html = renderToString(<App locale={locale} messages={messages} />)

  // Serialize state for hydration
  const state = JSON.stringify({ locale, messages })

  return `
<!DOCTYPE html>
<html>
  <head><title>Intlayer SSR Example</title></head>
  <body>
    <div id="root">${html}</div>
    <script>
      window.__INTLAYER_STATE__ = ${state};
    </script>
    <script src="/client.js"></script>
  </body>
</html>
  `
}

// On client, you would recreate i18n from window.__INTLAYER_STATE__