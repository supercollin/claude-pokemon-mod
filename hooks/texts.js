import { BUNDLED_GENS, dexKey, dexNumber, dexOf, GENS, genOf, isCaught, NATIONAL_DEX, tierOf } from './dex.js'
import { MAX_LEVEL, xpAt } from './levels.js'
import { t } from './i18n.js'
import { itemFor, itemName } from './items.js'
import { iconsFor, statNow } from './meters.js'
import { displayName } from './names.js'
import { conditionOf, downReply, fullNameOf, goneLine, levelOf, nameOf, ownEvolutionsOf, readyToEvolve, xpOf } from './records.js'
import { MONS } from './sprites.js'
import { S } from './state.js'
import { hasRunAway, isDead, isFainted, isGone } from './status.js'

// The replies that tell you things: stats, the box, the Pokédex, and help

// How one entry evolves the mon, like "Jolteon with a Thunder Stone" or "Steelix by trade
// holding a Metal Coat"
export function evolutionText(entry) {
  const into = displayName(entry.into)
  const item = entry.item ? itemName(itemFor(entry)) : null
  if (entry.happy) return t.evolveHappy(into, entry.time)
  if (entry.fed) return t.evolveFed(into)
  if (entry.with) return t.evolveWith(into, displayName(entry.with))
  if (entry.more) return t.evolveMore(into, entry.level, entry.more)
  if (entry.trade && item) return t.evolveTradeHolding(into, item)
  if (item) return t.evolveItem(into, item, entry.time)
  return entry.trade ? t.evolveTrade(into) : t.evolveLevel(into, entry.level)
}

// Every way a mon evolves, like "Vileplume with a Leaf Stone or Bellossom with a Sun Stone".
// The ones left to chance at a level read as one, like "Silcoon or Cascoon at Lv. 7, by
// chance", and as plain "Wobbuffet at Lv. 15" when every pick shows as the same mon.
export function evolutionsText(entries) {
  const texts = []
  for (const entry of entries) {
    if (!entry.pick) texts.push(evolutionText(entry))
    else if (entries.find((other) => other.pick && other.level === entry.level) === entry) {
      const names = [...new Set(entries.filter((other) => other.pick && other.level === entry.level).map((other) => displayName(other.into)))]
      texts.push(t.evolvePick(names, entry.level, names.length > 1))
    }
  }
  return t.or(texts)
}

// Like "Pikachu, Lv. 12, 1820 XP (377 to Lv. 13). Can become Raichu with a Thunder Stone.
// Food 50%, happiness 67%. 12 pets, 5 feeds."
export function statsText(pets, feeds) {
  if (isGone(S.mon)) return goneLine(S.mon) + t.picksAnother
  const level = levelOf(S.mon)
  const next = level < MAX_LEVEL ? t.toNext(xpAt(level + 1) - xpOf(S.mon), level + 1) : ''
  const evolutions = ownEvolutionsOf(S.mon)
  const ready = readyToEvolve()
  let becomes = ''
  if (ready) becomes = t.readyLine(displayName(ready))
  else if (evolutions.length > 0) becomes = t.canBecomeLine(evolutionsText(evolutions))
  const plate = S.stats[S.mon]?.plate
  const holds = plate ? t.holds(itemName(plate)) : ''
  const meters = S.needsOn ? t.meters(Math.round(statNow(S.mon, 'food')), Math.round(statNow(S.mon, 'happiness'))) : t.needsOff
  const state = isFainted(S.mon) ? ' ' + downReply().text : ''
  return t.statsHead(fullNameOf(S.mon), level, xpOf(S.mon), next) + becomes + holds + meters + state + t.careCounts(pets, feeds)
}

// Every mon with a saved record, one a line, like "Charizard ◓, Lv. 36 ●●●○○ ♥♥♥♡♡ (active)",
// highest level first, where ◓ marks a mon caught in the wild. A record caught since carries
// caught, and one saved before that counts as caught when its species is in the dex.
export function boxText(dex = {}) {
  const raised = Object.keys(S.stats).filter((name) => MONS.includes(name) && S.stats[name] && typeof S.stats[name] === 'object' && !isDead(name))
  if (raised.length === 0) return t.boxEmpty(displayName(S.mon))
  const caught = (name) => Boolean(S.stats[name].caught || isCaught(dex[dexKey(name)]))
  raised.sort((a, b) => levelOf(b) - levelOf(a) || displayName(a).localeCompare(displayName(b)) || a.localeCompare(b))
  const lines = raised.map((name) => {
    const meters = S.needsOn && !hasRunAway(name) ? ' ' + iconsFor('food', name).trimEnd() + ' ' + iconsFor('happiness', name).trimEnd() : ''
    const condition = conditionOf(name)
    const tags = [name === S.mon && !hasRunAway(name) ? t.active : null, condition ? t.condition(condition) : null].filter(Boolean)
    return t.boxLine(fullNameOf(name), caught(name), levelOf(name), meters, tags)
  })
  const alone = raised.length === 1 && raised[0] === S.mon ? t.onlySoFar(nameOf(S.mon)) : ''
  return t.boxList(t.mons(raised.length), lines, alone)
}

const dexLabel = (key) => '#' + String(dexNumber(key)).padStart(3, '0') + ' ' + displayName(key)

// † marks a species lost for good until a new one is caught, and a mon that ran away says so
const LOST_MARK = ' †'
function dexMark(key) {
  const own = Object.keys(S.stats).filter((name) => dexKey(name) === key)
  if (own.some(isDead)) return LOST_MARK
  return own.some(hasRunAway) ? t.ranAwayMark : ''
}

// The graveyard as saved, a list of { mon, level, nickname?, at }, like
// "Rest well: Spoon (Abra), Lv. 35, on 2026-10-10."
function graveyardText(graveyard) {
  if (!Array.isArray(graveyard) || graveyard.length === 0) return ''
  const lines = graveyard.map((g) => t.graveLine(g.nickname ? g.nickname + ' (' + displayName(g.mon) + ')' : displayName(g.mon), g.level, new Date(g.at).toISOString().slice(0, 10)))
  return t.graveyard(lines)
}

// The Pokédex as saved, { [dexKey]: { seen, caught?, shiny? } }, where shiny marks a shiny
// catch. The whole dex is a count, the caught mons in dex order, and the ones only seen.
// One mon is its number, tier, and status. The count is of the generations in the wild,
// gens, and mons met stay listed once their generation is off.
export function dexText(dex, wanted, graveyard, gens = BUNDLED_GENS) {
  const entries = NATIONAL_DEX.filter((key) => dex[key] && typeof dex[key] === 'object')
  if (wanted) {
    if (!MONS.includes(wanted) && !NATIONAL_DEX.includes(wanted)) return t.unknownMonList(wanted)
    const key = dexKey(wanted)
    if (!NATIONAL_DEX.includes(key)) return t.notInDex(displayName(wanted), GENS)
    const entry = entries.includes(key) ? dex[key] : null
    const gen = genOf(key)
    const tier = t.tier(tierOf(key))
    if (!entry && !gens.includes(gen)) return t.dexOff(dexLabel(key), tier, gen)
    let status = t.dexUnseen
    if (isCaught(entry)) status = t.dexCaught(entry.shiny)
    else if (entry) status = t.dexSeen
    const mark = dexMark(key)
    let lost = ''
    if (mark === LOST_MARK) lost = t.dexLost
    else if (mark) lost = t.dexRanAway
    return t.dexEntry(dexLabel(key), tier, status, lost)
  }
  const caught = entries.filter((key) => isCaught(dex[key]))
  const seen = entries.filter((key) => !isCaught(dex[key]))
  const shiny = caught.filter((key) => dex[key].shiny).length
  const head = t.dexHead(entries.length, caught.length, dexOf(gens).length, shiny)
  const rest = graveyardText(graveyard)
  if (entries.length === 0) return head + t.dexNone + rest
  const lines = caught.map((key) => dexLabel(key) + ' ◓' + (dex[key].shiny ? ' ✦' : '') + dexMark(key))
  if (seen.length > 0) lines.push(t.dexSeenList(seen.map((key) => displayName(key) + dexMark(key))))
  return head + '\n' + lines.join('\n') + rest
}

// Every option by the command it stands for, in groups for /pokemon help, each line's usage
// and what it does in the band's language. A setting's second field reads its current value.
export const HELP = [
  ['pick', [['<mon>'], ['default'], ['shiny'], ['new'], ['list']]],
  ['care', [['pet'], ['feed'], ['sleep'], ['revive'], ['nickname']]],
  ['battle', [['attack'], ['moves'], ['catch'], ['roar']]],
  ['evolve', [['evolve'], ['stop']]],
  ['items', [['bag'], ['use'], ['take']]],
  ['records', [['stats'], ['box'], ['party'], ['dex'], ['release']]],
  ['settings', [
    ['wander', () => t.onOff(S.wander)],
    ['needs', () => t.onOff(S.needsOn)],
    ['emoji', () => t.onOff(S.emojiOn)],
    ['size', () => t.sizeName(S.size)],
    ['images', () => t.imageMode(S.imageMode)],
    ['pane', () => t.onOff(S.paneOn)],
    ['sync', () => t.onOff(S.syncOn)],
    ['autoevolve', () => t.onOff(S.autoEvolve)],
    ['nuzlocke', () => t.onOff(S.nuzlockeOn)],
    ['trainer', () => t.onOff(S.trainerOn)],
    ['gen', () => t.gensValue(S.wildGens)],
  ]],
]
// The hidden debug options, at the top of /pokemon help only while debug is on
const DEBUG_HELP = ['debug', [['wild'], ['kill']]]

// A setting shows its value ahead of what it does, so the values line up in a column
export function helpText(debug) {
  const groups = debug ? [DEBUG_HELP, ...HELP] : HELP
  const width = Math.max(...[DEBUG_HELP, ...HELP].flatMap(([, rows]) => rows.map(([command]) => t.help[command][0].length))) + 2
  const lines = groups.map(([group, rows]) => t.helpGroups[group] + '\n' + rows.map(([command, value]) => '  ' + t.help[command][0].padEnd(width) + (value ? value().padEnd(7) : '') + t.help[command][1]).join('\n'))
  return t.usage + '\n\n' + lines.join('\n\n') + t.helpNames
}
