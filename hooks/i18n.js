import { EN } from './locales/en.js'
import { FR } from './locales/fr.js'
import { S } from './state.js'

// The band speaks English or French. The plugin's language option picks one, or auto
// follows Claude Code's own language setting, or the system's language when that setting
// is left at its default, and English stands in for any other language. Every message comes from the current language's table, as t.<message>(...),
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

// Claude Code's language setting, a text row of the config menu, or nothing when it's
// left at its default, which reads "Default (English)"
async function claudeLanguage($) {
  try {
    const value = (await $.config.list()).find((r) => r.key === 'language')?.value
    if (typeof value !== 'string' || /^default\b/i.test(value.trim())) return undefined
    return plain(value) ? value : undefined
  } catch {
    return undefined
  }
}

// The system's language, from the locale the variables name in their usual order, like
// "fr" from fr_FR.UTF-8, or nothing when none is set or it's C or POSIX
async function systemLanguage($) {
  try {
    const value = (await $.env.get('LC_ALL')) || (await $.env.get('LC_MESSAGES')) || (await $.env.get('LANG'))
    const code = (value ?? '').split(/[_.@-]/)[0]
    return code && code !== 'C' && code !== 'POSIX' ? code : undefined
  } catch {
    return undefined
  }
}

// The language the option picks, auto reading Claude Code's setting, then the system's
export async function chosenLanguage($, option) {
  if (Object.hasOwn(LOCALES, option)) return option
  return languageOf((await claudeLanguage($)) ?? (await systemLanguage($)) ?? '')
}

export const locale = () => LOCALES[S.lang] ?? EN

// t.wildFled(name) reads the message from the current language's table
export const t = new Proxy({}, { get: (_, key) => locale()[key] })
