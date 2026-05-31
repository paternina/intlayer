const rtlLanguages = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ku'])

export function isRTL(locale: string): boolean {
  const [lang = ''] = locale.trim().split(/[-_]/)
  return rtlLanguages.has(lang.toLowerCase())
}

export function setRTL(rtlList: string[]): void {
  rtlLanguages.clear()
  rtlList.forEach(lang => rtlLanguages.add(lang.toLowerCase()))
}

export function addRTL(...locales: string[]): void {
  locales.forEach(lang => rtlLanguages.add(lang.toLowerCase()))
}

export function removeRTL(...locales: string[]): void {
  locales.forEach(lang => rtlLanguages.delete(lang.toLowerCase()))
}
