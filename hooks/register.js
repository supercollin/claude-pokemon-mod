import { englishCommand } from './aliases.js'
import { INKS } from './art.js'
import { prepareAttack } from './attacks.js'
import { drawScene, inkFor } from './band.js'
import { clearAlert, isAlerted, raiseAlert } from './bubble.js'
import {
  attackCommand, battleWait, careReply, evolvingReply, moveKey, movesText, nicknameCommand, releaseCommand, waitsForCare,
  waitsForEvolution,
} from './commands.js'
import { IMAGE_WAIT_TICKS, TICK_MS } from './constants.js'
import { CREW_SIZE, crewThinking, crewToolEnds, crewToolStarts, isOut, joinCrew } from './crew.js'
import { CUSTOM_PREFIX, fetchMon, monsOfGen } from './custom.js'
import { BUNDLED_GENS, dexKey, GENS, genOf, isCaught, mergedDexEntry, pickWild, tierOf, wildGensOf } from './dex.js'
import { catchCommand, foeMoves, roarCommand, runawayFoe, wildMoves, wildName } from './encounter.js'
import { evolutionsOf, isLevelUpOnly, levelEvolutionOf, levelUpEvolutionOf, startLevel, timeOfDay } from './evolutions.js'
import { SPRITES } from './frames.js'
import { femaleEighthsOf, SEXES, sexedSprite, sexFor } from './genders.js'
import { chosenLanguage, languageOf, LOCALES, t } from './i18n.js'
import {
  addedTo, bagOf, bagText, dropOf, findItem, itemFor, itemName, ITEMS, LONG_TURN_CANDY_ODDS, migratedBag, PLATE_KEYS, plateType, RARE_CANDY,
  takenFrom,
} from './items.js'
import { bandRows, bandZoom, battleFits, clampX, homeX, isHome, stripTarget, wildAt } from './layout.js'
import { careOf, LONG_TURN_MS, MAX_LEVEL, turnXp, xpAt } from './levels.js'
import { bittenHappiness, bumpStat, filledIcons, iconsFor, isFull, isHappiest, park, STAT_ICONS, statNow, STATS, unpark } from './meters.js'
import { feed, flinch, pet, startAttack, step } from './motion.js'
import { displayName, moveName } from './names.js'
import {
  applyImageMode, cellsNow, drawsHearts, drawsImage, drawsImages, heartsImage, IMAGE_MODES, imageNow, svgNow,
} from './paint.js'
import { joinParty } from './party.js'
import {
  conditionOf, downReply, fullNameOf, goneLine, HEAL_MS, healingReply, levelOf, nameOf, readyToEvolve, revivedMeters,
  lacksSex, ownEvolutionsOf, settleHeal, sexedRecord, sexOf, xpOf,
} from './records.js'
import { addCustom, MONS, VARIANTS } from './sprites.js'
import { S } from './state.js'
import {
  hasRunAway, isAsleep, isDead, isDown, isFainted, isFlinching, isFree, isGone, isHealing, isPetted, isTuckedIn, markActive,
} from './status.js'
import { assignedTo, canWork, crewVariant, endAgent, partyMons, stepCrewMons, typesOf } from './team.js'
import { boxText, dexText, evolutionsText, evolutionText, HELP, helpText, statsText } from './texts.js'
import {
  chargedWild, damageOf, engagedWild, faintedWild, fleeingWild, foeX, isHere, isOnStage, isWeak, newWild, partingBite,
  STRIKE_GAP_MS, STRIKE_JITTER_MS, stepWild, strikeBite, strikingWild, struckWild, WEAK_MS, WILD_STAY_MS, WILD_TURNS,
} from './wild.js'
import { SIZES } from './zoom.js'

// One pixel Pokémon lives in a strip at the right of the band above the prompt.
// While Claude works it paces, with a thought bubble while Claude thinks. It
// hops when a turn ends, then wanders while idle (or stays at the right edge,
// after /pokemon wander) and falls asleep after five quiet minutes.
// /pokemon pet makes pixel hearts float up, and /pokemon feed drops a random pixel
// berry for it to walk over and eat. Food and happiness drain over time, slower while Claude Code is closed,
// shown as ●●●○○ and ♥♥♥♡♡ at the right edge, so it needs both now and then.
// /pokemon emoji swaps the meters' icons for 🍓 and 💗.
// /pokemon sleep tucks it in, so both meters drain slower until Claude starts working.
// /pokemon attack plays one of its moves, with the animations in attacks.js.
// While a tool runs, the bubble shows it, with a TM disc for a skill from any agent, and
// when Claude waits on you the mon stops and shows a "!". Each running subagent is a Poké Ball along the left of the strip,
// and while the band has room a mon from your box steps out of it and works beside yours, as in crew.js.
// A main-loop tool call that fails makes it flinch, with a sweat drop by its head.
// Answered turns earn XP, and the mon evolves at the levels from the games.
// Now and then a wild mon walks in from the left, and the strip widens to fit both.
// One knocked out may drop an item into a bag, which stone and trade evolutions and Rare Candy draw on.
// Each open session shows its own mon, starting with the one last picked anywhere. XP,
// meters, nickname, and sleep belong to the mon, so sessions showing the same mon share them.
// Left with empty meters for hours it faints until /pokemon revive heals it, and left fainted it runs away.
// With /pokemon nuzlocke on, a mon that faints is gone for good.
// The mon, hearts, berries, bubbles, balls, and Zs are pixels in one Raster, two per cell.
// The desktop app has no Raster, so there the same pixels are one Svg.
//
// Every function handed $ lives in this file, since the engine follows $ only into
// functions declared in the hooks module itself. The rest of the band is in the modules
// imported above, sharing its state through S in state.js.

// How long the TM disc stays up after a skill is typed as /name
const DISC_TICKS = 60
// /pokemon pane moves the scene from the band into a pane, docked beside the transcript in
// the fullscreen layout so Claude's replies keep the rest of the screen. It's drawn there
// once the surface places it; until then the band goes on drawing it.
const PANE_ID = 'pokemon'
// The turn.step chunks that start or end a subagent's thinking
const THOUGHT_KINDS = new Set(['thinking', 'text', 'tool', 'stop'])
// Tools that ask you something, and notifications that wait on you
const QUESTION_TOOLS = ['AskUserQuestion', 'ExitPlanMode']
const ALERT_NOTIFICATIONS = ['permission_prompt', 'worker_permission_prompt', 'agent_needs_input', 'elicitation_dialog']
// A minute after a turn with no word from you, the "!" shows for two
const IDLE_WAIT_MS = 60 * 1000
// What core tells the model when you turn a call down at its dialog or interrupt it.
// Nothing else marks a refusal there, so the wording is the one sign.
const REFUSED = /The user doesn't want to (proceed with this tool use|take this action)|\[Request interrupted by user/

// Hold the disc when a command that ran is a skill, by its source in the command list
async function markSkillCommand($, command) {
  const found = (await $.command.list()).find((c) => c.name === command)
  if (found && found.source !== 'builtin') S.discUntil = S.tick + DISC_TICKS
}

// What a fainted mon can't do, and what a mon that's gone can't do either
const DOWN_WAITS = ['pet', 'feed', 'attack', 'catch', 'evolve', 'sleep']
const GONE_WAITS = [...DOWN_WAITS, ...VARIANTS, 'nickname']

// A mon that isn't bundled, like Quilava to evolve into or a gen 2 mon met in the wild,
// comes from the store when a session fetched it before, or is fetched the way
// /pokemon new fetches it, from gen when known, its Pokédex generation by default. The saved entry's by says why it was
// fetched: 'new', 'evolution', or 'wild'. Only one fetched with /pokemon new is free to
// show in trainer mode. Throws with a line for the person.
async function ensureMon($, name, by = 'evolution', gen = genOf(name) ?? undefined) {
  if (SPRITES[name]) return
  const saved = await $.store.get(CUSTOM_PREFIX + name)
  if (saved?.sprite) {
    addCustom(name, saved)
    return
  }
  const entry = { ...(await fetchMon((url, init) => $.http.fetch(url, init), name, gen)), by }
  await $.store.set(CUSTOM_PREFIX + name, entry)
  addCustom(name, entry)
}

// A fetched mon's entry predating by was fetched with /pokemon new, the only way then
const freeToShow = (entry) => Boolean(entry?.sprite) && (entry.by ?? 'new') === 'new'

// A level evolution about to fall due, once the mon it becomes is here. One that can't be
// fetched now, or whose mon was switched away meanwhile, isn't due: the next level-up,
// showing the mon again, or /pokemon evolve tries again.
async function dueEvolution($, entryInto) {
  const mon = S.mon
  const into = evolvedSprite(entryInto)
  try {
    await ensureMon($, into)
  } catch (err) {
    $.ui.toast(t.evolveFailed(nameOf(mon), displayName(into), err?.message ?? String(err)))
    return null
  }
  return S.mon === mon ? into : null
}

// The sprite an evolution entry's mon shows for the shown mon's sex, which carries over,
// like a female Bayleef's Meganium as meganium_female
const evolvedSprite = (into) => sexedSprite(into, sexOf(S.mon))

// Play the evolve effect with the evolved mon swapped in, in a band grown to fit both.
// The item it needs, if any, leaves the bag once the evolution is done.
function startEvolution($, into, item = null) {
  $.ui.toast(t.evolving(nameOf(S.mon)))
  startAttack({ effect: 'evolve', color: S.ink.silhouette })
  S.attack.swap = into
  S.evolving = { from: S.mon, into, item }
  S.evolveDue = null
  $.ui.invalidate('ui.render')
}

// Start a due evolution once the mon is free, and finish one whose effect is over
function stepEvolution($) {
  if (S.evolving && !S.attack) finishEvolution($)
  else if (S.evolveDue && isFree()) startEvolution($, S.evolveDue)
}

// The evolved mon takes over the record, so its level, XP, and meters carry over. It's taken
// here first, so the band shows the evolved mon at its own level from its first frame, then
// again as last saved, so XP earned elsewhere meanwhile comes along. 'evolved' tells another
// session showing the old mon that it evolved rather than being released. A friendship
// evolution the old mon was ready for stays behind.
function evolvedRecord(from) {
  const { readyFor, ...record } = S.stats[from] ?? {}
  return { ...record, xp: xpOf(from) }
}

async function moveRecord($, from, into) {
  await freshen($, [from])
  // The ◓ the box showed stays: a mon raised before its species was caught showed it by the
  // dex, and the species it becomes may not be caught
  const dex = await $.store.get('dex')
  const marked = Boolean(S.stats[from]?.caught) || isCaught(dex?.[dexKey(from)])
  S.stats[into] = { ...evolvedRecord(from), ...(marked ? { caught: true } : {}) }
  delete S.stats[from]
  await saveStats($, [from, into])
  $.ui.invalidate('ui.render')
  const evolved = (await $.store.get('evolved')) ?? {}
  await $.store.set('evolved', { ...evolved, [from]: into })
}

// The mon becomes the evolved one. Its record moves along, so level, XP, and meters carry over.
function finishEvolution($) {
  const { from, into, item } = S.evolving
  const wasHome = isHome()
  S.evolving = null
  S.stats[into] = evolvedRecord(from)
  S.mon = into
  if (wasHome) S.x = homeX()
  clampX()
  const name = nameOf(from)
  saveMon($).catch((err) => logOnce($, err))
  moveRecord($, from, into).catch((err) => logOnce($, err))
  if (item) changeBag($, (bag) => takenFrom(bag, item)).catch((err) => logOnce($, err))
  $.ui.toast(t.evolved(name, displayName(into)))
  $.ui.invalidate('ui.render')
  const also = evolutionsOf(from).find((entry) => entry.into === into)?.also
  if (also) joinedBox($, also, levelOf(into)).catch((err) => logOnce($, err))
}

// A mon an evolution leaves behind, like the shell Nincada sheds as Shedinja, joins the box
// at the evolved mon's level, caught in the Pokédex. One already there stays as it is, and
// one that can't be fetched now doesn't come.
async function joinedBox($, mon, level) {
  try {
    await ensureMon($, mon)
  } catch (err) {
    $.ui.toast(t.joinFailed(displayName(mon), err?.message ?? String(err)))
    return
  }
  await freshen($, [mon])
  if (isDead(mon)) delete S.stats[mon]
  if (S.stats[mon]) return
  S.stats[mon] = { xp: xpAt(level), caught: true, parked: true }
  await markDex($, dexKey(mon), { seen: S.nowMs, caught: S.nowMs })
  await saveRecords($, [mon])
  $.ui.toast(t.joinedToo(displayName(mon)))
}

// Call off an evolution under way or due. The mon stays as it is.
function stopEvolution($) {
  const name = nameOf(S.mon)
  if (!S.evolving && !S.evolveDue) return { text: t.notEvolving(name) }
  if (S.evolving) S.attack = null
  S.evolving = null
  S.evolveDue = null
  $.ui.invalidate('ui.render')
  return { text: t.stoppedEvolving(name) }
}

// A stone, a trade, a level the mon has reached, or a level-up by the meters or the clock
// starts its evolution now. One a level-up reached goes first when none is named. A stone or
// a trade needs its item in the bag: the stone, the item the mon trades holding, or a
// Link Cable. Several ways and none named get a list.
async function evolveCommand($, wanted) {
  const name = nameOf(S.mon)
  const entries = ownEvolutionsOf(S.mon)
  if (wanted && !entries.some((entry) => moveKey(entry.into) === moveKey(wanted))) {
    const other = otherSexReply((entry) => moveKey(entry.into) === moveKey(wanted))
    if (other) return other
  }
  if (entries.length === 0) return { text: t.doesntEvolve(name) }
  if (S.attack || S.food) return { text: t.busy(name) }
  const reached = S.stats[S.mon]?.readyFor
  let picked = entries
  if (wanted) picked = entries.filter((entry) => moveKey(entry.into) === moveKey(wanted))
  else if (entries.some((entry) => isLevelUpOnly(entry) && entry.into === reached)) picked = entries.filter((entry) => entry.into === reached)
  // Chance picks for it at the level-up that reaches its level, so there's nothing to choose
  if (picked.length !== 1 && entries.every((entry) => entry.pick)) return { text: t.canBecome(name, evolutionsText(entries)) }
  if (picked.length !== 1) {
    const example = entries[Math.floor(Math.random() * entries.length)].into
    return { text: t.canBecomeTry(name, evolutionsText(entries), example) }
  }
  const [entry] = picked
  if (isLevelUpOnly(entry) && entry.into !== reached) return { text: t.canBecome(name, entry.pick ? evolutionsText(entries) : evolutionText(entry)) }
  const level = levelOf(S.mon)
  if (entry.level && level < entry.level) return { text: t.evolvesAtLevel(name, displayName(entry.into), entry.level, level) }
  const item = itemFor(entry)
  if (entry.item && entry.time) {
    const now = timeOfDay(await $.clock.now())
    if (now !== entry.time) return { text: t.evolvesByTime(name, displayName(entry.into), itemName(item), entry.time, now) }
  }
  if (item && !(await loadBag($))[item]) return { text: t.needsItem(name, itemName(item), displayName(entry.into)) }
  const mon = S.mon
  const into = evolvedSprite(entry.into)
  try {
    await ensureMon($, into)
  } catch (err) {
    return { text: t.evolveFailed(name, displayName(into), err?.message ?? String(err)) }
  }
  if (S.mon !== mon) return { text: t.notOnShowEvolve(name) }
  if (S.attack || S.food) return { text: t.busy(name) }
  startEvolution($, into, item)
  if (entry.trade && entry.item) return { text: t.tradeHolding(name, itemName(item)) }
  if (entry.item) return { text: t.useOn(itemName(item), name) }
  if (entry.trade) return { text: t.trade(name) }
  return { text: t.letEvolve(name) }
}

// What the shown mon says when asked for an evolution only the other sex has, like "Only a
// male Kirlia can become Gallade.", or null when no such evolution matches
function otherSexReply(matches) {
  const entry = evolutionsOf(S.mon).find((e) => e.sex && e.sex !== sexOf(S.mon) && matches(e))
  return entry ? { text: t.onlySex(entry.sex, displayName(S.mon), displayName(entry.into)) } : null
}

// Send the foe off, with a toast unless quiet. One still calling just doesn't come, and
// a fainted one blinks away where it lies.
function fleeWild($, quiet = false) {
  if (S.wild?.phase === 'fainted') return
  const shown = isOnStage(S.wild) && S.wild.phase !== 'fleeing'
  if (shown && !quiet) $.ui.toast(t.fled(displayName(S.wild.mon)))
  S.wild = fleeingWild(S.wild, wildAt())
}

// Take a foe's bite out of the shown mon's happiness, never below one heart, with a broken
// heart over its head when it takes any. With needs off, or the mon down, it takes nothing.
async function biteMon($, amount) {
  const name = S.mon
  if (!S.needsOn || amount <= 0 || isDown()) return
  S.nowMs = await $.clock.now()
  await freshen($, [name])
  const taken = bittenHappiness(amount, name)
  if (name !== S.mon || taken <= 0 || isDown()) return
  bumpStat('happiness', -taken, name)
  S.heartbreakAt = S.tick
  await saveRecords($, [name])
  $.ui.invalidate('ui.render')
}

// Mark a mon in the Pokédex as last saved by any session, so two sessions marking at once
// lose a mark at worst
async function markDex($, key, patch) {
  const saved = await $.store.get('dex')
  const dex = saved && typeof saved === 'object' ? { ...saved } : {}
  dex[key] = mergedDexEntry(dex[key], patch)
  await $.store.set('dex', dex)
}

// Mark the foe owned when its species is caught in the Pokédex, so a ball shows beside its HP bar
async function markOwned($, seed) {
  const dex = await $.store.get('dex')
  if (S.wild?.seed === seed && dex && typeof dex === 'object' && isCaught(dex[S.wild.key])) S.wild = { ...S.wild, owned: true }
}

// Move the visit on a tick. Asleep or fainted, the home mon can't fight, so the foe leaves.
function stepWildPhase($) {
  if (!S.wild) return
  if (!['fleeing', 'fainted'].includes(S.wild.phase) && (isTuckedIn() || isAsleep() || isDown())) return fleeWild($)
  // A move that scares sends the foe off wherever it is, even one still on its way
  if (S.attack?.move.scares && landsNow()) {
    S.attack.landed = true
    return fleeWild($)
  }
  const result = stepWild(S.wild, { tick: S.tick, atHome: isHome() && !S.attack, at: wildAt(), stayTicks: WILD_STAY_MS / TICK_MS })
  if (result.event === 'timeout') {
    biteMon($, partingBite(S.wild)).catch((err) => logOnce($, err))
    fleeWild($)
  } else S.wild = result.wild
  if (result.event === 'arrived') {
    S.wild = { ...S.wild, nextStrikeAt: S.tick + strikeGap() }
    const yours = S.wild.runaway ? t.looksLike(S.stats[S.wild.mon]?.nickname ?? t.yourMon(displayName(S.wild.mon))) : ''
    $.ui.toast(t.appeared(wildName(), S.wild.level, yours))
    markOwned($, S.wild.seed).catch((err) => logOnce($, err))
    markDex($, S.wild.key, { seen: S.nowMs }).catch((err) => logOnce($, err))
    refreshPlates($).catch((err) => logOnce($, err))
    if (S.wild.runaway) metRunaway($, S.wild.mon).catch((err) => logOnce($, err))
  } else if (result.event === 'caught') {
    caughtFoe($, S.wild).catch((err) => logOnce($, err))
  } else if (result.event === 'brokefree') {
    $.ui.toast(t.brokeFree[S.wild.throw.shakes])
  }
  if (S.wild?.phase === 'battle') stepBattle($)
}

// Mark the catch in the Pokédex, and put the species in the box at its first level with
// fresh meters, parked unless it's the mon on show. A species already there stays as it is,
// unless it ran away, when its record comes back, or died, when a fresh one takes its place.
async function caughtFoe($, caught) {
  const species = caught.mon
  const name = displayName(species)
  S.nowMs = await $.clock.now()
  await markDex($, caught.key, { caught: S.nowMs, ...(caught.variant === 'shiny' ? { shiny: true } : {}) })
  await freshen($, [species])
  if (hasRunAway(species)) {
    const { ranAway, fainted, healing, starving, ...record } = S.stats[species]
    S.stats[species] = { ...record, ...revivedMeters(), ...(species === S.mon ? {} : { parked: true }) }
    await saveRecords($, [species])
    $.ui.toast(t.cameBack(nameOf(species)))
    $.ui.invalidate('ui.render')
    return
  }
  if (isDead(species)) delete S.stats[species]
  if (S.stats[species]) {
    $.ui.toast(t.caughtMarked(name))
    return
  }
  const sex = caught.sex ?? sexFor(species)
  S.stats[species] = { xp: xpAt(startLevel(species)), caught: true, ...(sex ? { sex } : {}), ...(species === S.mon ? {} : { parked: true }) }
  await saveRecords($, [species])
  $.ui.toast(t.caught(name))
}

// The desktop app stops the running turn when you send it a message, and a foe only
// fights mid-turn, so the desktop band attacks and throws the ball from buttons instead.
// They can't be disabled, so while the mon is evolving, busy or down they draw dim and a
// press only says why, as /pokemon catch and attack would.
function battleButtons($, { Box, Button }) {
  if (S.wild?.phase !== 'battle') return []
  const press = (act) => {
    S.wild = engagedWild(S.wild)
    const reply = battleWait() ?? act()
    markActive()
    $.ui.toast(reply.text)
    $.ui.invalidate('ui.render')
  }
  const dimColor = battleWait() !== null
  return [
    Box({
      flexDirection: 'row',
      gap: 1,
      children: [
        Button({ key: 'catch', label: t.catchButton, variant: 'primary', dimColor, onPress: () => press(catchCommand) }),
        Button({ key: 'attack', label: t.attackButton, dimColor, onPress: () => press(() => attackCommand('')) }),
      ],
    }),
  ]
}

const strikeGap = () => Math.round((STRIKE_GAP_MS + Math.random() * STRIKE_JITTER_MS) / TICK_MS)
const STRIKE_DELAY_TICKS = 2000 / TICK_MS

// A move at the foe lands 60% of the way through it
const landsNow = () => S.attack?.atFoe && !S.attack.landed && !S.attack.backing && S.tick >= S.attack.start + Math.round(S.attack.ticks * 0.6)

// Land a move on the foe, and spend banked work on the next move once the mon is free,
// awake, at home, and its last move is long enough ago. The mon holds off a weak foe,
// so only /pokemon attack knocks it out.
function stepBattle($) {
  if (landsNow()) {
    S.attack.landed = true
    hitFoe($)
    if (S.wild.phase !== 'battle') return
  }
  strikeBack($)
  const ready = !S.wild.strike && !S.attack && !S.food && !S.evolving && !isAlerted() && !isFlinching() && !isAsleep() && S.x === homeX()
  if (!ready || isWeak(S.wild) || S.wild.charge === 0 || S.tick < S.wild.nextAttackAt) return
  const moves = foeMoves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  S.wild = { ...S.wild, charge: S.wild.charge - 1 }
  startAttack(move, { foe: true })
  $.ui.toast(t.used(nameOf(S.mon), moveName(move.name)))
}

// Now and then the foe plays one of its own moves at the free mon. It lands 60% of the
// way through, makes the mon flinch, puts its next move off, and bites into its
// happiness, more with each strike in a row you leave the foe alone.
function strikeBack($) {
  const { strike } = S.wild
  if (strike && !strike.landed && S.tick >= strike.start + Math.round(strike.attack.ticks * 0.6)) {
    const bite = strikeBite(S.wild)
    S.wild = { ...struckWild(S.wild), strike: { ...strike, landed: true }, nextAttackAt: Math.max(S.wild.nextAttackAt, S.tick + STRIKE_DELAY_TICKS) }
    flinch()
    biteMon($, bite).catch((err) => logOnce($, err))
  }
  if (strike && S.tick >= strike.start + strike.attack.ticks) S.wild = { ...S.wild, strike: null }
  const free = !S.wild.strike && !S.attack && !S.food && !S.evolving && !isAsleep() && S.x === homeX()
  if (!free || S.tick < S.wild.nextStrikeAt) return
  const moves = wildMoves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  const seed = Math.floor(Math.random() * 0x7fffffff)
  const attack = prepareAttack(move, { side: 'right', seed, x: foeX(S.wild, wildAt()), home: homeX() })
  S.wild = strikingWild(S.wild, move, attack, S.tick, S.tick + strikeGap())
  $.ui.toast(t.wildUsed(displayName(S.wild.mon), moveName(move.name)))
}

// A hit resets the foe's wait for a fight. Weak, it waits WEAK_MS for a ball, and at 0 HP
// it faints and may drop an item into the bag.
function hitFoe($) {
  const name = displayName(S.wild.mon)
  const hp = Math.max(0, Math.round(S.wild.hp - damageOf(S.wild, S.attack.power, Math.random())))
  if (hp === 0) {
    const item = dropOf(S.wild.key, S.wild.seed, S.wildGens, ownedPlates())
    S.wild = { ...faintedWild(S.wild, S.tick), drop: item ? { item, at: S.tick } : null }
    if (!item) {
      $.ui.toast(t.wildFainted(name))
      return
    }
    $.ui.toast(t.wildDropped(name, itemName(item)))
    changeBag($, (bag) => addedTo(bag, item)).catch((err) => logOnce($, err))
    return
  }
  const weak = isWeak({ ...S.wild, hp })
  const stay = (weak ? WEAK_MS : WILD_STAY_MS) / TICK_MS
  if (weak && !isWeak(S.wild)) $.ui.toast(t.wildWeak(name))
  S.wild = { ...S.wild, hp, hitAt: S.tick, leaveAt: S.tick + stay }
}

const SPAWN_CHECK_TICKS = (30 * 1000) / TICK_MS
const FIRST_WILD_MS = 5 * 60 * 1000
const WILD_EVERY_MS = [20 * 60 * 1000, 40 * 60 * 1000]

// Every session shares one gate in the store, wildAt = { at, by }, so encounters come
// every 20 to 40 minutes of work however many sessions run. A session finding it due
// claims it with its token and checks on its next call that no other session's claim
// landed over its own before the mon shows up.
async function maybeSpawn($) {
  if (S.tick - S.lastSpawnCheck < SPAWN_CHECK_TICKS) return
  S.lastSpawnCheck = S.tick
  const pick = S.claimedPick
  S.claimedPick = null
  if (!S.turnRunning || S.wild || isTuckedIn() || isAsleep() || isDown()) return
  const now = await $.clock.now()
  const gate = await $.store.get('wildAt')
  if (pick) {
    if (gate?.by === S.sessionToken && !S.wild && !isDown() && battleFits(pick.mon, pick.variant)) S.wild = newWild(pick, Math.floor(Math.random() * 0x7fffffff))
    return
  }
  if (typeof gate?.at !== 'number') return $.store.set('wildAt', { at: now + FIRST_WILD_MS, by: S.sessionToken })
  if (now < gate.at) return
  const next = (await runawayPick($, now)) ?? pickWild(Math.random, S.wildGens)
  const here = Boolean(SPRITES[next.mon])
  if (here && !battleFits(next.mon, next.variant)) return
  const wait = WILD_EVERY_MS[0] + Math.random() * (WILD_EVERY_MS[1] - WILD_EVERY_MS[0])
  await $.store.set('wildAt', { at: now + Math.round(wait), by: S.sessionToken })
  if (here) {
    S.claimedPick = next
    return
  }
  // Fetched without holding up the tool call, it comes at the next check once it's here
  arrivingPick($, next).then((pick) => {
    S.claimedPick = pick
  })
}

// A wild pick once its mon is here: a mon of a fetched generation met for the first time is
// fetched and saved as a wild fetch, and one that can't be fetched gives way to a bundled mon
function arrivingPick($, pick) {
  if (SPRITES[pick.mon]) return Promise.resolve(pick)
  return ensureMon($, pick.mon, 'wild').then(
    () => pick,
    (err) => {
      logOnce($, err)
      return pickWild(Math.random)
    },
  )
}

const RUNAWAY_BACK_MS = 30 * 60 * 1000
const RUNAWAY_ODDS = 0.25

// The first encounter at least RUNAWAY_BACK_MS after a mon ran away is that mon, and after
// that it's one in RUNAWAY_ODDS until it's caught. Null for a wild mon as usual.
async function runawayPick($, now) {
  const saved = await $.store.get('stats')
  if (!saved || typeof saved !== 'object') return null
  const back = Object.keys(saved).filter((name) => MONS.includes(name) && saved[name]?.ranAway && !saved[name].dead && now - saved[name].ranAway.at >= RUNAWAY_BACK_MS)
  if (back.length === 0) return null
  await freshen($, back)
  const unmet = back.find((name) => hasRunAway(name) && !S.stats[name].ranAway.met)
  if (unmet) return runawayFoe(unmet)
  const met = back.filter(hasRunAway)
  return met.length > 0 && Math.random() < RUNAWAY_ODDS ? runawayFoe(met[Math.floor(Math.random() * met.length)]) : null
}

// Once a mon that ran away has shown up, it's met, and later encounters are it only by chance
async function metRunaway($, name) {
  await freshen($, [name])
  if (!hasRunAway(name) || S.stats[name].ranAway.met) return
  S.stats[name] = { ...S.stats[name], ranAway: { ...S.stats[name].ranAway, met: true } }
  await saveRecords($, [name])
}

// The hidden debug spawn, /pokemon wild [<mon>] [shiny] [male|female]. Null when debug is
// off, so it reads as an unknown option. A mon that ran away comes as itself, and a sex
// its species can't have is left out.
async function wildCommand($, rest) {
  if ((await $.store.get('debug')) !== true) return null
  const words = rest.split(/\s+/).filter(Boolean)
  const name = words.find((word) => word !== 'shiny' && !SEXES.includes(word))
  if (name && !MONS.includes(name) && genOf(name) === null) return { text: t.unknownMonList(name) }
  if (S.wild) return { text: t.alreadyWild(displayName(S.wild.mon)) }
  if (isTuckedIn()) return { text: t.asleep(nameOf(S.mon)) }
  if (isDown()) return downReply()
  if (name) await freshen($, [name])
  const own = name && hasRunAway(name) ? runawayFoe(name) : null
  const asked = name ? askedWild(name, words.find((word) => SEXES.includes(word))) : pickWild(Math.random, S.wildGens)
  const pick = own ?? (await arrivingPick($, asked))
  if (words.includes('shiny')) pick.variant = 'shiny'
  if (!battleFits(pick.mon, pick.variant)) return { text: t.tooNarrow(displayName(pick.mon)) }
  S.wild = newWild(pick, Math.floor(Math.random() * 0x7fffffff))
  S.wanderTarget = null
  return { text: t.onItsWay(displayName(pick.mon)) }
}

// The debug spawn's mon, in the sex asked for when its species has it, shown as its
// sprite for that sex
function askedWild(name, wanted) {
  const eighths = femaleEighthsOf(name)
  const possible = { male: eighths !== null && eighths < 8, female: eighths !== null && eighths > 0 }
  const sex = possible[wanted] ? wanted : sexFor(name)
  const mon = sexedSprite(name, sex)
  return { mon, sex, variant: 'default', key: dexKey(mon), tier: tierOf(mon), level: startLevel(mon) }
}

// The hidden debug faint, /pokemon kill. It faints the shown mon as neglect would, or
// loses it under nuzlocke. Null when debug is off, so it reads as an unknown option.
async function killCommand($) {
  if ((await $.store.get('debug')) !== true) return null
  S.nowMs = await $.clock.now()
  await freshen($, [S.mon])
  if (isDown()) return downReply()
  const name = nameOf(S.mon)
  await (S.nuzlockeOn ? loseMon($, S.mon) : faintMon($))
  return { text: t.killed(name, S.nuzlockeOn) }
}

const PET_HAPPINESS = 25
const STAT_REDRAW_TICKS = 1200

// Fill the meters once the berry is eaten or the hearts have floated away, not when
// asked, for the mon that was fed or petted
function stepOwed($) {
  if (S.pettingFills && !isPetted()) {
    S.owed.push({ name: S.pettingFills, happiness: PET_HAPPINESS })
    S.pettingFills = null
  }
  if (S.owed.length > 0) payOwed($, S.owed.splice(0)).catch((err) => logOnce($, err))
}

async function payOwed($, gains) {
  S.nowMs = await $.clock.now()
  const names = [...new Set(gains.map((g) => g.name))]
  await freshen($, names)
  for (const { name, ...meters } of gains) {
    for (const [key, amount] of Object.entries(meters)) bumpStat(key, amount, name)
  }
  await saveRecords($, names)
  $.ui.invalidate('ui.render')
}

// Saves both meters as they are now before the drain rate changes, so the slower
// rate only covers the time asleep
async function setAsleep($, asleep) {
  await freshen($, [S.mon])
  for (const key of Object.keys(STATS)) bumpStat(key, 0)
  S.stats[S.mon] = { ...S.stats[S.mon], asleep }
  await saveStats($, [S.mon])
  $.ui.invalidate('ui.render')
}

// Every open session shares the store, so a session saves only the records it changed
// over the stored ones and picks up the others' as it goes. It counts its saves, and the
// ones still being written, so a sync that read the store before one landed doesn't undo it.
let statWrites = 0
let statSaving = 0

async function saveStats($, names) {
  await saveRecords($, names)
}

// Take these mons' records as last saved by any session, right before changing them, so
// a change lands on another session's newest XP and meters rather than on this one's
// copy from the last sync. A record gone from the store was released in another session,
// so it goes here too rather than being saved back. The shown mon is never parked here.
async function freshen($, names) {
  const saved = await $.store.get('stats')
  if (!saved || typeof saved !== 'object') return
  for (const name of names) {
    if (!saved[name]) {
      delete S.stats[name]
      continue
    }
    const { parked, ...shown } = saved[name]
    S.stats[name] = name === S.mon ? shown : saved[name]
  }
}

async function saveRecords($, names) {
  statWrites += 1
  statSaving += 1
  try {
    const saved = await $.store.get('stats')
    const merged = saved && typeof saved === 'object' ? { ...saved } : {}
    const started = names.filter((name) => S.stats[name] && !merged[name])
    for (const name of names) {
      if (S.stats[name]) S.stats[name] = sexedRecord(name, S.stats[name])
      if (S.stats[name]) merged[name] = S.stats[name]
      else delete merged[name]
    }
    S.stats = merged
    await $.store.set('stats', merged)
    // A mon raised again from scratch no longer points at what it once evolved into
    if (started.length > 0) {
      const evolved = await $.store.get('evolved')
      if (evolved && started.some((name) => name in evolved)) {
        const rest = { ...evolved }
        for (const name of started) delete rest[name]
        await $.store.set('evolved', rest)
      }
    }
  } finally {
    statSaving -= 1
  }
}

// Records saved before mons had a sex get one now, for good: the one the sprite pins down,
// like a female Pikachu's, or one drawn by the species' share of females
async function sexRecords($) {
  const unsexed = Object.keys(S.stats).filter((name) => lacksSex(name, S.stats[name]))
  if (unsexed.length > 0) await saveRecords($, unsexed)
}

// 'mon' is the last one picked in any session, and a new session starts with it. A mon
// picked here is shown as itself, even if it once evolved in another session.
async function saveMon($) {
  S.seenPick = S.mon
  await $.store.set('mon', S.mon)
  const evolved = await $.store.get('evolved')
  if (evolved && S.mon in evolved) {
    const { [S.mon]: _, ...rest } = evolved
    await $.store.set('evolved', rest)
  }
}

// Earlier versions kept a mon per session under 'mon:' keys and a busy mark under 'busy:' keys
async function forgetOldKeys($) {
  for (const key of await $.store.keys()) {
    if (key.startsWith('mon:') || key.startsWith('busy:')) await $.store.delete(key)
  }
}

const SYNC_TICKS = 20
// How often the party is checked against the live agents, and how old a ball must be
// before a missing agent pops it, so a fresh spawn the list hasn't caught up with stays
const PARTY_SYNC_TICKS = 40
// An agent still at work, as the agent list reports it
const LIVE_STATUSES = ['pending', 'running', 'waiting']

// Pop the ball of any agent the engine no longer reports at work. A teammate in a pane of
// its own runs no loop here, so its turn never completes in this process, and this is the
// only way its ball ever pops.
async function syncParty($) {
  const open = S.party.filter((ball) => ball.popStart === null && S.tick - ball.born >= PARTY_SYNC_TICKS)
  if (open.length === 0) return
  const live = new Set()
  for (const agent of await $.agent.list()) {
    if (!LIVE_STATUSES.includes(agent.status)) continue
    live.add(agent.id)
    if (agent.teammateId) live.add(agent.teammateId)
  }
  for (const ball of open) if (!live.has(ball.id)) endAgent(ball.id)
}

async function loadPartyPicks($) {
  const saved = await $.store.get('partyPicks')
  S.partyPicks = Array.isArray(saved) ? saved.filter((name) => MONS.includes(name)) : null
  const agents = await $.store.get('partyAgents')
  S.partyAgents = {}
  if (agents && typeof agents === 'object') {
    for (const [type, name] of Object.entries(agents)) if (MONS.includes(name)) S.partyAgents[type] = name
  }
}

// Give a new subagent the mon assigned to its agent type, or when that one is busy or
// can't work, the next party mon nobody has, from the box as last saved
async function joinCrewFor($, id, type) {
  const saved = await $.store.get('stats')
  if (saved && typeof saved === 'object') await freshen($, Object.keys(saved))
  await loadPartyPicks($)
  const dex = await $.store.get('dex')
  const assigned = assignedTo(type)
  const mons = assigned && canWork(assigned) ? [assigned, ...partyMons()] : partyMons()
  S.crew = joinCrew(S.crew, id, mons, (name) => crewVariant(name, dex))
}

// Show the mon this one evolved into in another session, once nothing here is mid-move
function followEvolution($, into, record) {
  if (S.evolving || S.attack) return
  const name = nameOf(S.mon)
  const from = S.mon
  const wasHome = isHome()
  delete S.stats[S.mon]
  S.stats[into] = record
  S.evolveDue = null
  S.mon = into
  if (wasHome) S.x = homeX()
  clampX()
  S.sentCells = null
  // Arceus taking another plate's forme is the same mon, not an evolution
  if (dexKey(into) === dexKey(from)) $.ui.toast(t.changedForme(name, displayName(into)))
  else $.ui.toast(t.evolved(name, displayName(into)))
  $.ui.invalidate('ui.render')
}

// With sync on, show the mon last picked in another session. A pick that's this mon
// evolving elsewhere is left to followEvolution. Says whether it switched.
async function followPick($) {
  const pick = await $.store.get('mon')
  if (pick === S.seenPick || typeof pick !== 'string') return false
  if (!MONS.includes(pick)) await loadCustom($)
  const evolved = await $.store.get('evolved')
  if (S.evolving || S.attack || evolved?.[S.mon] === pick) return false
  S.seenPick = pick
  if (pick === S.mon || !MONS.includes(pick)) return false
  // A mon gone from the box can't be shown, so this session keeps its own
  await freshen($, [pick])
  if (isGone(pick)) return false
  await switchTo($, pick, { save: false })
  S.sentCells = null
  $.ui.invalidate('ui.render')
  return true
}

// Take the shown mon's record as another session showing it saved it: fed, petted, earned
// XP, or put to bed. Put to bed elsewhere while Claude works here, it wakes right back up
// in stepWake.
async function syncSessions($) {
  S.syncOn = (await $.store.get('sync')) === true
  S.nuzlockeOn = (await $.store.get('nuzlocke')) === true
  S.trainerOn = (await $.store.get('trainer')) !== false
  S.wildGens = wildGensOf(await $.store.get('gens'))
  if (S.syncOn && (await followPick($))) return
  const writes = statWrites
  const saved = await $.store.get('stats')
  const evolved = await $.store.get('evolved')
  // Nothing may await between this check and acting on what was read
  if (statSaving > 0 || writes !== statWrites) return
  // Evolved in another session, the shown mon evolves here too. Released, it starts over.
  if (!saved?.[S.mon]) {
    const into = evolved?.[S.mon]
    if (MONS.includes(into) && saved?.[into]) {
      followEvolution($, into, saved[into])
      return
    }
    // Evolved into a fetched mon this session hasn't loaded yet: load it, and the next
    // sync follows the evolution rather than taking the mon for released
    if (into && saved?.[into] && !MONS.includes(into)) {
      await loadCustom($)
      return
    }
    if (S.stats[S.mon] && saved && typeof saved === 'object') {
      delete S.stats[S.mon]
      S.evolveDue = null
      $.ui.invalidate('ui.render')
    }
    return
  }
  // Run away or lost in another session, it leaves this band too
  if (!isGone(S.mon) && (saved[S.mon].ranAway || saved[S.mon].dead)) {
    S.stats[S.mon] = saved[S.mon]
    await leaveBand($, { save: false })
    return
  }
  // A session that switched away from the shown mon parked it. It's still on show here, so
  // its record goes back unparked and drains on from where the park left it.
  const { parked, ...theirs } = saved[S.mon]
  if (parked && !isGone(S.mon)) {
    await freshen($, [S.mon])
    await saveRecords($, [S.mon])
  } else if (JSON.stringify(theirs) === JSON.stringify(S.stats[S.mon])) {
    return
  } else {
    const wasFainted = isFainted(S.mon)
    S.stats[S.mon] = theirs
    if (!wasFainted && isFainted(S.mon)) $.ui.toast(t.fainted(nameOf(S.mon)))
  }
  $.ui.invalidate('ui.render')
}

// A tucked-in mon wakes when Claude starts working, or when it has a berry to eat,
// a move to play, or an evolution to go through
function stepWake($) {
  if (isTuckedIn() && (S.turnRunning || S.food || S.attack || S.evolving || S.evolveDue)) setAsleep($, false).catch((err) => logOnce($, err))
}

// An answered turn earns XP, scaled by care. A level-up toasts the new level once, and
// an evolution it reaches is due.
async function gainXp($, durationMs) {
  S.nowMs = await $.clock.now()
  await freshen($, [S.mon])
  if (isDown()) return
  const was = levelOf(S.mon)
  const care = S.needsOn ? careOf(statNow(S.mon, 'food'), statNow(S.mon, 'happiness')) : 1
  S.stats[S.mon] = { ...S.stats[S.mon], xp: xpOf(S.mon) + turnXp({ level: was, durationMs, care }) }
  await saveStats($, [S.mon])
  const level = levelOf(S.mon)
  if (level === was) return
  S.stats[S.mon] = markedLevelUp(S.mon)
  await saveStats($, [S.mon])
  $.ui.toast(t.grew(nameOf(S.mon), level))
  $.ui.invalidate('ui.render')
  const into = readyToEvolve()
  if (!into) return
  if (S.autoEvolve) S.evolveDue = await dueEvolution($, into)
  else $.ui.toast(t.readyToEvolve(nameOf(S.mon), displayName(into)))
}

// A party mon earns this share of what its own subagent's answered turn would earn the lead
const PARTY_XP_SHARE = 0.5

// A level-up reaches a friendship evolution with full hearts, by day or night when it asks,
// Feebas's with full food, Tyrogue's by which meter has more icons, Mantyke's with a
// Remoraid on show or in the party, and picks one left to chance at its level. With needs
// off both meters count as full. The record keeps what it reached, so it stays ready the
// way a level evolution does, and a pick stays the same.
function markedLevelUp(name) {
  const food = S.needsOn ? filledIcons('food', name) : STAT_ICONS
  const hearts = S.needsOn ? filledIcons('happiness', name) : STAT_ICONS
  const kept = S.stats[name]?.readyFor
  const team = [S.mon, ...partyMons()].filter((mon) => mon !== name).map(dexKey)
  const level = levelOf(name)
  const entry = levelUpEvolutionOf(name, { level, food, hearts, full: STAT_ICONS, time: timeOfDay(S.nowMs), sex: sexOf(name), team, kept })
  return entry ? { ...S.stats[name], readyFor: entry.into } : S.stats[name]
}

// A level-up off show can't evolve the mon, so a box mon at its evolution level, or that
// leveled up into one by the meters or the clock, is marked ready, and it evolves
// once it's shown
function markedReady(name, was) {
  const level = levelOf(name)
  if (level <= was) return S.stats[name]
  const record = markedLevelUp(name)
  const evolution = levelEvolutionOf(name, sexOf(name))
  const ready = (evolution && level >= evolution.level) || record.readyFor
  return ready ? { ...record, evolveReady: true } : record
}

// The party mon out for a subagent earns XP for that subagent's answered turn, scaled by
// its own meters
async function partyXp($, name, durationMs) {
  if (!name || name === S.mon) return
  S.nowMs = await $.clock.now()
  await freshen($, [name])
  if (!S.stats[name] || isGone(name) || isFainted(name)) return
  const was = levelOf(name)
  const care = S.needsOn ? careOf(statNow(name, 'food'), statNow(name, 'happiness')) : 1
  const xp = Math.max(1, Math.round(turnXp({ level: was, durationMs, care }) * PARTY_XP_SHARE))
  S.stats[name] = { ...S.stats[name], xp: xpOf(name) + xp }
  S.stats[name] = markedReady(name, was)
  await saveRecords($, [name])
  if (levelOf(name) > was) $.ui.toast(t.grewBeside(nameOf(name), levelOf(name), nameOf(S.mon)))
}

// A mon marked ready off show evolves now it's shown, or waits for /pokemon evolve with
// autoevolve off
async function evolveIfReady($) {
  if (!S.stats[S.mon]?.evolveReady) return
  const { evolveReady, ...record } = S.stats[S.mon]
  S.stats[S.mon] = record
  await saveRecords($, [S.mon])
  const into = readyToEvolve()
  if (!into) return
  if (S.autoEvolve) S.evolveDue = await dueEvolution($, into)
  else $.ui.toast(t.readyToEvolve(nameOf(S.mon), displayName(into)))
}

// The bag as last saved. The first time it's made, every stone or trade mon already in
// the box, or on show, gets the item it needs, so nobody raised before the bag is stranded.
async function loadBag($) {
  const saved = await $.store.get('bag')
  if (saved && typeof saved === 'object') return keptPlates(bagOf(saved))
  const stats = await $.store.get('stats')
  const boxed = stats && typeof stats === 'object' ? Object.keys(stats).filter((name) => !stats[name]?.ranAway && !stats[name]?.dead) : []
  const bag = migratedBag(new Set([...boxed, ...(isGone(S.mon) ? [] : [S.mon])]))
  await $.store.set('bag', bag)
  return keptPlates(bag)
}

async function changeBag($, change) {
  const bag = keptPlates(change(await loadBag($)))
  await $.store.set('bag', bag)
  return bag
}

// The plates in the bag are kept in memory, so a knockout knows which it can't drop
// without waiting on the store
function keptPlates(bag) {
  S.bagPlates = PLATE_KEYS.filter((plate) => bag[plate] > 0)
  return bag
}

// The plates in the bag as last saved, read without making the first bag
async function refreshPlates($) {
  keptPlates(bagOf(await $.store.get('bag')))
}

// The plates you have: in the bag, or held by an Arceus in your box
const ownedPlates = () => [...S.bagPlates, ...Object.values(S.stats).map((record) => record?.plate).filter(Boolean)]

// The Arceus forme a plate gives, or Normal's for none
const formeOf = (plate) => (plate ? 'arceus_' + plateType(plate) : 'arceus')

// Arceus holds a plate and takes its type's forme at once, keeping its level, XP, and
// meters. The plate leaves the bag, and the one it held, if any, goes back. Without a
// plate it's Normal again. The forme is fetched first, like an evolution's mon.
async function holdPlate($, plate) {
  const name = nameOf(S.mon)
  const from = S.mon
  const held = S.stats[from]?.plate ?? null
  const into = formeOf(plate)
  if (into !== from && S.stats[into] && !isDead(into)) return { text: t.boxHasForme(fullNameOf(into), name) }
  try {
    await ensureMon($, into)
  } catch (err) {
    return { text: t.formeFailed(name, err?.message ?? String(err)) }
  }
  if (S.mon !== from) return { text: t.keptPlate(name) }
  await freshen($, [from])
  const { plate: _, ...record } = S.stats[from] ?? {}
  S.stats[into] = plate ? { ...record, plate } : record
  if (into !== from) delete S.stats[from]
  const wasHome = isHome()
  S.mon = into
  if (wasHome) S.x = homeX()
  clampX()
  await saveStats($, [from, into])
  await saveMon($)
  if (into !== from) {
    const evolved = (await $.store.get('evolved')) ?? {}
    await $.store.set('evolved', { ...evolved, [from]: into })
  }
  await changeBag($, (bag) => {
    const taken = plate ? takenFrom(bag, plate) : bag
    return held ? addedTo(taken, held) : taken
  })
  $.ui.invalidate('ui.render')
  const back = held ? t.plateBack(itemName(held)) : ''
  if (!plate) return { text: t.tookPlate(itemName(held), name) }
  return { text: t.holdsPlate(name, itemName(plate), t.typeName(plateType(plate)), back) }
}

// /pokemon use <plate>: only Arceus holds one, and only one it has in the bag
async function plateCommand($, plate) {
  const name = nameOf(S.mon)
  if (dexKey(S.mon) !== 'arceus') return { text: t.onlyArceus(name, itemName(plate)) }
  if (isDown()) return downReply()
  if (S.evolving || S.attack || S.food) return { text: t.busy(name) }
  if (S.stats[S.mon]?.plate === plate) return { text: t.alreadyHolds(name, itemName(plate)) }
  if (!(await loadBag($))[plate]) return { text: t.noPlate(itemName(plate)) }
  return holdPlate($, plate)
}

// /pokemon take: Arceus gives its plate back to the bag
async function takeCommand($) {
  const name = nameOf(S.mon)
  if (!S.stats[S.mon]?.plate) return { text: t.holdsNothing(name) }
  if (isDown()) return downReply()
  if (S.evolving || S.attack || S.food) return { text: t.busy(name) }
  return holdPlate($, null)
}

// A long main turn now and then turns up a Rare Candy
async function maybeFindCandy($, durationMs) {
  if (durationMs < LONG_TURN_MS || isDown() || Math.random() >= LONG_TURN_CANDY_ODDS) return
  await changeBag($, (bag) => addedTo(bag, RARE_CANDY))
  $.ui.toast(t.foundCandy(nameOf(S.mon)))
}

// Rare Candy raises the shown mon, or a box mon named, one level, to the start of the
// next. It never revives a fainted mon or brings back one that's gone.
async function candyCommand($, wanted) {
  const name = wanted || S.mon
  if (!MONS.includes(name)) return { text: t.unknownMonBox(wanted) }
  await freshen($, [name])
  const shown = nameOf(name)
  if (isDead(name)) return { text: t.candyGone(displayName(name)) }
  if (hasRunAway(name)) return { text: goneLine(name) }
  if (name !== S.mon && !S.stats[name]) return { text: t.notInBoxList(displayName(name)) }
  if (isFainted(name)) return { text: t.candyFainted(shown) }
  const was = levelOf(name)
  if (was >= MAX_LEVEL) return { text: t.maxLevel(shown, MAX_LEVEL) }
  if (!(await loadBag($))[RARE_CANDY]) return { text: t.noCandy }
  await changeBag($, (bag) => takenFrom(bag, RARE_CANDY))
  await freshen($, [name])
  S.stats[name] = { ...S.stats[name], xp: xpAt(was + 1) }
  S.stats[name] = name === S.mon ? markedLevelUp(name) : markedReady(name, was)
  await saveRecords($, [name])
  $.ui.invalidate('ui.render')
  const grew = t.gaveCandy(shown, was + 1)
  const into = name === S.mon ? readyToEvolve() : null
  if (!into) return { text: grew }
  if (S.autoEvolve) {
    S.evolveDue = await dueEvolution($, into)
    return { text: grew }
  }
  return { text: grew + t.candyReady(displayName(into)) }
}

// /pokemon use <item> [mon]. The item's name may take several words, so the longest
// start of the words that names an item is the item, and the rest the mon.
async function useCommand($, rest) {
  const words = rest.split(/\s+/).filter(Boolean)
  const names = ITEMS.map((item) => itemName(item.key)).join(', ')
  if (words.length === 0) return { text: t.nameItem }
  let n = words.length
  while (n > 0 && !findItem(words.slice(0, n).join(' '))) n--
  if (n === 0) return { text: t.unknownItem(rest.trim(), names) }
  const item = findItem(words.slice(0, n).join(' '))
  const wanted = words.slice(n).join('_')
  if (item === RARE_CANDY) return candyCommand($, wanted)
  if (wanted && !MONS.includes(wanted)) return { text: t.unknownMonBox(wanted) }
  if (wanted && wanted !== S.mon) return { text: t.showFirst(nameOf(wanted), wanted, itemName(item)) }
  if (PLATE_KEYS.includes(item)) return plateCommand($, item)
  if (isDown()) return downReply()
  const entry = ownEvolutionsOf(S.mon).find((e) => itemFor(e) === item)
  if (!entry) return otherSexReply((e) => itemFor(e) === item) ?? { text: t.cantUse(nameOf(S.mon), itemName(item)) }

  return evolveCommand($, entry.into)
}

// The box's mons beside the one on show that come out of subagents' balls, one a line,
// like "Sparky (Pikachu), Lv. 12, working for Count files", with the agent named by its
// description in the agent list
async function partyText($) {
  const saved = await $.store.get('stats')
  if (saved && typeof saved === 'object') await freshen($, Object.keys(saved))
  await loadPartyPicks($)
  const assigned = [...new Set(Object.values(S.partyAgents))].filter(canWork)
  const mons = [...assigned, ...partyMons()]
  if (mons.length === 0 && S.partyPicks) return t.partyEmptyPicked
  if (mons.length === 0) return t.partyEmpty(nameOf(S.mon))
  const agents = await $.agent.list().catch(() => [])
  const described = new Map((Array.isArray(agents) ? agents : []).map((agent) => [agent.id, agent.description || agent.id]))
  const lines = mons.map((name) => {
    const member = S.crew.find((m) => m.mon === name && m.endAt === null)
    const types = typesOf(name)
    const ready = S.stats[name]?.evolveReady ? t.partyReady : ''
    const shown = fullNameOf(name) + ', ' + t.lv(levelOf(name)) + ready + (types.length > 0 ? t.partyFor(types) : '')
    if (!member) return shown + t.partyFree
    const waiting = isOut(member, S.tick) ? '' : t.partyWaiting
    return shown + t.partyWorking(described.get(member.id) ?? member.id, waiting)
  })
  return t.partyList(t.mons(mons.length), nameOf(S.mon), lines)
}

// Add a box mon to the party or take one out. The first change starts from the party as
// it stands, and a mon taken out while it works finishes its subagent first.
async function partyCommand($, verb, wanted) {
  const saved = await $.store.get('stats')
  if (saved && typeof saved === 'object') await freshen($, Object.keys(saved))
  await loadPartyPicks($)
  const example = verb === 'add' ? 'dratini' : (partyMons()[0] ?? 'pikachu')
  if (!wanted) return { text: t.nameMonLike(verb, example) }
  if (!MONS.includes(wanted)) return { text: t.unknownMonBox(wanted) }
  const picks = S.partyPicks ?? partyMons()
  const name = nameOf(wanted)
  if (verb === 'remove') {
    if (!picks.includes(wanted)) return { text: t.notInParty(name) }
    S.partyPicks = picks.filter((pick) => pick !== wanted)
    await $.store.set('partyPicks', S.partyPicks)
    const working = S.crew.some((m) => m.mon === wanted && m.endAt === null)
    return { text: t.leavesParty(name, working) }
  }
  if (wanted === S.mon) return { text: t.onShow(name) }
  if (!S.stats[wanted] || isDead(wanted)) return { text: t.notInBoxCatch(displayName(wanted), wanted) }
  if (isGone(wanted)) return { text: t.ranAwayCatch(name) }
  if (picks.includes(wanted)) return { text: t.alreadyInParty(name) }
  if (picks.length >= CREW_SIZE) return { text: t.partyFull(CREW_SIZE) }
  S.partyPicks = [...picks, wanted]
  await $.store.set('partyPicks', S.partyPicks)
  return { text: t.joinsParty(name, isFainted(wanted) ? t.restsUntilRevived : '') }
}

// Assign a box mon to an agent type, so every subagent of that type comes out as it, or
// take an assignment back. A mon works for one agent type at a time.
async function assignCommand($, verb, words) {
  const saved = await $.store.get('stats')
  if (saved && typeof saved === 'object') await freshen($, Object.keys(saved))
  await loadPartyPicks($)
  if (verb === 'unassign') {
    const type = words.join(' ')
    if (!type) return { text: t.nameAgent }
    if (!S.partyAgents[type]) return { text: t.noneAssigned(type) }
    const name = nameOf(S.partyAgents[type])
    delete S.partyAgents[type]
    await $.store.set('partyAgents', S.partyAgents)
    return { text: t.noLongerFor(name, type) }
  }
  if (words.length < 2) return { text: t.nameAgentAndMon }
  const wanted = words.at(-1)
  const type = words.slice(0, -1).join(' ')
  if (!MONS.includes(wanted)) return { text: t.unknownMonBox(wanted) }
  const name = nameOf(wanted)
  if (wanted === S.mon) return { text: t.onShow(name) }
  if (!S.stats[wanted] || isDead(wanted)) return { text: t.notInBoxCatch(displayName(wanted), wanted) }
  if (isGone(wanted)) return { text: t.ranAwayCatch(name) }
  const before = typesOf(wanted).filter((other) => other !== type)
  for (const other of before) delete S.partyAgents[other]
  S.partyAgents[type] = wanted
  await $.store.set('partyAgents', S.partyAgents)
  const moved = before.length > 0 ? t.movedFrom(before) : ''
  return { text: t.comesOutFor(name, type, moved, isFainted(wanted) ? t.restsUntilRevived : '') }
}

// The options as typed in the band's language, like attack or attaque
const options = () => [...HELP.flatMap(([, rows]) => rows.map(([command]) => t.help[command][0].split(' ')[0])), t.command('help')]

// Send the frame only when it differs from the last one sent or drawn. A resize can
// remount the band, and the host then refuses frames for the old one, so a refused
// frame asks for a redraw, at most once a second, which draws the band anew.
const REDRAW_AFTER_REFUSAL_TICKS = 20
let refusedAt = -Infinity
function blitFrame($) {
  const zoom = bandZoom()
  if (!zoom) return
  if (S.imageRetryAt !== null && S.tick >= S.imageRetryAt) S.imageRetryAt = null
  // Going between the Image and cells takes a redraw, so the blits wait for it
  if (drawsImage() !== S.drawnImage || drawsHearts() !== S.drawnHearts) return $.ui.invalidate('ui.render')
  if (S.drawnHearts) blitHearts($)
  if (S.drawnImage) return blitImage($, zoom)
  const cells = cellsNow()
  if (cells === S.sentCells) return
  S.sentCells = cells
  $.ui
    .blit({ requestId: S.bandId, key: 'pokemon', columns: zoom.columns, rows: zoom.rows, cells })
    .then((result) => {
      if (!result?.deny) return
      S.sentCells = null
      redrawRefused($, result.deny)
    })
    .catch((err) => logOnce($, err))
}

function redrawRefused($, deny) {
  if (S.tick - refusedAt < REDRAW_AFTER_REFUSAL_TICKS) return
  refusedAt = S.tick
  logOnce($, 'frame refused: ' + deny)
  $.ui.invalidate('ui.render')
}

// Swap the small band's Image to the frame now, when it differs from the last one sent
// or drawn. A terminal that draws the Image's alt gets half blocks for a while.
function blitImage($, zoom) {
  const source = imageNow(zoom)
  if (source.png === S.sentImage) return
  S.sentImage = source.png
  $.ui
    .blit({ requestId: S.bandId, key: 'pokemon', columns: zoom.columns, rows: zoom.rows, source })
    .then((result) => {
      if (!result?.deny) {
        S.imagesDrawn = true
        return
      }
      S.sentImage = null
      deniedImage($, result.deny)
    })
    .catch((err) => logOnce($, err))
}

// Send the pixel hearts as drawn, once per PNG, to learn whether the terminal draws them
function blitHearts($) {
  const source = heartsImage(filledIcons('happiness'))
  if (source.png === S.sentHearts) return
  S.sentHearts = source.png
  $.ui
    .blit({ requestId: S.bandId, key: 'hearts', columns: STAT_ICONS, rows: 1, source })
    .then((result) => {
      if (!result?.deny) {
        S.imagesDrawn = true
        return
      }
      S.sentHearts = null
      deniedImage($, result.deny)
    })
    .catch((err) => logOnce($, err))
}

function deniedImage($, deny) {
  if (!/draws its alt/.test(deny)) return redrawRefused($, deny)
  if (S.imageRetryAt !== null) return
  // A terminal that has drawn Images denies one only for a while, as when its focus
  // resets, so the wait starts over
  if (S.imagesDrawn) S.imageWait = IMAGE_WAIT_TICKS[0]
  S.imagesDrawn = false
  S.imageRetryAt = S.tick + S.imageWait
  S.imageWait = Math.min(IMAGE_WAIT_TICKS[1], S.imageWait * 2)
  logOnce($, 'drawing half blocks and text hearts: ' + deny)
  $.ui.invalidate('ui.render')
}

// The desktop has no Raster to repaint, so a changed frame draws the band again. The
// host draws a plugin's band ten times a second at most.
const DESKTOP_FRAME_TICKS = 2
function redrawSvg($) {
  if (!bandZoom() || svgNow() === S.sentSvg) return
  $.ui.invalidate('ui.render')
}

// Ticks stop while the machine sleeps, so the meters resync with the real clock
// The meters drain at OFF_DRAIN of their speed while no session runs: Claude Code closed,
// or the laptop off or asleep. Every open session marks the store as seen every BEAT_MS.
// A session that starts long after the last mark, or a running one whose own beat comes
// late because the laptop slept, moves every meter's timestamp on by the rest of that
// time, so only OFF_DRAIN of it counts. This stacks with /pokemon sleep's slower drain.
const OFF_DRAIN = 0.25
const BEAT_MS = 10 * 1000
const BEAT_TICKS = BEAT_MS / TICK_MS
const OFF_AFTER_MS = 60 * 1000

async function slowMeters($, now, offMs) {
  await freshen($, Object.keys(S.stats))
  // A stamp set during the gap, by another session, only sees the gap after it
  const overlap = (at) => Math.min(offMs, Math.max(0, now - at))
  const draining = Object.keys(S.stats).filter((name) => !S.stats[name].parked)
  for (const name of draining) {
    const record = { ...S.stats[name] }
    for (const key of Object.keys(STATS)) {
      if (record[key]?.at !== undefined) record[key] = { ...record[key], at: record[key].at + overlap(record[key].at) * (1 - OFF_DRAIN) }
    }
    S.stats[name] = record
  }
  // A heal takes open time too, so its end moves on by all of the gap it ran through
  const healing = Object.keys(S.stats).filter((name) => typeof S.stats[name].healing?.until === 'number')
  for (const name of healing) {
    const { from, until } = S.stats[name].healing
    const start = from ?? until - HEAL_MS
    const shift = overlap(start)
    S.stats[name] = { ...S.stats[name], healing: { from: start + shift, until: until + shift } }
  }
  await saveRecords($, [...new Set([...draining, ...healing])])
}

// The gap runs from the last mark any session left, so time another session was open
// never counts as off, whether this one is starting or its own ticks came late
async function beat($) {
  const since = await $.store.get('seenAt')
  const now = await $.clock.now()
  S.nowMs = now
  if (typeof since === 'number' && now - since > OFF_AFTER_MS) await slowMeters($, now, now - since - BEAT_MS)
  await $.store.set('seenAt', now)
}

async function resyncMeters($) {
  S.nowMs = await $.clock.now()
  $.ui.invalidate('ui.render')
}

// A mon faints once food and happiness have both sat empty for FAINT_AFTER_MS of open
// session time, kept in its record as starving = { ms, at }. Each check adds the time since
// the last one by any session, when that's under COUNTED_GAP_MS, so time with every session
// closed or the laptop asleep never counts. A session holds the clock for FAINT_GRACE_MS
// after it first shows the mon. Left fainted for RUNAWAY_AFTER_MS, counted the same way in
// fainted = { ms, at }, it runs away. With needs off, both clocks stop.
const FAINT_AFTER_MS = 3 * 3600 * 1000
const RUNAWAY_AFTER_MS = 24 * 3600 * 1000
const FAINT_GRACE_MS = 10 * 60 * 1000
const COUNTED_GAP_MS = OFF_AFTER_MS

// The mon on show ran away or died, so the band shows the next one in the box: the
// highest level one still standing, else a fainted one. With none, the band is a line of
// text. Returns the mon it shows next, if any.
async function leaveBand($, { save = true } = {}) {
  const gone = S.mon
  const next = Object.keys(S.stats)
    .filter((name) => name !== gone && MONS.includes(name) && S.stats[name] && typeof S.stats[name] === 'object' && !isGone(name))
    .sort((a, b) => isFainted(a) - isFainted(b) || levelOf(b) - levelOf(a) || a.localeCompare(b))[0]
  S.attack = null
  S.food = null
  S.evolving = null
  S.evolveDue = null
  if (S.wild) fleeWild($, true)
  if (next) await switchTo($, next, { save })
  S.sentCells = null
  $.ui.invalidate('ui.render')
  return next ?? null
}

async function faintMon($) {
  const { starving, asleep, ...record } = S.stats[S.mon]
  S.stats[S.mon] = { ...record, food: { value: 0, at: S.nowMs }, happiness: { value: 0, at: S.nowMs }, fainted: { ms: 0, at: S.nowMs } }
  await saveRecords($, [S.mon])
  $.ui.toast(t.fainted(nameOf(S.mon)))
  $.ui.invalidate('ui.render')
}

// The record stays, marked with when it left and the variant it was shown in, for its
// comeback in the wild
async function runAway($) {
  const name = nameOf(S.mon)
  const { fainted, healing, starving, asleep, ...record } = S.stats[S.mon]
  S.stats[S.mon] = { ...record, ranAway: { at: S.nowMs, variant: S.variant } }
  await saveRecords($, [S.mon])
  const next = await leaveBand($)
  $.ui.toast(t.ranAway(name, next ? nameOf(next) : null))
}

// Under nuzlocke a fainted mon is lost. Its record goes for a dead mark that locks the
// species until a new one is caught, and the graveyard keeps who it was.
async function loseMon($, name) {
  const shownName = nameOf(name)
  const grave = { mon: name, level: levelOf(name), at: S.nowMs, ...(S.stats[name]?.nickname ? { nickname: S.stats[name].nickname } : {}) }
  const graveyard = await $.store.get('graveyard')
  await $.store.set('graveyard', [...(Array.isArray(graveyard) ? graveyard : []), grave])
  S.stats[name] = { dead: { at: S.nowMs } }
  await saveRecords($, [name])
  const next = name === S.mon ? await leaveBand($) : null
  $.ui.toast(t.lost(shownName, next ? nameOf(next) : null))
}

// With nuzlocke on, every fainted mon in the box is lost, except one already being healed
async function loseFainted($) {
  const saved = await $.store.get('stats')
  if (!saved || typeof saved !== 'object') return
  const names = Object.keys(saved).filter((name) => saved[name]?.fainted && !saved[name].healing && !saved[name].dead && !saved[name].ranAway)
  if (names.length === 0) return
  await freshen($, names)
  for (const name of names) if (isFainted(name) && !isHealing(name)) await loseMon($, name)
}

// Move the shown mon's faint clock or runaway clock on, as often as the beat
async function checkNeglect($) {
  if (S.checkingNeglect) return
  S.checkingNeglect = true
  try {
    S.nowMs = await $.clock.now()
    if (S.nuzlockeOn) await loseFainted($)
    await freshen($, [S.mon])
    const record = S.stats[S.mon]
    if (!S.needsOn || !record || isGone(S.mon) || isHealing(S.mon)) return
    const now = S.nowMs
    const counts = now - (S.firstShown.get(S.mon) ?? now) >= FAINT_GRACE_MS
    const added = (clock) => (counts && clock && now - clock.at <= COUNTED_GAP_MS ? Math.max(0, now - clock.at) : 0)
    if (isFainted(S.mon)) {
      const ms = (record.fainted.ms ?? 0) + added(record.fainted)
      if (ms >= RUNAWAY_AFTER_MS) return await runAway($)
      S.stats[S.mon] = { ...record, fainted: { ms, at: now } }
      return await saveRecords($, [S.mon])
    }
    if (statNow(S.mon, 'food') > 0 || statNow(S.mon, 'happiness') > 0) {
      if (!record.starving) return
      const { starving, ...rest } = record
      S.stats[S.mon] = rest
      return await saveRecords($, [S.mon])
    }
    const ms = (record.starving?.ms ?? 0) + added(record.starving)
    if (ms >= FAINT_AFTER_MS) return await (S.nuzlockeOn ? loseMon($, S.mon) : faintMon($))
    S.stats[S.mon] = { ...record, starving: { ms, at: now } }
    await saveRecords($, [S.mon])
  } finally {
    S.checkingNeglect = false
  }
}

async function finishHeal($) {
  S.finishingHeal = true
  try {
    S.nowMs = await $.clock.now()
    await freshen($, [S.mon])
    const healed = settleHeal(S.mon)
    if (healed) await saveRecords($, [S.mon])
    if (healed || !isFainted(S.mon)) {
      markActive()
      S.hopStart = S.tick
      S.releasedAt = S.tick
      $.ui.toast(t.healed(nameOf(S.mon)))
      $.ui.invalidate('ui.render')
    }
  } finally {
    S.finishingHeal = false
  }
}

// Stop whatever the shown mon was doing once it's down, here or in another session
function stepDown($) {
  if (!isDown()) return
  if (isHealing(S.mon) && !S.finishingHeal && S.nowMs >= S.stats[S.mon].healing.until) finishHeal($).catch((err) => logOnce($, err))
  S.attack = null
  S.evolving = null
  S.evolveDue = null
  S.food = null
}

// /pokemon revive [<mon>] takes a fainted mon to a Pokémon Center for HEAL_MS
async function reviveCommand($, wanted) {
  const name = wanted || S.mon
  if (!MONS.includes(name)) return { text: t.unknownMonBox(wanted) }
  await freshen($, [name])
  if (name === S.mon && isDown()) {
    if (isGone(S.mon) || isHealing(S.mon)) return downReply()
  } else if (isDead(name)) {
    return { text: t.gone(displayName(name)) }
  } else if (hasRunAway(name)) {
    return { text: goneLine(name) }
  }
  const shown = nameOf(name)
  if (!isFainted(name)) return { text: t.notFainted(shown) }
  if (isHealing(name)) return { text: t.atCenter(shown) }
  if (S.nuzlockeOn) return { text: t.noRevive(shown) }
  S.stats[name] = { ...S.stats[name], healing: { from: S.nowMs, until: S.nowMs + HEAL_MS } }
  await saveRecords($, [name])
  // It comes back out of its ball at home
  if (name === S.mon) S.x = homeX()
  $.ui.invalidate('ui.render')
  return { text: t.takenToCenter(shown, HEAL_MS / 60000) }
}

// The shown mon is at the Pokémon Center, so it can't be swapped out until it's back
async function stillHealing($) {
  await freshen($, [S.mon])
  return isHealing(S.mon) && S.nowMs < S.stats[S.mon].healing.until
}

async function nuzlockeCommand($) {
  S.nuzlockeOn = !S.nuzlockeOn
  await $.store.set('nuzlocke', S.nuzlockeOn)
  if (!S.nuzlockeOn) return { text: t.nuzlockeOff }
  const saved = await $.store.get('stats')
  if (saved && typeof saved === 'object') await freshen($, Object.keys(saved))
  const doomed = Object.keys(S.stats).filter((name) => MONS.includes(name) && isFainted(name) && !isHealing(name))
  return { text: t.nuzlockeOn(doomed.map(nameOf)) }
}

// /pokemon gen <N> turns a generation's mons in the wild on or off, and /pokemon gen lists
// the ones on. The bundled generations are always on.
async function genCommand($, wanted) {
  const toggled = GENS.filter((gen) => !BUNDLED_GENS.includes(gen))
  const how = t.genHow(toggled)
  if (!wanted) return { text: t.inTheWild(S.wildGens, how) }
  if (!/^\d+$/.test(wanted)) return { text: t.unknownGen(wanted, how) }
  const gen = Number(wanted)
  if (BUNDLED_GENS.includes(gen)) return { text: t.genAlways(gen, how) }
  if (!GENS.includes(gen)) return { text: t.genNotYet(gen, how) }
  const on = !S.wildGens.includes(gen)
  S.wildGens = wildGensOf(on ? [...S.wildGens, gen] : S.wildGens.filter((g) => g !== gen))
  await $.store.set('gens', S.wildGens.filter((g) => !BUNDLED_GENS.includes(g)))
  if (!on) return { text: t.genOff(gen) }
  return { text: t.genOn(gen) }
}

async function trainerCommand($) {
  S.trainerOn = !S.trainerOn
  await $.store.set('trainer', S.trainerOn)
  if (!S.trainerOn) return { text: t.trainerOff }
  return { text: t.trainerOn((await boxIsEmpty($)) ? STARTERS.map(displayName) : null) }
}

// With trainer mode on, only mons in your box can be shown. A box with no mon in it, new
// or with every mon gone, picks one of the starters, so it's never stuck with nothing to
// show or catch with. Mons fetched with /pokemon new are left out of it.
const STARTERS = ['bulbasaur', 'charmander', 'squirtle', 'pikachu']

async function boxIsEmpty($) {
  const saved = await $.store.get('stats')
  if (saved && typeof saved === 'object') await freshen($, Object.keys(saved))
  return !Object.keys(S.stats).some((name) => MONS.includes(name) && !isGone(name))
}

// Why trainer mode keeps asked off the band, or null when it may be shown. The caller has
// freshened asked's record. A starter picked joins the box at its first level.
async function trainerWait($, asked) {
  if (!S.trainerOn || asked === S.mon || S.stats[asked] || freeToShow(await $.store.get(CUSTOM_PREFIX + asked))) return null
  if (!(await boxIsEmpty($))) return { text: t.trainerBox(displayName(asked)) }
  if (!STARTERS.includes(asked)) return { text: t.trainerStarter(STARTERS.map(displayName)) }
  S.stats[asked] = { xp: xpAt(startLevel(asked)) }
  await saveRecords($, [asked])
  return null
}

// A broken frame goes to the debug log, each distinct message once
const logged = new Set()
function logOnce($, err) {
  const message = String(err?.message ?? err)
  if (logged.has(message)) return
  logged.add(message)
  // Logging is best effort: a log that fails must not break the hook that hit the error
  try {
    Promise.resolve($.ui.log('pokemon: ' + message, { to: 'debug' })).catch(() => {})
  } catch {}
}

async function themeInk($) {
  try {
    const rows = await $.config.list()
    return inkFor(rows.find((row) => row.key === 'theme')?.value)
  } catch {
    return INKS.dark
  }
}


// Show another mon, parking the one that leaves so its meters stop where they are
async function switchTo($, asked, { save = true } = {}) {
  const wasHome = isHome()
  S.evolveDue = null
  const left = S.mon
  S.nowMs = await $.clock.now()
  await freshen($, [left, asked])
  settleHeal(asked)
  if (!S.firstShown.has(asked)) S.firstShown.set(asked, S.nowMs)
  if (asked !== left && (S.stats[left] || S.stats[asked])) {
    park(left)
    unpark(asked)
    await saveRecords($, [left, asked])
  }
  S.mon = asked
  if (wasHome) S.x = homeX()
  clampX()
  if (save) await saveMon($)
  await evolveIfReady($)
}

// Load the mons fetched with /pokemon new, in this session or another, not loaded yet
async function loadCustom($) {
  for (const key of await $.store.keys()) {
    const name = key.slice(CUSTOM_PREFIX.length)
    if (!key.startsWith(CUSTOM_PREFIX) || SPRITES[name]) continue
    const saved = await $.store.get(key)
    if (saved?.sprite) addCustom(name, saved)
  }
}

// With gen 2 on in trainer mode, gen 2's mons are caught in the wild, not fetched for free
// In trainer mode, a generation in the wild has its mons caught there, not fetched for free
const caughtInWild = (gen) => S.trainerOn && !BUNDLED_GENS.includes(gen) && S.wildGens.includes(gen)

const catchInWildReply = (gen, name) => ({ text: t.catchInWild(gen, name ? displayName(name) : null) })

// The generations /pokemon new picks a random mon from
const NEW_GENS = [2, 3, 4, 5]

// /pokemon new <mon> fetches a mon from any generation and shows it. "random" picks one
// from gen 2 to 5 you don't have yet, and "random gen3" or "gen3" one from that generation.
// A mon fetched before for the wild or an evolution becomes free to show, like one fetched now.
async function newCommand($, wanted) {
  const genAsked = wanted.match(/^(?:random\s*)?gen\s*([1-5])$/)
  const random = wanted === 'random' || genAsked !== null
  let name = random ? '' : wanted.replace(/\s+/g, '_')
  let gen
  const get = (url, init) => $.http.fetch(url, init)
  if (!wanted) return { text: t.nameMonToFetch }
  try {
    if (genAsked && caughtInWild(Number(genAsked[1]))) return catchInWildReply(Number(genAsked[1]), null)
    if (!random && caughtInWild(genOf(name))) return catchInWildReply(genOf(name), name)
    if (random) {
      const open = NEW_GENS.filter((g) => !caughtInWild(g))
      if (!genAsked && open.length === 0) return { text: t.everyGenWild }
      gen = genAsked ? Number(genAsked[1]) : open[Math.floor(Math.random() * open.length)]
      const fresh = (await monsOfGen(get, gen)).filter((n) => !SPRITES[n])
      if (fresh.length === 0) return { text: t.haveEveryGen(gen) }
      name = fresh[Math.floor(Math.random() * fresh.length)]
    } else if (SPRITES[name]) {
      const saved = await $.store.get(CUSTOM_PREFIX + name)
      if (saved?.sprite && !freeToShow(saved)) await $.store.set(CUSTOM_PREFIX + name, { ...saved, by: 'new' })
      return { text: t.alreadyHere(nameOf(name), name) }
    } else if (!/^[a-z0-9_.-]+$/.test(name)) {
      return { text: t.unknownMonFetch(wanted) }
    }
    const entry = { ...(await fetchMon(get, name, gen)), by: 'new' }
    await $.store.set(CUSTOM_PREFIX + name, entry)
    addCustom(name, entry)
    await switchTo($, name)
    $.ui.invalidate('ui.render')
    return { text: t.fetched(entry.gen, nameOf(name), entry.moves.map(moveName), S.variant) }
  } catch (err) {
    return { text: t.fetchFailed(name, err?.message ?? String(err)) }
  }
}

// Asks for half the terminal, unless the person sized the dock themselves
async function openPane($, columns) {
  const opened = await $.ui.open({ id: PANE_ID, title: 'Pokémon', ...(columns > 0 ? { columns } : {}) })
  if (!opened.isPlaced) leavePane($)
  return opened
}

// The band draws the scene again, and blits go to it
function leavePane($) {
  if (!S.paneShown) return
  S.paneShown = false
  S.bandId = null
  $.ui.invalidate('ui.render')
}

async function paneCommand($, presentation) {
  if (S.paneOn) {
    S.paneOn = false
    await $.store.set('pane', false)
    await $.ui.close({ id: PANE_ID })
    leavePane($)
    return { text: t.backAbovePrompt(nameOf(S.mon)) }
  }
  S.paneOn = true
  const columns = Math.floor((presentation?.columns ?? 0) / 2)
  await $.store.set('pane', true)
  await $.store.set('paneColumns', columns)
  const opened = await openPane($, columns)
  if (!opened.isPlaced) return { text: t.paneWaits(nameOf(S.mon)) }
  if (presentation?.isFullscreen === false) return { text: t.paneAbove(nameOf(S.mon)) }
  return { text: t.paneBeside(nameOf(S.mon)) }
}

// The commands that count as facing a wild foe, so its strikes stay small
const FIGHT_VERBS = ['catch', 'attack', 'roar', 'run']

// Served from the one command.run hook below. Claude Code keeps a command out of the
// up-arrow history when more than one command.run hook could answer it.
async function runPokemon($, e) {
  const asked = englishCommand(e.args.trim().toLowerCase())
  let reply
  // Another session may have fetched a mon since this one started
  await loadCustom($).catch(() => {})
  // A pet doesn't wake a sleeping mon, so it doesn't count as activity
  if (asked !== 'pet' || !isAsleep()) markActive()
  clearAlert()
  S.nowMs = await $.clock.now()
  if (FIGHT_VERBS.includes(asked.split(' ')[0]) && asked !== 'attack list') S.wild = engagedWild(S.wild)
  if (waitsForEvolution(asked)) return evolvingReply()
  if (waitsForCare(asked)) return careReply()
  const verb = asked.split(' ')[0]
  const blocked = DOWN_WAITS.includes(verb) || (isGone(S.mon) && GONE_WAITS.includes(verb))
  if (asked !== 'attack list' && isDown() && blocked) {
    // Healed or caught back in another session since the last sync, it carries on
    await freshen($, [S.mon])
    if (isDown()) return downReply()
  }
  if (MONS.includes(asked)) {
    await freshen($, [asked])
    if (isDead(asked)) return { text: t.goneCatchNew(displayName(asked)) }
    if (hasRunAway(asked)) return { text: goneLine(asked) }
    if (asked !== S.mon && (await stillHealing($))) return healingReply()
    if ((reply = await trainerWait($, asked))) return reply
    await switchTo($, asked)
  } else if (asked === 'new' || asked.startsWith('new ')) {
    if (await stillHealing($)) return healingReply()
    return newCommand($, asked.slice('new'.length).trim())
  } else if (VARIANTS.includes(asked)) {
    S.variant = asked
    await $.store.set('variant', S.variant)
  } else if (asked === 'wander') {
    S.wander = !S.wander
    S.wanderTarget = null
    await $.store.set('wander', S.wander)
    return { text: t.wander(nameOf(S.mon), S.wander) }
  } else if (asked === 'pet') {
    // A mon as happy as can be, every heart filled, still enjoys it, but it fills no
    // meter and doesn't count as a pet
    const happiest = isHappiest()
    const sleeping = isAsleep()
    pet()
    const line = t.petted(nameOf(S.mon), sleeping ? t.petSleeping : t.petLines[Math.floor(Math.random() * t.petLines.length)])
    if (happiest) return { text: line + t.happiest(nameOf(S.mon)) }
    S.pettingFills = S.mon
    const pets = Number((await $.store.get('pets')) ?? 0) + 1
    await $.store.set('pets', pets)
    return { text: line }
  } else if (asked === 'feed') {
    if (isHere(S.wild)) return { text: t.notNow(wildName()) }
    // A full mon, every food icon filled, still eats the berry, but it fills no meter
    // and doesn't count as a feed
    const full = isFull()
    const berry = feed()
    const tossed = t.tossed(nameOf(S.mon), t.berryName(berry.name), berry.emoji)
    if (full) return { text: tossed + t.full(nameOf(S.mon)) }
    // The meters fill once it has eaten the berry
    S.food.fills = S.mon
    const feeds = Number((await $.store.get('feeds')) ?? 0) + 1
    await $.store.set('feeds', feeds)
    return { text: tossed }
  } else if (asked === 'sleep') {
    const name = nameOf(S.mon)
    if (isTuckedIn()) {
      await setAsleep($, false)
      return { text: t.wakes(name) }
    }
    if (S.turnRunning) return { text: t.cantSleep(name) }
    await setAsleep($, true)
    return { text: t.fallsAsleep(name) }
  } else if (asked === 'attack' || asked.startsWith('attack ')) {
    return attackCommand(asked.slice('attack'.length).trim())
  } else if (asked === 'catch') {
    return catchCommand()
  } else if (asked === 'roar' || asked === 'run') {
    return roarCommand()
  } else if ((asked === 'wild' || asked.startsWith('wild ')) && (reply = await wildCommand($, asked.slice('wild'.length)))) {
    return reply
  } else if (asked === 'kill' && (reply = await killCommand($))) {
    return reply
  } else if (asked === 'moves' || asked.startsWith('moves ')) {
    const whose = asked.slice('moves'.length).trim() || S.mon
    if (!MONS.includes(whose)) return { text: t.unknownMonList(whose) }
    return movesText(whose)
  } else if (asked === 'needs') {
    S.needsOn = !S.needsOn
    await $.store.set('needs', S.needsOn)
    $.ui.invalidate('ui.render')
    const name = nameOf(S.mon)
    return { text: t.needs(name, S.needsOn, isFainted(S.mon) ? t.stillFainted : '') }
  } else if (asked === 'emoji') {
    S.emojiOn = !S.emojiOn
    await $.store.set('emoji', S.emojiOn)
    $.ui.invalidate('ui.render')
    const icons = iconsFor('food').trimEnd() + ' ' + iconsFor('happiness').trimEnd()
    return { text: t.emoji(S.emojiOn, icons) }
  } else if (asked === 'size' || asked.startsWith('size ')) {
    const wanted = asked.slice('size'.length).trim()
    const sizes = Object.keys(SIZES).map(t.sizeName).join(', ')
    if (!wanted) return { text: t.bandSizes(S.size, sizes) }
    if (!Object.hasOwn(SIZES, wanted)) return { text: t.unknownSize(wanted, sizes) }
    S.size = wanted
    await $.store.set('size', S.size)
    $.ui.invalidate('ui.render')
    return { text: t.bandIs(S.size) }
  } else if (asked === 'images' || asked.startsWith('images ')) {
    const wanted = asked.slice('images'.length).trim()
    const modes = Object.keys(IMAGE_MODES).join(', ')
    if (!wanted) return { text: t.imageModes(S.imageMode, t.drawn(S.noImages), modes) }
    if (!Object.hasOwn(IMAGE_MODES, wanted)) return { text: t.unknownMode(wanted, modes) }
    S.imageMode = wanted
    await $.store.set('images', S.imageMode)
    applyImageMode()
    $.ui.invalidate('ui.render')
    return { text: t.images(S.imageMode, t.drawn(S.noImages)) }
  } else if (asked === 'pane') {
    return paneCommand($, e.presentation)
  } else if (asked === 'sync') {
    S.syncOn = !S.syncOn
    await $.store.set('sync', S.syncOn)
    const name = nameOf(S.mon)
    if (!S.syncOn) return { text: t.syncOff }
    // This session's mon becomes the pick the others follow
    await saveMon($)
    return { text: t.syncOn(name) }
  } else if (asked === 'autoevolve') {
    S.autoEvolve = !S.autoEvolve
    await $.store.set('autoEvolve', S.autoEvolve)
    const name = nameOf(S.mon)
    if (!S.autoEvolve) {
      S.evolveDue = null
      return { text: t.evolveWaits(name) }
    }
    // Already at its level, it evolves once idle
    const into = readyToEvolve()
    S.evolveDue = into && (await dueEvolution($, into))
    return { text: t.evolvesAlone(name) }
  } else if (asked === 'revive' || asked.startsWith('revive ')) {
    return reviveCommand($, asked.slice('revive'.length).trim())
  } else if (asked === 'nuzlocke') {
    return nuzlockeCommand($)
  } else if (asked === 'trainer') {
    return trainerCommand($)
  } else if (asked === 'gen' || asked.startsWith('gen ') || /^gen\d+$/.test(asked)) {
    return genCommand($, asked.slice('gen'.length).trim())
  } else if (asked === 'evolve' || asked.startsWith('evolve ')) {
    return evolveCommand($, asked.slice('evolve'.length).trim())
  } else if (asked === 'stop') {
    return stopEvolution($)
  } else if (asked === 'bag') {
    return { text: bagText(await loadBag($)) }
  } else if (asked === 'take') {
    return takeCommand($)
  } else if (asked === 'use' || asked.startsWith('use ')) {
    return useCommand($, asked.slice('use'.length))
  } else if (asked === 'stats') {
    const pets = Number((await $.store.get('pets')) ?? 0)
    const feeds = Number((await $.store.get('feeds')) ?? 0)
    return { text: statsText(pets, feeds) }
  } else if (asked === 'box') {
    // List every record as last saved by any session
    const saved = await $.store.get('stats')
    if (saved && typeof saved === 'object') await freshen($, Object.keys(saved))
    const healed = Object.keys(S.stats).filter((name) => name !== S.mon && settleHeal(name))
    if (healed.length > 0) await saveRecords($, healed)
    const dex = await $.store.get('dex')
    return { text: boxText(dex && typeof dex === 'object' ? dex : {}) }
  } else if (asked === 'party') {
    return { text: await partyText($) }
  } else if (asked.startsWith('party assign') || asked.startsWith('party unassign')) {
    const [, verb, ...rest] = asked.split(/\s+/)
    return assignCommand($, verb, rest)
  } else if (asked.startsWith('party add') || asked.startsWith('party remove')) {
    const [, verb, ...rest] = asked.split(/\s+/)
    return partyCommand($, verb, rest.join(' '))
  } else if (asked === 'dex' || asked.startsWith('dex ')) {
    const saved = await $.store.get('stats')
    if (saved && typeof saved === 'object') await freshen($, Object.keys(saved))
    const dex = await $.store.get('dex')
    return { text: dexText(dex && typeof dex === 'object' ? dex : {}, asked.slice('dex'.length).trim(), await $.store.get('graveyard'), S.wildGens) }
  } else if (asked === 'release' || asked.startsWith('release ')) {
    const wanted = asked.slice('release'.length).trim()
    if (MONS.includes(wanted)) await freshen($, [wanted])
    // The shown mon starts over, so a foe it faced leaves
    if (wanted === S.mon && S.stats[wanted] && S.wild) fleeWild($)
    const result = releaseCommand(wanted)
    if (MONS.includes(wanted)) await saveRecords($, [wanted])
    $.ui.invalidate('ui.render')
    return result
  } else if (asked === 'nickname' || asked.startsWith('nickname ')) {
    await freshen($, [S.mon])
    const result = nicknameCommand(e.args.trim().slice('nickname'.length))
    await saveRecords($, [S.mon])
    $.ui.invalidate('ui.render')
    return result
  } else if (asked === 'list') {
    return { text: t.monList(MONS.length, MONS) }
  } else if (asked === 'help') {
    return { text: helpText((await $.store.get('debug')) === true) }
  } else if (asked) {
    return { text: t.unknownOption(asked, options()) }
  } else {
    if (isGone(S.mon)) return { text: t.goneOptions(goneLine(S.mon), options()) }
    const condition = conditionOf(S.mon)
    const mode = (condition ? ', ' + t.condition(condition) : '') + (isTuckedIn() ? t.modeAsleep : '') + (S.wander ? t.modeWandering : '') + (isHere(S.wild) ? t.modeWild(wildName()) : '')
    const levels = t.levels(Math.round(statNow(S.mon, 'food')), Math.round(statNow(S.mon, 'happiness')))
    return { text: t.showing(S.variant, nameOf(S.mon), levelOf(S.mon), mode, S.needsOn ? levels : t.needsOffShort, options()) }
  }
  $.ui.invalidate('ui.render')
  return { text: t.nowShowing(S.variant, nameOf(S.mon)) }

}

// The plugin's options, from its userConfig: language is auto, en, or fr
export function register(on, settings = {}) {
  on('session.start', async ($, e, next) => {
    S.sessionToken = Math.random().toString(36).slice(2)
    S.lang = await chosenLanguage($, settings.language)
    await $.command.register({
      name: 'pokemon',
      description: t.commandDescription,
      argumentHint: '[' + options().join('|') + ']',
      immediate: true,
    })
    await loadCustom($).catch((err) => logOnce($, err))
    const savedMon = await $.store.get('mon')
    if (MONS.includes(savedMon)) S.mon = savedMon
    S.seenPick = savedMon ?? null
    S.syncOn = (await $.store.get('sync')) === true
    S.nuzlockeOn = (await $.store.get('nuzlocke')) === true
    S.trainerOn = (await $.store.get('trainer')) !== false
    S.wildGens = wildGensOf(await $.store.get('gens'))
    await loadPartyPicks($)
    forgetOldKeys($).catch((err) => logOnce($, err))
    const savedVariant = await $.store.get('variant')
    if (VARIANTS.includes(savedVariant)) S.variant = savedVariant
    S.wander = (await $.store.get('wander')) !== false
    S.needsOn = (await $.store.get('needs')) !== false
    S.emojiOn = (await $.store.get('emoji')) === true
    const savedSize = await $.store.get('size')
    if (Object.hasOwn(SIZES, savedSize)) S.size = savedSize
    const savedImages = await $.store.get('images')
    if (Object.hasOwn(IMAGE_MODES, savedImages)) S.imageMode = savedImages
    S.autoEvolve = (await $.store.get('autoEvolve')) !== false
    S.paneOn = (await $.store.get('pane')) === true
    S.paneShown = false
    if (S.paneOn) openPane($, await $.store.get('paneColumns')).catch((err) => logOnce($, err))
    const savedStats = await $.store.get('stats')
    if (savedStats && typeof savedStats === 'object') S.stats = savedStats
    await sexRecords($).catch((err) => logOnce($, err))
    await refreshPlates($).catch((err) => logOnce($, err))
    S.nowMs = await $.clock.now()
    S.firstShown.set(S.mon, S.nowMs)
    S.ink = await themeInk($)
    // A refused env read leaves the band as it is on any other terminal
    const unread = () => undefined
    S.knownImages = drawsImages({
      program: await $.env.get('TERM_PROGRAM').catch(unread),
      version: await $.env.get('TERM_PROGRAM_VERSION').catch(unread),
      term: await $.env.get('TERM').catch(unread),
      kittyWindow: await $.env.get('KITTY_WINDOW_ID').catch(unread),
      bundle: await $.env.get('__CFBundleIdentifier').catch(unread),
    })
    applyImageMode()
    await beat($).catch((err) => logOnce($, err))
    // Shown again, a parked mon's meters pick up where they stopped
    if (S.stats[S.mon]?.parked && !isGone(S.mon)) {
      unpark(S.mon)
      await saveStats($, [S.mon]).catch((err) => logOnce($, err))
    }
    await evolveIfReady($).catch((err) => logOnce($, err))
    // The mon last picked ran away or was lost, so the session starts with the next one
    if (isGone(S.mon)) await leaveBand($).catch((err) => logOnce($, err))
    await checkNeglect($).catch((err) => logOnce($, err))
    $.clock.every(TICK_MS, () => {
      try {
        stepDown($)
        step()
        stepEvolution($)
        stepWildPhase($)
        stepCrewMons()
        stepWake($)
        stepOwed($)
        // The band grows and shrinks back around a Transform
        if (bandRows() !== S.drawnRows) {
          S.drawnRows = bandRows()
          $.ui.invalidate('ui.render')
        }
        // The strip grows and shrinks back around a wild mon's visit
        if (S.bandId !== null && stripTarget(S.lastBodyColumns) !== S.drawnColumns) {
          S.drawnColumns = stripTarget(S.lastBodyColumns)
          $.ui.invalidate('ui.render')
        }
        if (S.tick % STAT_REDRAW_TICKS === 0) resyncMeters($).catch((err) => logOnce($, err))
        if (S.tick % SYNC_TICKS === 0) syncSessions($).catch((err) => logOnce($, err))
        if (S.tick % PARTY_SYNC_TICKS === 0) syncParty($).catch((err) => logOnce($, err))
        if (S.tick % BEAT_TICKS === 0) beat($).then(() => checkNeglect($)).catch((err) => logOnce($, err))
        if (S.bandId !== null && S.bandSurface === 'terminal') blitFrame($)
        if (S.bandId !== null && S.bandSurface === 'desktop' && S.tick % DESKTOP_FRAME_TICKS === 0) redrawSvg($)
      } catch (err) {
        logOnce($, err)
      }
    })
    return next(e)
  })

  // Speak the language Claude Code's language setting changes to, unless the option picks one
  on('config.set', { key: 'language' }, async ($, e, next) => {
    const result = await next(e)
    if (!Object.hasOwn(LOCALES, settings.language) && typeof result?.value === 'string') {
      S.lang = languageOf(result.value)
      $.ui.invalidate('ui.render')
    }
    return result
  })

  // Follow the theme, so the bubble and the Zs stay visible on its background
  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    if (result?.value !== undefined) {
      S.ink = inkFor(result.value)
      $.ui.invalidate('ui.render')
    }
    return result
  })

  // Typing or sending a prompt wakes the mon up and answers its "!"
  on('prompt.edit', async ($, e, next) => {
    markActive()
    clearAlert()
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    markActive()
    clearAlert()
    return next(e)
  })

  // Read what the turn is doing from the spinner, and draw the spinner as usual
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    S.thinking = e.props.mode === 'thinking'
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    S.turnRunning = true
    return next(e)
  })

  // The main agent's turn ending answers any "!" and starts the idle minute. The mon
  // hops unless the turn was interrupted, and earns XP when it answered. A subagent's
  // turn ending sends its party mon back and pops its Poké Ball.
  on('turn.complete', async ($, e, next) => {
    S.thinking = false
    markActive()
    const worker = e.agentId ? S.crew.find((m) => m.id === e.agentId)?.mon : null
    if (e.agentId) endAgent(e.agentId)
    if (!e.agentId) {
      S.turnRunning = false
      clearAlert()
    }
    if (!e.agentId && !e.isAborted) {
      S.hopStart = S.tick
      S.idleAlertAt = S.tick + IDLE_WAIT_MS / TICK_MS
      S.wild = chargedWild(S.wild)
    }
    // A foe left uncaught for WILD_TURNS main turns moves on
    if (!e.agentId && S.wild?.phase === 'battle') {
      S.wild = { ...S.wild, turns: S.wild.turns + 1 }
      if (S.wild.turns >= WILD_TURNS) {
        const bite = partingBite(S.wild)
        fleeWild($)
        // Before gainXp, which would otherwise save over the bite with the record it read
        await biteMon($, bite).catch((err) => logOnce($, err))
      }
    }
    if (!e.agentId && e.reason === 'answer') {
      await gainXp($, e.durationMs ?? 0).catch((err) => logOnce($, err))
      await maybeFindCandy($, e.durationMs ?? 0).catch((err) => logOnce($, err))
    }
    if (worker && e.reason === 'answer') await partyXp($, worker, e.durationMs ?? 0).catch((err) => logOnce($, err))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const desktop = e.surface === 'desktop'
    if ((e.surface !== 'terminal' && !desktop) || e.props.hasSurvey) {
      if (!S.paneShown) S.bandId = null
      return next(e)
    }
    if (S.working !== e.props.isWorking) {
      S.working = e.props.isWorking
      // The pane hears of a turn through the band, so it draws again with it
      if (S.paneShown) $.ui.invalidate('ui.render')
    }
    if (!S.working) S.thinking = false
    if (S.paneShown) return next(e)
    const elements = $.ui.resolve(e)
    const corner = drawScene(elements, e, { maxRows: e.props.maxRows, bodyColumns: e.props.bodyColumns, buttons: battleButtons($, elements) })
    const { Box } = $.ui.resolve(e)
    const theirs = await next(e)
    return Box({
      flexDirection: 'row',
      justifyContent: theirs ? 'space-between' : 'flex-end',
      children: theirs ? [Box({ flexGrow: 1, children: [theirs] }), ...corner] : corner,
    })
  })

  // Docked, the pane runs floor to ceiling, so the scene sits at its foot by the prompt
  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const wasShown = S.paneShown
    S.paneShown = true
    // The band stops drawing the scene once the pane does
    if (!wasShown) $.ui.invalidate('ui.render')
    const elements = $.ui.resolve(e)
    const { Box } = elements
    const corner = drawScene(elements, e, { maxRows: e.props.scroll.bodyRows, bodyColumns: e.props.bodyColumns, buttons: battleButtons($, elements) })
    const docked = e.props.placement === 'dock'
    return Box({
      flexDirection: 'column',
      justifyContent: 'flex-end',
      height: docked ? e.props.scroll.bodyRows : undefined,
      children: [Box({ flexDirection: 'row', justifyContent: 'flex-end', children: corner })],
    })
  })

  // Closed by hand, the scene goes back to the band and stays there
  on('ui.close', async ($, e, next) => {
    const result = await next(e)
    if (e.id !== PANE_ID) return result
    leavePane($)
    if (e.origin === 'person') {
      S.paneOn = false
      await $.store.set('pane', false)
    }
    return result
  })

  // Show the main loop's running tools in the bubble, and any agent's running skill as
  // a TM disc, and call you over while one asks you something. A call resolving also
  // settles a dialog waiting on its tool.
  // A call that errors or throws makes the mon flinch, unless you interrupted it or
  // it was refused: by the permission check, at its dialog, or by a hook beneath.
  on('tool.call', async ($, e, next) => {
    const name = String(e.tool)
    let id = null
    S.toolCalls += 1
    const skillId = name === 'Skill' ? (e.tool_use_id ?? S.toolCalls) : null
    if (skillId !== null) S.runningSkills.add(skillId)
    // A subagent's call shows in its party mon's bubble
    const crewCall = e.agentId && S.crew.some((m) => m.id === e.agentId) ? (e.tool_use_id ?? S.toolCalls) : null
    if (crewCall !== null) S.crew = crewToolStarts(S.crew, e.agentId, crewCall, name)
    if (!e.agentId) {
      await maybeSpawn($).catch((err) => logOnce($, err))
      id = e.tool_use_id ?? S.toolCalls
      S.runningTools.set(id, name)
      if (QUESTION_TOOLS.includes(name)) raiseAlert({ tool: name })
    }
    let failed = true
    try {
      const result = await next(e)
      failed = result?.isError === true && !REFUSED.test(String(result.text ?? ''))
      return result
    } finally {
      S.wild = chargedWild(S.wild)
      if (skillId !== null) S.runningSkills.delete(skillId)
      if (crewCall !== null) {
        S.crew = crewToolEnds(S.crew, e.agentId, crewCall, failed && !next.signal?.aborted && S.verdicts.get(crewCall) !== 'deny', S.tick)
        S.verdicts.delete(crewCall)
      }
      if (id !== null) {
        S.runningTools.delete(id)
        if (failed && !next.signal?.aborted && S.verdicts.get(id) !== 'deny') flinch()
        S.verdicts.delete(id)
      }
      S.alertTools.delete(name)
    }
  })

  // A skill you type as /name runs as a command, with no Skill call, and a forked one
  // also spawns no agent, so the command running is the only sign of it. A command from
  // your own files, a plugin, or an MCP server counts as a skill; Claude Code's built-in
  // commands, and /pokemon itself, don't. The disc shows for a moment.
  on('command.run', async ($, e, next) => {
    if (e.command === 'pokemon') return runPokemon($, e)
    await markSkillCommand($, e.command).catch((err) => logOnce($, err))
    return next(e)
  })

  // The typings say a skill's prompt expanding raises this, for /name, the Skill tool,
  // and a preload into a subagent. In practice no session raises it yet, so the hooks
  // above carry the disc, and this one is ready for when it does.
  on('skill.prompt', async ($, e, next) => {
    S.discUntil = S.tick + DISC_TICKS
    return next(e)
  })

  // Note what the permission check decides for the main loop's calls, so a call it
  // denies isn't taken for a tool failing
  on('tool.check', async ($, e, next) => {
    const result = await next(e)
    const crewCall = S.crew.some((m) => m.tools.some((t) => t.call === e.tool_use_id))
    if (e.tool_use_id !== undefined && (S.runningTools.has(e.tool_use_id) || crewCall)) S.verdicts.set(e.tool_use_id, result?.decision)
    return result
  })

  // Call you over while a permission dialog waits, until the call it holds resolves.
  // A hook that decides the request opens no dialog.
  on('classic.PermissionRequest', async ($, e, next) => {
    const result = await next(e)
    if (!result?.decision) raiseAlert({ tool: e.tool_name })
    return result
  })

  // Call you over when Claude needs you. The permission reminder comes 6 s into a
  // dialog PermissionRequest already flagged, so it raises nothing while that alert is up.
  // The idle reminder has its own timer above, since a policy plugin can keep classic
  // events from reaching user plugins.
  on('classic.Notification', async ($, e, next) => {
    const type = e.notification_type
    const reminder = type === 'permission_prompt' && S.alertTools.size > 0
    if (ALERT_NOTIFICATIONS.includes(type) && !reminder) raiseAlert({ ticks: Infinity })
    return next(e)
  })

  // Each subagent the Agent tool starts is a Poké Ball in the party along the left of
  // the strip, until its turn ends or the agent list stops reporting it at work, and the
  // next mon from the box waits in it to step out
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result?.agentId) {
      S.party = joinParty(S.party, result.agentId, S.tick)
      await joinCrewFor($, result.agentId, e.subagentType).catch((err) => logOnce($, err))
    }
    return result
  })

  // A subagent's model thinking shows as dots in its party mon's bubble, until it writes,
  // calls a tool, or stops
  on('turn.step', async function* ($, e, next) {
    const stream = next(e)
    try {
      while (true) {
        const { value, done } = await stream.next()
        if (done) return value
        if (e.agentId && THOUGHT_KINDS.has(value?.kind)) S.crew = crewThinking(S.crew, e.agentId, value.kind === 'thinking')
        yield value
      }
    } finally {
      if (e.agentId) S.crew = crewThinking(S.crew, e.agentId, false)
    }
  })
}
