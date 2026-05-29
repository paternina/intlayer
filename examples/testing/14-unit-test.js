// examples/testing/14-unit-test.js
// Example of mocking intlayer in a unit test (using Jest)
import { createI18n } from '@paternina/intlayer'

// Function under test that uses i18n
function greetUser(i18n, userName) {
  const message = i18n.t('greeting', { name: userName })
  return `Message: ${message}`
}

test('greets user with translated message', () => {
  // Create a mock i18n instance with overridden t method
  const mockI18n = {
    t: jest.fn((key, values) => {
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