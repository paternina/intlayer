const rtlLanguages = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi'])

export function isRTL(locale: string): boolean {
  const [lang = ''] = locale.trim().split(/[-_]/)
  return rtlLanguages.has(lang.toLowerCase())
}
