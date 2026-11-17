import { BASE_FORM, evolutionsOf, FETCHED, preEvolutionOf, startLevel, UNOWN_FORMS } from './evolutions.js'

// The Pokédex and how often each mon turns up in the wild. GEN_DEX lists each generation's
// Pokédex keys in national dex order. Gen 1's sprites are bundled. A later generation's
// mons are fetched from vscode-pokemon the first time one turns up in the wild, once
// /pokemon gen <N> brings it in. A female sprite or other form counts as its base form's
// entry. Adding a generation is its list here, its legendary and rare mons, and its forms.

const GEN1 = [
  'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard', 'squirtle', 'wartortle', 'blastoise', 'caterpie',
  'metapod', 'butterfree', 'weedle', 'kakuna', 'beedrill', 'pidgey', 'pidgeotto', 'pidgeot', 'rattata', 'raticate',
  'spearow', 'fearow', 'ekans', 'arbok', 'pikachu', 'raichu', 'sandshrew', 'sandslash', 'nidoran_female', 'nidorina',
  'nidoqueen', 'nidoran_male', 'nidorino', 'nidoking', 'clefairy', 'clefable', 'vulpix', 'ninetales', 'jigglypuff', 'wigglytuff',
  'zubat', 'golbat', 'oddish', 'gloom', 'vileplume', 'paras', 'parasect', 'venonat', 'venomoth', 'diglett',
  'dugtrio', 'meowth', 'persian', 'psyduck', 'golduck', 'mankey', 'primeape', 'growlithe', 'arcanine', 'poliwag',
  'poliwhirl', 'poliwrath', 'abra', 'kadabra', 'alakazam', 'machop', 'machoke', 'machamp', 'bellsprout', 'weepinbell',
  'victreebel', 'tentacool', 'tentacruel', 'geodude', 'graveler', 'golem', 'ponyta', 'rapidash', 'slowpoke', 'slowbro',
  'magnemite', 'magneton', 'farfetchd', 'doduo', 'dodrio', 'seel', 'dewgong', 'grimer', 'muk', 'shellder',
  'cloyster', 'gastly', 'haunter', 'gengar', 'onix', 'drowzee', 'hypno', 'krabby', 'kingler', 'voltorb',
  'electrode', 'exeggcute', 'exeggutor', 'cubone', 'marowak', 'hitmonlee', 'hitmonchan', 'lickitung', 'koffing', 'weezing',
  'rhyhorn', 'rhydon', 'chansey', 'tangela', 'kangaskhan', 'horsea', 'seadra', 'goldeen', 'seaking', 'staryu',
  'starmie', 'mrmime', 'scyther', 'jynx', 'electabuzz', 'magmar', 'pinsir', 'tauros', 'magikarp', 'gyarados',
  'lapras', 'ditto', 'eevee', 'vaporeon', 'jolteon', 'flareon', 'porygon', 'omanyte', 'omastar', 'kabuto',
  'kabutops', 'aerodactyl', 'snorlax', 'articuno', 'zapdos', 'moltres', 'dratini', 'dragonair', 'dragonite', 'mewtwo',
  'mew',
]

const GEN2 = [
  'chikorita', 'bayleef', 'meganium', 'cyndaquil', 'quilava', 'typhlosion', 'totodile', 'croconaw', 'feraligatr', 'sentret',
  'furret', 'hoothoot', 'noctowl', 'ledyba', 'ledian', 'spinarak', 'ariados', 'crobat', 'chinchou', 'lanturn',
  'pichu', 'cleffa', 'igglybuff', 'togepi', 'togetic', 'natu', 'xatu', 'mareep', 'flaaffy', 'ampharos',
  'bellossom', 'marill', 'azumarill', 'sudowoodo', 'politoed', 'hoppip', 'skiploom', 'jumpluff', 'aipom', 'sunkern',
  'sunflora', 'yanma', 'wooper', 'quagsire', 'espeon', 'umbreon', 'murkrow', 'slowking', 'misdreavus', 'unown',
  'wobbuffet', 'girafarig', 'pineco', 'forretress', 'dunsparce', 'gligar', 'steelix', 'snubbull', 'granbull', 'qwilfish',
  'scizor', 'shuckle', 'heracross', 'sneasel', 'teddiursa', 'ursaring', 'slugma', 'magcargo', 'swinub', 'piloswine',
  'corsola', 'remoraid', 'octillery', 'delibird', 'mantine', 'skarmory', 'houndour', 'houndoom', 'kingdra', 'phanpy',
  'donphan', 'porygon2', 'stantler', 'smeargle', 'tyrogue', 'hitmontop', 'smoochum', 'elekid', 'magby', 'miltank',
  'blissey', 'raikou', 'entei', 'suicune', 'larvitar', 'pupitar', 'tyranitar', 'lugia', 'hooh', 'celebi',
]

export const GEN_DEX = { 1: GEN1, 2: GEN2 }
export const GENS = Object.keys(GEN_DEX).map(Number)
// The generations whose sprites come with the mod, always in the wild
export const BUNDLED_GENS = [1]
export const BUNDLED_DEX = BUNDLED_GENS.flatMap((gen) => GEN_DEX[gen])
export const NATIONAL_DEX = GENS.flatMap((gen) => GEN_DEX[gen])

// The Pokédex in play: every generation in gens, in national order
export const dexOf = (gens) => GENS.filter((gen) => gens.includes(gen)).flatMap((gen) => GEN_DEX[gen])

// The folders a Pokédex key with none of its own is fetched from, one picked per encounter:
// gen 2's Unown, Wobbuffet, and Heracross
export const WILD_FORMS = {
  unown: UNOWN_FORMS.map((form) => 'unown_' + form),
  wobbuffet: ['wobbuffet_male', 'wobbuffet_female'],
  heracross: ['heracross_male', 'heracross_female'],
}

export const dexKey = (mon) => BASE_FORM[mon] ?? mon

// The generation a mon's Pokédex entry is in, or null for one in none, like a gen 6 fetch
export const genOf = (mon) => GENS.find((gen) => GEN_DEX[gen].includes(dexKey(mon))) ?? null

export const isBundled = (mon) => BUNDLED_GENS.includes(genOf(mon))

// The generations in the wild, as saved: the bundled ones, and every other one turned on
export const wildGensOf = (saved) => GENS.filter((gen) => BUNDLED_GENS.includes(gen) || (Array.isArray(saved) && saved.includes(gen)))

export const dexNumber = (mon) => NATIONAL_DEX.indexOf(dexKey(mon)) + 1

export const LEGENDARY = ['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew', 'raikou', 'entei', 'suicune', 'lugia', 'hooh', 'celebi']

// Rare mons and everything they evolve into. Gen 2's babies hatch from eggs in the games,
// so they're rare in the wild here, as the only way to catch one.
export const RARE = [
  'lapras', 'snorlax', 'eevee', 'dratini', 'omanyte', 'kabuto', 'aerodactyl', 'chansey', 'tauros', 'kangaskhan',
  'scyther', 'pinsir', 'porygon', 'ditto', 'hitmonlee', 'hitmonchan',
  'larvitar', 'heracross', 'skarmory', 'miltank', 'smeargle', 'shuckle', 'unown', 'sneasel',
  'pichu', 'cleffa', 'igglybuff', 'togepi', 'tyrogue', 'smoochum', 'elekid', 'magby',
]

// weight is how often a tier turns up, hits how many attacks wear one out, and catch
// the best odds of a ball holding it
export const TIERS = {
  common: { weight: 60, hits: 3, catch: 0.9 },
  uncommon: { weight: 25, hits: 5, catch: 0.75 },
  rare: { weight: 6, hits: 7, catch: 0.55 },
  legendary: { weight: 1, hits: 10, catch: 0.35 },
}

const STAGE_TIERS = ['common', 'uncommon', 'rare']
const SHINY_ODDS = 1 / 128
// A gen 1 mon's female sprite, shown in the wild half the time
const FEMALE_FORM = Object.fromEntries(Object.entries(BASE_FORM).filter(([, base]) => BUNDLED_DEX.includes(base)).map(([female, base]) => [base, female]))

// Outside the short lists, a family's base form is common and each evolution a tier
// rarer. A mon with no family is uncommon, and a bundled mon that only evolves into a
// fetched one, like Onix into Steelix, has none, so it keeps its gen 1 tier.
export function tierOf(mon) {
  const key = dexKey(mon)
  if (LEGENDARY.includes(key)) return 'legendary'
  let base = key
  let stage = 0
  for (let parent = preEvolutionOf(base); parent; parent = preEvolutionOf(base)) {
    base = parent
    stage++
  }
  if (RARE.includes(base)) return 'rare'
  const family = evolutionsOf(base).filter((entry) => !isBundled(base) || !FETCHED.includes(entry.into))
  if (stage === 0 && family.length === 0) return 'uncommon'
  return STAGE_TIERS[stage]
}

// Each tier's mons for a set of generations, worked out once per set
const BY_TIER = new Map()
function byTier(gens) {
  const id = GENS.filter((gen) => gens.includes(gen)).join(',')
  if (!BY_TIER.has(id)) {
    const dex = dexOf(gens)
    BY_TIER.set(id, Object.fromEntries(Object.keys(TIERS).map((tier) => [tier, dex.filter((mon) => tierOf(mon) === tier)])))
  }
  return BY_TIER.get(id)
}

// The sprite a wild key shows as: one of its forms, its female sprite half the time, or itself
function wildForm(key, random) {
  if (WILD_FORMS[key]) return WILD_FORMS[key][Math.floor(random() * WILD_FORMS[key].length)]
  return FEMALE_FORM[key] && random() < 0.5 ? FEMALE_FORM[key] : key
}

// A tier by weight, then a mon from it, from the generations in gens. random() returns a
// number in [0, 1).
export function pickWild(random, gens = BUNDLED_GENS) {
  const total = Object.values(TIERS).reduce((sum, { weight }) => sum + weight, 0)
  let roll = random() * total
  const tier = Object.keys(TIERS).find((name) => (roll -= TIERS[name].weight) < 0) ?? 'common'
  const pool = byTier(gens)[tier]
  const key = pool[Math.floor(random() * pool.length)]
  const mon = wildForm(key, random)
  const variant = random() < SHINY_ODDS ? 'shiny' : 'default'
  return { mon, variant, key, tier, level: startLevel(mon) }
}

// Two marks of one mon as one: the earliest time for each of seen and caught, and shiny
// if either has it
export function mergedDexEntry(old, patch) {
  const entry = old && typeof old === 'object' ? { ...old } : {}
  for (const key of ['seen', 'caught']) {
    const times = [entry[key], patch[key]].filter((t) => typeof t === 'number')
    if (times.length > 0) entry[key] = Math.min(...times)
  }
  if (entry.shiny || patch.shiny) entry.shiny = true
  return entry
}

export const isCaught = (entry) => typeof entry?.caught === 'number'
