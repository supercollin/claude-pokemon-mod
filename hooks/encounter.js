import { aimsAhead } from './attacks.js'
import { FALLBACK_MOVES } from './commands.js'
import { dexKey, tierOf, TIERS } from './dex.js'
import { withSexMark } from './genders.js'
import { bandRows, foeMiddle } from './layout.js'
import { startAttack } from './motion.js'
import { MOVE_FX, movesOf } from './moves.js'
import { t } from './i18n.js'
import { displayName, moveName } from './names.js'
import { BALL } from './party.js'
import { levelOf, nameOf, sexOf } from './records.js'
import { VARIANTS } from './sprites.js'
import { S } from './state.js'
import { thrownWild } from './wild.js'

// The wild mon on show, kept as data in wild.js, as the home mon faces it: its name, the
// moves that reach it, the ball thrown at it, and a mon that ran away coming back as one

export const wildName = () => t.wildName(withSexMark(displayName(S.wild.mon), S.wild.sex), S.wild.variant === 'shiny')

// Throw a ball at the foe in battle. It falls from the foe's middle to the ground.
export function catchCommand() {
  if (S.wild?.phase !== 'battle' && S.wild?.phase !== 'throw') return { text: t.noWild }
  if (S.attack || S.wild.phase === 'throw') return { text: t.waitMove }
  const rows = bandRows()
  const drop = Math.max(0, rows * 2 - BALL.length - (foeMiddle(rows).y - Math.floor(BALL.length / 2)))
  S.wild = thrownWild(S.wild, S.tick, drop)
  return { text: t.threwBall }
}

// Roar at the foe, which turns tail when the roar lands. Every mon can, whatever its moves.
export function roarCommand() {
  if (!S.wild || S.wild.phase === 'fleeing' || S.wild.phase === 'fainted') return { text: t.noWild }
  if (S.wild.phase === 'throw') return { text: t.waitBall }
  if (S.attack) return { text: t.waitMove }
  startAttack({ name: 'Roar', ...MOVE_FX.Roar }, { foe: true })
  return { text: t.used(nameOf(S.mon), moveName('Roar')) }
}

// The moves that can reach a foe in front of the mon. One that scares it off waits to
// be asked for by name.
export function foeMoves() {
  const moves = movesOf(S.mon).filter((move) => aimsAhead(move) && !move.scares)
  return moves.length > 0 ? moves : FALLBACK_MOVES
}

// The foe's own moves that reach the home mon
export function wildMoves() {
  const moves = movesOf(S.wild.mon).filter(aimsAhead)
  return moves.length > 0 ? moves : FALLBACK_MOVES
}

// A mon that ran away turns up again at its own level and variant, a tier harder and
// harder still to hold in a ball
const TIER_ORDER = Object.keys(TIERS)
const RUNAWAY_CATCH = 0.5

export function runawayFoe(name) {
  const tier = TIER_ORDER[Math.min(TIER_ORDER.length - 1, TIER_ORDER.indexOf(tierOf(name)) + 1)]
  const variant = VARIANTS.includes(S.stats[name].ranAway.variant) ? S.stats[name].ranAway.variant : 'default'
  return { mon: name, sex: sexOf(name), variant, key: dexKey(name), tier, level: levelOf(name), runaway: true, catchScale: RUNAWAY_CATCH }
}
