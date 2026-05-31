// examples/testing/15-vitest-mock.js
// Example of mocking intlayer in a unit test (using Vitest)
import { createI18n } from '@paternina/intlayer'
import { expect, test, vi } from 'vitest'

// Function under test that uses i18n
function greetUser(i18n, userName) {
  const message = i18n.t('greeting', { name: userName })
  return `Message: ${message}`
}

test('greets user with translated message', () => {
  // Create a mock i18n instance with vi.fn() for Vitest
  const mockI18n = {
    t: vi.fn((key, values) => {
      if (key === 'greeting') {
        return `Hello ${values.name}`
      }
      return key
    })
  }

  const result = greetUser(mockI18n, 'Alice')
  expect(result).toBe('Message: Hello Alice')
  expect(mockI18n.t).toHaveBeenCalledWith('greeting', { name: 'Alice' })
})

test('uses has() to check translation existence before rendering', () => {
  const i18n = createI18n({
    locale: 'en',
    messages: {
      greeting: 'Hello'
    }
  })

  // Conditional rendering based on translation existence
  const message = i18n.has('greeting') ? i18n.t('greeting') : 'Default message'
  expect(message).toBe('Hello')

  const missing = i18n.has('nonexistent') ? i18n.t('nonexistent') : 'Default message'
  expect(missing).toBe('Default message')
})

test('pluralization works with fallback languages', () => {
  const i18n = createI18n({
    locale: 'de',
    fallbackLocale: 'en',
    messages: {
      en: { items: '{count, plural, one {# item} other {# items}}' }
    }
  })

  expect(i18n.t('items', { count: 1 })).toBe('1 item')
  expect(i18n.t('items', { count: 5 })).toBe('5 items')
})