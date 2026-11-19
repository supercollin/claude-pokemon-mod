// The gen 1 evolutions follow the Red and Blue rules and are keyed by sprite key, in
// Pokédex order, followed by gen 2's, gen 3's, and gen 4's. Each entry is one thing the mon can become: { into, level } on level-up,
// { into, item } with an evolution stone, { into, trade: true }, { into, trade: true,
// item } for a trade holding an item, which takes that item and no Link Cable, or
// { into, happy: true } on a level-up with full hearts, with time: 'day' or 'night' when
// only then. { into, level, more } stands in for Tyrogue's stats: at that level, more food
// icons than hearts, more hearts than food, or as many of each. { into, level, pick:
// 'random' } entries at one level share it by chance, like Wurmple's, the pick made at the
// level-up that reaches it. { into, fed: true } is a level-up with full food, standing in
// for Feebas's beauty, and { into, level, also } a level evolution that puts another mon in
// the box too, like Nincada's Shedinja. sex: 'male' or 'female' keeps an entry to a mon
// of that sex, like Kirlia's Gallade, and time on an item entry to that time of day, like
// Sneasel's Razor Claw by night. { into, with } is a level-up with that mon in the party,
// like Mantyke's Remoraid. A mon that doesn't evolve has no entry. The mon
// an entry names shows as its sprite for the evolving mon's sex, so a female Bayleef
// becomes meganium_female and a female Wynaut wobbuffet_female.

const FIRST_LEVEL = 5

// The letters and marks each of Unown's forms is a folder for, like unown_a
export const UNOWN_FORMS = [...'abcdefghijklmnopqrstuvwxyz', 'exclamation', 'question']

// Gen 4's forms with a folder each: Burmy's and Wormadam's cloaks, Rotom's appliances, and
// Arceus's types, one for each plate
export const BURMY_CLOAKS = ['plant', 'sandy', 'trash']
export const ROTOM_FORMS = ['fan', 'frost', 'heat', 'mow', 'wash']
export const ARCEUS_TYPES = [
  'bug', 'dark', 'dragon', 'electric', 'fighting', 'fire', 'flying', 'ghost', 'grass', 'ground', 'ice', 'poison', 'psychic', 'rock', 'steel', 'water',
]

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
  ...Object.fromEntries(BURMY_CLOAKS.flatMap((cloak) => [['burmy_' + cloak, 'burmy'], ['wormadam_' + cloak, 'wormadam']])),
  combee_male: 'combee',
  combee_female: 'combee',
  shellos_east: 'shellos',
  shellos_west: 'shellos',
  gastrodon_east: 'gastrodon',
  gastrodon_west: 'gastrodon',
  gible_female: 'gible',
  gabite_female: 'gabite',
  garchomp_female: 'garchomp',
  hippopotas_male: 'hippopotas',
  hippopotas_female: 'hippopotas',
  hippowdon_male: 'hippowdon',
  hippowdon_female: 'hippowdon',
  ...Object.fromEntries(ROTOM_FORMS.map((form) => ['rotom_' + form, 'rotom'])),
  giratina_origin: 'giratina',
  shaymin_sky: 'shaymin',
  ...Object.fromEntries(ARCEUS_TYPES.map((type) => ['arceus_' + type, 'arceus'])),
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
    { into: 'leafeon', item: 'Leaf Stone' },
    { into: 'glaceon', item: 'Ice Stone' },
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
  kirlia: [
    { into: 'gardevoir', level: 30 },
    { into: 'gallade', item: 'Dawn Stone', sex: 'male' },
  ],
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
  snorunt: [
    { into: 'glalie', level: 42 },
    { into: 'froslass', item: 'Dawn Stone', sex: 'female' },
  ],
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

  // Gen 4, by Diamond, Pearl, and Platinum rules, fetched like gen 2's. A mon the games
  // evolve once it knows a move evolves at the level it learns that move there, like Aipom
  // at 32 for Double Hit. Piloswine only relearns Ancient Power, so it evolves at its first
  // level-up. Magneton and Nosepass, which evolve at Mt. Coronet, take a Thunder Stone, and
  // Eevee a Leaf Stone for Leafeon and an Ice Stone for Glaceon, as in Sword and Shield. Each of Shellos's seas, Gible's
  // and Hippopotas's sexes, and the female Combee evolve on their own. A Burmy keeps its
  // cloak as Wormadam, and a male becomes Mothim. Holding an item at a time of day, as
  // Sneasel, Gligar, and Happiny level up in the games, is using it then here.
  magneton: [{ into: 'magnezone', item: 'Thunder Stone' }],
  lickitung: [{ into: 'lickilicky', level: 33 }],
  tangela: [{ into: 'tangrowth', level: 33 }],
  aipom: [{ into: 'ambipom', level: 32 }],
  yanma: [{ into: 'yanmega', level: 33 }],
  piloswine: [{ into: 'mamoswine', level: 34 }],
  nosepass: [{ into: 'probopass', item: 'Thunder Stone' }],
  rhydon: [{ into: 'rhyperior', trade: true, item: 'Protector' }],
  electabuzz: [{ into: 'electivire', trade: true, item: 'Electirizer' }],
  magmar: [{ into: 'magmortar', trade: true, item: 'Magmarizer' }],
  porygon2: [{ into: 'porygonz', trade: true, item: 'Dubious Disc' }],
  togetic: [{ into: 'togekiss', item: 'Shiny Stone' }],
  misdreavus: [{ into: 'mismagius', item: 'Dusk Stone' }],
  murkrow: [{ into: 'honchkrow', item: 'Dusk Stone' }],
  roselia: [{ into: 'roserade', item: 'Shiny Stone' }],
  dusclops: [{ into: 'dusknoir', trade: true, item: 'Reaper Cloth' }],
  sneasel: [{ into: 'weavile', item: 'Razor Claw', time: 'night' }],
  gligar: [{ into: 'gliscor', item: 'Razor Fang', time: 'night' }],
  turtwig: [{ into: 'grotle', level: 18 }],
  grotle: [{ into: 'torterra', level: 32 }],
  chimchar: [{ into: 'monferno', level: 14 }],
  monferno: [{ into: 'infernape', level: 36 }],
  piplup: [{ into: 'prinplup', level: 16 }],
  prinplup: [{ into: 'empoleon', level: 36 }],
  starly: [{ into: 'staravia', level: 14 }],
  staravia: [{ into: 'staraptor', level: 34 }],
  bidoof: [{ into: 'bibarel', level: 15 }],
  kricketot: [{ into: 'kricketune', level: 10 }],
  shinx: [{ into: 'luxio', level: 15 }],
  luxio: [{ into: 'luxray', level: 30 }],
  budew: [{ into: 'roselia', happy: true, time: 'day' }],
  cranidos: [{ into: 'rampardos', level: 30 }],
  ...Object.fromEntries(
    BURMY_CLOAKS.map((cloak) => [
      'burmy_' + cloak,
      [
        { into: 'wormadam_' + cloak, level: 20, sex: 'female' },
        { into: 'mothim', level: 20, sex: 'male' },
      ],
    ]),
  ),
  shieldon: [{ into: 'bastiodon', level: 30 }],
  combee_female: [{ into: 'vespiquen', level: 21 }],
  buizel: [{ into: 'floatzel', level: 26 }],
  cherubi: [{ into: 'cherrim', level: 25 }],
  shellos_east: [{ into: 'gastrodon_east', level: 30 }],
  shellos_west: [{ into: 'gastrodon_west', level: 30 }],
  drifloon: [{ into: 'drifblim', level: 28 }],
  buneary: [{ into: 'lopunny', happy: true }],
  glameow: [{ into: 'purugly', level: 38 }],
  chingling: [{ into: 'chimecho', happy: true, time: 'night' }],
  stunky: [{ into: 'skuntank', level: 34 }],
  bronzor: [{ into: 'bronzong', level: 33 }],
  bonsly: [{ into: 'sudowoodo', level: 17 }],
  mimejr: [{ into: 'mrmime', level: 18 }],
  happiny: [{ into: 'chansey', item: 'Oval Stone', time: 'day' }],
  gible: [{ into: 'gabite', level: 24 }],
  gible_female: [{ into: 'gabite_female', level: 24 }],
  gabite: [{ into: 'garchomp', level: 48 }],
  gabite_female: [{ into: 'garchomp_female', level: 48 }],
  munchlax: [{ into: 'snorlax', happy: true }],
  riolu: [{ into: 'lucario', happy: true, time: 'day' }],
  hippopotas_male: [{ into: 'hippowdon_male', level: 34 }],
  hippopotas_female: [{ into: 'hippowdon_female', level: 34 }],
  skorupi: [{ into: 'drapion', level: 40 }],
  croagunk: [{ into: 'toxicroak', level: 37 }],
  finneon: [{ into: 'lumineon', level: 31 }],
  mantyke: [{ into: 'mantine', with: 'remoraid' }],
  snover: [{ into: 'abomasnow', level: 40 }],
}

// The mons EVOLUTIONS names that aren't bundled, as vscode-pokemon names their folders
// under media/gen<N>. scripts/check-data.mjs holds every unbundled name to this list.
export const FETCHED = [
  'abomasnow', 'aggron', 'aipom', 'altaria', 'ambipom', 'ampharos', 'anorith', 'ariados', 'armaldo', 'aron',
  'azumarill', 'azurill', 'bagon', 'baltoy', 'banette', 'barboach', 'bastiodon', 'bayleef', 'beautifly', 'beldum',
  'bellossom', 'bibarel', 'bidoof', 'blaziken', 'blissey', 'bonsly', 'breloom', 'bronzong', 'bronzor', 'budew',
  'buizel', 'buneary', 'burmy_plant', 'burmy_sandy', 'burmy_trash', 'cacnea', 'cacturne', 'camerupt', 'carvanha', 'cascoon',
  'cherrim', 'cherubi', 'chikorita', 'chimchar', 'chimecho', 'chinchou', 'chingling', 'clamperl', 'claydol', 'cleffa',
  'combee_female', 'combusken', 'corphish', 'cradily', 'cranidos', 'crawdaunt', 'croagunk', 'crobat', 'croconaw', 'cyndaquil',
  'delcatty', 'donphan', 'drapion', 'drifblim', 'drifloon', 'dusclops', 'dusknoir', 'duskull', 'dustox', 'electivire',
  'electrike', 'elekid', 'empoleon', 'espeon', 'exploud', 'feebas', 'feraligatr', 'finneon', 'flaaffy', 'floatzel',
  'flygon', 'forretress', 'froslass', 'furret', 'gabite', 'gabite_female', 'gallade', 'garchomp', 'garchomp_female', 'gardevoir',
  'gastrodon_east', 'gastrodon_west', 'gible', 'gible_female', 'glaceon', 'glalie', 'glameow', 'gligar', 'gliscor', 'gorebyss',
  'granbull', 'grotle', 'grovyle', 'grumpig', 'gulpin', 'happiny', 'hariyama', 'hippopotas_female', 'hippopotas_male', 'hippowdon_female',
  'hippowdon_male', 'hitmontop', 'honchkrow', 'hoothoot', 'hoppip', 'houndoom', 'houndour', 'huntail', 'igglybuff', 'infernape',
  'jumpluff', 'kingdra', 'kirlia', 'kricketot', 'kricketune', 'lairon', 'lanturn', 'larvitar', 'leafeon', 'ledian',
  'ledyba', 'lickilicky', 'lileep', 'linoone', 'lombre', 'lopunny', 'lotad', 'loudred', 'lucario', 'ludicolo',
  'lumineon', 'luxio', 'luxray', 'magby', 'magcargo', 'magmortar', 'magnezone', 'makuhita', 'mamoswine', 'manectric',
  'mantine', 'mantyke', 'mareep', 'marill', 'marshtomp', 'masquerain', 'medicham', 'meditite', 'meganium', 'metagross',
  'metang', 'mightyena', 'milotic', 'mimejr', 'misdreavus', 'mismagius', 'monferno', 'mothim', 'mudkip', 'munchlax',
  'murkrow', 'natu', 'nincada', 'ninjask', 'noctowl', 'nosepass', 'numel', 'nuzleaf', 'octillery', 'pelipper',
  'phanpy', 'pichu', 'piloswine', 'pineco', 'piplup', 'politoed', 'poochyena', 'porygon2', 'porygonz', 'prinplup',
  'probopass', 'pupitar', 'purugly', 'quagsire', 'quilava', 'ralts', 'rampardos', 'remoraid', 'rhyperior', 'riolu',
  'roselia', 'roserade', 'salamence', 'sceptile', 'scizor', 'sealeo', 'seedot', 'sentret', 'sharpedo', 'shedinja',
  'shelgon', 'shellos_east', 'shellos_west', 'shieldon', 'shiftry', 'shinx', 'shroomish', 'shuppet', 'silcoon', 'skiploom',
  'skitty', 'skorupi', 'skuntank', 'slaking', 'slakoth', 'slowking', 'slugma', 'smoochum', 'sneasel', 'snorunt',
  'snover', 'snubbull', 'spheal', 'spinarak', 'spoink', 'staraptor', 'staravia', 'starly', 'steelix', 'stunky',
  'sudowoodo', 'sunflora', 'sunkern', 'surskit', 'swablu', 'swalot', 'swampert', 'swellow', 'swinub', 'taillow',
  'tangrowth', 'teddiursa', 'togekiss', 'togepi', 'togetic', 'torchic', 'torterra', 'totodile', 'toxicroak', 'trapinch',
  'treecko', 'turtwig', 'typhlosion', 'tyranitar', 'tyrogue', 'umbreon', 'ursaring', 'vespiquen', 'vibrava', 'vigoroth',
  'wailmer', 'wailord', 'walrein', 'weavile', 'whiscash', 'whismur', 'wingull', 'wobbuffet_female', 'wobbuffet_male', 'wooper',
  'wormadam_plant', 'wormadam_sandy', 'wormadam_trash', 'wurmple', 'wynaut', 'xatu', 'yanma', 'yanmega', 'zigzagoon',
]

// PARENTS maps each evolved mon to the mon it comes from and the entry that takes it there.
// A bundled mon keeps no fetched parent, like Jynx from Smoochum, so its start level and
// wild tier stay as in gen 1.
const PARENTS = new Map()
// A form's entries stand for its base form's when that has none of its own, like
// Combee's female or Shellos's seas, and are left out when it does, like Pikachu's female.
for (const [from, entries] of Object.entries(EVOLUTIONS)) {
  if (BASE_FORM[from] && EVOLUTIONS[BASE_FORM[from]]) continue
  for (const entry of entries) {
    if (FETCHED.includes(from) && !FETCHED.includes(entry.into)) continue
    PARENTS.set(BASE_FORM[entry.into] ?? entry.into, { from: BASE_FORM[from] ?? from, entry })
  }
}

const parentOf = (mon) => PARENTS.get(BASE_FORM[mon] ?? mon)

// A mon's evolutions, for a mon of that sex when sex is given, so a female Kirlia has no
// Gallade, and a mon with no sex none for either
export function evolutionsOf(mon, sex) {
  const entries = EVOLUTIONS[mon] ?? []
  return sex === undefined ? entries : entries.filter((entry) => !entry.sex || entry.sex === sex)
}

// The evolution a level alone reaches, leaving out Tyrogue's that also weigh the meters
// and the ones left to chance
export const levelEvolutionOf = (mon, sex) => evolutionsOf(mon, sex).find((entry) => entry.level && !entry.more && !entry.pick) ?? null

// An evolution a level-up reaches by the meters, the clock, chance, or the party, kept on
// the record as readyFor
export const isLevelUpOnly = (entry) => Boolean(entry.happy || entry.more || entry.pick || entry.fed || entry.with)

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

// The evolution a level-up reaches by the meters, the clock, chance, or the party, or null:
// one by friendship with full hearts at this time of day, Feebas's with full food,
// Tyrogue's at its level by which meter has more, Mantyke's with a Remoraid among the
// Pokédex keys in team, or one of those left to chance at their level. A pick already
// made, kept, stays; random() returns a number in [0, 1).
export function levelUpEvolutionOf(mon, { level, food, hearts, full, time, sex, team = [], random = Math.random, kept = null }) {
  const picks = evolutionsOf(mon, sex).filter((entry) => entry.pick && level >= entry.level)
  if (picks.length > 0) return picks.find((entry) => entry.into === kept) ?? picks[Math.floor(random() * picks.length)]
  const reached = (entry) => {
    if (entry.happy) return hearts === full && (!entry.time || entry.time === time)
    if (entry.fed) return food === full
    if (entry.with) return team.includes(entry.with)
    return Boolean(entry.more) && level >= entry.level && entry.more === moreOf(food, hearts)
  }
  return evolutionsOf(mon, sex).find(reached) ?? null
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
