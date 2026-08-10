// Demonstrates catching malformed ICU syntax before it reaches production.
// Run this as a build/CI step over your locale files.

import { validateMessages, assertValidMessages, formatIssues } from '@paternina/intlayer'

const messages = {
  en: {
    greeting: 'Hello {name}',
    items: '{count, plural, one {# item}}',
    price: '{value, number, monetary}',
    broken: 'Hello {name'
  },
  es: {
    greeting: 'Hola {name}',
    items: '{count, plural, one {# artículo} other {# artículos}}'
  }
}

const result = validateMessages(messages)

console.log('valid:', result.valid) // false

for (const issue of result.issues) {
  console.log(`${issue.locale}:${issue.key} [${issue.code}] ${issue.message}`)
}
// en:items [missing-other] plural block is missing the required "other" branch.
// en:price [unknown-style] Unknown number style "monetary". ...
// en:broken [unbalanced-brace] Unclosed "{". ...

// Readable one-shot output
console.log(formatIssues(result.issues))

// Pass the same named formats you use at runtime so they are recognised
validateMessages(messages, {
  formats: { number: { monetary: { style: 'currency', currency: 'USD' } } }
})

// Fail a build outright
try {
  assertValidMessages(messages)
} catch (error) {
  console.error(error.message)
  // process.exit(1)
}

// Valid catalogs pass silently
assertValidMessages({ en: { ok: 'All good {name}' } })
console.log('valid catalog passed')
