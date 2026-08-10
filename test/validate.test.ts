import { describe, expect, it } from 'vitest'
import { assertValidMessages, formatIssues, validateMessage, validateMessages } from '../src/index'

const codes = (message: string) => validateMessage(message).map((issue) => issue.code)

describe('validateMessage - valid input', () => {
  it.each([
    'Plain text',
    '',
    'Hello {name}',
    'Hello {  name  }',
    '{count, plural, one {# item} other {# items}}',
    '{count, plural, =0 {No items} =1 {A single item} other {# items}}',
    '{gender, select, male {He} female {She} other {They}}',
    '{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}',
    'Use \\{name\\} for variables.',
    '{count, plural, one {\\#1 item} other {\\# items}}',
    '{total, number, currency}',
    '{total, number, integer}',
    '{value, number, ::compact-short}',
    '{value, number, ::currency/JPY precision-integer}',
    '{value, number, ::.00}',
    '{value, number, ::.0#}',
    '{value, number, ::integer-width/000}',
    '{when, date, long}',
    '{when, date, ::yyyyMMdd}',
    '{when, time, ::HHmm}',
    '{time, duration}',
    '{time, duration, long}',
    '{count, plural, one {# item for {total, number, currency}} other {# items for {total, number, currency}}}',
    '{count, plural, other {{#, number, ::compact-short} views}}',
    '{a, select, yes {Y} no {N} other {?}}'
  ])('accepts %j', (message) => {
    expect(validateMessage(message)).toEqual([])
  })

  it('accepts named formats supplied through options', () => {
    const options = {
      formats: {
        number: { budget: { style: 'currency', currency: 'GBP' } as Intl.NumberFormatOptions },
        date: { compact: { year: 'numeric' } as Intl.DateTimeFormatOptions },
        duration: { verbose: { style: 'long' as const } }
      }
    }

    expect(validateMessage('{v, number, budget}', options)).toEqual([])
    expect(validateMessage('{v, date, compact}', options)).toEqual([])
    expect(validateMessage('{v, duration, verbose}', options)).toEqual([])
  })
})

describe('validateMessage - structural errors', () => {
  it('detects an unclosed brace', () => {
    expect(codes('Hello {name')).toEqual(['unbalanced-brace'])
  })

  it('detects an unexpected closing brace', () => {
    expect(codes('Hello name}')).toEqual(['unbalanced-brace'])
  })

  it('detects an empty placeholder', () => {
    expect(codes('Hello {}')).toEqual(['empty-placeholder'])
  })

  it('detects a placeholder name containing whitespace', () => {
    expect(codes('Hello {first name}')).toEqual(['invalid-argument-name'])
  })

  it('detects a missing argument type after a comma', () => {
    expect(codes('{value, }')).toEqual(['unknown-argument-type'])
  })

  it('detects a missing argument name', () => {
    expect(codes('{, number}')).toEqual(['invalid-argument-name'])
  })

  it('detects an unknown argument type', () => {
    const issues = validateMessage('{value, spellout}')

    expect(issues).toHaveLength(1)
    expect(issues[0]!.code).toBe('unknown-argument-type')
    expect(issues[0]!.message).toContain('spellout')
  })
})

describe('validateMessage - block errors', () => {
  it('detects a plural block missing the other branch', () => {
    expect(codes('{count, plural, one {# item}}')).toEqual(['missing-other'])
  })

  it('detects a select block missing the other branch', () => {
    expect(codes('{g, select, male {He}}')).toEqual(['missing-other'])
  })

  it('detects an invalid plural branch name', () => {
    const issues = validateMessage('{count, plural, singular {x} other {y}}')

    expect(issues.map((issue) => issue.code)).toEqual(['invalid-branch'])
    expect(issues[0]!.message).toContain('singular')
  })

  it('accepts any branch name in a select block', () => {
    expect(validateMessage('{g, select, singular {x} other {y}}')).toEqual([])
  })

  it('detects a duplicate branch', () => {
    expect(codes('{count, plural, one {a} one {b} other {c}}')).toEqual(['duplicate-branch'])
  })

  it('detects an invalid exact match', () => {
    expect(codes('{count, plural, =x {a} other {b}}')).toEqual(['invalid-branch'])
  })

  it('accepts negative and decimal exact matches', () => {
    expect(validateMessage('{count, plural, =-1 {a} =1.5 {b} other {c}}')).toEqual([])
  })

  it('detects a branch with no body', () => {
    expect(codes('{count, plural, one other {x}}')).toContain('malformed-block')
  })

  it('detects an empty block', () => {
    expect(codes('{count, plural, }')).toEqual(['malformed-block'])
  })

  it('detects a block missing the comma before its branches', () => {
    expect(codes('{count, plural one {a} other {b}}')).toEqual(['malformed-block'])
  })

  it('detects an unclosed branch body', () => {
    expect(codes('{count, plural, other {oops}')).toEqual(['unbalanced-brace'])
  })

  it('reports errors nested inside a branch', () => {
    expect(codes('{count, plural, other {{inner, bogus}}}')).toEqual(['unknown-argument-type'])
  })
})

describe('validateMessage - style errors', () => {
  it('detects an unknown number style', () => {
    const issues = validateMessage('{v, number, monetary}')

    expect(issues.map((issue) => issue.code)).toEqual(['unknown-style'])
    expect(issues[0]!.message).toContain('monetary')
  })

  it('detects an unknown date and time style', () => {
    expect(codes('{v, date, huge}')).toEqual(['unknown-style'])
    expect(codes('{v, time, huge}')).toEqual(['unknown-style'])
  })

  it('detects an unknown duration style', () => {
    expect(codes('{v, duration, clock}')).toEqual(['unknown-style'])
  })

  it('detects an empty style after the comma', () => {
    expect(codes('{v, number, }')).toEqual(['empty-style'])
  })

  it('detects an empty skeleton', () => {
    expect(codes('{v, number, ::}')).toEqual(['empty-skeleton'])
    expect(codes('{v, date, ::}')).toEqual(['empty-skeleton'])
  })

  it('detects unknown skeleton tokens', () => {
    const issues = validateMessage('{v, number, ::mystery}')

    expect(issues.map((issue) => issue.code)).toEqual(['unknown-skeleton-token'])
    expect(issues[0]!.message).toContain('mystery')
  })

  it('detects an unknown date skeleton', () => {
    expect(codes('{v, date, ::qqqq}')).toEqual(['unknown-skeleton-token'])
  })

  it('reports every bad token in a multi-token skeleton', () => {
    expect(codes('{v, number, ::percent nope alsonope}')).toEqual([
      'unknown-skeleton-token',
      'unknown-skeleton-token'
    ])
  })
})

describe('validateMessage - strictHash', () => {
  it('is silent about # outside plurals by default', () => {
    expect(validateMessage('Issue #42')).toEqual([])
  })

  it('flags # outside plurals when strictHash is enabled', () => {
    expect(validateMessage('Issue #42', { strictHash: true }).map((issue) => issue.code)).toEqual([
      'hash-outside-plural'
    ])
  })

  it('allows # inside plural branches under strictHash', () => {
    expect(validateMessage('{n, plural, other {# items}}', { strictHash: true })).toEqual([])
  })

  it('allows an escaped # under strictHash', () => {
    expect(validateMessage('Issue \\#42', { strictHash: true })).toEqual([])
  })
})

describe('validateMessage - offsets', () => {
  it('reports the offset of the offending placeholder', () => {
    const issues = validateMessage('Hello there {v, bogus}')

    expect(issues[0]!.offset).toBe(12)
  })
})

describe('validateMessages', () => {
  it('reports valid for a clean catalog', () => {
    const result = validateMessages({ a: 'Hello {name}', b: { c: '{n, plural, other {# x}}' } })

    expect(result).toEqual({ valid: true, issues: [] })
  })

  it('reports dotted key paths for nested messages', () => {
    const result = validateMessages({ auth: { login: { title: 'Hi {name' } } })

    expect(result.valid).toBe(false)
    expect(result.issues[0]!.key).toBe('auth.login.title')
    expect(result.issues[0]!.locale).toBeUndefined()
  })

  it('reports array index paths', () => {
    const result = validateMessages({ items: ['ok', 'bad {'] })

    expect(result.issues[0]!.key).toBe('items[1]')
  })

  it('detects and annotates locale maps', () => {
    const result = validateMessages({
      en: { greet: 'Hello {name}' },
      es: { greet: 'Hola {name' }
    })

    expect(result.valid).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]!.locale).toBe('es')
    expect(result.issues[0]!.key).toBe('greet')
  })

  it('treats a flat catalog with non-locale keys as a single locale', () => {
    const result = validateMessages({ greeting: 'Hi {name', farewell: 'Bye' })

    expect(result.issues[0]!.key).toBe('greeting')
    expect(result.issues[0]!.locale).toBeUndefined()
  })

  it('ignores non-string leaves', () => {
    const result = validateMessages({ a: 1, b: null, c: true } as never)

    expect(result.valid).toBe(true)
  })

  it('handles an empty catalog', () => {
    expect(validateMessages({})).toEqual({ valid: true, issues: [] })
  })

  it('collects issues across many keys and locales', () => {
    const result = validateMessages({
      en: { a: '{n, plural, one {x}}', b: '{v, number, bogus}' },
      fr: { a: 'ok' }
    })

    expect(result.issues).toHaveLength(2)
    expect(result.issues.every((issue) => issue.locale === 'en')).toBe(true)
  })
})

describe('formatIssues and assertValidMessages', () => {
  it('formats issues into readable lines', () => {
    const result = validateMessages({ es: { greet: 'Hola {name' } })
    const text = formatIssues(result.issues)

    expect(text).toContain('[intlayer]')
    expect(text).toContain('es:greet')
    expect(text).toContain('unbalanced-brace')
  })

  it('omits the locale prefix for flat catalogs', () => {
    const result = validateMessages({ greet: 'Hola {name' })

    expect(formatIssues(result.issues)).toContain('] greet (')
  })

  it('does not throw for a valid catalog', () => {
    expect(() => assertValidMessages({ en: { a: 'ok {v}' } })).not.toThrow()
  })

  it('throws with a descriptive message for an invalid catalog', () => {
    expect(() => assertValidMessages({ en: { a: '{n, plural, one {x}}' } })).toThrow(/Invalid ICU messages/)
    expect(() => assertValidMessages({ en: { a: '{n, plural, one {x}}' } })).toThrow(/missing-other/)
  })
})
