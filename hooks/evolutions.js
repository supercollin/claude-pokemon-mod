// The gen 1 evolutions follow the Red and Blue rules and are keyed by sprite key, in
// Pokédex order, followed by gen 2's and gen 3's. Each entry is one thing the mon can become: { into, level } on level-up,
// { into, item } with an evolution stone, { into, trade: true }, { into, trade: true,
// item } for a trade holding an item, which takes that item and no Link Cable, or
// { into, happy: true } on a level-up with full hearts, with time: 'day' or 'night' when
// only then. { into, level, more } stands in for Tyrogue's stats: at that level, more food
// icons than hearts, more hearts than food, or as many of each. { into, level, pick:
// 'random' } entries at one level share it by chance, like Wurmple's, the pick made at the
// level-up that reaches it. { into, fed: true } is a level-up with full food, standing in
// for Feebas's beauty, and { into, level, also } a level evolution that puts another mon in
// the box too, like Nincada's Shedinja. A mon that doesn't evolve has no entry. The mon
// an entry names shows as its sprite for the evolving mon's sex, so a female Bayleef
// becomes meganium_female and a female Wynaut wobbuffet_female.

const FIRST_LEVEL = 5

// The letters and marks each of Unown's forms is a folder for, like unown_a
export const UNOWN_FORMS = [...'abcdefghijklmnopqrstuvwxyz', 'exclamation', 'question']

// Female sprites and other forms take their base form's place in the family, so raichu
// comes from pikachu and venusaur_female from ivysaur. Heracross, Wobbuffet, and Unown
// have no folder of their own, only their forms'.
export const BASE_FORM = {
  pikachu_female: 'pikachu',
  venusaur_female: 'venusaur',
  meganium_female: 'meganium',
  pichu_spiky_eared: 'pichu',
  steelix_female: 'steelix',
  heracross_male: 'heracross',
  heracross_female: 'heracross',
  wobbuffet_male: 'wobbuffet',
  wobbuffet_female: 'wobbuffet',
  ...Object.fromEntries(UNOWN_FORMS.map((form) => ['unown_' + form, 'unown'])),
  deoxys_attack: 'deoxys',
  deoxys_defense: 'deoxys',
  deoxys_speed: 'deoxys',
}

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
  golbat: [{ into: 'crobat', happy: true }],
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
  poliwhirl: [
    { into: 'poliwrath', item: 'Water Stone' },
    { into: 'politoed', trade: true, item: "King's Rock" },
  ],
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
  slowpoke: [
    { into: 'slowbro', level: 37 },
    { into: 'slowking', trade: true, item: "King's Rock" },
  ],
  magnemite: [{ into: 'magneton', level: 30 }],
  doduo: [{ into: 'dodrio', level: 31 }],
  seel: [{ into: 'dewgong', level: 34 }],
  grimer: [{ into: 'muk', level: 38 }],
  shellder: [{ into: 'cloyster', item: 'Water Stone' }],
  gastly: [{ into: 'haunter', level: 25 }],
  haunter: [{ into: 'gengar', trade: true }],
  onix: [{ into: 'steelix', trade: true, item: 'Metal Coat' }],
  drowzee: [{ into: 'hypno', level: 26 }],
  krabby: [{ into: 'kingler', level: 28 }],
  voltorb: [{ into: 'electrode', level: 30 }],
  exeggcute: [{ into: 'exeggutor', item: 'Leaf Stone' }],
  chansey: [{ into: 'blissey', happy: true }],
  cubone: [{ into: 'marowak', level: 28 }],
  koffing: [{ into: 'weezing', level: 35 }],
  rhyhorn: [{ into: 'rhydon', level: 42 }],
  horsea: [{ into: 'seadra', level: 32 }],
  seadra: [{ into: 'kingdra', trade: true, item: 'Dragon Scale' }],
  goldeen: [{ into: 'seaking', level: 33 }],
  staryu: [{ into: 'starmie', item: 'Water Stone' }],
  scyther: [{ into: 'scizor', trade: true, item: 'Metal Coat' }],
  magikarp: [{ into: 'gyarados', level: 20 }],
  eevee: [
    { into: 'vaporeon', item: 'Water Stone' },
    { into: 'jolteon', item: 'Thunder Stone' },
    { into: 'flareon', item: 'Fire Stone' },
    { into: 'espeon', happy: true, time: 'day' },
    { into: 'umbreon', happy: true, time: 'night' },
  ],
  porygon: [{ into: 'porygon2', trade: true, item: 'Up-Grade' }],
  omanyte: [{ into: 'omastar', level: 40 }],
  kabuto: [{ into: 'kabutops', level: 40 }],
  dratini: [{ into: 'dragonair', level: 30 }],
  dragonair: [{ into: 'dragonite', level: 55 }],

  // Gen 2, by Gold and Silver rules. These mons aren't bundled: /pokemon new fetches
  // them, and a mon evolving into one fetches it first.
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
  pichu: [{ into: 'pikachu', happy: true }],
  cleffa: [{ into: 'clefairy', happy: true }],
  igglybuff: [{ into: 'jigglypuff', happy: true }],
  togepi: [{ into: 'togetic', happy: true }],
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
  tyrogue: [
    { into: 'hitmonlee', level: 20, more: 'food' },
    { into: 'hitmonchan', level: 20, more: 'happiness' },
    { into: 'hitmontop', level: 20, more: 'neither' },
  ],
  smoochum: [{ into: 'jynx', level: 30 }],
  elekid: [{ into: 'electabuzz', level: 30 }],
  magby: [{ into: 'magmar', level: 30 }],
  larvitar: [{ into: 'pupitar', level: 30 }],
  pupitar: [{ into: 'tyranitar', level: 55 }],

  // Gen 3, by Ruby and Sapphire rules, fetched like gen 2's. Azurill and Wynaut grow into
  // gen 2's Marill and Wobbuffet, Wynaut into the Wobbuffet sprite for its sex.
  treecko: [{ into: 'grovyle', level: 16 }],
  grovyle: [{ into: 'sceptile', level: 36 }],
  torchic: [{ into: 'combusken', level: 16 }],
  combusken: [{ into: 'blaziken', level: 36 }],
  mudkip: [{ into: 'marshtomp', level: 16 }],
  marshtomp: [{ into: 'swampert', level: 36 }],
  poochyena: [{ into: 'mightyena', level: 18 }],
  zigzagoon: [{ into: 'linoone', level: 20 }],
  wurmple: [
    { into: 'silcoon', level: 7, pick: 'random' },
    { into: 'cascoon', level: 7, pick: 'random' },
  ],
  silcoon: [{ into: 'beautifly', level: 10 }],
  cascoon: [{ into: 'dustox', level: 10 }],
  lotad: [{ into: 'lombre', level: 14 }],
  lombre: [{ into: 'ludicolo', item: 'Water Stone' }],
  seedot: [{ into: 'nuzleaf', level: 14 }],
  nuzleaf: [{ into: 'shiftry', item: 'Leaf Stone' }],
  taillow: [{ into: 'swellow', level: 22 }],
  wingull: [{ into: 'pelipper', level: 25 }],
  ralts: [{ into: 'kirlia', level: 20 }],
  kirlia: [{ into: 'gardevoir', level: 30 }],
  surskit: [{ into: 'masquerain', level: 22 }],
  shroomish: [{ into: 'breloom', level: 23 }],
  nincada: [{ into: 'ninjask', level: 20, also: 'shedinja' }],
  slakoth: [{ into: 'vigoroth', level: 18 }],
  vigoroth: [{ into: 'slaking', level: 36 }],
  whismur: [{ into: 'loudred', level: 20 }],
  loudred: [{ into: 'exploud', level: 40 }],
  makuhita: [{ into: 'hariyama', level: 24 }],
  azurill: [{ into: 'marill', happy: true }],
  skitty: [{ into: 'delcatty', item: 'Moon Stone' }],
  aron: [{ into: 'lairon', level: 32 }],
  lairon: [{ into: 'aggron', level: 42 }],
  meditite: [{ into: 'medicham', level: 37 }],
  electrike: [{ into: 'manectric', level: 26 }],
  gulpin: [{ into: 'swalot', level: 26 }],
  carvanha: [{ into: 'sharpedo', level: 30 }],
  wailmer: [{ into: 'wailord', level: 40 }],
  numel: [{ into: 'camerupt', level: 33 }],
  spoink: [{ into: 'grumpig', level: 32 }],
  trapinch: [{ into: 'vibrava', level: 35 }],
  vibrava: [{ into: 'flygon', level: 45 }],
  cacnea: [{ into: 'cacturne', level: 32 }],
  swablu: [{ into: 'altaria', level: 35 }],
  barboach: [{ into: 'whiscash', level: 30 }],
  corphish: [{ into: 'crawdaunt', level: 30 }],
  baltoy: [{ into: 'claydol', level: 36 }],
  lileep: [{ into: 'cradily', level: 40 }],
  anorith: [{ into: 'armaldo', level: 40 }],
  feebas: [{ into: 'milotic', fed: true }],
  shuppet: [{ into: 'banette', level: 37 }],
  duskull: [{ into: 'dusclops', level: 37 }],
  wynaut: [{ into: 'wobbuffet_male', level: 15 }],
  snorunt: [{ into: 'glalie', level: 42 }],
  spheal: [{ into: 'sealeo', level: 32 }],
  sealeo: [{ into: 'walrein', level: 44 }],
  clamperl: [
    { into: 'huntail', trade: true, item: 'Deep Sea Tooth' },
    { into: 'gorebyss', trade: true, item: 'Deep Sea Scale' },
  ],
  bagon: [{ into: 'shelgon', level: 30 }],
  shelgon: [{ into: 'salamence', level: 50 }],
  beldum: [{ into: 'metang', level: 20 }],
  metang: [{ into: 'metagross', level: 45 }],
}

// The mons EVOLUTIONS names that aren't bundled, as vscode-pokemon names their folders
// under media/gen<N>. scripts/check-data.mjs holds every unbundled name to this list.
export const FETCHED = [
  'aggron', 'altaria', 'ampharos', 'anorith', 'ariados', 'armaldo', 'aron', 'azumarill', 'azurill', 'bagon',
  'baltoy', 'banette', 'barboach', 'bayleef', 'beautifly', 'beldum', 'bellossom', 'blaziken', 'blissey', 'breloom',
  'cacnea', 'cacturne', 'camerupt', 'carvanha', 'cascoon', 'chikorita', 'chinchou', 'clamperl', 'claydol', 'cleffa',
  'combusken', 'corphish', 'cradily', 'crawdaunt', 'crobat', 'croconaw', 'cyndaquil', 'delcatty', 'donphan', 'dusclops',
  'duskull', 'dustox', 'electrike', 'elekid', 'espeon', 'exploud', 'feebas', 'feraligatr', 'flaaffy', 'flygon',
  'forretress', 'furret', 'gardevoir', 'glalie', 'gorebyss', 'granbull', 'grovyle', 'grumpig', 'gulpin', 'hariyama',
  'hitmontop', 'hoothoot', 'hoppip', 'houndoom', 'houndour', 'huntail', 'igglybuff', 'jumpluff', 'kingdra', 'kirlia',
  'lairon', 'lanturn', 'larvitar', 'ledian', 'ledyba', 'lileep', 'linoone', 'lombre', 'lotad', 'loudred',
  'ludicolo', 'magby', 'magcargo', 'makuhita', 'manectric', 'mareep', 'marill', 'marshtomp', 'masquerain', 'medicham',
  'meditite', 'meganium', 'metagross', 'metang', 'mightyena', 'milotic', 'mudkip', 'natu', 'nincada', 'ninjask',
  'noctowl', 'numel', 'nuzleaf', 'octillery', 'pelipper', 'phanpy', 'pichu', 'piloswine', 'pineco', 'politoed',
  'poochyena', 'porygon2', 'pupitar', 'quagsire', 'quilava', 'ralts', 'remoraid', 'salamence', 'sceptile', 'scizor',
  'sealeo', 'seedot', 'sentret', 'sharpedo', 'shedinja', 'shelgon', 'shiftry', 'shroomish', 'shuppet', 'silcoon',
  'skiploom', 'skitty', 'slaking', 'slakoth', 'slowking', 'slugma', 'smoochum', 'snorunt', 'snubbull', 'spheal',
  'spinarak', 'spoink', 'steelix', 'sunflora', 'sunkern', 'surskit', 'swablu', 'swalot', 'swampert', 'swellow',
  'swinub', 'taillow', 'teddiursa', 'togepi', 'togetic', 'torchic', 'totodile', 'trapinch', 'treecko', 'typhlosion',
  'tyranitar', 'tyrogue', 'umbreon', 'ursaring', 'vibrava', 'vigoroth', 'wailmer', 'wailord', 'walrein', 'whiscash',
  'whismur', 'wingull', 'wobbuffet_female', 'wobbuffet_male', 'wooper', 'wurmple', 'wynaut', 'xatu', 'zigzagoon',
]

// PARENTS maps each evolved mon to the mon it comes from and the entry that takes it there.
// A bundled mon keeps no fetched parent, like Jynx from Smoochum, so its start level and
// wild tier stay as in gen 1.
const PARENTS = new Map()
for (const [from, entries] of Object.entries(EVOLUTIONS)) {
  if (BASE_FORM[from]) continue
  for (const entry of entries) {
    if (FETCHED.includes(from) && !FETCHED.includes(entry.into)) continue
    PARENTS.set(BASE_FORM[entry.into] ?? entry.into, { from, entry })
  }
}

const parentOf = (mon) => PARENTS.get(BASE_FORM[mon] ?? mon)

export const evolutionsOf = (mon) => EVOLUTIONS[mon] ?? []

// The evolution a level alone reaches, leaving out Tyrogue's that also weigh the meters
// and the ones left to chance
export const levelEvolutionOf = (mon) => evolutionsOf(mon).find((entry) => entry.level && !entry.more && !entry.pick) ?? null

// An evolution a level-up reaches by the meters, the clock, or chance, kept on the record
// as readyFor
export const isLevelUpOnly = (entry) => Boolean(entry.happy || entry.more || entry.pick || entry.fed)

// Which meter has more icons, as a Tyrogue entry's more names it
export function moreOf(food, hearts) {
  if (food > hearts) return 'food'
  if (hearts > food) return 'happiness'
  return 'neither'
}

// Gold and Silver's day runs from 4:00 to 18:00 on the local clock, and night the rest
export function timeOfDay(ms) {
  const hour = new Date(ms).getHours()
  return hour >= 4 && hour < 18 ? 'day' : 'night'
}

// The evolution a level-up reaches by the meters, the clock, or chance, or null: one by
// friendship with full hearts at this time of day, Feebas's with full food, Tyrogue's at
// its level by which meter has more, or one of those left to chance at their level. A pick
// already made, kept, stays; random() returns a number in [0, 1).
export function levelUpEvolutionOf(mon, { level, food, hearts, full, time, random = Math.random, kept = null }) {
  const picks = evolutionsOf(mon).filter((entry) => entry.pick && level >= entry.level)
  if (picks.length > 0) return picks.find((entry) => entry.into === kept) ?? picks[Math.floor(random() * picks.length)]
  const reached = (entry) => {
    if (entry.happy) return hearts === full && (!entry.time || entry.time === time)
    if (entry.fed) return food === full
    return Boolean(entry.more) && level >= entry.level && entry.more === moreOf(food, hearts)
  }
  return evolutionsOf(mon).find(reached) ?? null
}

export const preEvolutionOf = (mon) => parentOf(mon)?.from ?? null

// A mon reached by level-up starts at that level, one reached by stone or trade starts
// where its pre-evolution does, and any other mon starts at FIRST_LEVEL, the lowest
// levels the games allow
export function startLevel(mon) {
  const parent = parentOf(mon)
  if (!parent) return FIRST_LEVEL
  return parent.entry.level ?? startLevel(parent.from)
}
