import { ITEM_ART, stamp } from './art.js'
import { rnd } from './effects/draw.js'
import { GENS } from './dex.js'
import { evolutionsOf } from './evolutions.js'

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
  { key: 'linkcable', name: 'Link Cable', gen: 1 },
  { key: 'rarecandy', name: 'Rare Candy', gen: 1 },
]
export const STONES = ['firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone', 'sunstone', 'shinystone', 'duskstone', 'dawnstone', 'icestone']
export const RARE_CANDY = 'rarecandy'
export const LINK_CABLE = 'linkcable'

// A knockout drops an item one time in 5. A drop is Rare Candy one time in 15, a Link
// Cable one in 12 of the rest, a foe that holds an item that item one in 10 of the rest,
// and otherwise a stone it drops. A foe with no stone to drop, or none from a generation
// in the wild, drops nothing in its place.
const DROP_ODDS = 1 / 5
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
export const STONE_FAMILIES = {
  firestone: [
    'charmander', 'charmeleon', 'charizard', 'vulpix', 'ninetales', 'growlithe', 'arcanine', 'ponyta', 'rapidash', 'magmar', 'flareon', 'moltres',
    'cyndaquil', 'quilava', 'typhlosion', 'slugma', 'magcargo', 'houndour', 'houndoom', 'magby', 'entei', 'hooh', 'torchic', 'combusken',
    'blaziken', 'numel', 'camerupt', 'torkoal', 'chimchar', 'monferno', 'infernape', 'magmortar', 'heatran',
  ],
  waterstone: [
    'squirtle', 'wartortle', 'blastoise', 'psyduck', 'golduck', 'poliwag', 'poliwhirl', 'poliwrath', 'tentacool', 'tentacruel', 'slowpoke', 'slowbro',
    'seel', 'dewgong', 'shellder', 'cloyster', 'krabby', 'kingler', 'horsea', 'seadra', 'goldeen', 'seaking', 'staryu', 'starmie',
    'magikarp', 'gyarados', 'lapras', 'vaporeon', 'omanyte', 'omastar', 'kabuto', 'kabutops', 'totodile', 'croconaw', 'feraligatr', 'chinchou',
    'lanturn', 'marill', 'azumarill', 'politoed', 'wooper', 'quagsire', 'slowking', 'qwilfish', 'corsola', 'remoraid', 'octillery', 'mantine',
    'kingdra', 'suicune', 'mudkip', 'marshtomp', 'swampert', 'lotad', 'lombre', 'ludicolo', 'wingull', 'pelipper', 'surskit', 'carvanha',
    'sharpedo', 'wailmer', 'wailord', 'barboach', 'whiscash', 'corphish', 'crawdaunt', 'feebas', 'milotic', 'spheal', 'sealeo', 'walrein',
    'clamperl', 'huntail', 'gorebyss', 'relicanth', 'luvdisc', 'kyogre', 'piplup', 'prinplup', 'empoleon', 'bibarel', 'buizel', 'floatzel',
    'shellos', 'gastrodon', 'finneon', 'lumineon', 'mantyke', 'palkia', 'phione', 'manaphy',
  ],
  thunderstone: [
    'pikachu', 'raichu', 'magnemite', 'magneton', 'voltorb', 'electrode', 'electabuzz', 'jolteon', 'zapdos', 'chinchou', 'lanturn', 'pichu',
    'mareep', 'flaaffy', 'ampharos', 'elekid', 'raikou', 'electrike', 'manectric', 'plusle', 'minun', 'shinx', 'luxio', 'luxray',
    'pachirisu', 'magnezone', 'electivire', 'rotom',
  ],
  leafstone: [
    'bulbasaur', 'ivysaur', 'venusaur', 'oddish', 'gloom', 'vileplume', 'paras', 'parasect', 'bellsprout', 'weepinbell', 'victreebel', 'exeggcute',
    'exeggutor', 'tangela', 'chikorita', 'bayleef', 'meganium', 'bellossom', 'hoppip', 'skiploom', 'jumpluff', 'sunkern', 'sunflora', 'celebi',
    'treecko', 'grovyle', 'sceptile', 'lotad', 'lombre', 'ludicolo', 'seedot', 'nuzleaf', 'shiftry', 'shroomish', 'breloom', 'roselia',
    'cacnea', 'cacturne', 'lileep', 'cradily', 'tropius', 'turtwig', 'grotle', 'torterra', 'budew', 'roserade', 'wormadam', 'cherubi',
    'cherrim', 'carnivine', 'snover', 'abomasnow', 'tangrowth', 'leafeon', 'shaymin',
  ],
  moonstone: [
    'nidoran_female', 'nidorina', 'nidoqueen', 'nidoran_male', 'nidorino', 'nidoking', 'clefairy', 'clefable', 'jigglypuff', 'wigglytuff', 'cleffa', 'igglybuff',
    'togepi', 'togetic', 'umbreon', 'snubbull', 'granbull', 'ralts', 'kirlia', 'gardevoir', 'azurill', 'skitty', 'delcatty', 'mawile',
    'lunatone',
  ],
  sunstone: [
    'bellossom', 'sunkern', 'sunflora', 'hooh', 'solrock', 'castform', 'cherrim',
  ],
  shinystone: [
    'clefairy', 'clefable', 'jigglypuff', 'wigglytuff', 'mrmime', 'cleffa', 'igglybuff', 'togepi', 'togetic', 'marill', 'azumarill', 'snubbull',
    'granbull', 'ralts', 'kirlia', 'gardevoir', 'azurill', 'mawile', 'roselia', 'budew', 'roserade', 'mimejr', 'togekiss',
  ],
  duskstone: [
    'gastly', 'haunter', 'gengar', 'umbreon', 'murkrow', 'misdreavus', 'sneasel', 'houndour', 'houndoom', 'tyranitar', 'poochyena', 'mightyena',
    'nuzleaf', 'shiftry', 'shedinja', 'sableye', 'carvanha', 'sharpedo', 'cacturne', 'crawdaunt', 'shuppet', 'banette', 'duskull', 'dusclops',
    'absol', 'drifloon', 'drifblim', 'mismagius', 'honchkrow', 'stunky', 'skuntank', 'spiritomb', 'drapion', 'weavile', 'dusknoir', 'froslass',
    'rotom', 'giratina', 'darkrai',
  ],
  dawnstone: [
    'abra', 'kadabra', 'alakazam', 'slowpoke', 'slowbro', 'drowzee', 'hypno', 'exeggcute', 'exeggutor', 'starmie', 'mrmime', 'jynx',
    'mewtwo', 'mew', 'natu', 'xatu', 'espeon', 'slowking', 'unown', 'wobbuffet', 'girafarig', 'smoochum', 'lugia', 'celebi',
    'ralts', 'kirlia', 'gardevoir', 'meditite', 'medicham', 'spoink', 'grumpig', 'lunatone', 'solrock', 'baltoy', 'claydol', 'chimecho',
    'wynaut', 'beldum', 'metang', 'metagross', 'latias', 'latios', 'jirachi', 'deoxys', 'chingling', 'bronzor', 'bronzong', 'mimejr',
    'gallade', 'uxie', 'mesprit', 'azelf', 'cresselia',
  ],
  icestone: [
    'dewgong', 'cloyster', 'jynx', 'lapras', 'articuno', 'sneasel', 'swinub', 'piloswine', 'delibird', 'smoochum', 'snorunt', 'glalie',
    'spheal', 'sealeo', 'walrein', 'regice', 'snover', 'abomasnow', 'weavile', 'glaceon', 'mamoswine', 'froslass',
  ],
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
  metalcoat: [
    'magnemite', 'magneton', 'onix', 'scyther', 'forretress', 'steelix', 'scizor', 'skarmory', 'mawile', 'aron', 'lairon', 'aggron',
    'beldum', 'metang', 'metagross', 'registeel', 'jirachi', 'empoleon', 'shieldon', 'bastiodon', 'bronzor', 'bronzong', 'lucario', 'magnezone',
    'probopass', 'dialga', 'heatran',
  ],
  dragonscale: [
    'horsea', 'seadra', 'dratini', 'dragonair', 'dragonite', 'kingdra', 'vibrava', 'flygon', 'altaria', 'bagon', 'shelgon', 'salamence',
    'latias', 'latios', 'rayquaza', 'gible', 'gabite', 'garchomp', 'dialga', 'palkia', 'giratina',
  ],
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

const itemGen = (key) => ITEMS.find((item) => item.key === key)?.gen ?? 1

// The stones and held items a foe can drop while gens are in the wild
export const stonesOf = (key, gens = GENS) => STONES.filter((stone) => STONE_FAMILIES[stone].includes(key) && gens.includes(itemGen(stone)))
export const heldItemsOf = (key, gens = GENS) =>
  Object.keys(HELD_FAMILIES).filter((item) => HELD_FAMILIES[item].includes(key) && gens.includes(itemGen(item)))

// What a knocked out foe drops while gens are in the wild, or null for nothing, rolled
// from its seed so the same foe always drops the same. A foe with several stones or held
// items drops one of them.
export function dropOf(key, seed, gens = GENS) {
  if (rnd(seed, 4, DROP_SALT) >= DROP_ODDS) return null
  if (rnd(seed, 0, DROP_SALT) < CANDY_ODDS) return RARE_CANDY
  if (rnd(seed, 1, DROP_SALT) < CABLE_ODDS) return LINK_CABLE
  const held = heldItemsOf(key, gens)
  if (held.length > 0 && rnd(seed, 2, DROP_SALT) < HELD_ODDS) return held[Math.floor(rnd(seed, 3, DROP_SALT) * held.length)]
  const stones = stonesOf(key, gens)
  return stones.length > 0 ? stones[Math.floor(rnd(seed, 5, DROP_SALT) * stones.length)] : null
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
