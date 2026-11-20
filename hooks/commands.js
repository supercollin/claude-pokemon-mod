import { aimsAhead } from './attacks.js'
import { foeMoves } from './encounter.js'
import { startAttack } from './motion.js'
import { movesOf } from './moves.js'
import { plain, t } from './i18n.js'
import { displayName, moveName } from './names.js'
import { downReply, nameOf } from './records.js'
import { MONS } from './sprites.js'
import { S } from './state.js'
import { isDead, isDown, isPetted } from './status.js'

// The /pokemon options that need nothing from the engine, and which options wait while
// the mon evolves, eats, or enjoys a pet

// Petting, feeding, sleeping, attacking, roaring, releasing, using an item, and switching mons wait while it evolves
const WAITS_FOR_EVOLUTION = ['pet', 'feed', 'sleep', 'attack', 'release', 'catch', 'roar', 'run', 'new', 'use']
// While it eats a berry or enjoys a pet, only the commands that just show something run,
// so nothing changes the record the berry or pet is about to fill
const SHOWS_ONLY = ['', 'list', 'help', 'stats', 'box', 'party', 'moves', 'dex', 'bag']
export const waitsForCare = (asked) => (S.food !== null || isPetted()) && !SHOWS_ONLY.includes(asked.split(' ')[0]) && asked !== 'attack list'

export const evolvingReply = () => ({ text: t.evolvingWait(nameOf(S.mon)) })
export const careReply = () => ({ text: t.care(nameOf(S.mon), Boolean(S.food)) })

// What stops the mon fighting now, as the command's reply, or null when it's free
export function battleWait() {
  if (S.evolving !== null) return evolvingReply()
  if (S.food !== null || isPetted()) return careReply()
  if (isDown()) return downReply()
  return null
}

export const waitsForEvolution = (asked) => S.evolving !== null && (MONS.includes(asked) || WAITS_FOR_EVOLUTION.includes(asked.split(' ')[0]))

// Drop a mon's record from the box, so it starts over at its first level with fresh
// meters. The active mon stays on screen and starts over in place.
export function releaseCommand(wanted) {
  if (!wanted) return { text: t.nameRelease(S.mon) }
  if (!MONS.includes(wanted)) return { text: t.unknownMonBox(wanted) }
  if (!S.stats[wanted] || isDead(wanted)) return { text: t.notInBox(displayName(wanted)) }
  const name = nameOf(wanted)
  delete S.stats[wanted]
  if (wanted !== S.mon) return { text: t.released(name) }
  S.evolveDue = null
  return { text: t.releasedShown(name, displayName(S.mon)) }
}

const NICKNAME_MAX = 12

// Name the active mon. Its species name, as in the games, takes the nickname away.
export function nicknameCommand(wanted) {
  const species = displayName(S.mon)
  const nickname = wanted.replace(/\p{C}/gu, '').replace(/\s+/g, ' ').trim()
  if (!nickname) {
    const now = S.stats[S.mon]?.nickname ? t.goesBy(species, S.stats[S.mon].nickname) : ''
    return { text: now + t.nameIt(NICKNAME_MAX) }
  }
  if ([...nickname].length > NICKNAME_MAX) return { text: t.tooLong(NICKNAME_MAX) }
  const old = S.stats[S.mon]?.nickname
  if (moveKey(nickname) === moveKey(species) || moveKey(nickname) === moveKey(S.mon)) {
    if (!old) return { text: t.noNickname(species) }
    // A sex alone isn't a mon raised, so a record with nothing else goes
    const { nickname: _, ...rest } = S.stats[S.mon]
    if (Object.keys(rest).some((key) => key !== 'sex')) S.stats[S.mon] = rest
    else delete S.stats[S.mon]
    return { text: t.justAgain(old, species) }
  }
  S.stats[S.mon] = { ...S.stats[S.mon], nickname }
  return { text: t.nowNamed(old ?? species, nickname) }
}

export const FALLBACK_MOVES = [{ name: 'Tackle', effect: 'tackle' }]
export const moveKey = (name) => name.toLowerCase().replace(/[\s\-_'.]/g, '')

// Whether a move is the one asked for, by its English or French name
const isMoveNamed = (name, asked) => moveKey(name) === moveKey(asked) || plain(moveName(name, 'fr')) === plain(asked)

// A mon's moves, like "Pikachu knows Thunderbolt, Quick Attack, Thunder, Agility."
export function movesText(name) {
  const known = movesOf(name)
  const moves = known.length > 0 ? known : FALLBACK_MOVES
  return { text: t.knows(nameOf(name), moves.map((m) => moveName(m.name))) }
}

// Play a random move, or the one named, and announce it. "list" lists the moves instead.
export function attackCommand(wanted) {
  const name = nameOf(S.mon)
  if (wanted === 'list') return movesText(S.mon)
  if (S.attack) return { text: t.stillAttacking(name) }
  if (S.food) return { text: t.busyEating(name) }
  const known = movesOf(S.mon)
  const moves = known.length > 0 ? known : FALLBACK_MOVES
  // Facing a foe, a random move is one that reaches it, and any such move is aimed at it
  const battle = S.wild?.phase === 'battle'
  const pool = battle && !wanted ? foeMoves() : moves
  const move = wanted ? moves.find((m) => isMoveNamed(m.name, wanted)) : pool[Math.floor(Math.random() * pool.length)]
  if (!move) return { text: t.doesntKnow(name, wanted, moves.map((m) => moveName(m.name))) }
  startAttack(move, { foe: battle && aimsAhead(move) })
  const text = move.text ? t.moveText(move.name, move.text) : ''
  return { text: t.used(name, moveName(move.name)) + (text ? '\n' + text : '') }
}
