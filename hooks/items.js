import { ITEM_ART, stamp } from './art.js'
import { rnd } from './effects/draw.js'
import { GENS, NATIONAL_DEX } from './dex.js'
import { evolutionsOf } from './evolutions.js'
import { plain, t } from './i18n.js'
import { ITEMS as ITEMS_FR } from './locales/names-fr.js'
import { S } from './state.js'
import { TYPE_MONS } from './types.js'

// The item bag, kept as plain data: { [item key]: count }. Knocked out wild mons drop
// items, stone and trade evolutions use them up, and Rare Candy raises a level. Every
// function returns a new bag and leaves its input alone. Each item has the generation it
// came in, and a foe drops it only while that generation is in the wild. The Link Cable
// and Rare Candy, gen 1's, always come.

export const ITEMS = [
  { key: 'firestone', name: 'Fire Stone', gen: 1 },
  { key: 'waterstone', name: 'Water Stone', gen: 1 },
  { key: 'thunderstone', name: 'Thunder Stone', gen: 1 },
  { key: 'leafstone', name: 'Leaf Stone', gen: 1 },
  { key: 'moonstone', name: 'Moon Stone', gen: 1 },
  { key: 'sunstone', name: 'Sun Stone', gen: 2 },
  { key: 'shinystone', name: 'Shiny Stone', gen: 4 },
  { key: 'duskstone', name: 'Dusk Stone', gen: 4 },
  { key: 'dawnstone', name: 'Dawn Stone', gen: 4 },
  { key: 'icestone', name: 'Ice Stone', gen: 4 },
  { key: 'kingsrock', name: "King's Rock", gen: 2 },
  { key: 'metalcoat', name: 'Metal Coat', gen: 2 },
  { key: 'dragonscale', name: 'Dragon Scale', gen: 2 },
  { key: 'upgrade', name: 'Up-Grade', gen: 2 },
  { key: 'deepseatooth', name: 'Deep Sea Tooth', gen: 3 },
  { key: 'deepseascale', name: 'Deep Sea Scale', gen: 3 },
  { key: 'protector', name: 'Protector', gen: 4 },
  { key: 'electirizer', name: 'Electirizer', gen: 4 },
  { key: 'magmarizer', name: 'Magmarizer', gen: 4 },
  { key: 'dubiousdisc', name: 'Dubious Disc', gen: 4 },
  { key: 'reapercloth', name: 'Reaper Cloth', gen: 4 },
  { key: 'razorclaw', name: 'Razor Claw', gen: 4 },
  { key: 'razorfang', name: 'Razor Fang', gen: 4 },
  { key: 'ovalstone', name: 'Oval Stone', gen: 4 },
  { key: 'flameplate', name: 'Flame Plate', gen: 4 },
  { key: 'splashplate', name: 'Splash Plate', gen: 4 },
  { key: 'zapplate', name: 'Zap Plate', gen: 4 },
  { key: 'meadowplate', name: 'Meadow Plate', gen: 4 },
  { key: 'icicleplate', name: 'Icicle Plate', gen: 4 },
  { key: 'fistplate', name: 'Fist Plate', gen: 4 },
  { key: 'toxicplate', name: 'Toxic Plate', gen: 4 },
  { key: 'earthplate', name: 'Earth Plate', gen: 4 },
  { key: 'skyplate', name: 'Sky Plate', gen: 4 },
  { key: 'mindplate', name: 'Mind Plate', gen: 4 },
  { key: 'insectplate', name: 'Insect Plate', gen: 4 },
  { key: 'stoneplate', name: 'Stone Plate', gen: 4 },
  { key: 'spookyplate', name: 'Spooky Plate', gen: 4 },
  { key: 'dracoplate', name: 'Draco Plate', gen: 4 },
  { key: 'dreadplate', name: 'Dread Plate', gen: 4 },
  { key: 'ironplate', name: 'Iron Plate', gen: 4 },
  { key: 'linkcable', name: 'Link Cable', gen: 1 },
  { key: 'rarecandy', name: 'Rare Candy', gen: 1 },
]
export const STONES = ['firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone', 'sunstone', 'shinystone', 'duskstone', 'dawnstone', 'icestone']
export const RARE_CANDY = 'rarecandy'
export const LINK_CABLE = 'linkcable'

// A knockout drops an item one time in 5. A drop is Rare Candy one time in 15, a Link
// Cable one in 12 of the rest, a plate one in 20 of the rest, a foe that holds an item
// that item one in 10 of the rest,
// and otherwise a stone it drops. A foe with no stone to drop, or none from a generation
// in the wild, drops nothing in its place.
const DROP_ODDS = 1 / 5
// One drop in 20 is a plate for the foe's type, while gen 4 is in the wild and you have
// none of it yet
const PLATE_ODDS = 1 / 20
const CANDY_ODDS = 1 / 15
const CABLE_ODDS = 1 / 12
const HELD_ODDS = 1 / 10
// A main turn of two minutes or more turns up Rare Candy one time in 10
export const LONG_TURN_CANDY_ODDS = 1 / 10
const DROP_SALT = 0x17e5

// The wild mons, by Pokédex key, that drop each stone, from every generation: a Fire,
// Water, Thunder, or Leaf Stone from a mon of that type, a Shiny Stone from a fairy-type
// mon or Budew's line, which evolves with one, a Dusk Stone from a ghost or dark one, a
// Dawn Stone from a psychic one, and an Ice Stone from an ice one. The Moon Stone stands
// for the lunar mons and the fairy-like ones that use it, and the Sun Stone for the
// sun-loving ones. Types are the games' today, fairy included.
// Each mon of any of types, once, in national order
const ofTypes = (...types) => NATIONAL_DEX.filter((key) => types.some((type) => TYPE_MONS[type].includes(key)))

export const STONE_FAMILIES = {
  firestone: TYPE_MONS.fire,
  waterstone: TYPE_MONS.water,
  thunderstone: TYPE_MONS.electric,
  leafstone: TYPE_MONS.grass,
  moonstone: [
    'nidoran_female', 'nidorina', 'nidoqueen', 'nidoran_male', 'nidorino', 'nidoking', 'clefairy', 'clefable', 'jigglypuff', 'wigglytuff', 'cleffa', 'igglybuff',
    'togepi', 'togetic', 'umbreon', 'snubbull', 'granbull', 'ralts', 'kirlia', 'gardevoir', 'azurill', 'skitty', 'delcatty', 'mawile',
    'lunatone',
  ],
  sunstone: [
    'bellossom', 'sunkern', 'sunflora', 'hooh', 'solrock', 'castform', 'cherrim',
  ],
  shinystone: [...TYPE_MONS.fairy, 'budew', 'roselia', 'roserade'],
  duskstone: ofTypes('ghost', 'dark'),
  dawnstone: TYPE_MONS.psychic,
  icestone: TYPE_MONS.ice,
}

// The wild mons, by Pokédex key, that hold each item a trade or held-item evolution
// needs: the ones that hold it in the games, the line that evolves with it, and a few that
// plainly fit, like every steel type for the Metal Coat and every dragon for the Dragon
// Scale. No wild mon holds the Protector, Dubious Disc, Reaper Cloth, Razor Claw, or Razor
// Fang, so Rhyhorn's line and the shield fossils hold the Protector, Duskull's line and the
// puppet ghosts the Reaper Cloth, and Sneasel's and Gligar's lines with the clawed and
// fanged mons the Razor Claw and Razor Fang.
export const HELD_FAMILIES = {
  kingsrock: [
    'poliwag', 'poliwhirl', 'poliwrath', 'slowpoke', 'slowbro', 'politoed', 'slowking', 'hariyama',
  ],
  metalcoat: ['onix', 'scyther', ...TYPE_MONS.steel],
  dragonscale: ['horsea', 'seadra', ...TYPE_MONS.dragon],
  upgrade: [
    'porygon', 'porygon2',
  ],
  deepseatooth: [
    'carvanha', 'sharpedo', 'clamperl', 'huntail',
  ],
  deepseascale: [
    'chinchou', 'lanturn', 'clamperl', 'gorebyss', 'relicanth',
  ],
  protector: [
    'rhyhorn', 'rhydon', 'shieldon', 'bastiodon', 'rhyperior',
  ],
  electirizer: [
    'electabuzz', 'elekid', 'electivire',
  ],
  magmarizer: [
    'magmar', 'magby', 'magmortar',
  ],
  dubiousdisc: [
    'porygon2', 'porygonz',
  ],
  reapercloth: [
    'shuppet', 'banette', 'duskull', 'dusclops', 'dusknoir',
  ],
  razorclaw: [
    'sandshrew', 'sandslash', 'kabuto', 'kabutops', 'sneasel', 'zangoose', 'anorith', 'armaldo', 'weavile',
  ],
  razorfang: [
    'ekans', 'arbok', 'gligar', 'snubbull', 'granbull', 'mawile', 'seviper', 'gliscor',
  ],
  ovalstone: [
    'chansey', 'blissey', 'happiny',
  ],
}

// Arceus's plates, by the type each gives it, in the order of its forme folders
export const PLATES = {
  bug: 'insectplate',
  dark: 'dreadplate',
  dragon: 'dracoplate',
  electric: 'zapplate',
  fighting: 'fistplate',
  fire: 'flameplate',
  flying: 'skyplate',
  ghost: 'spookyplate',
  grass: 'meadowplate',
  ground: 'earthplate',
  ice: 'icicleplate',
  poison: 'toxicplate',
  psychic: 'mindplate',
  rock: 'stoneplate',
  steel: 'ironplate',
  water: 'splashplate',
}
export const PLATE_KEYS = Object.values(PLATES)
export const plateType = (plate) => Object.keys(PLATES).find((type) => PLATES[type] === plate) ?? null

// The plates for a foe's types: one for each type it has but normal and fairy
export const platesOf = (key) => Object.keys(PLATES).filter((type) => TYPE_MONS[type].includes(key)).map((type) => PLATES[type])

const itemGen = (key) => ITEMS.find((item) => item.key === key)?.gen ?? 1

// The stones and held items a foe can drop while gens are in the wild
export const stonesOf = (key, gens = GENS) => STONES.filter((stone) => STONE_FAMILIES[stone].includes(key) && gens.includes(itemGen(stone)))
export const heldItemsOf = (key, gens = GENS) =>
  Object.keys(HELD_FAMILIES).filter((item) => HELD_FAMILIES[item].includes(key) && gens.includes(itemGen(item)))

// What a knocked out foe drops while gens are in the wild, or null for nothing, rolled
// from its seed so the same foe always drops the same. A foe with several stones, held
// items, or plates drops one of them, and never a plate in owned.
export function dropOf(key, seed, gens = GENS, owned = []) {
  if (rnd(seed, 4, DROP_SALT) >= DROP_ODDS) return null
  if (rnd(seed, 0, DROP_SALT) < CANDY_ODDS) return RARE_CANDY
  if (rnd(seed, 1, DROP_SALT) < CABLE_ODDS) return LINK_CABLE
  const plates = platesOf(key).filter((plate) => gens.includes(itemGen(plate)) && !owned.includes(plate))
  if (plates.length > 0 && rnd(seed, 6, DROP_SALT) < PLATE_ODDS) return plates[Math.floor(rnd(seed, 7, DROP_SALT) * plates.length)]
  const held = heldItemsOf(key, gens)
  if (held.length > 0 && rnd(seed, 2, DROP_SALT) < HELD_ODDS) return held[Math.floor(rnd(seed, 3, DROP_SALT) * held.length)]
  const stones = stonesOf(key, gens)
  return stones.length > 0 ? stones[Math.floor(rnd(seed, 5, DROP_SALT) * stones.length)] : null
}

const keyOf = (text) => String(text).toLowerCase().replace(/[\s\-_'.]/g, '')

// An item's name in the band's language, like "Thunder Stone" or "Pierre Foudre"
export const itemName = (key) => (S.lang === 'fr' && ITEMS_FR[key]) || (ITEMS.find((item) => item.key === key)?.name ?? key)

// The item a name means, matched loosely, in English or French: "Thunder Stone",
// "thunderstone", "thunder", "candy", "Pierre Foudre", or "foudre". Null when it means none,
// or more than one.
export function findItem(text) {
  const k = keyOf(text)
  if (!k) return null
  const exact = ITEMS.find((item) => item.key === k || item.key === k + 'stone')
  if (exact) return exact.key
  const french = plain(text)
  const named = ITEMS.filter((item) => [french, 'pierre' + french].includes(plain(ITEMS_FR[item.key])))
  if (named.length === 1) return named[0].key
  const partial = ITEMS.filter((item) => k.length >= 3 && (item.key.includes(k) || plain(ITEMS_FR[item.key]).includes(french)))
  return partial.length === 1 ? partial[0].key : null
}

// The item an evolution entry needs: its stone or held item, a Link Cable for a trade
// holding none, or null for a level
export const itemFor = (entry) => (entry.item ? keyOf(entry.item) : entry.trade ? LINK_CABLE : null)

// A bag as saved, keeping only known items with whole counts above zero
export function bagOf(saved) {
  const bag = {}
  if (!saved || typeof saved !== 'object') return bag
  for (const { key } of ITEMS) {
    const count = Math.floor(Number(saved[key]))
    if (count > 0) bag[key] = count
  }
  return bag
}

export const addedTo = (bag, key, count = 1) => ({ ...bag, [key]: (bag[key] ?? 0) + count })

// One of an item taken out, its key gone once none is left
export function takenFrom(bag, key) {
  const { [key]: count = 0, ...rest } = bag
  return count > 1 ? { ...rest, [key]: count - 1 } : rest
}

// The bag made the first time for a box that had none: one of each item every stone or
// trade mon in it needs to evolve, so no mon raised before the bag is left stranded
export function migratedBag(names) {
  let bag = {}
  for (const name of names) {
    const needs = new Set(evolutionsOf(name).map(itemFor).filter(Boolean))
    for (const key of needs) bag = addedTo(bag, key)
  }
  return bag
}

// Like "Your bag:\nThunder Stone, 2\nRare Candy, 1", in the items' order
export function bagText(bag) {
  const held = ITEMS.filter((item) => bag[item.key] > 0)
  if (held.length === 0) return t.bagEmpty
  return t.bag(held.map((item) => itemName(item.key) + ', ' + bag[item.key]))
}

// A drop pops up out of the foe in an arc over POP_TICKS, from its middle, from, to the
// ground at to, and lies there until the foe blinks away
const POP_TICKS = 10
const POP_HEIGHT = 8

export function dropStamps(drop, tick, from, to) {
  const art = ITEM_ART[drop.item]
  const half = Math.floor(art.rows[0].length / 2)
  const land = to.y - art.rows.length + 1
  const u = Math.min(1, (tick - drop.at + 1) / POP_TICKS)
  const x = Math.round(from.x + (to.x - from.x) * u) - half
  const y = Math.round(from.y + (land - from.y) * u - POP_HEIGHT * 4 * u * (1 - u))
  return [stamp(x, Math.max(0, Math.min(land, y)), art.rows, art.colors)]
}
