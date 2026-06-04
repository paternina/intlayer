import { LRUCache } from '../utils/lru'

type Segment = TextSegment | VariableSegment | PluralSegment

type TextSegment = { type: 'text'; value: string }
type VariableSegment = { type: 'variable'; name: string }
type PluralSegment = {
  type: 'plural'
  value: string
  options: Record<string, Segment[]>
}

const compileCache = new LRUCache<string, (data?: Record<string, unknown>, locale?: string) => string>(1000)
const defaultPluralRulesCache = new LRUCache<string, Intl.PluralRules>(1000)

export function compileMessage(message: string, pluralRulesCache?: LRUCache<string, Intl.PluralRules>): (data?: Record<string, unknown>, locale?: string) => string {
  const cached = compileCache.get(message)

  if (cached) {
    return cached
  }

  const segments = parseTemplate(message)
  const effectiveCache = pluralRulesCache ?? defaultPluralRulesCache
  const fn = (data?: Record<string, unknown>, locale?: string): string => renderSegments(segments, data ?? {}, locale ?? 'en', effectiveCache)

  compileCache.set(message, fn)
  return fn
}

function renderSegments(
  segments: Segment[],
  data: Record<string, unknown>,
  locale: string,
  pluralRulesCache?: LRUCache<string, Intl.PluralRules>,
  pluralCount?: number
): string {
  return segments
    .map((segment) => {
      if (segment.type === 'text') {
        if (pluralCount == null) {
          return segment.value
        }
        return segment.value.replace(/(^|[^\\])#/g, `$1${pluralCount}`).replace(/\\#/g, '#')
      }

      if (segment.type === 'variable') {
        if (segment.name === '#') {
          return String(pluralCount ?? '')
        }

        const value = data[segment.name]
        return value == null ? '' : String(value)
      }

      if (segment.type === 'plural') {
        const rawValue = data[segment.value]
        const count = Number(rawValue ?? 0)
        const exactMatch = `=${count}`
        const option = segment.options[exactMatch] ?? (() => {
          const effectiveCache = pluralRulesCache ?? defaultPluralRulesCache
          let rule = effectiveCache.get(locale)
          if (!rule) {
            rule = new Intl.PluralRules(locale)
            effectiveCache.set(locale, rule)
          }
          return segment.options[rule.select(count)] ?? segment.options.other
        })()

        if (!option) {
          return ''
        }

        return renderSegments(option, data, locale, pluralRulesCache, count)
      }

      return ''
    })
    .join('')
}

function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  let textBuffer = ''

  while (cursor < template.length) {
    if (template[cursor] === '\\' && (template[cursor + 1] === '{' || template[cursor + 1] === '}')) {
      textBuffer += template[cursor + 1]
      cursor += 2
      continue
    }

    if (template[cursor] === '{') {
      if (textBuffer.length > 0) {
        segments.push({ type: 'text', value: textBuffer })
        textBuffer = ''
      }

      const end = findMatchingBrace(template, cursor)

      if (end === -1) {
        textBuffer += template.slice(cursor)
        break
      }

      const content = template.slice(cursor + 1, end).trim()

      if (isPluralBlock(content)) {
        segments.push(parsePlural(content))
      } else {
        segments.push({ type: 'variable', name: content })
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

function findMatchingBrace(value: string, start: number) {
  let depth = 0

  for (let index = start; index < value.length; index += 1) {
    if (value[index] === '\\') {
      index += 1
      continue
    }

    if (value[index] === '{') {
      depth += 1
    } else if (value[index] === '}') {
      depth -= 1

      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}

function isPluralBlock(content: string) {
  return /^\w+,\s*plural\b/.test(content)
}

function parsePlural(content: string): PluralSegment {
  const firstComma = content.indexOf(',')
  const value = firstComma >= 0 ? content.slice(0, firstComma).trim() : ''
  const rest = firstComma >= 0 ? content.slice(firstComma + 1) : ''
  const trimmedRest = rest.trim()

  if (!trimmedRest.startsWith('plural')) {
    return { type: 'plural', value, options: {} }
  }

  let body = trimmedRest.slice('plural'.length).trim()
  if (body.startsWith(',')) {
    body = body.slice(1).trimStart()
  }
  const options: Record<string, Segment[]> = {}
  const validCategories = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])
  let cursor = 0

  while (cursor < body.length) {
    cursor = skipWhitespace(body, cursor)
    if (cursor >= body.length) {
      break
    }

    const categoryMatch = body.slice(cursor).match(/^(=?\w+)/)

    if (!categoryMatch || !categoryMatch[1]) {
      break
    }

    const category = categoryMatch[1]

    if (!validCategories.has(category) && !category.startsWith('=')) {
      break
    }

    cursor += categoryMatch[0].length
    cursor = skipWhitespace(body, cursor)

    if (cursor >= body.length || body[cursor] !== '{') {
      break
    }

    const end = findMatchingBrace(body, cursor)

    if (end === -1) {
      break
    }

    const optionText = body.slice(cursor + 1, end)
    options[category] = parseTemplate(optionText)
    cursor = end + 1
  }

  return {
    type: 'plural',
    value,
    options
  }
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
