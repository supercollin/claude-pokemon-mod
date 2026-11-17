// The gen 1 evolutions follow the Red and Blue rules and are keyed by sprite key, in
// Pokédex order, followed by gen 2's. Each entry is one thing the mon can become: { into, level } on level-up,
// { into, item } with an evolution stone, or { into, trade: true }. A mon that doesn't
// evolve has no entry.

const FIRST_LEVEL = 5

// Female sprites take their base form's place in the family, so raichu comes from
// pikachu and venusaur_female from ivysaur
export const BASE_FORM = { pikachu_female: 'pikachu', venusaur_female: 'venusaur' }

export const EVOLUTIONS = {
  bulbasaur: [{ into: 'ivysaur', level: 16 }],
  ivysaur: [{ into: 'venusaur', level: 32 }],
  charmander: [{ into: 'charmeleon', level: 16 }],
  charmeleon: [{ into: 'charizard', level: 36 }],
  squirtle: [{ into: 'wartortle', level: 16 }],
  wartortle: [{ into: 'blastoise', level: 36 }],
  caterpie: [{ into: 'metapod', level: 7 }],
  metapod: [{ into: 'butterfree', level: 10 }],
  weedle: [{ into: 'kakuna', level: 7 }],
  kakuna: [{ into: 'beedrill', level: 10 }],
  pidgey: [{ into: 'pidgeotto', level: 18 }],
  pidgeotto: [{ into: 'pidgeot', level: 36 }],
  rattata: [{ into: 'raticate', level: 20 }],
  spearow: [{ into: 'fearow', level: 20 }],
  ekans: [{ into: 'arbok', level: 22 }],
  pikachu: [{ into: 'raichu', item: 'Thunder Stone' }],
  pikachu_female: [{ into: 'raichu', item: 'Thunder Stone' }],
  sandshrew: [{ into: 'sandslash', level: 22 }],
  nidoran_female: [{ into: 'nidorina', level: 16 }],
  nidorina: [{ into: 'nidoqueen', item: 'Moon Stone' }],
  nidoran_male: [{ into: 'nidorino', level: 16 }],
  nidorino: [{ into: 'nidoking', item: 'Moon Stone' }],
  clefairy: [{ into: 'clefable', item: 'Moon Stone' }],
  vulpix: [{ into: 'ninetales', item: 'Fire Stone' }],
  jigglypuff: [{ into: 'wigglytuff', item: 'Moon Stone' }],
  zubat: [{ into: 'golbat', level: 22 }],
  oddish: [{ into: 'gloom', level: 21 }],
  gloom: [
    { into: 'vileplume', item: 'Leaf Stone' },
    { into: 'bellossom', item: 'Sun Stone' },
  ],
  paras: [{ into: 'parasect', level: 24 }],
  venonat: [{ into: 'venomoth', level: 31 }],
  diglett: [{ into: 'dugtrio', level: 26 }],
  meowth: [{ into: 'persian', level: 28 }],
  psyduck: [{ into: 'golduck', level: 33 }],
  mankey: [{ into: 'primeape', level: 28 }],
  growlithe: [{ into: 'arcanine', item: 'Fire Stone' }],
  poliwag: [{ into: 'poliwhirl', level: 25 }],
  poliwhirl: [{ into: 'poliwrath', item: 'Water Stone' }],
  abra: [{ into: 'kadabra', level: 16 }],
  kadabra: [{ into: 'alakazam', trade: true }],
  machop: [{ into: 'machoke', level: 28 }],
  machoke: [{ into: 'machamp', trade: true }],
  bellsprout: [{ into: 'weepinbell', level: 21 }],
  weepinbell: [{ into: 'victreebel', item: 'Leaf Stone' }],
  tentacool: [{ into: 'tentacruel', level: 30 }],
  geodude: [{ into: 'graveler', level: 25 }],
  graveler: [{ into: 'golem', trade: true }],
  ponyta: [{ into: 'rapidash', level: 40 }],
  slowpoke: [{ into: 'slowbro', level: 37 }],
  magnemite: [{ into: 'magneton', level: 30 }],
  doduo: [{ into: 'dodrio', level: 31 }],
  seel: [{ into: 'dewgong', level: 34 }],
  grimer: [{ into: 'muk', level: 38 }],
  shellder: [{ into: 'cloyster', item: 'Water Stone' }],
  gastly: [{ into: 'haunter', level: 25 }],
  haunter: [{ into: 'gengar', trade: true }],
  drowzee: [{ into: 'hypno', level: 26 }],
  krabby: [{ into: 'kingler', level: 28 }],
  voltorb: [{ into: 'electrode', level: 30 }],
  exeggcute: [{ into: 'exeggutor', item: 'Leaf Stone' }],
  cubone: [{ into: 'marowak', level: 28 }],
  koffing: [{ into: 'weezing', level: 35 }],
  rhyhorn: [{ into: 'rhydon', level: 42 }],
  horsea: [{ into: 'seadra', level: 32 }],
  goldeen: [{ into: 'seaking', level: 33 }],
  staryu: [{ into: 'starmie', item: 'Water Stone' }],
  magikarp: [{ into: 'gyarados', level: 20 }],
  eevee: [
    { into: 'vaporeon', item: 'Water Stone' },
    { into: 'jolteon', item: 'Thunder Stone' },
    { into: 'flareon', item: 'Fire Stone' },
  ],
  omanyte: [{ into: 'omastar', level: 40 }],
  kabuto: [{ into: 'kabutops', level: 40 }],
  dratini: [{ into: 'dragonair', level: 30 }],
  dragonair: [{ into: 'dragonite', level: 55 }],

  // Gen 2, by Gold and Silver rules. These mons aren't bundled: /pokemon new fetches
  // them, and a mon evolving into one fetches it first. Evolutions by friendship, time of
  // day, a held item, or stats, and the baby mons, aren't here yet.
  chikorita: [{ into: 'bayleef', level: 16 }],
  bayleef: [{ into: 'meganium', level: 32 }],
  cyndaquil: [{ into: 'quilava', level: 14 }],
  quilava: [{ into: 'typhlosion', level: 36 }],
  totodile: [{ into: 'croconaw', level: 18 }],
  croconaw: [{ into: 'feraligatr', level: 30 }],
  sentret: [{ into: 'furret', level: 15 }],
  hoothoot: [{ into: 'noctowl', level: 20 }],
  ledyba: [{ into: 'ledian', level: 18 }],
  spinarak: [{ into: 'ariados', level: 22 }],
  chinchou: [{ into: 'lanturn', level: 27 }],
  natu: [{ into: 'xatu', level: 25 }],
  mareep: [{ into: 'flaaffy', level: 15 }],
  flaaffy: [{ into: 'ampharos', level: 30 }],
  marill: [{ into: 'azumarill', level: 18 }],
  hoppip: [{ into: 'skiploom', level: 18 }],
  skiploom: [{ into: 'jumpluff', level: 27 }],
  sunkern: [{ into: 'sunflora', item: 'Sun Stone' }],
  wooper: [{ into: 'quagsire', level: 20 }],
  pineco: [{ into: 'forretress', level: 31 }],
  snubbull: [{ into: 'granbull', level: 23 }],
  teddiursa: [{ into: 'ursaring', level: 30 }],
  slugma: [{ into: 'magcargo', level: 38 }],
  swinub: [{ into: 'piloswine', level: 33 }],
  remoraid: [{ into: 'octillery', level: 25 }],
  houndour: [{ into: 'houndoom', level: 24 }],
  phanpy: [{ into: 'donphan', level: 25 }],
  larvitar: [{ into: 'pupitar', level: 30 }],
  pupitar: [{ into: 'tyranitar', level: 55 }],
}

// The mons EVOLUTIONS names that aren't bundled, as vscode-pokemon names their folders
// under media/gen2. scripts/check-data.mjs holds every unbundled name to this list.
export const FETCHED = [
  'ampharos', 'ariados', 'azumarill', 'bayleef', 'bellossom', 'chikorita', 'chinchou', 'croconaw', 'cyndaquil', 'donphan',
  'feraligatr', 'flaaffy', 'forretress', 'furret', 'granbull', 'hoothoot', 'hoppip', 'houndoom', 'houndour', 'jumpluff',
  'lanturn', 'larvitar', 'ledian', 'ledyba', 'magcargo', 'mareep', 'marill', 'meganium', 'natu', 'noctowl',
  'octillery', 'phanpy', 'piloswine', 'pineco', 'pupitar', 'quagsire', 'quilava', 'remoraid', 'sentret', 'skiploom',
  'slugma', 'snubbull', 'spinarak', 'sunflora', 'sunkern', 'swinub', 'teddiursa', 'totodile', 'typhlosion', 'tyranitar',
  'ursaring', 'wooper', 'xatu',
]

// PARENTS maps each evolved mon to the mon it comes from and the entry that takes it there
const PARENTS = new Map()
for (const [from, entries] of Object.entries(EVOLUTIONS)) {
  if (BASE_FORM[from]) continue
  for (const entry of entries) PARENTS.set(entry.into, { from, entry })
}

const parentOf = (mon) => PARENTS.get(BASE_FORM[mon] ?? mon)

export const evolutionsOf = (mon) => EVOLUTIONS[mon] ?? []

export const levelEvolutionOf = (mon) => evolutionsOf(mon).find((entry) => entry.level) ?? null

export const preEvolutionOf = (mon) => parentOf(mon)?.from ?? null

// A mon reached by level-up starts at that level, one reached by stone or trade starts
// where its pre-evolution does, and any other mon starts at FIRST_LEVEL, the lowest
// levels the games allow
export function startLevel(mon) {
  const parent = parentOf(mon)
  if (!parent) return FIRST_LEVEL
  return parent.entry.level ?? startLevel(parent.from)
}
