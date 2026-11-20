import { TICK_MS } from './constants.js'
import { evolutionsOf, isLevelUpOnly, levelEvolutionOf, startLevel } from './evolutions.js'
import { femaleEighthsOf, fixedSexOf, sexFor, withSexMark } from './genders.js'
import { levelAt, MAX_LEVEL, xpAt } from './levels.js'
import { t } from './i18n.js'
import { displayName } from './names.js'
import { S } from './state.js'
import { hasRunAway, isDead, isDown, isFainted, isGone, isHealing } from './status.js'

// A mon's record as this session reads it: its name, XP, and level, what its level lets
// it evolve into, and whether it has fainted, is healing, or is gone

// A nickname lives in the mon's record too, so it follows the mon through evolution
export const nameOf = (name) => S.stats[name]?.nickname ?? displayName(name)

// A mon's sex as its record keeps it, or the one its sprite pins down when the record
// has none yet, or null
export const sexOf = (name) => S.stats[name]?.sex ?? fixedSexOf(name)

// A record without a sex yet gets one for good: the one its sprite pins down, or one drawn
// by its species' share of females. A genderless mon's record stays as it is, and so does
// a lost mon's, which only marks the species lost.
export const lacksSex = (name, record) => Boolean(record) && typeof record === 'object' && !record.sex && !record.dead && femaleEighthsOf(name) !== null

export const sexedRecord = (name, record, random = Math.random) => (lacksSex(name, record) ? { ...record, sex: sexFor(name, random) } : record)

// The ways a mon can evolve for its sex: a female Kirlia has no Gallade, and a Kirlia not
// raised yet, with no sex, neither
export const ownEvolutionsOf = (name) => evolutionsOf(name, sexOf(name))

// Like "Sparky (Pikachu ♀)", or just "Pikachu ♀" without a nickname
export function fullNameOf(name) {
  const species = withSexMark(displayName(name), sexOf(name))
  return S.stats[name]?.nickname ? S.stats[name].nickname + ' (' + species + ')' : species
}

// XP lives in each mon's record. A mon that hasn't earned any starts at its first level.
export const xpOf = (name) => S.stats[name]?.xp ?? xpAt(startLevel(name))
export const levelOf = (name) => levelAt(xpOf(name))

// The level line above the meters, at most five columns wide
export const levelLine = () => t.bandLevel(levelOf(S.mon), levelOf(S.mon) >= MAX_LEVEL)

// The mon its level lets it become, or a level-up by the meters or the clock did, while it
// isn't evolving already
export function readyToEvolve() {
  if (S.evolving || isDown()) return null
  const evolution = levelEvolutionOf(S.mon, sexOf(S.mon))
  if (evolution && levelOf(S.mon) >= evolution.level) return evolution.into
  const reached = S.stats[S.mon]?.readyFor
  return ownEvolutionsOf(S.mon).some((entry) => isLevelUpOnly(entry) && entry.into === reached) ? reached : null
}

export const HEAL_MS = 5 * 60 * 1000
const REVIVED = { food: 50, happiness: 30 }
// A heal at the Pokémon Center fills the hearts all the way
export const HEALED_HAPPINESS = 100

export const revivedMeters = () => ({ food: { value: REVIVED.food, at: S.nowMs }, happiness: { value: REVIVED.happiness, at: S.nowMs } })

export const conditionOf = (name) => (hasRunAway(name) ? 'ran away' : isHealing(name) ? 'healing' : isFainted(name) ? 'fainted' : null)

export const goneLine = (name) => (isDead(name) ? t.goneForGood(displayName(name)) : t.ranAwayLine(nameOf(name)))

// What a command the shown mon can't do while it's down says instead
export function downReply() {
  const name = nameOf(S.mon)
  if (isGone(S.mon)) return { text: goneLine(S.mon) + t.picksAnother }
  if (isHealing(S.mon)) {
    const minutes = Math.max(1, Math.ceil((S.stats[S.mon].healing.until - S.nowMs) / 60000))
    return { text: t.resting(name, minutes) }
  }
  return { text: t.hasFainted(name) }
}

// The heal in this session's ticks, from its saved times, so a session started midway
// joins it where it's at
export function healTicks() {
  const { from, until } = S.stats[S.mon].healing
  const start = Math.min(from ?? until - HEAL_MS, until)
  return { startTick: S.tick - Math.max(0, Math.round((S.nowMs - start) / TICK_MS)), endTick: S.tick + Math.round((until - S.nowMs) / TICK_MS) }
}

// A heal that's over stands the mon up with half its food, full happiness, and a fresh faint clock
export function settleHeal(name) {
  if (!isHealing(name) || S.nowMs < S.stats[name].healing.until) return false
  const { fainted, healing, starving, ...record } = S.stats[name]
  S.stats[name] = { ...record, ...revivedMeters(), happiness: { value: HEALED_HAPPINESS, at: S.nowMs } }
  return true
}

export const healingReply = () => ({ text: downReply().text + t.waitSwitch })
