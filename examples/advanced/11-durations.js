// Demonstrates duration formatting, both standalone and inside messages

import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  formats: {
    duration: {
      verbose: { style: 'long' }
    }
  },
  messages: {
    en: {
      eta: 'Ready in {time, duration}',
      elapsed: 'Took {time, duration, long}',
      verbose: 'Session lasted {time, duration, verbose}',
      retry: '{count, plural, one {Retry in {wait, duration}} other {# retries, next in {wait, duration}}}'
    }
  }
})

// Standalone helper
console.log(i18n.duration(3661)) // 1:01:01
console.log(i18n.duration(90, { style: 'long' })) // 1 minute, 30 seconds
console.log(i18n.duration(90, { style: 'narrow' })) // 1m 30s
console.log(i18n.duration({ hours: 2, minutes: 5 })) // 2:05:00

// Negative and zero values
console.log(i18n.duration(-90)) // -0:01:30
console.log(i18n.duration(0)) // 0:00:00

// Inside messages
console.log(i18n.t('eta', { time: 90 })) // Ready in 0:01:30
console.log(i18n.t('elapsed', { time: 3661 })) // Took 1 hour, 1 minute, 1 second
console.log(i18n.t('verbose', { time: 5400 })) // Session lasted 1 hour, 30 minutes

// Inside a plural branch
console.log(i18n.t('retry', { count: 1, wait: 90 })) // Retry in 0:01:30
console.log(i18n.t('retry', { count: 3, wait: 45 })) // 3 retries, next in 0:00:45

// Locale override
console.log(i18n.duration({ hours: 1 }, { style: 'long' }, 'es')) // 1 hora
