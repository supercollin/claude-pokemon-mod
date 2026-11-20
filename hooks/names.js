import { BASE_FORM } from './evolutions.js'
import { MOVES, SPECIES, TYPES } from './locales/names-fr.js'
import { S } from './state.js'

// How a mon's key reads in messages: "nidoran_female" is "Nidoran♀", "abra" is "Abra",
// and in French "Nidoran♀" and "Abra" too, "charmander" being "Salamèche"
const DISPLAY_NAMES = {
  nidoran_female: 'Nidoran♀',
  nidoran_male: 'Nidoran♂',
  mrmime: 'Mr. Mime',
  farfetchd: "Farfetch'd",
  pikachu_female: 'Pikachu',
  venusaur_female: 'Venusaur',
  hooh: 'Ho-Oh',
  meganium_female: 'Meganium',
  steelix_female: 'Steelix',
  pichu_spiky_eared: 'Pichu',
  heracross_male: 'Heracross',
  heracross_female: 'Heracross',
  wobbuffet_male: 'Wobbuffet',
  wobbuffet_female: 'Wobbuffet',
  unown_exclamation: 'Unown !',
  unown_question: 'Unown ?',
  deoxys_attack: 'Deoxys (Attack)',
  deoxys_defense: 'Deoxys (Defense)',
  deoxys_speed: 'Deoxys (Speed)',
  mimejr: 'Mime Jr.',
  porygonz: 'Porygon-Z',
}

// A form's name in parentheses, like "Rotom (Wash)", and a sprite for one sex none
const FORM_NAMES = /^(burmy|wormadam|shellos|gastrodon|rotom|giratina|shaymin|arceus)_(\w+)$/
const SEX_FORMS = /^(combee|gible|gabite|garchomp|hippopotas|hippowdon)_(male|female)$/

const capitalized = (word) => word.charAt(0).toUpperCase() + word.slice(1)

// A form's word in French, like Rotom's wash as Lavage. Arceus' types read as types.
const FORM_WORDS_FR = {
  plant: 'Plante', sandy: 'Sable', trash: 'Déchet', west: 'Ouest', east: 'Est', heat: 'Chaleur', wash: 'Lavage', frost: 'Froid',
  fan: 'Hélice', mow: 'Tonte', origin: 'Originelle', sky: 'Céleste', attack: 'Attaque', defense: 'Défense', speed: 'Vitesse',
}
const UNOWN_MARKS = { exclamation: '!', question: '?' }

// A mon's French name: its species' name, with its form's word, or Unown's letter, after it.
// A mon PokéAPI doesn't name, like one fetched from gen 6 on, keeps its English name.
function frenchName(mon) {
  const species = BASE_FORM[mon] ?? mon
  const name = SPECIES[species]
  if (!name) return null
  const form = mon.match(FORM_NAMES) ?? mon.match(/^(deoxys)_(\w+)$/)
  if (form) return name + ' (' + (FORM_WORDS_FR[form[2]] ?? TYPES[form[2]] ?? capitalized(form[2])) + ')'
  const letter = mon.match(/^unown_(\w+)$/)
  if (letter) return name + ' ' + (UNOWN_MARKS[letter[1]] ?? letter[1].toUpperCase())
  return name
}

export function displayName(mon) {
  if (S.lang === 'fr') {
    const french = frenchName(mon)
    if (french) return french
  }
  const form = mon.match(FORM_NAMES)
  if (form) return capitalized(form[1]) + ' (' + capitalized(form[2]) + ')'
  const sexed = mon.match(SEX_FORMS)
  if (sexed) return capitalized(sexed[1])
  return DISPLAY_NAMES[mon] ?? mon.split('_').map(capitalized).join(' ')
}

// A move's name in the band's language, or the one given, like "Vine Whip" or "Fouet Lianes"
export const moveName = (name, lang = S.lang) => (lang === 'fr' && MOVES[name]) || name
