import { plain } from './i18n.js'
import { VERBS, WORDS } from './locales/fr.js'
import { SPECIES } from './locales/names-fr.js'
import { MONS } from './sprites.js'

// /pokemon takes its commands in French as well as English, whatever language the band
// speaks: "attaque", "capture", "utilise pierre foudre pikachu" or "salamèche". The French
// verb, the word some commands take after it, and a mon's French name turn into their
// English ones before the command is read. Items and moves are found by either name where
// they're looked up. A nickname is kept as typed.

const byPlainName = (table) => Object.fromEntries(Object.entries(table).map(([en, fr]) => [plain(fr), en]))
const VERB_OF = { ...byPlainName(VERBS), pokedex: 'dex' }
const WORD_OF = { ...byPlainName(WORDS), liste: 'list' }

// A mon's French name, plain, to its key, leaving out the names that are already a key,
// like Pikachu's
const KEY_OF = Object.fromEntries(Object.entries(SPECIES).filter(([key, fr]) => plain(fr) !== key).map(([key, fr]) => [plain(fr), key]))

// The longest run of words, up to three, starting at i that names a mon in French
const LONGEST_NAME = 3
function monAt(words, i) {
  for (let n = Math.min(LONGEST_NAME, words.length - i); n > 0; n--) {
    const key = KEY_OF[plain(words.slice(i, i + n).join(''))]
    if (key && !MONS.includes(words[i])) return { key, n }
  }
  return null
}

// The command as /pokemon reads it, from the lowercase words typed
export function englishCommand(asked) {
  const [first = '', ...rest] = asked.split(/\s+/).filter(Boolean)
  const verb = VERB_OF[plain(first)] && !MONS.includes(first) ? VERB_OF[plain(first)] : first
  if (verb === 'nickname') return [verb, ...rest].join(' ')
  const words = [verb, ...rest]
  if (words.length > 1 && WORD_OF[plain(words[1])]) words[1] = WORD_OF[plain(words[1])]
  const out = []
  for (let i = 0; i < words.length; ) {
    const mon = monAt(words, i)
    out.push(mon ? mon.key : words[i])
    i += mon ? mon.n : 1
  }
  return out.join(' ')
}
