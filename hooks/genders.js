import { BASE_FORM } from './evolutions.js'

// Each mon's sex, male or female, drawn once from its species' share of females in the
// games and kept in its record. A species with a female sprite shows it for a female
// and its base sprite for a male, and Heracross and Wobbuffet, with only a male and a
// female sprite, the one for its sex. Genderless species have no sex.

// Pokédex keys by eighths of females, from the games. A species not listed is half female.
const GENDERLESS = [
  'magnemite', 'magneton', 'voltorb', 'electrode', 'staryu', 'starmie', 'ditto', 'porygon', 'articuno', 'zapdos',
  'moltres', 'mewtwo', 'mew', 'unown', 'porygon2', 'raikou', 'entei', 'suicune', 'lugia', 'hooh',
  'celebi', 'shedinja', 'lunatone', 'solrock', 'baltoy', 'claydol', 'beldum', 'metang', 'metagross', 'regirock',
  'regice', 'registeel', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys',
  'bronzor', 'bronzong', 'magnezone', 'porygonz', 'rotom', 'uxie', 'mesprit', 'azelf', 'dialga', 'palkia',
  'regigigas', 'giratina', 'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus',
]
const FEMALE_EIGHTHS = {
  0: ['nidoran_male', 'nidorino', 'nidoking', 'hitmonlee', 'hitmonchan', 'tauros', 'tyrogue', 'hitmontop', 'volbeat', 'latios', 'mothim', 'gallade'],
  1: [
    'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard', 'squirtle', 'wartortle', 'blastoise', 'eevee',
    'vaporeon', 'jolteon', 'flareon', 'omanyte', 'omastar', 'kabuto', 'kabutops', 'aerodactyl', 'snorlax', 'chikorita',
    'bayleef', 'meganium', 'cyndaquil', 'quilava', 'typhlosion', 'totodile', 'croconaw', 'feraligatr', 'togepi', 'togetic',
    'espeon', 'umbreon', 'treecko', 'grovyle', 'sceptile', 'torchic', 'combusken', 'blaziken', 'mudkip', 'marshtomp',
    'swampert', 'lileep', 'cradily', 'anorith', 'armaldo', 'relicanth',
    'turtwig', 'grotle', 'torterra', 'chimchar', 'monferno', 'infernape', 'piplup', 'prinplup', 'empoleon', 'cranidos',
    'rampardos', 'shieldon', 'bastiodon', 'combee', 'munchlax', 'riolu', 'lucario', 'togekiss', 'leafeon', 'glaceon',
  ],
  2: ['growlithe', 'arcanine', 'abra', 'kadabra', 'alakazam', 'machop', 'machoke', 'machamp', 'electabuzz', 'magmar', 'elekid', 'magby', 'makuhita', 'hariyama', 'electivire', 'magmortar'],
  6: [
    'clefairy', 'clefable', 'vulpix', 'ninetales', 'jigglypuff', 'wigglytuff', 'cleffa', 'igglybuff', 'snubbull', 'granbull',
    'corsola', 'azurill', 'skitty', 'delcatty', 'luvdisc', 'glameow', 'purugly',
  ],
  8: ['nidoran_female', 'nidorina', 'nidoqueen', 'chansey', 'kangaskhan', 'jynx', 'smoochum', 'miltank', 'blissey', 'illumise', 'latias', 'wormadam', 'vespiquen', 'happiny', 'froslass', 'cresselia'],
}
const DEFAULT_EIGHTHS = 4

export const SEXES = ['male', 'female']
const MARKS = { male: '♂', female: '♀' }
// The mark's color in the band, the games' blue and pink
export const SEX_COLORS = { male: '#5aa0ff', female: '#ff6f9f' }

export const SEX_LISTS = { GENDERLESS, FEMALE_EIGHTHS }

const speciesOf = (sprite) => BASE_FORM[sprite] ?? sprite

// The eighths of a species that are female, or null for a genderless one
export function femaleEighthsOf(sprite) {
  const key = speciesOf(sprite)
  if (GENDERLESS.includes(key)) return null
  const eighths = Object.keys(FEMALE_EIGHTHS).find((n) => FEMALE_EIGHTHS[n].includes(key))
  return eighths === undefined ? DEFAULT_EIGHTHS : Number(eighths)
}

// A species' sprite for one sex, like pikachu_female, or undefined when it has none
const formFor = (key, sex) => Object.keys(BASE_FORM).find((form) => BASE_FORM[form] === key && form === key + '_' + sex)

// The sex a sprite pins down, or null when either would do: a single-sex species' sex, a
// female or male sprite's own, and male for the base sprite of a species with a female
// sprite, like Pikachu's
export function fixedSexOf(sprite) {
  const eighths = femaleEighthsOf(sprite)
  if (eighths === null) return null
  if (eighths === 0) return 'male'
  if (eighths === 8) return 'female'
  const key = speciesOf(sprite)
  for (const sex of SEXES) if (sprite === formFor(key, sex)) return sex
  if (sprite === key && formFor(key, 'female') && !formFor(key, 'male')) return 'male'
  return null
}

// A sex drawn by a species' share of females, like a wild mon's, or null when genderless.
// random() returns a number in [0, 1).
export function randomSex(sprite, random = Math.random) {
  const eighths = femaleEighthsOf(sprite)
  if (eighths === null) return null
  return random() * 8 < eighths ? 'female' : 'male'
}

// The sex of a mon raised as this sprite: the one the sprite pins down, or one drawn by
// its species' share of females, or null when genderless
export const sexFor = (sprite, random = Math.random) => fixedSexOf(sprite) ?? randomSex(sprite, random)

// The sprite a mon of this sex shows: its species' sprite for that sex when there is one,
// the base sprite for a male of a species with only a female one, like pikachu, and the
// sprite as it is for any other form, like Unown's, or no sex
export function sexedSprite(sprite, sex) {
  if (!sex) return sprite
  const key = speciesOf(sprite)
  const own = formFor(key, sex)
  if (own) return own
  const otherSex = SEXES.some((other) => sprite === formFor(key, other))
  return otherSex ? key : sprite
}

// Like "Pikachu ♀", the mark left off a name that already says it, like Nidoran♀
export function withSexMark(name, sex) {
  const mark = MARKS[sex]
  return mark && !name.includes(mark) ? name + ' ' + mark : name
}

export const sexMark = (sex) => MARKS[sex] ?? ''
