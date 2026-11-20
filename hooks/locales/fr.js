import { BERRIES, TYPES } from './names-fr.js'

// Every message the band says, in French, under the same names as en.js. Names come in
// already written out in French, like "Pikachu ♀" or "Pierre Foudre". The commands it
// names are the French verbs, which /pokemon takes as well as the English ones.

// The French verb for each command, and for the words some commands take after it
export const VERBS = {
  pet: 'caresse', feed: 'nourris', sleep: 'dors', revive: 'soigne', nickname: 'surnom', attack: 'attaque', moves: 'capacités',
  catch: 'capture', roar: 'rugis', run: 'fuis', evolve: 'évolue', stop: 'stop', bag: 'sac', use: 'utilise', take: 'reprends',
  stats: 'stats', box: 'boîte', party: 'équipe', dex: 'dex', release: 'relâche', new: 'nouveau', list: 'liste', help: 'aide',
  default: 'normal', shiny: 'chromatique', wander: 'balade', needs: 'besoins', emoji: 'emoji', size: 'taille', images: 'images',
  pane: 'panneau', sync: 'synchro', autoevolve: 'autoévolution', nuzlocke: 'nuzlocke', trainer: 'dresseur', gen: 'gen',
}
export const WORDS = { add: 'ajoute', remove: 'retire', assign: 'assigne', unassign: 'désassigne', random: 'hasard', small: 'petit', large: 'grand' }

const command = (name) => VERBS[name] ?? name
const word = (name) => WORDS[name] ?? name
const P = (name, rest = '') => '/pokemon ' + command(name) + (rest ? ' ' + rest : '')

const joined = (w) => (items) => (items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' ' + w + ' ' + items.at(-1))
const or = joined('ou')
const and = joined('et')

// The articles a name takes, by its first word: une Pierre Feu, la Plaque Flamme, but un
// Super Bonbon, l'Améliorator, d'Abra
const FEMININE = ['pierre', 'roche', 'peau', 'ecaille', 'dent', 'griffe', 'plaque', 'baie']
const firstWord = (name) => name.split(' ')[0].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const isFeminine = (name) => FEMININE.includes(firstWord(name))
const elides = (name) => /^[aeiouyhâàéèêëîïôûù]/i.test(name)
const a = (name) => (isFeminine(name) ? 'une ' : 'un ') + name
const the = (name) => {
  if (elides(name)) return 'l\'' + name
  return (isFeminine(name) ? 'la ' : 'le ') + name
}
const of = (name) => (elides(name) ? 'd\'' : 'de ') + name
const capitalized = (text) => text.charAt(0).toUpperCase() + text.slice(1)

const lv = (level) => 'N. ' + level
const TIMES = { day: 'le jour', night: 'la nuit' }
const NOW = { day: 'Il fait jour.', night: 'Il fait nuit.' }
const SEXES = { male: 'mâle', female: 'femelle' }
const CONDITIONS = { 'ran away': 'enfui', healing: 'en soin', fainted: 'K.O.' }
const TIERS = { common: 'commun', uncommon: 'peu commun', rare: 'rare', legendary: 'légendaire' }
const VARIANTS = { default: 'normal', shiny: 'chromatique' }
const SIZES = { small: 'petit', large: 'grand' }
const IMAGE_MODES = { auto: 'auto', on: 'on', off: 'off' }
const MOVE_TEXTS = { 'Pay Day': 'Il y a des pièces partout !', Rest: 'Il s\'endort !', Splash: 'Mais rien ne se passe !' }

const MORE_TEXTS = {
  food: ' avec plus de nourriture que de cœurs',
  happiness: ' avec plus de cœurs que de nourriture',
  neither: ' avec autant de nourriture que de cœurs',
}

export const FR = {
  or,
  and,
  a,
  lv,
  bandLevel: (level, max) => (max ? 'N.' : 'N. ') + level,
  command,
  word,
  timeOfDay: (time) => TIMES[time] ?? time,
  condition: (condition) => CONDITIONS[condition] ?? condition,
  tier: (tier) => TIERS[tier] ?? tier,
  variant: (variant) => VARIANTS[variant] ?? variant,
  sizeName: (size) => SIZES[size] ?? size,
  imageMode: (mode) => IMAGE_MODES[mode] ?? mode,
  onOff: (on) => (on ? 'oui' : 'non'),
  moveText: (name, text) => MOVE_TEXTS[name] ?? text,
  berryName: (name) => BERRIES[name] ?? name,
  typeName: (type) => TYPES[type] ?? type,
  versusWild: (name, foe) => name + ' contre ' + foe + ' sauvage',
  catchButton: 'Capturer',
  attackButton: 'Attaquer',
  commandDescription: 'Choisis le Pokémon au-dessus du prompt, caresse-le, nourris-le, endors-le, fais-le attaquer, liste ses capacités, fais-le évoluer, ou consulte ton Pokédex',

  // Évolution
  evolveFailed: (name, into, why) => name + ' ne peut pas encore évoluer en ' + into + ' : ' + why,
  evolving: (name) => 'Hein ? ' + name + ' évolue !',
  evolved: (name, into) => 'Félicitations ! Ton ' + name + ' a évolué en ' + into + ' !',
  changedForme: (name, into) => name + ' change de forme et devient ' + into + ' !',
  joinFailed: (mon, why) => mon + ' n\'a pas pu rejoindre ta boîte : ' + why,
  joinedToo: (mon) => mon + ' rejoint aussi ta boîte !',
  notEvolving: (name) => name + ' n\'est pas en train d\'évoluer.',
  stoppedEvolving: (name) => 'Hein ? ' + name + ' a arrêté d\'évoluer !',
  doesntEvolve: (name) => name + ' n\'évolue pas.',
  busy: (name) => name + ' est occupé pour l\'instant.',
  canBecome: (name, text) => name + ' peut devenir ' + text + '.',
  canBecomeTry: (name, text, example) => name + ' peut devenir ' + text + '. Essaie ' + P('evolve', example) + '.',
  evolvesAtLevel: (name, into, level, now) => name + ' évolue en ' + into + ' au ' + lv(level) + '. Il est au ' + lv(now) + '.',
  evolvesByTime: (name, into, item, time, now) => name + ' évolue en ' + into + ' avec ' + a(item) + ' ' + (TIMES[time] ?? time) + '. ' + (NOW[now] ?? now),
  needsItem: (name, item, into) => name + ' a besoin ' + of(a(item)) + ' pour évoluer en ' + into + '. Les Pokémon sauvages que tu mets K.O. lâchent parfois un objet, et ' + P('bag') + ' liste les tiens.',
  notOnShowEvolve: (name) => name + ' n\'est plus affiché, il n\'a donc pas évolué.',
  tradeHolding: (name, item) => 'Tu échanges ' + name + ' tenant ' + a(item) + ' avec un ami, qui te le renvoie aussitôt.',
  useOn: (item, name) => 'Tu utilises ' + a(item) + ' sur ' + name + '.',
  trade: (name) => 'Tu échanges ' + name + ' avec un ami, qui te le renvoie aussitôt.',
  letEvolve: (name) => 'Tu laisses ' + name + ' évoluer.',
  onlySex: (sex, species, into) => 'Seul un ' + species + ' ' + (SEXES[sex] ?? sex) + ' peut devenir ' + into + '.',
  readyToEvolve: (name, into) => name + ' est prêt à évoluer en ' + into + ' ! ' + P('evolve') + ' le laisse faire.',
  evolveWaits: (name) => name + ' attend ' + P('evolve') + ' quand il atteint son niveau d\'évolution.',
  evolvesAlone: (name) => name + ' évolue tout seul, au repos, une fois à son niveau d\'évolution.',

  // Comment une évolution se lit, comme « Voltali avec une Pierre Foudre »
  evolveHappy: (into, time) => into + ' en montant de niveau avec tous ses cœurs' + (time ? ' ' + (TIMES[time] ?? time) : ''),
  evolveFed: (into) => into + ' en montant de niveau le ventre plein',
  evolveWith: (into, mon) => into + ' en montant de niveau avec ' + mon + ' dans ton équipe',
  evolveMore: (into, level, more) => into + ' au ' + lv(level) + MORE_TEXTS[more],
  evolveTradeHolding: (into, item) => into + ' par échange en tenant ' + a(item),
  evolveItem: (into, item, time) => into + ' avec ' + a(item) + (time ? ' ' + (TIMES[time] ?? time) : ''),
  evolveTrade: (into) => into + ' par échange',
  evolveLevel: (into, level) => into + ' au ' + lv(level),
  evolvePick: (names, level, chance) => or(names) + ' au ' + lv(level) + (chance ? ', au hasard' : ''),

  // Les Pokémon sauvages
  wildName: (name, shiny) => name + (shiny ? ' sauvage chromatique' : ' sauvage'),
  fled: (name) => name + ' sauvage s\'enfuit !',
  looksLike: (yours) => ' Il ressemble beaucoup à ' + yours + '.',
  yourMon: (name) => 'ton ' + name,
  appeared: (wild, level, yours) => 'Un ' + wild + ' (' + lv(level) + ') apparaît !' + yours,
  brokeFree: ['Oh non ! Le Pokémon s\'est libéré !', 'Raah ! Ça y était presque !', 'Raah ! Ça y était presque !', 'Mince ! Pas loin !'],
  cameBack: (name) => 'Gotcha ! ' + name + ' est revenu vers toi.',
  caughtMarked: (name) => 'Gotcha ! ' + name + ' est attrapé ! ' + name + ' est déjà dans ta boîte, il est donc noté dans ton Pokédex.',
  caught: (name) => 'Gotcha ! ' + name + ' est attrapé ! Il rejoint ta boîte.',
  used: (name, move) => name + ' utilise ' + move + ' !',
  wildUsed: (name, move) => name + ' sauvage utilise ' + move + ' !',
  wildFainted: (name) => name + ' sauvage est K.O. ! Il ne peut plus être attrapé.',
  wildDropped: (name, item) => name + ' sauvage est K.O. ! Il ne peut plus être attrapé. Il a lâché ' + a(item) + ', qui est dans ton sac.',
  wildWeak: (name) => name + ' sauvage est affaibli ! Lance une Poké Ball avec ' + P('catch') + '. Un coup de plus pourrait le mettre K.O.',
  alreadyWild: (name) => 'Un ' + name + ' sauvage est déjà là.',
  asleep: (name) => name + ' dort.',
  tooNarrow: (name) => 'Le bandeau est trop étroit pour un ' + name + ' sauvage. Élargis le panneau et réessaie.',
  onItsWay: (name) => 'Un ' + name + ' sauvage arrive.',
  noWild: 'Il n\'y a pas de Pokémon sauvage ici.',
  waitMove: 'Attends la fin de l\'attaque.',
  waitBall: 'Attends que la Poké Ball se stabilise.',
  threwBall: 'Tu lances une Poké Ball !',
  notNow: (wild) => 'Pas maintenant, un ' + wild + ' est juste là !',

  // K.O. et Centre Pokémon
  killed: (name, forGood) => name + (forGood ? ' est K.O. pour de bon.' : ' est K.O.'),
  fainted: (name) => name + ' est K.O. ! ' + P('revive') + ' l\'emmène au Centre Pokémon.',
  ranAway: (name, next) => name + ' s\'est enfui ! Il pourrait réapparaître dans la nature.' + (next ? ' ' + next + ' prend sa place.' : ''),
  lost: (name, next) => name + ' est K.O. pour de bon. Repose en paix.' + (next ? ' ' + next + ' prend sa place.' : ''),
  healed: (name) => name + ' est soigné et de nouveau sur pied !',
  gone: (name) => name + ' est parti.',
  goneCatchNew: (name) => name + ' est parti. Attrapes-en un nouveau dans la nature pour l\'élever de nouveau.',
  goneForGood: (name) => name + ' est K.O. pour de bon. Repose en paix.',
  ranAwayLine: (name) => name + ' s\'est enfui. Il pourrait réapparaître dans la nature.',
  picksAnother: ' /pokemon <pokémon> en choisit un autre.',
  resting: (name, minutes) => name + ' se repose au Centre Pokémon. Il revient dans ' + minutes + ' min.',
  hasFainted: (name) => name + ' est K.O. ' + P('revive') + ' l\'emmène au Centre Pokémon.',
  waitSwitch: ' Attends son retour avant de changer.',
  notFainted: (name) => name + ' n\'est pas K.O.',
  atCenter: (name) => name + ' est déjà au Centre Pokémon.',
  noRevive: (name) => 'Le nuzlocke est activé, ' + name + ' ne peut donc pas être soigné.',
  takenToCenter: (name, minutes) => 'Tu emmènes ' + name + ' au Centre Pokémon. Il sera de nouveau sur pied dans ' + minutes + ' minutes.',
  nuzlockeOff: 'Le nuzlocke est désactivé. Un Pokémon K.O. peut de nouveau être soigné. Ceux que tu as perdus le restent.',
  nuzlockeOn: (doomed) => {
    const fate = doomed.length === 1 ? ' est déjà K.O., il sera donc perdu pour de bon dans un instant.' : ' sont déjà K.O., ils seront donc perdus pour de bon dans un instant.'
    const warning = doomed.length > 0 ? ' ' + and(doomed) + fate : ''
    return 'Le nuzlocke est activé. Un Pokémon K.O. est perdu pour de bon, sans soin ni retour. Garde-les nourris et heureux.' + warning
  },

  // Niveaux
  grew: (name, level) => name + ' monte au ' + lv(level) + ' !',
  grewBeside: (name, level, beside) => name + ' monte au ' + lv(level) + ' en travaillant aux côtés ' + of(beside) + ' !',

  // Les plaques d'Arceus
  boxHasForme: (other, name) => 'Ta boîte a déjà ' + other + '. Relâche-le d\'abord pour changer la forme ' + of(name) + '.',
  formeFailed: (name, why) => name + ' ne peut pas encore changer de forme : ' + why,
  keptPlate: (name) => name + ' n\'est plus affiché, il a donc gardé sa plaque.',
  plateBack: (plate) => ' ' + capitalized(the(plate)) + ' retourne dans ton sac.',
  tookPlate: (plate, name) => 'Tu reprends ' + the(plate) + ' à ' + name + '. Il redevient de type Normal.',
  holdsPlate: (name, plate, type, back) => name + ' tient ' + the(plate) + ' et devient de type ' + type + ' !' + back,
  onlyArceus: (name, plate) => name + ' ne peut pas utiliser ' + a(plate) + '. Seul Arceus tient une plaque.',
  alreadyHolds: (name, plate) => name + ' tient déjà ' + the(plate) + '.',
  noPlate: (plate) => 'Tu n\'as pas ' + of(plate) + '. Les Pokémon sauvages de son type en lâchent parfois une tant que la gen 4 est activée.',
  holdsNothing: (name) => name + ' ne tient rien.',

  // Objets
  foundCandy: (name) => name + ' a trouvé un Super Bonbon ! Il est dans ton sac.',
  candyGone: (name) => name + ' est parti. Un Super Bonbon ne peut pas le ramener.',
  notInBoxList: (name) => name + ' n\'est pas dans ta boîte. ' + P('box') + ' liste les tiens.',
  candyFainted: (name) => name + ' est K.O., et un Super Bonbon ne le soignera pas. ' + P('revive') + ' l\'emmène au Centre Pokémon.',
  maxLevel: (name, level) => name + ' est déjà au ' + lv(level) + '.',
  noCandy: 'Tu n\'as pas de Super Bonbon. Les Pokémon sauvages que tu mets K.O. en lâchent parfois un.',
  gaveCandy: (name, level) => 'Tu donnes un Super Bonbon à ' + name + '. Il monte au ' + lv(level) + ' !',
  candyReady: (into) => ' Il est prêt à évoluer en ' + into + '. ' + P('evolve') + ' le laisse faire.',
  nameItem: 'Nomme l\'objet, comme ' + P('use', 'super bonbon') + '. ' + P('bag') + ' liste les tiens.',
  unknownItem: (asked, names) => 'Objet inconnu « ' + asked + ' ». Objets : ' + names + '.',
  showFirst: (name, mon, item) => 'Affiche d\'abord ' + name + ' avec /pokemon ' + mon + ', puis utilise ' + the(item) + '.',
  cantUse: (name, item) => name + ' ne peut pas utiliser ' + a(item) + '.',
  bagEmpty: 'Ton sac est vide. Mets K.O. un Pokémon sauvage avec ' + P('attack') + ', et il lâchera peut-être un objet.',
  bag: (lines) => 'Ton sac :\n' + lines.join('\n'),
  holds: (plate) => ' Tient ' + the(plate) + '.',

  // L'équipe
  partyEmptyPicked: 'Ton équipe est vide. Ajoute un Pokémon de ta boîte avec ' + P('party', word('add') + ' <pokémon>') + '.',
  partyEmpty: (name) => 'Ton équipe est vide. Élève ou attrape un autre Pokémon, et il sortira de la Poké Ball d\'un sous-agent pour travailler aux côtés ' + of(name) + '.',
  partyReady: ', prêt à évoluer',
  partyFor: (types) => ', pour ' + and(types),
  partyFree: ', libre',
  partyWaiting: ', attend dans sa Poké Ball qu\'il y ait de la place',
  partyWorking: (agent, waiting) => ', travaille pour ' + agent + waiting,
  mons: (count) => count + ' Pokémon',
  partyList: (count, name, lines) => count + ' dans ton équipe, aux côtés ' + of(name) + ' :\n' + lines.join('\n'),
  nameMonLike: (verb, example) => 'Nomme le Pokémon, comme ' + P('party', word(verb) + ' ' + example) + '. ' + P('box') + ' liste les tiens.',
  unknownMonBox: (asked) => 'Pokémon inconnu « ' + asked + ' ». ' + P('box') + ' liste les tiens.',
  unknownMonList: (asked) => 'Pokémon inconnu « ' + asked + ' ». ' + P('list') + ' les donne tous.',
  notInParty: (name) => name + ' n\'est pas dans ton équipe.',
  leavesParty: (name, working) => name + ' quitte ton équipe.' + (working ? ' Il finit d\'abord le travail de son sous-agent.' : ''),
  onShow: (name) => name + ' est le Pokémon affiché. Choisis-en un autre avec /pokemon <pokémon> d\'abord.',
  notInBoxCatch: (name, mon) => name + ' n\'est pas dans ta boîte. Attrapes-en un, ou choisis-le avec /pokemon ' + mon + '.',
  ranAwayCatch: (name) => name + ' s\'est enfui. Attrape-le dans la nature pour le ramener.',
  alreadyInParty: (name) => name + ' est déjà dans ton équipe.',
  partyFull: (size) => 'Ton équipe est complète à ' + size + '. Retires-en un avec ' + P('party', word('remove') + ' <pokémon>') + ' d\'abord.',
  restsUntilRevived: ' Il se repose jusqu\'à ce qu\'il soit soigné.',
  joinsParty: (name, resting) => name + ' rejoint ton équipe.' + resting,
  nameAgent: 'Nomme le type d\'agent, comme ' + P('party', word('unassign') + ' explore') + '.',
  noneAssigned: (type) => 'Aucun Pokémon n\'est assigné à ' + type + '.',
  noLongerFor: (name, type) => name + ' ne sort plus pour ' + type + '.',
  nameAgentAndMon: 'Nomme le type d\'agent et le Pokémon, comme ' + P('party', word('assign') + ' explore abra') + '.',
  movedFrom: (types) => ' Il ne sort plus pour ' + or(types) + '.',
  comesOutFor: (name, type, moved, resting) => name + ' sort pour chaque sous-agent ' + type + '.' + moved + resting,

  // Générations et mode dresseur
  genHow: (gens) => '/pokemon gen <N> active ou désactive ' + or(gens.map((gen) => 'la gen ' + gen)) + '.',
  inTheWild: (gens, how) => 'Dans la nature : gen ' + and(gens.map(String)) + '. ' + how,
  unknownGen: (asked, how) => 'Génération inconnue « ' + asked + ' ». ' + how,
  genAlways: (gen, how) => 'La gen ' + gen + ' est toujours dans la nature. ' + how,
  genNotYet: (gen, how) => 'La gen ' + gen + ' n\'est pas encore dans la nature. ' + how,
  genOff: (gen) => 'La gen ' + gen + ' est désactivée. Ses Pokémon n\'apparaissent plus dans la nature. Ceux de ta boîte restent.',
  genOn: (gen) => 'La gen ' + gen + ' est activée. Ses Pokémon apparaissent aussi dans la nature, chacun récupéré sur GitHub la première fois que tu le croises.',
  trainerOff: 'Le mode dresseur est désactivé. /pokemon <pokémon> affiche n\'importe quel Pokémon.',
  trainerOn: (starters) => (starters ? 'Le mode dresseur est activé. Choisis ton starter, ' + or(starters) + ', puis attrape les autres dans la nature.' : 'Le mode dresseur est activé. Tu ne peux afficher que les Pokémon de ta boîte, attrape donc les autres dans la nature.') + ' Les Pokémon récupérés avec ' + P('new') + ' restent libres d\'être affichés.',
  trainerBox: (name) => 'Le mode dresseur est activé, tu ne peux donc afficher que les Pokémon de ta boîte. Attrape un ' + name + ' sauvage pour en élever un, ou désactive le mode dresseur avec ' + P('trainer') + '.',
  trainerStarter: (starters) => 'Le mode dresseur est activé, choisis donc d\'abord ton starter : ' + or(starters) + '. Attrape les autres dans la nature, ou désactive le mode dresseur avec ' + P('trainer') + '.',
  catchInWild: (gen, name) => 'La gen ' + gen + ' est activée, attrape donc ' + (name ?? 'les Pokémon de la gen ' + gen) + ' dans la nature, ou désactive la gen ' + gen + ' avec /pokemon gen ' + gen + '.',

  // Récupérer des Pokémon
  nameMonToFetch: 'Nomme un Pokémon à récupérer, comme ' + P('new', 'gobou') + ', ou essaie ' + P('new', word('random')) + ' ou ' + P('new', 'gen3') + '.',
  everyGenWild: 'Toutes les générations sont dans la nature, attrape donc tes Pokémon là-bas.',
  haveEveryGen: (gen) => 'Tu as déjà tous les Pokémon de la gen ' + gen + '.',
  alreadyHere: (name, mon) => name + ' est déjà là. /pokemon ' + mon + ' l\'affiche.',
  unknownMonFetch: (asked) => 'Pokémon inconnu « ' + asked + ' ». Les noms s\'écrivent comme gobou ou m._mime.',
  fetched: (gen, name, moves, variant) => name + ' de la gen ' + gen + ' récupéré. Il connaît ' + moves.join(', ') + '. Affiche ' + name + ' ' + (VARIANTS[variant] ?? variant) + '.',
  fetchFailed: (name, why) => 'Impossible de récupérer ' + (name || 'un Pokémon') + ' : ' + why,

  // Le panneau
  backAbovePrompt: (name) => name + ' est de retour au-dessus du prompt.',
  paneWaits: (name) => 'Le panneau ' + of(name) + ' est ouvert mais attend un terminal plus large. ' + P('pane') + ' le ramène dans le bandeau.',
  paneAbove: (name) => name + ' passe dans un panneau au-dessus du prompt. Il s\'ancre à côté de la conversation en plein écran. ' + P('pane') + ' le ramène dans le bandeau.',
  paneBeside: (name) => name + ' passe dans un panneau à côté de la conversation. ' + P('pane') + ' le ramène dans le bandeau.',

  // Soins et réglages
  wander: (name, on) => name + (on ? ' est libre de se balader.' : ' rentre à la maison.'),
  petLines: ['adore ça', 'se trémousse de joie', 's\'appuie contre ta main', 'fait un petit bond', 'a l\'air ravi'],
  petSleeping: 'sourit dans son sommeil',
  petted: (name, line) => name + ' ' + line + ' ♥',
  happiest: (name) => ' ' + name + ' est déjà aussi heureux que possible.',
  tossed: (name, berry, emoji) => 'Tu lances ' + a(berry) + ' ' + emoji + ' à ' + name,
  full: (name) => '. ' + name + ' n\'a plus faim, il la grignote juste.',
  wakes: (name) => name + ' se réveille.',
  cantSleep: (name) => name + ' ne peut pas dormir pendant que Claude travaille.',
  fallsAsleep: (name) => name + ' se roule en boule et s\'endort. Ses jauges baissent moins vite jusqu\'à ce que Claude se mette au travail.',
  stillFainted: ' Il est toujours K.O., ' + P('revive') + ' l\'emmène donc au Centre Pokémon.',
  needs: (name, on, still) => (on ? 'Les besoins sont activés. Garde ' + name + ' nourri et heureux.' : 'Les besoins sont désactivés. ' + name + ' n\'aura ni faim ni ne se sentira seul.') + still,
  emoji: (on, icons) => (on ? 'Les jauges affichent des emoji : ' : 'Les jauges affichent des icônes texte : ') + icons,
  bandIs: (size) => 'Le bandeau est ' + (SIZES[size] ?? size) + '.',
  bandSizes: (size, sizes) => 'Le bandeau est ' + (SIZES[size] ?? size) + '. Tailles : ' + sizes + '.',
  unknownSize: (asked, sizes) => 'Taille inconnue « ' + asked + ' ». Essaie : ' + sizes + '.',
  drawn: (noImages) => (noImages ? 'des demi-blocs' : 'des images'),
  images: (mode, drawn) => 'Les images sont en ' + mode + ', le bandeau dessine donc ' + drawn + '.',
  imageModes: (mode, drawn, modes) => 'Les images sont en ' + mode + ', le bandeau dessine donc ' + drawn + '. Modes : ' + modes + '.',
  unknownMode: (asked, modes) => 'Mode inconnu « ' + asked + ' ». Essaie : ' + modes + '.',
  syncOff: 'La synchro est désactivée. Chaque session garde le Pokémon choisi.',
  syncOn: (name) => 'La synchro est activée. Chaque session ouverte affiche ' + name + ', et suit le prochain Pokémon que tu choisis.',
  monList: (count, names) => count + ' Pokémon : ' + names.join(', '),
  unknownOption: (asked, options) => 'Option inconnue « ' + asked + ' ». Essaie : ' + options.join(', ') + '. ' + P('list') + ' donne tous les Pokémon.',
  goneOptions: (line, options) => line + ' /pokemon <pokémon> en choisit un autre. Options : ' + options.join(', ') + '.',
  modeAsleep: ', endormi',
  modeWandering: ', en balade',
  modeWild: (wild) => ', un ' + wild + ' est là',
  levels: (food, happiness) => 'nourriture ' + food + ' %, bonheur ' + happiness + ' %',
  needsOffShort: 'besoins désactivés',
  showing: (variant, name, level, mode, levels, options) => 'Affiche ' + name + ' ' + (VARIANTS[variant] ?? variant) + ' ' + lv(level) + mode + ' (' + levels + '). Options : ' + options.join(', ') + '. ' + P('help') + ' dit ce que fait chacune.',
  nowShowing: (variant, name) => 'Affiche maintenant ' + name + ' ' + (VARIANTS[variant] ?? variant) + '.',

  // Les commandes de commands.js et encounter.js
  evolvingWait: (name) => name + ' évolue ! ' + P('stop') + ' l\'annule.',
  care: (name, eating) => name + (eating ? ' est occupé à manger.' : ' profite des caresses.') + ' Réessaie dans un instant.',
  nameRelease: (mon) => 'Nomme le Pokémon à relâcher, comme ' + P('release', mon) + '. ' + P('box') + ' liste les tiens.',
  notInBox: (name) => name + ' n\'est pas dans ta boîte.',
  released: (name) => 'Tu relâches ' + name + '. Bye-bye, ' + name + ' !',
  releasedShown: (name, fresh) => 'Tu relâches ' + name + '. Bye-bye, ' + name + ' ! Un nouveau ' + fresh + ' prend sa place.',
  goesBy: (species, nickname) => species + ' s\'appelle ' + nickname + '. ',
  nameIt: (max) => 'Donne-lui un nom avec ' + P('nickname', '<nom>') + ', jusqu\'à ' + max + ' caractères.',
  tooLong: (max) => 'C\'est trop long. Un surnom tient en ' + max + ' caractères.',
  noNickname: (species) => species + ' n\'a pas de surnom.',
  justAgain: (old, species) => old + ' redevient simplement ' + species + '.',
  nowNamed: (old, nickname) => old + ' s\'appelle maintenant ' + nickname + ' !',
  knows: (name, moves) => name + ' connaît ' + moves.join(', ') + '.',
  stillAttacking: (name) => name + ' est encore en train d\'attaquer.',
  busyEating: (name) => name + ' est occupé à manger.',
  doesntKnow: (name, asked, moves) => name + ' ne connaît pas « ' + asked + ' ». Ses capacités : ' + moves.join(', ') + '.',

  // Stats, boîte et Pokédex
  statsHead: (name, level, xp, next) => name + ', ' + lv(level) + ', ' + xp + ' XP' + next + '.',
  toNext: (xp, level) => ' (' + xp + ' avant le ' + lv(level) + ')',
  readyLine: (into) => ' Prêt à évoluer en ' + into + '. ' + P('evolve') + ' le laisse faire.',
  canBecomeLine: (text) => ' Peut devenir ' + text + '.',
  meters: (food, happiness) => ' Nourriture ' + food + ' %, bonheur ' + happiness + ' %.',
  needsOff: ' Besoins désactivés.',
  careCounts: (pets, feeds) => ' ' + pets + ' caresses, ' + feeds + ' repas.',
  boxEmpty: (name) => 'Ta boîte est vide. Caresse ou nourris ' + name + ', ou termine un tour, pour commencer à l\'élever.',
  boxLine: (name, caught, level, meters, tags) => name + (caught ? ' ◓' : '') + ', ' + lv(level) + meters + (tags.length > 0 ? ' (' + tags.join(', ') + ')' : ''),
  active: 'actif',
  onlySoFar: (name) => '\nSeulement ' + name + ' pour l\'instant. /pokemon <pokémon> en choisit un autre.',
  boxList: (count, lines, alone) => count + ' dans ta boîte :\n' + lines.join('\n') + alone,
  ranAwayMark: ' (enfui)',
  graveLine: (name, level, date) => name + ', ' + lv(level) + ', le ' + date,
  graveyard: (lines) => '\nRepose en paix : ' + lines.join(' ; ') + '.',
  notInDex: (name, gens) => name + ' n\'est pas dans le Pokédex. Seuls les Pokémon de la gen ' + and(gens.map(String)) + ' apparaissent dans la nature.',
  dexOff: (label, tier, gen) => label + ', ' + tier + '. Il apparaît dans la nature une fois la gen ' + gen + ' activée : /pokemon gen ' + gen + ' l\'active.',
  dexCaught: (shiny) => 'Attrapé ◓' + (shiny ? ' ✦' : '') + '.',
  dexSeen: 'Vu, pas encore attrapé.',
  dexUnseen: 'Pas encore vu.',
  dexLost: ' Perdu pour de bon †. Attrapes-en un nouveau pour l\'élever de nouveau.',
  dexRanAway: ' Enfui. Il pourrait réapparaître dans la nature.',
  dexEntry: (label, tier, status, lost) => label + ', ' + tier + '. ' + status + lost,
  dexHead: (seen, caught, total, shiny) => 'Pokédex : ' + seen + ' vus, ' + caught + ' attrapés sur ' + total + (shiny ? ' (' + shiny + ' chromatiques)' : '') + '.',
  dexNone: ' Aucun Pokémon sauvage croisé pour l\'instant.',
  dexSeenList: (names) => 'Vus : ' + names.join(', '),

  // /pokemon aide, par commande
  usage: 'Usage : /pokemon <option>',
  helpGroups: { pick: 'Choisir', care: 'Soins', battle: 'Combat', evolve: 'Évolution', items: 'Objets', records: 'Registres', settings: 'Réglages', debug: 'Debug' },
  help: {
    '<mon>': ['<pokémon>', 'Affiche un Pokémon, comme /pokemon salamèche'],
    default: [VERBS.default, 'Affiche ses couleurs normales'],
    shiny: [VERBS.shiny, 'Affiche ses couleurs chromatiques'],
    new: [VERBS.new + ' <pokémon>', 'Récupère un Pokémon des gens 2 à 5, ou ' + VERBS.new + ' ' + WORDS.random + ', ' + VERBS.new + ' gen3'],
    list: [VERBS.list, 'Liste tous les noms de Pokémon'],
    pet: [VERBS.pet, 'Le caresser'],
    feed: [VERBS.feed, 'Lui lancer une baie'],
    sleep: [VERBS.sleep, 'Le coucher, ou le réveiller'],
    revive: [VERBS.revive + ' [pokémon]', 'Emmener un Pokémon K.O. au Centre Pokémon'],
    nickname: [VERBS.nickname + ' <nom>', 'Lui donner un surnom, jusqu\'à 12 caractères'],
    attack: [VERBS.attack + ' [capacité]', 'Lancer une capacité au hasard, ou celle nommée'],
    moves: [VERBS.moves + ' [pokémon]', 'Lister ses capacités, ou celles d\'un autre Pokémon'],
    catch: [VERBS.catch, 'Lancer une Poké Ball sur le Pokémon sauvage'],
    roar: [VERBS.roar, 'Rugir pour chasser le Pokémon sauvage'],
    evolve: [VERBS.evolve + ' [pokémon]', 'Évoluer avec une pierre, un Câble Link ou un objet tenu de ton sac, ou choisir ce que devient Évoli'],
    stop: [VERBS.stop, 'Annuler une évolution'],
    bag: [VERBS.bag, 'Tes objets, lâchés par les Pokémon sauvages que tu mets K.O.'],
    use: [VERBS.use + ' <objet> [pokémon]', 'Utiliser un objet, comme ' + VERBS.use + ' super bonbon ou ' + VERBS.use + ' pierre foudre. Arceus tient une plaque, comme ' + VERBS.use + ' plaque flamme'],
    take: [VERBS.take, 'Reprendre la plaque que tient Arceus'],
    stats: [VERBS.stats, 'Son niveau, son XP, son évolution et ses jauges'],
    box: [VERBS.box, 'Tous les Pokémon que tu as élevés'],
    party: [VERBS.party, 'Les Pokémon qui sortent pour les sous-agents. ' + VERBS.party + ' ' + WORDS.add + ' ou ' + WORDS.remove + ' <pokémon> les choisit, ' + VERBS.party + ' ' + WORDS.assign + ' <agent> <pokémon> en lie un à un type d\'agent'],
    dex: [VERBS.dex + ' [pokémon]', 'Les Pokémon sauvages que tu as vus et attrapés'],
    release: [VERBS.release + ' <pokémon>', 'Relâcher un Pokémon, qui repart de zéro'],
    wander: [VERBS.wander, 'Se balader au repos'],
    needs: [VERBS.needs, 'Nourriture et bonheur'],
    emoji: [VERBS.emoji, 'Jauges en emoji'],
    size: [VERBS.size + ' ' + WORDS.small + '|' + WORDS.large, 'Taille du bandeau'],
    images: [VERBS.images + ' auto|on|off', 'Images en pixels ou demi-blocs'],
    pane: [VERBS.pane, 'Afficher le Pokémon dans un panneau ancré, pas dans le bandeau'],
    sync: [VERBS.sync, 'Le même Pokémon dans chaque session ouverte'],
    autoevolve: [VERBS.autoevolve, 'Évoluer tout seul à son niveau'],
    nuzlocke: [VERBS.nuzlocke, 'Un Pokémon K.O. est perdu pour de bon'],
    trainer: [VERBS.trainer, 'N\'afficher que les Pokémon de ta boîte'],
    gen: [VERBS.gen + ' <N>', 'Activer ou désactiver les Pokémon d\'une génération dans la nature, chacun récupéré la première fois que tu le croises'],
    wild: ['wild [pokémon]', 'Appeler un Pokémon sauvage maintenant, ou celui nommé ; ajoute shiny pour ses couleurs chromatiques'],
    kill: ['kill', 'Mettre le Pokémon K.O. maintenant, ou le perdre en nuzlocke'],
  },
  gensValue: (gens) => 'gen ' + and(gens.map(String)),
  helpNames: '\n\nLes commandes anglaises marchent aussi, et les Pokémon, objets et capacités se nomment en français comme en anglais.',
}
