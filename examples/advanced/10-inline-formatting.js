// Demonstrates ICU number/date/time arguments inside messages

import { createI18n } from '@paternina/intlayer'

const i18n = createI18n({
  locale: 'en',
  defaultCurrency: 'USD',
  timeZone: 'UTC',
  formats: {
    number: {
      budget: { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }
    },
    date: {
      compact: { year: 'numeric', month: 'short' }
    }
  },
  messages: {
    en: {
      receipt: 'You paid {total, number, currency} on {when, date, long}',
      meeting: 'Starts at {when, time, short}',
      stats: '{views, number, ::compact-short} views ({rate, number, percent})',
      budget: 'Budget: {value, number, budget}',
      period: 'Period: {when, date, compact}',
      cart: '{count, plural, one {# item for {total, number, currency}} other {# items for {total, number, currency}}}'
    }
  }
})

const when = new Date('2026-06-20T15:00:00Z')

// Built-in styles
console.log(i18n.t('receipt', { total: 42.5, when })) // You paid $42.50 on June 20, 2026
console.log(i18n.t('meeting', { when })) // Starts at 3:00 PM

// Skeletons
console.log(i18n.t('stats', { views: 12500, rate: 0.256 })) // 13K views (26%)

// Named formats
console.log(i18n.t('budget', { value: 1999.4 })) // Budget: £1,999
console.log(i18n.t('period', { when })) // Period: Jun 2026

// Arguments inside plural branches
console.log(i18n.t('cart', { count: 1, total: 9.5 })) // 1 item for $9.50
console.log(i18n.t('cart', { count: 3, total: 28.25 })) // 3 items for $28.25
