import { LRUCache } from '../utils/lru'
import { getCachedFormatter } from '../utils/intl'
import { findClosingBrace, readApostrophe } from './scan'
import { resolveDateOptions, resolveNumberOptions } from './formats'
import { formatDuration, resolveDurationOptions } from './duration'
import type { CustomFormats, DurationInput, DurationRecord } from '../types'

type Segment =
  | TextSegment
  | VariableSegment
  | PluralSegment
  | SelectSegment
  | SelectOrdinalSegment
  | NumberSegment
  | DateSegment
  | TimeSegment
  | DurationSegment

type TextSegment = { type: 'text'; value: string }
type VariableSegment = { type: 'variable'; name: string }
type PluralSegment = { type: 'plural'; value: string; options: Record<string, Segment[]>; offset?: number }
type SelectSegment = { type: 'select'; value: string; options: Record<string, Segment[]> }
type SelectOrdinalSegment = { type: 'selectordinal'; value: string; options: Record<string, Segment[]> }
type NumberSegment = { type: 'number'; value: string; style?: string }
type DateSegment = { type: 'date'; value: string; style?: string }
type TimeSegment = { type: 'time'; value: string; style?: string }
type DurationSegment = { type: 'duration'; value: string; style?: string }
type FormatSegment = PluralSegment | SelectSegment | SelectOrdinalSegment
type ArgumentSegment = NumberSegment | DateSegment | TimeSegment | DurationSegment

interface DurationFormatLike {
  format: (value: Record<string, number>) => string
}

/** Per-instance formatter caches and defaults used while rendering a message. */
export interface FormatContext {
  pluralRules: LRUCache<string, Intl.PluralRules>
  numberFormat: LRUCache<string, Intl.NumberFormat>
  dateTimeFormat: LRUCache<string, Intl.DateTimeFormat>
  listFormat?: LRUCache<string, Intl.ListFormat>
  durationFormat?: LRUCache<string, DurationFormatLike>
  formats?: CustomFormats
  defaultCurrency?: string
  timeZone?: string
}

/** A parsed message ready to render with values, a locale and a {@link FormatContext}. */
export type CompiledMessage = (data?: Record<string, unknown>, locale?: string, context?: FormatContext) => string

// Parsed messages are pure and shared by every instance; the bound only matters for very large catalogs.
const astCache = new LRUCache<string, Segment[]>(10000)
const defaultContext: FormatContext = {
  pluralRules: new LRUCache<string, Intl.PluralRules>(1000),
  numberFormat: new LRUCache<string, Intl.NumberFormat>(1000),
  dateTimeFormat: new LRUCache<string, Intl.DateTimeFormat>(1000),
  listFormat: new LRUCache<string, Intl.ListFormat>(1000),
  durationFormat: new LRUCache<string, DurationFormatLike>(1000)
}

/**
 * Parses an ICU-style message (the parsed form is cached) and returns a renderer for it.
 *
 * @param message - Message source, e.g. `"{n, plural, one {# item} other {# items}}"`.
 * @param pluralRulesCache - Optional cache used when no `FormatContext` is passed to the renderer.
 * @returns A function that renders the message from values, a locale (default `"en"`) and a context.
 */
export function compileMessage(message: string, pluralRulesCache?: LRUCache<string, Intl.PluralRules>): CompiledMessage {
  let segments = astCache.get(message)

  if (!segments) {
    segments = parseTemplate(message)
    astCache.set(message, segments)
  }

  const ast = segments

  return (data?: Record<string, unknown>, locale?: string, context?: FormatContext): string => {
    const effectiveContext = context ?? (pluralRulesCache ? { ...defaultContext, pluralRules: pluralRulesCache } : defaultContext)
    return renderSegments(ast, data ?? {}, locale ?? 'en', effectiveContext)
  }
}

function renderSegments(
  segments: Segment[],
  data: Record<string, unknown>,
  locale: string,
  context: FormatContext,
  pluralCount?: number
): string {
  let output = ''

  for (const segment of segments) {
    if (segment.type === 'text') {
      output += pluralCount == null
        ? segment.value
        : segment.value.replace(/\\#|#/g, (match) => (match === '#' ? formatCount(pluralCount, locale, context) : '#'))
      continue
    }

    if (segment.type === 'variable') {
      if (segment.name === '#') {
        output += pluralCount == null ? '' : formatCount(pluralCount, locale, context)
        continue
      }

      const value = data[segment.name]
      output += value == null ? '' : String(value)
      continue
    }

    if (segment.type === 'number' || segment.type === 'date' || segment.type === 'time' || segment.type === 'duration') {
      output += renderArgument(segment, data, locale, context, pluralCount)
      continue
    }

    if (segment.type === 'select') {
      const rawValue = data[segment.value]
      const option = segment.options[String(rawValue)] ?? segment.options.other

      if (option) {
        output += renderSegments(option, data, locale, context, pluralCount)
      }

      continue
    }

    const rawValue = data[segment.value]
    const count = Number(rawValue ?? 0)
    // With `offset:N`, exact matches use the raw value; categories and `#` use the value minus the offset.
    const shifted = count - (segment.type === 'plural' ? segment.offset ?? 0 : 0)
    const option = segment.options[`=${count}`] ?? getPluralOption(segment, shifted, locale, context)

    if (option) {
      output += renderSegments(option, data, locale, context, shifted)
    }
  }

  return output
}

function formatCount(count: number, locale: string, context: FormatContext): string {
  return getCachedFormatter(context.numberFormat, locale, undefined, () => new Intl.NumberFormat(locale)).format(count)
}

function renderArgument(
  segment: ArgumentSegment,
  data: Record<string, unknown>,
  locale: string,
  context: FormatContext,
  pluralCount?: number
): string {
  const raw = segment.value === '#' ? pluralCount : data[segment.value]

  if (raw == null || raw === '') {
    return ''
  }

  if (segment.type === 'number') {
    const value = typeof raw === 'number' ? raw : Number(raw)

    if (!Number.isFinite(value)) {
      return String(raw)
    }

    const options = resolveNumberOptions(segment.style, context.formats, context.defaultCurrency)
    const formatter = getCachedFormatter(context.numberFormat, locale, options, () => new Intl.NumberFormat(locale, options))

    return formatter.format(value)
  }

  if (segment.type === 'duration') {
    const input = toDurationInput(raw)

    if (input === undefined) {
      return String(raw)
    }

    const { style } = resolveDurationOptions(segment.style, context.formats)

    return formatDuration(input, locale, style ?? 'digital', {
      duration: context.durationFormat ?? defaultContext.durationFormat!,
      number: context.numberFormat,
      list: context.listFormat ?? defaultContext.listFormat!
    })
  }

  const date = toDate(raw)

  if (!date) {
    return String(raw)
  }

  const resolved = resolveDateOptions(segment.style, context.formats, segment.type)
  const options = context.timeZone && resolved && resolved.timeZone === undefined
    ? { ...resolved, timeZone: context.timeZone }
    : resolved
  const formatter = getCachedFormatter(context.dateTimeFormat, locale, options, () => new Intl.DateTimeFormat(locale, options))

  return formatter.format(date)
}

function toDurationInput(value: unknown): DurationInput | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const record = value as DurationRecord
    const hasUnit = (['days', 'hours', 'minutes', 'seconds'] as const).some(
      (unit) => typeof record[unit] === 'number' && Number.isFinite(record[unit])
    )

    return hasUnit ? record : undefined
  }

  return undefined
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  return undefined
}

function getPluralOption(
  segment: Extract<Segment, { type: 'plural' | 'selectordinal' }>,
  count: number,
  locale: string,
  context: FormatContext
): Segment[] | undefined {
  const ordinal = segment.type === 'selectordinal'
  const cacheKey = ordinal ? `${locale}:ordinal` : locale
  let rule = context.pluralRules.get(cacheKey)

  if (!rule) {
    rule = new Intl.PluralRules(locale, ordinal ? { type: 'ordinal' } : undefined)
    context.pluralRules.set(cacheKey, rule)
  }

  return segment.options[rule.select(count)] ?? segment.options.other
}

/**
 * Parses message text into segments.
 *
 * @param inPlural - True inside a plural/selectordinal branch, where `#` is the count and `'#'` quotes it.
 */
function parseTemplate(template: string, inPlural = false): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  let textBuffer = ''

  while (cursor < template.length) {
    if (template[cursor] === '\\' && (template[cursor + 1] === '{' || template[cursor + 1] === '}')) {
      textBuffer += template[cursor + 1]
      cursor += 2
      continue
    }

    const quoted = readApostrophe(template, cursor, inPlural)

    if (quoted) {
      // A quoted "#" must survive the count substitution, so it is kept in its backslash-escaped form.
      textBuffer += inPlural ? quoted.text.replace(/#/g, '\\#') : quoted.text
      cursor = quoted.next
      continue
    }

    if (template[cursor] === '{') {
      if (textBuffer.length > 0) {
        segments.push({ type: 'text', value: textBuffer })
        textBuffer = ''
      }

      const end = findClosingBrace(template, cursor)

      if (end === -1) {
        textBuffer += template.slice(cursor)
        break
      }

      const content = template.slice(cursor + 1, end).trim()

      if (isFormatBlock(content)) {
        const block = parseFormat(content, inPlural)

        if (block) {
          segments.push(block)
        } else {
          // Malformed block: show the source text instead of silently dropping it.
          const source = template.slice(cursor, end + 1)
          segments.push({ type: 'text', value: inPlural ? source.replace(/#/g, '\\#') : source })
        }
      } else {
        const argument = parseArgument(content)
        segments.push(argument ?? { type: 'variable', name: content })
      }

      cursor = end + 1
      continue
    }

    textBuffer += template[cursor]
    cursor += 1
  }

  if (textBuffer.length > 0) {
    segments.push({ type: 'text', value: textBuffer })
  }

  return segments
}

function isFormatBlock(content: string) {
  return /^[^,]+,\s*(plural|select|selectordinal)\b/.test(content)
}

function parseArgument(content: string): ArgumentSegment | undefined {
  const match = content.match(/^([^,]+),\s*(number|date|time|duration)\s*(?:,([\s\S]*))?$/)

  if (!match) {
    return undefined
  }

  const value = match[1]?.trim() ?? ''
  const type = match[2] as ArgumentSegment['type']
  const style = match[3]?.trim()

  if (!value) {
    return undefined
  }

  return style ? { type, value, style } : { type, value }
}

/**
 * Parses the inside of a plural/select/selectordinal block.
 *
 * @param parentInPlural - Whether the block sits inside a plural branch (a select there still sees the outer `#`).
 * @returns The segment, or `undefined` when the block is malformed (no branches or unparseable trailing text).
 */
function parseFormat(content: string, parentInPlural: boolean): FormatSegment | undefined {
  const firstComma = content.indexOf(',')
  const value = firstComma >= 0 ? content.slice(0, firstComma).trim() : ''
  const rest = firstComma >= 0 ? content.slice(firstComma + 1) : ''
  const trimmedRest = rest.trim()
  const match = trimmedRest.match(/^(plural|select|selectordinal)\b/)

  if (!match || !match[1]) {
    return undefined
  }

  const type = match[1] as FormatSegment['type']
  const inPlural = type === 'select' ? parentInPlural : true
  let body = trimmedRest.slice(match[0].length).trim()
  if (body.startsWith(',')) {
    body = body.slice(1).trimStart()
  }

  let offset: number | undefined
  const offsetMatch = type === 'plural' ? body.match(/^offset:\s*(\d+)\s*/) : null

  if (offsetMatch) {
    offset = Number(offsetMatch[1])
    body = body.slice(offsetMatch[0].length)
  }

  // Null prototype so values like "constructor" never match inherited properties.
  const options: Record<string, Segment[]> = Object.create(null)
  const validCategories = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])
  let cursor = 0

  while (cursor < body.length) {
    cursor = skipWhitespace(body, cursor)
    if (cursor >= body.length) {
      break
    }

    const categoryMatch = body.slice(cursor).match(/^(=?[\w-]+)/)

    if (!categoryMatch || !categoryMatch[1]) {
      break
    }

    const category = categoryMatch[1]

    if (type !== 'select' && !validCategories.has(category) && !category.startsWith('=')) {
      break
    }

    cursor += categoryMatch[0].length
    cursor = skipWhitespace(body, cursor)

    if (cursor >= body.length || body[cursor] !== '{') {
      break
    }

    const end = findClosingBrace(body, cursor)

    if (end === -1) {
      break
    }

    const optionText = body.slice(cursor + 1, end)
    options[category] = parseTemplate(optionText, inPlural)
    cursor = end + 1
  }

  if (skipWhitespace(body, cursor) < body.length || Object.keys(options).length === 0) {
    return undefined
  }

  return offset === undefined ? { type, value, options } : { type: 'plural', value, options, offset }
}

function skipWhitespace(value: string, index: number) {
  while (index < value.length) {
    const char = value[index]

    if (char === undefined || !/\s/.test(char)) {
      break
    }

    index += 1
  }

  return index
}
