import { Messages } from '../types'

type Segment = TextSegment | VariableSegment | PluralSegment

type TextSegment = { type: 'text'; value: string }
type VariableSegment = { type: 'variable'; name: string }
type PluralSegment = {
  type: 'plural'
  value: string
  options: Record<string, Segment[]>
}

const compileCache = new Map<string, (data?: Record<string, unknown>, locale?: string) => string>()

export function compileMessage(message: string): (data?: Record<string, unknown>, locale?: string) => string {
  const cached = compileCache.get(message)

  if (cached) {
    return cached
  }

  const segments = parseTemplate(message)
  const fn = (data: Record<string, unknown> = {}, locale = 'en'): string => renderSegments(segments, data, locale)

  compileCache.set(message, fn)
  return fn
}

function renderSegments(
  segments: Segment[],
  data: Record<string, unknown>,
  locale: string,
  pluralCount?: number
): string {
  return segments
    .map((segment) => {
      if (segment.type === 'text') {
        return pluralCount == null ? segment.value : segment.value.replace(/#/g, String(pluralCount))
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
        const rule = new Intl.PluralRules(locale).select(count)
        const option = segment.options[rule] ?? segment.options.other

        if (!option) {
          return ''
        }

        return renderSegments(option, data, locale, count)
      }

      return ''
    })
    .join('')
}

function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = []
  let cursor = 0

  while (cursor < template.length) {
    const start = template.indexOf('{', cursor)

    if (start === -1) {
      segments.push({ type: 'text', value: template.slice(cursor) })
      break
    }

    if (start > cursor) {
      segments.push({ type: 'text', value: template.slice(cursor, start) })
    }

    const end = findMatchingBrace(template, start)

    if (end === -1) {
      segments.push({ type: 'text', value: template.slice(start) })
      break
    }

    const content = template.slice(start + 1, end).trim()

    if (isPluralBlock(content)) {
      segments.push(parsePlural(content))
    } else {
      segments.push({ type: 'variable', name: content })
    }

    cursor = end + 1
  }

  return segments
}

function findMatchingBrace(value: string, start: number) {
  let depth = 0

  for (let index = start; index < value.length; index += 1) {
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
  const parts = content.split(',').map((part) => part.trim())
  return parts.length >= 2 && parts[1] === 'plural'
}

function parsePlural(content: string): PluralSegment {
  const parts = content.split(',')
  const value = (parts[0] ?? '').trim()
  const rest = parts.slice(2)
  const body = rest.join(',').trim()
  const options: Record<string, Segment[]> = {}
  let cursor = 0

  while (cursor < body.length) {
    const chunk = body.slice(cursor)
    const categoryMatch = chunk.trimStart().match(/^(\w+)/)

    if (!categoryMatch || !categoryMatch[1]) {
      break
    }

    const category = categoryMatch[1]
    const offset = body.indexOf(category, cursor)

    if (offset === -1) {
      break
    }

    cursor = offset + category.length
    cursor = skipWhitespace(body, cursor)

    const nextChar = body[cursor]
    if (nextChar !== '{') {
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
