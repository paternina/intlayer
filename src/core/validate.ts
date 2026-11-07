import { isKnownNumberSkeletonToken } from './formats'
import { durationStyles } from './duration'
import { findClosingBrace, readApostrophe } from './scan'
import type { Messages, MessageIssue, ValidateMessagesOptions, ValidationResult } from '../types'

const pluralCategories = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])
const argumentTypes = new Set(['number', 'date', 'time', 'duration'])
const blockTypes = new Set(['plural', 'select', 'selectordinal'])
const numberStyles = new Set(['integer', 'percent', 'currency'])
const dateStyles = new Set(['short', 'medium', 'long', 'full'])
const dateFieldSymbols = /^[GyMLdEehHKkmsSzva]+$/

interface Reporter {
  add: (issue: Omit<MessageIssue, 'key' | 'locale'>) => void
}

function checkNumberStyle(style: string, offset: number, report: Reporter, formats: ValidateMessagesOptions['formats']) {
  if (formats?.number?.[style]) {
    return
  }

  if (style.startsWith('::')) {
    const skeleton = style.slice(2).trim()

    if (!skeleton) {
      report.add({ code: 'empty-skeleton', message: 'Empty number skeleton after "::".', offset })
      return
    }

    for (const token of skeleton.split(/\s+/)) {
      if (token && !isKnownNumberSkeletonToken(token)) {
        report.add({
          code: 'unknown-skeleton-token',
          message: `Unknown number skeleton token "${token}".`,
          offset
        })
      }
    }

    return
  }

  if (!numberStyles.has(style)) {
    report.add({
      code: 'unknown-style',
      message: `Unknown number style "${style}". Expected one of integer, percent, currency, a "::" skeleton, or a named format.`,
      offset
    })
  }
}

function checkDateStyle(
  style: string,
  kind: 'date' | 'time',
  offset: number,
  report: Reporter,
  formats: ValidateMessagesOptions['formats']
) {
  const named = kind === 'date' ? formats?.date : formats?.time

  if (named?.[style]) {
    return
  }

  if (style.startsWith('::')) {
    const skeleton = style.slice(2).trim()

    if (!skeleton) {
      report.add({ code: 'empty-skeleton', message: `Empty ${kind} skeleton after "::".`, offset })
      return
    }

    if (!dateFieldSymbols.test(skeleton)) {
      report.add({
        code: 'unknown-skeleton-token',
        message: `Unknown ${kind} skeleton "${skeleton}".`,
        offset
      })
    }

    return
  }

  if (!dateStyles.has(style)) {
    report.add({
      code: 'unknown-style',
      message: `Unknown ${kind} style "${style}". Expected one of short, medium, long, full, a "::" skeleton, or a named format.`,
      offset
    })
  }
}

function checkDurationStyle(style: string, offset: number, report: Reporter, formats: ValidateMessagesOptions['formats']) {
  if (formats?.duration?.[style]) {
    return
  }

  if (!(durationStyles as readonly string[]).includes(style)) {
    report.add({
      code: 'unknown-style',
      message: `Unknown duration style "${style}". Expected one of ${durationStyles.join(', ')}, or a named format.`,
      offset
    })
  }
}

function validateBlockBody(
  body: string,
  bodyOffset: number,
  type: string,
  report: Reporter,
  options: ValidateMessagesOptions
) {
  const seen = new Set<string>()
  let cursor = 0
  let count = 0

  if (type === 'plural') {
    const offsetMatch = body.match(/^offset:\s*(\d+)\s*/)

    if (offsetMatch) {
      cursor = offsetMatch[0].length
    } else if (body.startsWith('offset:')) {
      report.add({
        code: 'invalid-branch',
        message: 'Invalid plural offset. Expected "offset:" followed by a non-negative integer.',
        offset: bodyOffset
      })
      return
    }
  }

  while (cursor < body.length) {
    while (cursor < body.length && /\s/.test(body[cursor] ?? '')) {
      cursor += 1
    }

    if (cursor >= body.length) {
      break
    }

    const categoryMatch = body.slice(cursor).match(/^(=?[^\s{}]+)/)

    if (!categoryMatch || !categoryMatch[1]) {
      report.add({
        code: 'malformed-block',
        message: `Malformed ${type} block: expected a branch name.`,
        offset: bodyOffset + cursor
      })
      return
    }

    const category = categoryMatch[1]
    const categoryOffset = bodyOffset + cursor

    if (type !== 'select') {
      if (category.startsWith('=')) {
        if (!/^=-?\d+(\.\d+)?$/.test(category)) {
          report.add({
            code: 'invalid-branch',
            message: `Invalid exact match "${category}" in ${type} block.`,
            offset: categoryOffset
          })
        }
      } else if (!pluralCategories.has(category)) {
        report.add({
          code: 'invalid-branch',
          message: `Invalid ${type} branch "${category}". Expected one of ${[...pluralCategories].join(', ')} or an "=" exact match.`,
          offset: categoryOffset
        })
      }
    }

    if (seen.has(category)) {
      report.add({
        code: 'duplicate-branch',
        message: `Duplicate branch "${category}" in ${type} block.`,
        offset: categoryOffset
      })
    }

    seen.add(category)
    cursor += categoryMatch[0].length

    while (cursor < body.length && /\s/.test(body[cursor] ?? '')) {
      cursor += 1
    }

    if (body[cursor] !== '{') {
      report.add({
        code: 'malformed-block',
        message: `Branch "${category}" in ${type} block is missing its "{...}" body.`,
        offset: bodyOffset + cursor
      })
      return
    }

    const end = findClosingBrace(body, cursor)

    if (end === -1) {
      report.add({
        code: 'unbalanced-brace',
        message: `Unclosed body for branch "${category}" in ${type} block.`,
        offset: bodyOffset + cursor
      })
      return
    }

    walk(body.slice(cursor + 1, end), bodyOffset + cursor + 1, report, options, true)
    cursor = end + 1
    count += 1
  }

  if (count === 0) {
    report.add({
      code: 'malformed-block',
      message: `${type} block has no branches.`,
      offset: bodyOffset
    })
    return
  }

  if (!seen.has('other')) {
    report.add({
      code: 'missing-other',
      message: `${type} block is missing the required "other" branch.`,
      offset: bodyOffset
    })
  }
}

function validatePlaceholder(content: string, offset: number, report: Reporter, options: ValidateMessagesOptions) {
  const trimmed = content.trim()

  if (!trimmed) {
    report.add({ code: 'empty-placeholder', message: 'Empty placeholder "{}".', offset })
    return
  }

  const firstComma = trimmed.indexOf(',')

  if (firstComma === -1) {
    if (/\s/.test(trimmed) && trimmed !== '#') {
      report.add({
        code: 'invalid-argument-name',
        message: `Placeholder name "${trimmed}" contains whitespace.`,
        offset
      })
    }
    return
  }

  const name = trimmed.slice(0, firstComma).trim()
  const rest = trimmed.slice(firstComma + 1).trim()
  const typeMatch = rest.match(/^([A-Za-z]+)/)

  if (!name) {
    report.add({ code: 'invalid-argument-name', message: 'Placeholder is missing an argument name.', offset })
    return
  }

  if (!typeMatch || !typeMatch[1]) {
    report.add({
      code: 'unknown-argument-type',
      message: `Placeholder "${name}" has a comma but no argument type.`,
      offset
    })
    return
  }

  const type = typeMatch[1]
  const after = rest.slice(type.length).trim()

  if (blockTypes.has(type)) {
    if (!after.startsWith(',')) {
      report.add({
        code: 'malformed-block',
        message: `${type} block for "${name}" is missing a comma before its branches.`,
        offset
      })
      return
    }

    const body = after.slice(1)
    validateBlockBody(body.trim(), offset, type, report, options)
    return
  }

  if (!argumentTypes.has(type)) {
    report.add({
      code: 'unknown-argument-type',
      message: `Unknown argument type "${type}" for "${name}". Expected number, date, time, duration, plural, select or selectordinal.`,
      offset
    })
    return
  }

  if (!after) {
    return
  }

  if (!after.startsWith(',')) {
    report.add({
      code: 'malformed-argument',
      message: `Malformed ${type} argument for "${name}".`,
      offset
    })
    return
  }

  const style = after.slice(1).trim()

  if (!style) {
    report.add({
      code: 'empty-style',
      message: `Empty style for ${type} argument "${name}".`,
      offset
    })
    return
  }

  if (type === 'number') {
    checkNumberStyle(style, offset, report, options.formats)
  } else if (type === 'duration') {
    checkDurationStyle(style, offset, report, options.formats)
  } else {
    checkDateStyle(style, type as 'date' | 'time', offset, report, options.formats)
  }
}

function walk(
  template: string,
  baseOffset: number,
  report: Reporter,
  options: ValidateMessagesOptions,
  insideBlock: boolean
) {
  let cursor = 0

  while (cursor < template.length) {
    const char = template[cursor]

    if (char === '\\' && (template[cursor + 1] === '{' || template[cursor + 1] === '}' || template[cursor + 1] === '#')) {
      cursor += 2
      continue
    }

    const quoted = readApostrophe(template, cursor, insideBlock)

    if (quoted) {
      cursor = quoted.next
      continue
    }

    if (char === '}') {
      report.add({
        code: 'unbalanced-brace',
        message: 'Unexpected "}". Escape it as "\\}" or quote it as "\'}\'" to use a literal closing brace.',
        offset: baseOffset + cursor
      })
      return
    }

    if (char === '{') {
      const end = findClosingBrace(template, cursor)

      if (end === -1) {
        report.add({
          code: 'unbalanced-brace',
          message: 'Unclosed "{". Escape it as "\\{" to use a literal opening brace.',
          offset: baseOffset + cursor
        })
        return
      }

      validatePlaceholder(template.slice(cursor + 1, end), baseOffset + cursor, report, options)
      cursor = end + 1
      continue
    }

    if (char === '#' && !insideBlock && options.strictHash) {
      report.add({
        code: 'hash-outside-plural',
        message: 'The "#" placeholder is only meaningful inside a plural block. Escape it as "\\#".',
        offset: baseOffset + cursor
      })
    }

    cursor += 1
  }
}

/**
 * Checks the ICU syntax of one message string.
 *
 * @param message - The message to check.
 * @param options - Named formats to accept and the `strictHash` switch.
 * @returns The issues found (empty when the message is valid).
 */
export function validateMessage(message: string, options: ValidateMessagesOptions = {}): MessageIssue[] {
  const issues: MessageIssue[] = []
  const report: Reporter = {
    add: (issue) => {
      issues.push(issue as MessageIssue)
    }
  }

  walk(message, 0, report, options, false)
  return issues
}

function collect(
  node: unknown,
  path: string,
  locale: string | undefined,
  issues: MessageIssue[],
  options: ValidateMessagesOptions
) {
  if (typeof node === 'string') {
    for (const issue of validateMessage(node, options)) {
      issues.push(locale === undefined ? { ...issue, key: path } : { ...issue, key: path, locale })
    }
    return
  }

  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      collect(item, `${path}[${index}]`, locale, issues, options)
    })
    return
  }

  if (typeof node === 'object' && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      collect(value, path ? `${path}.${key}` : key, locale, issues, options)
    }
  }
}

function isLocaleMap(value: Messages): boolean {
  const entries = Object.entries(value)

  return (
    entries.length > 0 &&
    entries.every(
      ([key, item]) =>
        /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i.test(key) &&
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item)
    )
  )
}

/**
 * Checks every message in a flat catalog or a locale map. Intended for CI or build steps.
 *
 * @param messages - A catalog, or a map of locale to catalog.
 * @param options - Named formats to accept and the `strictHash` switch.
 * @returns `valid` plus the issues, each tagged with its dotted `key` (and `locale` for locale maps).
 *
 * @example
 * validateMessages({ en: { items: '{n, plural, one {# item}}' } }).issues[0].code // "missing-other"
 */
export function validateMessages(
  messages: Messages | Record<string, Messages>,
  options: ValidateMessagesOptions = {}
): ValidationResult {
  const issues: MessageIssue[] = []

  if (typeof messages !== 'object' || messages === null) {
    return { valid: true, issues: [] }
  }

  if (isLocaleMap(messages as Messages)) {
    for (const [locale, localeMessages] of Object.entries(messages)) {
      collect(localeMessages, '', locale, issues, options)
    }
  } else {
    collect(messages, '', undefined, issues, options)
  }

  return { valid: issues.length === 0, issues }
}

/**
 * Renders issues as one `[intlayer] locale:key (code) message` line each.
 *
 * @param issues - Issues from {@link validateMessages}.
 * @returns A newline-separated report.
 */
export function formatIssues(issues: readonly MessageIssue[]): string {
  return issues
    .map((issue) => {
      const location = issue.locale ? `${issue.locale}:${issue.key}` : issue.key
      return `[intlayer] ${location} (${issue.code}) ${issue.message}`
    })
    .join('\n')
}

/**
 * Like {@link validateMessages}, but throws when any issue is found.
 *
 * @param messages - A catalog, or a map of locale to catalog.
 * @param options - Named formats to accept and the `strictHash` switch.
 * @throws {Error} With a {@link formatIssues} report when the messages are invalid.
 */
export function assertValidMessages(
  messages: Messages | Record<string, Messages>,
  options: ValidateMessagesOptions = {}
): void {
  const result = validateMessages(messages, options)

  if (!result.valid) {
    throw new Error(`Invalid ICU messages:\n${formatIssues(result.issues)}`)
  }
}
