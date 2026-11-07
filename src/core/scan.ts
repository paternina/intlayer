/**
 * If an ICU apostrophe sequence starts at `index`, returns the text it stands for and the index after it.
 *
 * - `''` is a literal apostrophe.
 * - `'` followed by `{` or `}` (or `#` when `quoteHash` is set) quotes everything up to the next lone `'`,
 *   where `''` inside the quote is a literal apostrophe.
 * - Any other `'` is a plain apostrophe, so `It's` needs no escaping.
 *
 * @returns `undefined` when `value[index]` does not start such a sequence.
 */
export function readApostrophe(
  value: string,
  index: number,
  quoteHash = false
): { text: string; next: number } | undefined {
  if (value[index] !== "'") {
    return undefined
  }

  const following = value[index + 1]

  if (following === "'") {
    return { text: "'", next: index + 2 }
  }

  if (following !== '{' && following !== '}' && !(quoteHash && following === '#')) {
    return undefined
  }

  let text = ''
  let cursor = index + 1

  while (cursor < value.length) {
    if (value[cursor] === "'") {
      if (value[cursor + 1] === "'") {
        text += "'"
        cursor += 2
        continue
      }

      return { text, next: cursor + 1 }
    }

    text += value[cursor]
    cursor += 1
  }

  return { text, next: cursor }
}

/**
 * Finds the `}` that closes the `{` at `start`, ignoring backslash-escaped and apostrophe-quoted braces.
 *
 * @returns The index of the closing brace, or `-1` if it is unbalanced.
 */
export function findClosingBrace(value: string, start: number): number {
  let depth = 0

  for (let index = start; index < value.length; index += 1) {
    if (value[index] === '\\') {
      index += 1
      continue
    }

    const quoted = readApostrophe(value, index)

    if (quoted) {
      index = quoted.next - 1
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
