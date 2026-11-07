/** Language subtags treated as right-to-left. Shared by every instance; edit with `setRTL`, `addRTL`, `removeRTL`. */
const rtlLanguages = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ku'])

/**
 * Tells whether a locale's language is written right-to-left.
 *
 * @param locale - Locale tag such as `"ar"` or `"he-IL"`; only the language part is checked.
 * @returns `true` if the language is in the RTL list.
 */
export function isRTL(locale: string): boolean {
  const [lang = ''] = locale.trim().split(/[-_]/)
  return rtlLanguages.has(lang.toLowerCase())
}

/**
 * Replaces the whole RTL language list.
 *
 * @param rtlList - Language codes, e.g. `['ar', 'he']`.
 */
export function setRTL(rtlList: string[]): void {
  rtlLanguages.clear()
  rtlList.forEach(lang => rtlLanguages.add(lang.toLowerCase()))
}

/**
 * Adds languages to the RTL list.
 *
 * @param locales - Language codes to add.
 */
export function addRTL(...locales: string[]): void {
  locales.forEach(lang => rtlLanguages.add(lang.toLowerCase()))
}

/**
 * Removes languages from the RTL list.
 *
 * @param locales - Language codes to remove.
 */
export function removeRTL(...locales: string[]): void {
  locales.forEach(lang => rtlLanguages.delete(lang.toLowerCase()))
}
