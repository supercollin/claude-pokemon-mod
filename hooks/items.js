import { ITEM_ART, stamp } from './art.js'
import { rnd } from './effects/draw.js'
import { evolutionsOf } from './evolutions.js'

// The item bag, kept as plain data: { [item key]: count }. Knocked out wild mons drop
// items, stone and trade evolutions use them up, and Rare Candy raises a level. Every
// function returns a new bag and leaves its input alone.

export const ITEMS = [
  { key: 'firestone', name: 'Fire Stone' },
  { key: 'waterstone', name: 'Water Stone' },
  { key: 'thunderstone', name: 'Thunder Stone' },
  { key: 'leafstone', name: 'Leaf Stone' },
  { key: 'moonstone', name: 'Moon Stone' },
  { key: 'sunstone', name: 'Sun Stone' },
  { key: 'kingsrock', name: "King's Rock" },
  { key: 'metalcoat', name: 'Metal Coat' },
  { key: 'dragonscale', name: 'Dragon Scale' },
  { key: 'upgrade', name: 'Up-Grade' },
  { key: 'linkcable', name: 'Link Cable' },
  { key: 'rarecandy', name: 'Rare Candy' },
]
export const STONES = ['firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone', 'sunstone']
export const RARE_CANDY = 'rarecandy'
export const LINK_CABLE = 'linkcable'

// A knockout drops an item one time in 5. A drop is Rare Candy one time in 15, a Link
// Cable one in 12 of the rest, a foe that holds an item that item one in 10 of the rest,
// and otherwise the stone for the foe's type. A foe with no stone type drops nothing in
// its place.
const DROP_ODDS = 1 / 5
const CANDY_ODDS = 1 / 15
const CABLE_ODDS = 1 / 12
const HELD_ODDS = 1 / 10
// A main turn of two minutes or more turns up Rare Candy one time in 10
export const LONG_TURN_CANDY_ODDS = 1 / 10
const DROP_SALT = 0x17e5

// The wild mons, by Pokédex key, whose type favors each stone, gen 1's then gen 2's. Moon
// Stone stands in for the fairy-like mons that use it, and Sun Stone for the sun-loving
// ones. A generation brought into the wild adds its mons here.
export const STONE_FAMILIES = {
  firestone: [
    'charmander', 'charmeleon', 'charizard', 'vulpix', 'ninetales', 'growlithe', 'arcanine', 'ponyta', 'rapidash', 'magmar', 'flareon', 'moltres',
    'cyndaquil', 'quilava', 'typhlosion', 'slugma', 'magcargo', 'houndour', 'houndoom', 'magby', 'entei',
  ],
  waterstone: [
    'squirtle', 'wartortle', 'blastoise', 'psyduck', 'golduck', 'poliwag', 'poliwhirl', 'poliwrath', 'tentacool', 'tentacruel', 'slowpoke', 'slowbro',
    'seel', 'dewgong', 'shellder', 'cloyster', 'krabby', 'kingler', 'horsea', 'seadra', 'goldeen', 'seaking', 'staryu', 'starmie', 'magikarp',
    'gyarados', 'lapras', 'vaporeon', 'omanyte', 'omastar', 'kabuto', 'kabutops',
    'totodile', 'croconaw', 'feraligatr', 'chinchou', 'lanturn', 'marill', 'azumarill', 'wooper', 'quagsire', 'qwilfish', 'corsola', 'remoraid',
    'octillery', 'mantine', 'suicune', 'politoed', 'slowking', 'kingdra',
  ],
  thunderstone: ['pikachu', 'raichu', 'magnemite', 'magneton', 'voltorb', 'electrode', 'electabuzz', 'jolteon', 'zapdos', 'pichu', 'mareep', 'flaaffy', 'ampharos', 'elekid', 'raikou'],
  leafstone: [
    'bulbasaur', 'ivysaur', 'venusaur', 'oddish', 'gloom', 'vileplume', 'paras', 'parasect', 'bellsprout', 'weepinbell', 'victreebel', 'exeggcute', 'exeggutor', 'tangela',
    'chikorita', 'bayleef', 'meganium', 'hoppip', 'skiploom', 'jumpluff',
  ],
  moonstone: [
    'clefairy', 'clefable', 'jigglypuff', 'wigglytuff', 'nidoran_female', 'nidorina', 'nidoqueen', 'nidoran_male', 'nidorino', 'nidoking',
    'cleffa', 'igglybuff', 'togepi', 'togetic', 'snubbull', 'granbull', 'umbreon',
  ],
  sunstone: ['sunkern', 'sunflora', 'bellossom', 'hooh'],
}

export const stoneOfType = (key) => STONES.find((stone) => STONE_FAMILIES[stone].includes(key)) ?? null

// The wild mons, by Pokédex key, that hold each item a trade evolution needs, as wild
// Magnemite hold a Metal Coat and Horsea a Dragon Scale in Gold and Silver, and the mons
// those trades make. No wild mon holds an Up-Grade there, so Porygon stands in.
export const HELD_FAMILIES = {
  kingsrock: ['poliwag', 'poliwhirl', 'slowpoke', 'slowbro', 'politoed', 'slowking'],
  metalcoat: ['magnemite', 'magneton', 'steelix', 'scizor', 'skarmory', 'forretress'],
  dragonscale: ['horsea', 'seadra', 'kingdra'],
  upgrade: ['porygon', 'porygon2'],
}

export const heldItemOf = (key) => Object.keys(HELD_FAMILIES).find((item) => HELD_FAMILIES[item].includes(key)) ?? null

// What a knocked out foe drops, or null for nothing, rolled from its seed so the same foe
// always drops the same
export function dropOf(key, seed) {
  if (rnd(seed, 4, DROP_SALT) >= DROP_ODDS) return null
  if (rnd(seed, 0, DROP_SALT) < CANDY_ODDS) return RARE_CANDY
  if (rnd(seed, 1, DROP_SALT) < CABLE_ODDS) return LINK_CABLE
  const held = heldItemOf(key)
  if (held && rnd(seed, 2, DROP_SALT) < HELD_ODDS) return held
  return stoneOfType(key)
}

const keyOf = (text) => String(text).toLowerCase().replace(/[\s\-_'.]/g, '')

export const itemName = (key) => ITEMS.find((item) => item.key === key)?.name ?? key

// The item a name means, matched loosely: "Thunder Stone", "thunderstone", "thunder", or
// "candy". Null when it means none, or more than one.
export function findItem(text) {
  const k = keyOf(text)
  if (!k) return null
  const exact = ITEMS.find((item) => item.key === k || item.key === k + 'stone')
  if (exact) return exact.key
  const partial = ITEMS.filter((item) => k.length >= 3 && item.key.includes(k))
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
  if (held.length === 0) return 'Your bag is empty. Knock out a wild mon with /pokemon attack, and it may drop an item.'
  return 'Your bag:\n' + held.map((item) => item.name + ', ' + bag[item.key]).join('\n')
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
