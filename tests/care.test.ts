import { expect } from 'claude-code/testing'
import { keptEyesOf } from '../hooks/eyes.js'
import { DIZZY_COLORS, faintedPalette, faintedRows } from '../hooks/faint.js'
import { SPRITES } from '../hooks/frames.js'
import { atCenter, CENTER_ROWS, centerPhase, centerSpan, centerStamps, JOY_COLORS, recallFlash, recallTint } from '../hooks/joy.js'
import { test, BAND, paints, HOUR, startedWith, shown, ANSWERED, toastsOf, inBattle, weaken, catchFoe, MINUTE, working, run } from './helpers.ts'

// Each cell painting one of colors, as cell index and color, joined to compare frames
function cellsIn(cells: string, colors: number[]): string {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  return Array.from(words).flatMap((w, i) => (i % 3 !== 0 && colors.includes(w) ? [Math.floor(i / 3) + ':' + w] : [])).join(',')
}

const EMPTY = { value: 0, at: 0 }
const FAINTED = 'Abra has fainted. /pokemon revive takes it to a Pokémon Center.'

// The mock clock runs at most 10000 waits per advance, so minutes of ticks and beats go
// in steps of three minutes
async function advanceMinutes(clock, minutes: number) {
  for (let left = minutes; left > 0; left -= 3) await clock.advance(Math.min(left, 3) * MINUTE)
}

test('a mon faints after three hours of open time at empty meters, and closed time and a session\'s first ten minutes don\'t count', { timeoutMs: 60000 }, async ($, on) => {
  const toasts = toastsOf(on)
  // A minute short of three hours at empty meters, then four hours with Claude Code closed
  const saved: Record<string, any> = { stats: { abra: { food: EMPTY, happiness: EMPTY, starving: { ms: 3 * HOUR - MINUTE, at: 0 } } }, seenAt: 0 }
  const { clock } = await startedWith($, on, saved, 4 * HOUR)
  await advanceMinutes(clock, 9)
  expect(await run($, '')).not.toContain('fainted')
  expect(saved.stats.abra.starving.ms).toBe(3 * HOUR - MINUTE)
  await advanceMinutes(clock, 3)
  expect(await run($, '')).toMatch(/^Showing default Abra Lv\. 5, fainted, /)
  expect(toasts).toContain('Abra fainted! /pokemon revive takes it to a Pokémon Center.')
  // It faints a minute past the grace, so the runaway clock has counted the rest
  expect(saved.stats.abra.fainted).toEqual({ ms: expect.any(Number), at: expect.any(Number) })
  expect(saved.stats.abra.fainted.ms).toBeLessThanOrEqual(2 * MINUTE)
  expect(saved.stats.abra.starving).toBeUndefined()
})

test('feeding a mon at empty meters resets its faint clock', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { food: EMPTY, happiness: EMPTY, starving: { ms: 2 * HOUR, at: 0 } } } }
  const { clock } = await startedWith($, on, saved, 0)
  await run($, 'feed')
  await clock.advance(150 * 40 + 2000)
  expect(saved.stats.abra.starving).toEqual({ ms: 2 * HOUR, at: expect.any(Number) })
  await clock.advance(10 * 1000)
  expect(saved.stats.abra.starving).toBeUndefined()
  expect(await run($, '')).toContain('food 20%, happiness 5%')
})

test('a fainted mon lies still in its fainted colors, earns no XP, and pet, feed, attack, sleep, evolve, catch, and wild wait for a revive', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const saved: Record<string, any> = { debug: true, stats: { abra: { xp: 900, food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 } } } }
  const { clock, blits } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  for (const args of ['pet', 'feed', 'attack', 'attack confusion', 'sleep', 'evolve', 'catch', 'wild pidgey']) expect(await run($, args)).toBe(FAINTED)
  expect(await run($, 'attack list')).toMatch(/^Abra knows /)
  expect(await run($, 'stats')).toContain(' ' + FAINTED + ' ')
  await $.turn.complete(ANSWERED)
  expect(saved.stats.abra.xp).toBe(900)
  const cells = await shown(ui, blits)
  const fainted = faintedPalette(SPRITES.abra.variants.default.palette).map((hex) => parseInt(hex.slice(1), 16))
  expect(fainted.some((c) => paints(cells, c))).toBe(true)
  // It holds still while dizzy stars circle over it, so only the stars move
  const sent = blits.length
  await clock.advance(5000)
  const later = blits.slice(sent)
  expect(later.some((frame) => paints(frame, DIZZY_COLORS.y))).toBe(true)
  expect(later.some((frame) => frame !== cells)).toBe(true)
  expect(later.every((frame) => cellsIn(frame, fainted) === cellsIn(cells, fainted))).toBe(true)
})

test('a fainted mon keeps every row of its sprite, and the band grows to fit the stars over its head', async ($, on) => {
  const rows = SPRITES.snorlax.variants.default.idle[0].rows
  const fainted = faintedRows(rows, SPRITES.snorlax.variants.default.palette, keptEyesOf('snorlax', 'default', 'idle', 0).boxes)
  const opaque = (frame: string[]) => frame.map((row) => /[^.]/.test(row))
  expect(opaque(fainted)).toEqual(opaque(rows))
  expect(fainted).not.toEqual(rows)
  const saved: Record<string, any> = { mon: 'snorlax' }
  const { clock } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  const standing = (await ui.find({ key: 'pokemon' })).props.rows
  saved.stats = { snorlax: { food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 } } }
  await clock.advance(2000)
  expect((await ui.find({ key: 'pokemon' })).props.rows).toBeGreaterThan(standing)
})

test('a wild mon flees when the shown mon faints, here or in another session', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, toasts } = await inBattle($, on, saved)
  saved.stats = { abra: { food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 } } }
  await clock.advance(2000)
  expect(toasts).toContain('Abra fainted! /pokemon revive takes it to a Pokémon Center.')
  expect(toasts).toContain('Wild Pidgey fled!')
})

test('a heal started in another session during this one\'s gap keeps its five minutes', { timeoutMs: 60000 }, async ($, on) => {
  // This session last beat three hours ago, and another one has been open since, took Abra
  // to the Pokémon Center two minutes ago, and marked the store seen moments ago
  const healing = { from: 3 * HOUR - 2 * MINUTE, until: 3 * HOUR + 3 * MINUTE }
  const saved: Record<string, any> = { stats: { abra: { food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 }, healing } }, seenAt: 3 * HOUR - 5000 }
  await startedWith($, on, saved, 3 * HOUR)
  expect(saved.stats.abra.healing).toEqual(healing)
  expect(await run($, 'revive')).toBe('Abra is resting at the Pokémon Center. It\'s back in 3 min.')
})

test('time off only moves a heal on by the part of the gap it ran through', async ($, on) => {
  // Claude Code was closed for four hours, and the heal was set an hour before it closed
  const healing = { from: HOUR, until: HOUR + 5 * MINUTE }
  const saved: Record<string, any> = { stats: { abra: { food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 }, healing } }, seenAt: HOUR + MINUTE }
  await startedWith($, on, saved, 5 * HOUR + MINUTE)
  const off = 4 * HOUR - 10 * 1000
  expect(saved.stats.abra.healing).toEqual({ from: HOUR + off, until: HOUR + 5 * MINUTE + off })
  expect(await run($, 'revive')).toBe('Abra is resting at the Pokémon Center. It\'s back in 4 min.')
})

test('/pokemon revive heals a fainted mon in five minutes, filling its hearts on the way, and stands it up at half food and full happiness', { timeoutMs: 60000 }, async ($, on) => {
  const toasts = toastsOf(on)
  const saved: Record<string, any> = { stats: { abra: { food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 } }, pikachu: { xp: 1000, parked: true } } }
  const { clock } = await startedWith($, on, saved, 0)
  const resting = 'Abra is resting at the Pokémon Center. It\'s back in 5 min.'
  expect(await run($, 'revive pikachu')).toBe('Pikachu hasn\'t fainted.')
  expect(await run($, 'revive')).toBe('You take Abra to a Pokémon Center. It\'ll be back on its feet in 5 minutes.')
  expect(saved.stats.abra.healing).toEqual({ from: 0, until: 5 * MINUTE })
  expect(await run($, 'revive')).toBe(resting)
  expect(await run($, 'feed')).toBe(resting)
  expect(await run($, 'pikachu')).toBe(resting + ' Wait for it before switching.')
  expect(await run($, 'new mudkip')).toBe(resting + ' Wait for it before switching.')
  expect(await run($, 'abra')).toBe('Now showing default Abra.')
  expect(await run($, '')).toContain('Abra Lv. 5, healing, ')
  await clock.advance(2.5 * MINUTE)
  expect(await run($, '')).toContain('happiness 50%')
  await clock.advance(2.5 * MINUTE + 1000)
  expect(toasts).toContain('Abra is healed and back on its feet!')
  expect(await run($, '')).toContain('food 50%, happiness 100%')
  expect(saved.stats.abra.fainted).toBeUndefined()
  expect(saved.stats.abra.healing).toBeUndefined()
  expect(await run($, 'revive')).toBe('Abra hasn\'t fainted.')
  expect(await run($, 'pikachu')).toBe('Now showing default Pikachu.')
})

test('a revive takes the mon into its ball, shows Nurse Joy at her counter while the machine flashes, and ends with her bow', () => {
  const heal = { startTick: 0, endTick: 2000 }
  const where = { ground: 23, right: 39 }
  const phases = Array.from({ length: heal.endTick + 10 }, (_, t) => centerPhase(heal, t)?.phase ?? null)
  expect([...new Set(phases)]).toEqual(['recall', 'heal', 'bow', null])
  // It turns red, then goes in with a flash before the counter shows
  const recall = phases.lastIndexOf('recall')
  expect(recallTint(heal, 1)).toBeGreaterThan(0)
  expect(recallTint(heal, recall)).toBe(1)
  expect(recallFlash(heal, recall)).not.toBeNull()
  expect(centerStamps(heal, recall, where)).toEqual([])
  // At the counter, everything stands on the ground inside the strip, and the ball lights up with the chimes
  const shown = phases.indexOf('heal') + 40
  const stamps = centerStamps(heal, shown, where)
  expect(atCenter(heal, shown)).toBe(true)
  expect(Math.max(...stamps.map((s) => s.y + s.rows.length - 1))).toBe(where.ground)
  expect(Math.max(...stamps.map((s) => s.x + s.rows[0].length - 1))).toBe(where.right)
  expect(Math.min(...stamps.map((s) => s.x))).toBe(where.right - centerSpan() + 1)
  const ball = (t: number) => centerStamps(heal, t, where)[0].colors.R
  expect(new Set(Array.from({ length: 64 }, (_, k) => ball(shown + k))).size).toBe(2)
  // She bows with her eyes closed, a pixel lower
  const joy = (t: number) => centerStamps(heal, t, where)[1]
  const bowing = joy(phases.indexOf('bow') + 12)
  expect(bowing.rows[0]).toMatch(/^\.+$/)
  expect(bowing.rows).not.toEqual(joy(shown).rows)
  expect(centerStamps(heal, heal.endTick, where)).toEqual([])
})

test('Nurse Joy comes to heal a fainted mon and is gone once it\'s back on its feet', { timeoutMs: 60000 }, async ($, on) => {
  const saved: Record<string, any> = { wander: false, stats: { abra: { food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 } } } }
  const { clock, blits } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), JOY_COLORS.P)).toBe(false)
  await run($, 'revive')
  await clock.advance(5000)
  expect(paints(await shown(ui, blits), JOY_COLORS.P)).toBe(true)
  await clock.advance(5 * MINUTE)
  expect(paints(await shown(ui, blits), JOY_COLORS.P)).toBe(false)
})

test('a big mon goes to the Pokémon Center whole, with the band tall enough for the counter, and comes back out', { timeoutMs: 60000 }, async ($, on) => {
  const saved: Record<string, any> = { mon: 'snorlax', stats: { snorlax: { food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 } } } }
  const { clock, blits } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  // Its colors but black, which Joy's eyes and the ball share
  const own = SPRITES.snorlax.variants.default.palette.map((hex) => parseInt(hex.slice(1), 16)).filter((c) => c !== 0)
  const before = (await ui.find({ key: 'pokemon' })).props.rows
  await run($, 'revive')
  await clock.advance(5000)
  const cells = await shown(ui, blits)
  expect(paints(cells, JOY_COLORS.P)).toBe(true)
  expect(own.some((c) => paints(cells, c))).toBe(false)
  expect((await ui.find({ key: 'pokemon' })).props.rows).toBeGreaterThanOrEqual(Math.min(before, CENTER_ROWS))
  await clock.advance(5 * MINUTE)
  const back = await shown(ui, blits)
  expect(own.some((c) => paints(back, c))).toBe(true)
  // Back on its feet, it no longer needs room for the stars
  expect((await ui.find({ key: 'pokemon' })).props.rows).toBeLessThan(before)
})

test('/pokemon needs off stops the faint clock, and turning it back on doesn\'t revive a fainted mon', { timeoutMs: 60000 }, async ($, on) => {
  const saved: Record<string, any> = {
    needs: false,
    stats: { abra: { food: EMPTY, happiness: EMPTY, starving: { ms: 3 * HOUR - MINUTE, at: HOUR } }, pidgey: { fainted: { ms: 0, at: 0 }, parked: true } },
  }
  const { clock } = await startedWith($, on, saved, HOUR)
  await advanceMinutes(clock, 12)
  expect(await run($, '')).not.toContain('fainted')
  expect(saved.stats.abra.starving.ms).toBe(3 * HOUR - MINUTE)
  await run($, 'pidgey')
  expect(await run($, 'needs')).toBe('Needs are on. Keep Pidgey fed and happy. It\'s still fainted, so /pokemon revive takes it to a Pokémon Center.')
  expect(await run($, '')).toContain('Pidgey Lv. 5, fainted, ')
})

test('a mon left fainted for a day of open time runs away, and the band shows the next mon in the box', { timeoutMs: 60000 }, async ($, on) => {
  const toasts = toastsOf(on)
  const abra = { xp: 35 ** 3, nickname: 'Spoon', sex: 'female', food: EMPTY, happiness: EMPTY, fainted: { ms: 24 * HOUR - MINUTE, at: 0 } }
  const saved: Record<string, any> = { stats: { abra, pikachu: { xp: 10 ** 3, parked: true } }, seenAt: 0 }
  const { clock } = await startedWith($, on, saved, 4 * HOUR)
  await advanceMinutes(clock, 12)
  expect(toasts).toContain('Spoon ran away! It may turn up in the wild. Pikachu takes its place.')
  expect(saved.mon).toBe('pikachu')
  expect(saved.stats.abra).toEqual({
    xp: 35 ** 3, nickname: 'Spoon', sex: 'female', food: expect.any(Object), happiness: expect.any(Object), ranAway: { at: expect.any(Number), variant: 'default' }, parked: true,
  })
  expect(await run($, 'abra')).toBe('Spoon ran away. It may turn up in the wild.')
  expect(await run($, 'box')).toBe('2 mons in your box:\nSpoon (Abra ♀), Lv. 35 (ran away)\nPikachu ♂, Lv. 10 ●●●●○ ♥♥♥♥♡ (active)')
})

test('with no other mon in the box, the band says the mon ran away', async ($, on) => {
  await startedWith($, on, { stats: { abra: { xp: 35 ** 3, ranAway: { at: 0, variant: 'default' } } } }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ key: 'pokemon' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'Abra ran away. It may turn up in the wild.' })).toBeDefined()
  expect(await run($, 'feed')).toBe('Abra ran away. It may turn up in the wild. /pokemon <mon> picks another.')
})

test('a mon that ran away in another session leaves this band too', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { xp: 900 }, pikachu: { xp: 1000, parked: true } } }
  const { clock } = await startedWith($, on, saved, 0)
  saved.stats = { ...saved.stats, abra: { xp: 900, ranAway: { at: 0, variant: 'default' }, parked: true } }
  await clock.advance(2000)
  expect(await run($, '')).toMatch(/^Showing default Pikachu /)
})

test('a mon that ran away is the first wild mon half an hour on, and catching it brings its record back', { timeoutMs: 120000 }, async ($, on) => {
  const abra = { xp: 35 ** 3, nickname: 'Spoon', sex: 'female', parked: true, ranAway: { at: HOUR - 31 * MINUTE, variant: 'default' } }
  const saved: Record<string, any> = { mon: 'pikachu', wildAt: { at: HOUR - MINUTE, by: 'other' }, stats: { pikachu: { xp: 10 ** 3 }, abra } }
  const { clock, toasts, read } = await working($, on, saved)
  await read()
  await clock.advance(30000)
  await read()
  await clock.advance(10000)
  expect(toasts).toContain('A wild Abra ♀ (Lv. 35) appeared! It looks a lot like Spoon.')
  expect(saved.stats.abra.ranAway.met).toBe(true)
  const weak = 'Wild Abra is weak! Throw a ball with /pokemon catch. Another hit could knock it out.'
  for (let k = 0; k < 12 && !toasts.includes(weak); k++) {
    await read()
    await clock.advance(9000)
  }
  expect(toasts).toContain(weak)
  // Weak, it still breaks free most of the time
  await catchFoe($, clock, toasts, 40)
  expect(toasts).toContain('Gotcha! Spoon came back to you.')
  expect(saved.stats.abra).toEqual({ xp: 35 ** 3, nickname: 'Spoon', sex: 'female', parked: true, food: { value: 50, at: expect.any(Number) }, happiness: { value: 30, at: expect.any(Number) } })
  expect(saved.dex.abra.caught).toEqual(expect.any(Number))
})

test('/pokemon nuzlocke makes a faint final: the mon is lost, marked † in the dex, and its species locked', async ($, on) => {
  const toasts = toastsOf(on)
  const abra = { xp: 35 ** 3, nickname: 'Spoon', food: EMPTY, happiness: EMPTY, fainted: { ms: 0, at: 0 } }
  const saved: Record<string, any> = { stats: { abra }, dex: { abra: { seen: 1, caught: 2 } } }
  const { clock } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await run($, 'nuzlocke')).toBe(
    'Nuzlocke is on. A mon that faints is gone for good, with no revive and no coming back. Keep them fed and happy. Spoon has fainted already, so it\'s gone for good in a moment.',
  )
  expect(saved.nuzlocke).toBe(true)
  await clock.advance(11000)
  expect(toasts).toContain('Spoon fainted for good. Rest well.')
  expect(saved.stats.abra).toEqual({ dead: { at: expect.any(Number) } })
  expect(saved.graveyard).toEqual([{ mon: 'abra', level: 35, nickname: 'Spoon', at: expect.any(Number) }])
  expect(await ui.find({ type: 'Text', text: 'Abra fainted for good. Rest well.' })).toBeDefined()
  expect(await run($, 'abra')).toBe('Abra is gone. Catch a new one in the wild to raise it again.')
  expect(await run($, 'revive')).toBe('Abra fainted for good. Rest well. /pokemon <mon> picks another.')
  expect(await run($, 'dex')).toBe('Pokédex: seen 1, caught 1 of 151.\n#063 Abra ◓ †\nRest well: Spoon (Abra), Lv. 35, on 1970-01-01.')
  expect(await run($, 'release abra')).toBe('Abra isn\'t in your box.')
  expect(await run($, 'nuzlocke')).toBe('Nuzlocke is off. A mon that faints can be revived again. The ones you lost stay gone.')
  expect(await run($, 'abra')).toBe('Abra is gone. Catch a new one in the wild to raise it again.')
})

test('with nuzlocke on, a mon is lost where it would faint, and the band shows the next one', { timeoutMs: 60000 }, async ($, on) => {
  const toasts = toastsOf(on)
  const abra = { food: EMPTY, happiness: EMPTY, starving: { ms: 3 * HOUR - MINUTE, at: 0 } }
  const saved: Record<string, any> = { nuzlocke: true, stats: { abra, pikachu: { xp: 10 ** 3, parked: true } }, seenAt: 0 }
  const { clock } = await startedWith($, on, saved, 4 * HOUR)
  await advanceMinutes(clock, 12)
  expect(toasts).toContain('Abra fainted for good. Rest well. Pikachu takes its place.')
  expect(saved.stats.abra).toEqual({ dead: { at: expect.any(Number) } })
  expect(saved.mon).toBe('pikachu')
  expect(await run($, 'box')).toBe('1 mon in your box:\nPikachu ♂, Lv. 10 ●●●●○ ♥♥♥♥♡ (active)\nOnly Pikachu so far. /pokemon <mon> picks another.')
})

test('trainer mode is on by default: an existing box keeps its mons, and only they and fetched mons can be shown', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { xp: 10 ** 3 }, pidgey: { xp: 5 ** 3, caught: true, parked: true } }, 'custom:torchic': { gen: 3, sprite: SPRITES.diglett, moves: ['Ember'] } }
  await startedWith($, on, saved, 0)
  const boxOnly = (mon: string) => 'Trainer mode is on, so you can only switch to mons in your box. Catch a wild ' + mon + ' to raise one, or turn trainer mode off with /pokemon trainer.'
  expect(await run($, 'vulpix')).toBe(boxOnly('Vulpix'))
  expect(await run($, 'squirtle')).toBe(boxOnly('Squirtle'))
  expect(await run($, 'pidgey')).toBe('Now showing default Pidgey.')
  expect(await run($, 'abra')).toBe('Now showing default Abra.')
  expect(await run($, 'torchic')).toBe('Now showing default Torchic.')
  expect(await run($, 'trainer')).toBe('Trainer mode is off. /pokemon <mon> shows any mon.')
  expect(saved.trainer).toBe(false)
  expect(await run($, 'vulpix')).toBe('Now showing default Vulpix.')
  expect(await run($, 'trainer')).toBe('Trainer mode is on. You can only switch to mons in your box, so catch the rest in the wild. Mons fetched with /pokemon new stay free to show.')
})

test('in trainer mode an empty box picks one starter, and picks again once every mon in it is gone', async ($, on) => {
  const saved: Record<string, any> = {}
  await startedWith($, on, saved, 0)
  await run($, 'trainer')
  expect(await run($, 'trainer')).toBe('Trainer mode is on. Pick your starter, Bulbasaur, Charmander, Squirtle, or Pikachu, then catch the rest in the wild. Mons fetched with /pokemon new stay free to show.')
  expect(await run($, 'vulpix')).toBe('Trainer mode is on, so pick your starter first: Bulbasaur, Charmander, Squirtle, or Pikachu. Catch the rest in the wild, or turn trainer mode off with /pokemon trainer.')
  expect(await run($, 'squirtle')).toBe('Now showing default Squirtle.')
  expect(saved.stats.squirtle).toEqual({ xp: 5 ** 3, sex: expect.stringMatching(/^(male|female)$/) })
  expect(await run($, 'charmander')).toBe('Trainer mode is on, so you can only switch to mons in your box. Catch a wild Charmander to raise one, or turn trainer mode off with /pokemon trainer.')
  saved.stats = { squirtle: { dead: { at: 0 } } }
  expect(await run($, 'bulbasaur')).toBe('Now showing default Bulbasaur.')
})

test('a species lost in a nuzlocke comes back only by catching a new one, at its first level', async ($, on) => {
  const saved: Record<string, any> = { nuzlocke: true, stats: { pidgey: { dead: { at: 0 } } }, graveyard: [{ mon: 'pidgey', level: 30, at: 0 }], dex: { pidgey: { seen: 0, caught: 0 } } }
  const { clock, toasts } = await inBattle($, on, saved)
  expect(await run($, 'pidgey')).toBe('Pidgey is gone. Catch a new one in the wild to raise it again.')
  expect(await run($, 'dex')).toBe('Pokédex: seen 1, caught 1 of 151.\n#016 Pidgey ◓ †\nRest well: Pidgey, Lv. 30, on 1970-01-01.')
  await weaken($, clock, toasts)
  await catchFoe($, clock, toasts)
  expect(toasts).toContain('Gotcha! Pidgey was caught! It joined your box.')
  expect(saved.stats.pidgey).toEqual({ xp: 5 ** 3, caught: true, sex: 'male', parked: true })
  expect(await run($, 'dex')).toBe('Pokédex: seen 1, caught 1 of 151.\n#016 Pidgey ◓\nRest well: Pidgey, Lv. 30, on 1970-01-01.')
  expect(await run($, 'pidgey')).toBe('Now showing default Pidgey.')
})
