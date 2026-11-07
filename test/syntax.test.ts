// ICU apostrophe quoting, plural offset and malformed-block rendering.
import { describe, expect, it } from 'vitest'
import { createI18n, validateMessage } from '../src/index'

const render = (message: string, values?: Record<string, unknown>) =>
  createI18n({ locale: 'en', messages: { en: { m: message } } }).t('m', values)

describe('ICU apostrophe quoting', () => {
  it('keeps a lone apostrophe literal', () => {
    expect(render("It's {name}", { name: 'Ana' })).toBe("It's Ana")
  })

  it("turns '' into a single apostrophe", () => {
    expect(render("It''s {name}", { name: 'Ana' })).toBe("It's Ana")
    expect(render("l''{name}", { name: 'Ana' })).toBe("l'Ana")
  })

  it('quotes braces up to the closing apostrophe', () => {
    expect(render("'{'literal'}' and {name}", { name: 'Ana' })).toBe('{literal} and Ana')
    expect(render("'{name}'", { name: 'Ana' })).toBe('{name}')
    expect(render("'{it''s}'")).toBe("{it's}")
  })

  it('treats an unterminated quote as quoted to the end', () => {
    expect(render("'{abc")).toBe('{abc')
  })

  it("quotes # only inside plural branches", () => {
    expect(render("{n, plural, other {'#' is #}}", { n: 3 })).toBe('# is 3')
    expect(render("'#' stays", {})).toBe("'#' stays")
  })

  it('keeps quoted braces from unbalancing nested blocks', () => {
    expect(render("{n, plural, one {'{'#'}'} other {x}}", { n: 1 })).toBe('{1}')
  })

  it('still supports backslash escapes', () => {
    expect(render('\\{a\\} and {name}', { name: 'Ana' })).toBe('{a} and Ana')
  })

  it('validates quoted text without false positives', () => {
    expect(validateMessage("It's '{x}' and ''")).toEqual([])
    expect(validateMessage("{n, plural, one {'{'#'}'} other {x}}")).toEqual([])
    expect(validateMessage("'}' alone")).toEqual([])
  })
})

describe('plural offset', () => {
  const message = '{n, plural, offset:1 =0 {nobody} =1 {just you} one {you and # other} other {you and # others}}'

  it('matches exact values on the raw count and categories on the shifted one', () => {
    expect(render(message, { n: 0 })).toBe('nobody')
    expect(render(message, { n: 1 })).toBe('just you')
    expect(render(message, { n: 2 })).toBe('you and 1 other')
    expect(render(message, { n: 5 })).toBe('you and 4 others')
  })

  it('accepts whitespace and a bare offset-less block unchanged', () => {
    expect(render('{n, plural, offset: 2 other {# left}}', { n: 5 })).toBe('3 left')
    expect(render('{n, plural, one {# a} other {# b}}', { n: 1 })).toBe('1 a')
  })

  it('validates a correct offset and rejects a malformed one', () => {
    expect(validateMessage(message)).toEqual([])
    expect(validateMessage('{n, plural, offset:x other {a}}').map((i) => i.code)).toEqual(['invalid-branch'])
    expect(validateMessage('{n, plural, offset:1 one {a}}').map((i) => i.code)).toEqual(['missing-other'])
  })
})

describe('malformed blocks', () => {
  it.each([
    '{n, plural, bogus}',
    '{n, select}',
    '{n, plural, one {a} garbage}',
    '{n, plural, one a}',
    '{n, plural, }'
  ])('renders the source text of %s instead of dropping it', (message) => {
    expect(render(message, { n: 1 })).toBe(message)
  })

  it('keeps surrounding text and escapes # when nested in a plural', () => {
    expect(render('Hi {x, select} there', {})).toBe('Hi {x, select} there')
    expect(render('{n, plural, other {# {x, select}}}', { n: 2 })).toBe('2 {x, select}')
  })

  it('still renders nothing for a well-formed block without a matching branch', () => {
    expect(render('[{x, select, a {A}}]', { x: 'b' })).toBe('[]')
  })
})

describe('large catalogs', () => {
  it('translates consistently across more than 1,000 distinct messages', () => {
    const catalog: Record<string, string> = {}
    for (let i = 0; i < 3000; i += 1) catalog[`k${i}`] = `Message ${i} {n, plural, one {# a} other {# b}}`
    const i18n = createI18n({ locale: 'en', messages: { en: catalog } })

    for (let round = 0; round < 2; round += 1) {
      for (let i = 0; i < 3000; i += 1) expect(i18n.t(`k${i}`, { n: 2 })).toBe(`Message ${i} 2 b`)
    }
  })
})
