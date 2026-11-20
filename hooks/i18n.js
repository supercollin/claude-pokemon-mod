import { EN } from './locales/en.js'
import { FR } from './locales/fr.js'
import { S } from './state.js'

// The band speaks English or French. The plugin's language option picks one, or auto
// follows Claude Code's own language setting, and English stands in for any other
// language. Every message comes from the current language's table, as t.<message>(...),
// with names already in that language.

export const LOCALES = { en: EN, fr: FR }
export const LANGUAGE_OPTIONS = ['auto', ...Object.keys(LOCALES)]

// Lowercase without accents or punctuation, so "Français" and "francais" read alike
export const plain = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9♀♂]/g, '')

// The words Claude Code's language setting may hold for each language, matched plainly
const SPOKEN = { fr: ['fr', 'fra', 'fre', 'french', 'francais', 'frenchfrance', 'francaisfrance'] }

// The language Claude Code's language setting names, like "Français" or "french", or
// English for one the band doesn't speak
export function languageOf(setting) {
  const word = plain(setting)
  return Object.keys(SPOKEN).find((lang) => SPOKEN[lang].includes(word)) ?? 'en'
}

// The language the option picks, auto reading Claude Code's setting, a text row of the
// config menu
export async function chosenLanguage($, option) {
  if (Object.hasOwn(LOCALES, option)) return option
  try {
    const row = (await $.config.list()).find((r) => r.key === 'language')
    return languageOf(row?.value ?? '')
  } catch {
    return 'en'
  }
}

export const locale = () => LOCALES[S.lang] ?? EN

// t.wildFled(name) reads the message from the current language's table
export const t = new Proxy({}, { get: (_, key) => locale()[key] })
