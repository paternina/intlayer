// examples/ssr/9-node-express.js
// Example of using intlayer in an Express middleware
// Note: This is a simplified example; in production you'd cache instances per locale.
// Make sure to install express: npm install express

import express from 'express'
import { createI18n } from '@paternina/intlayer'

const app = express()

// Middleware to attach i18n instance to request based on Accept-Language header
app.use((req, res, next) => {
  const locale = req.headers['accept-language']?.split(',')[0]?.slice(0, 2) || 'en'
  const i18n = createI18n({
    locale,
    fallbackLocale: ['en'],
    messages: {
      en: { welcome: 'Welcome' },
      es: { welcome: 'Bienvenido' },
      fr: { welcome: 'Bienvenue' }
    }
  })
  req.i18n = i18n
  next()
})

app.get('/', (req, res) => {
  const message = req.i18n.t('welcome')
  res.send(`<h1>${message}</h1>`)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})