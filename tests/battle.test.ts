import { expect } from 'claude-code/testing'
import { SPRITES } from '../hooks/frames.js'
import { test, BAND, RASTER, paints, svgOf, HOUR, startedWith, ANSWERED, toastsOf, inBattle, weaken, catchFoe, MINUTE, APPEARED, working, run } from './helpers.ts'

// The raster columns painting a color, in a raster width columns wide
function columnsIn(cells: string, width: number, color: number): number[] {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  const columns: number[] = []
  for (let i = 0; i < words.length; i += 3) {
    if (words[i + 1] === color || words[i + 2] === color) columns.push((i / 3) % width)
  }
  return columns
}

// A color of the foe's palette that the home mon's lacks
function foeColor(home: string, foe: string, variant = 'default'): number {
  const own = new Set(SPRITES[home].variants.default.palette.map((hex) => hex.toLowerCase()))
  const hex = SPRITES[foe].variants[variant].palette.find((c) => !own.has(c.toLowerCase()))
  return parseInt(hex.slice(1), 16)
}

test('/pokemon wild spawns a mon only with debug on and a band it fits in', async ($, on) => {
  const saved: Record<string, any> = { wander: false }
  await startedWith($, on, saved, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('wild pidgey')).toMatch(/^Unknown option "wild pidgey"\. /)
  saved.debug = true
  // No band drawn yet, so no battle fits
  expect(await run('wild pidgey')).toBe('The band is too narrow for a wild Pidgey. Widen the pane and try again.')
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await run('wild agumon')).toBe('Unknown mon "agumon". See /pokemon list for every mon.')
  expect(await run('wild pidgey')).toBe('A wild Pidgey is on its way.')
  expect(await run('wild rattata')).toBe('A wild Pidgey is already here.')
})

test('/pokemon kill faints the shown mon only with debug on, and loses it under nuzlocke', async ($, on) => {
  const toasts = toastsOf(on)
  const saved: Record<string, any> = { wander: false, stats: { abra: { nickname: 'Spoon' }, pidgey: {} } }
  await startedWith($, on, saved, 0)
  expect(await run($, 'kill')).toMatch(/^Unknown option "kill"\. /)
  saved.debug = true
  expect(await run($, 'kill')).toBe('Spoon fainted.')
  expect(toasts).toContain('Spoon fainted! /pokemon revive takes it to a Pokémon Center.')
  expect(saved.stats.abra.fainted).toEqual({ ms: 0, at: expect.any(Number) })
  expect(await run($, 'kill')).toBe('Spoon has fainted. /pokemon revive takes it to a Pokémon Center.')
  await run($, 'pidgey')
  await run($, 'nuzlocke')
  expect(await run($, 'kill')).toBe('Pidgey fainted for good.')
  expect(saved.stats.pidgey).toEqual({ dead: { at: expect.any(Number) } })
})

test('a wild mon walks in from the left, the strip widens to fit it, and the dex marks it seen', async ($, on) => {
  const toasts = toastsOf(on)
  const saved: Record<string, any> = { wander: false, debug: true }
  const { clock, blits, widths } = await startedWith($, on, saved, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  const seen = blits.length
  await $.command.run({ command: 'pokemon', args: 'wild pidgeot male' })
  await clock.advance(10000)

  const color = foeColor('abra', 'pidgeot')
  const frames = blits.map((cells, i) => ({ cells, width: widths[i] })).slice(seen)
  const showing = frames.filter((f) => columnsIn(f.cells, f.width, color).length > 0)
  expect(showing.length).toBeGreaterThan(0)
  // Pidgeot is too wide to share 40 columns with Abra
  expect(showing.every((f) => f.width > RASTER)).toBe(true)
  // It first shows at the scene's left edge, and stands further right once it arrives
  const first = columnsIn(showing[0].cells, showing[0].width, color)
  const last = columnsIn(showing[showing.length - 1].cells, showing[showing.length - 1].width, color)
  expect(Math.min(...first)).toBe(0)
  expect(Math.max(...first)).toBeLessThan(4)
  expect(Math.min(...last)).toBeGreaterThan(0)

  expect(toasts).toEqual(['A wild Pidgeot ♂ (Lv. 36) appeared!'])
  expect(saved.dex).toEqual({ pidgeot: { seen: expect.any(Number) } })
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain(', a wild Pidgeot ♂ is here (')
})

test('a wild mon flees after four minutes without a fight, and the strip shrinks back', { timeoutMs: 60000 }, async ($, on) => {
  const toasts = toastsOf(on)
  const { clock, widths } = await startedWith($, on, { wander: false, debug: true }, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.command.run({ command: 'pokemon', args: 'wild pidgeot male' })
  await clock.advance(10000)
  expect(widths[widths.length - 1]).toBeGreaterThan(RASTER)
  // Keep Abra awake meanwhile, since a sleeping mon sends the foe off too
  for (let k = 0; k < 4; k++) {
    await $.command.run({ command: 'pokemon', args: 'stats' })
    await clock.advance(60 * 1000)
  }
  await clock.advance(10000)
  // Its own strikes don't count as a fight
  expect(toasts.filter((text) => !/^Wild Pidgeot used .+!$/.test(text))).toEqual(['A wild Pidgeot ♂ (Lv. 36) appeared!', 'Wild Pidgeot fled!'])
  expect(widths[widths.length - 1]).toBe(RASTER)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).not.toContain('wild')
})

test('/pokemon roar scares the wild mon off once the roar lands, and the strip shrinks back', async ($, on) => {
  const toasts = toastsOf(on)
  const { clock, widths } = await startedWith($, on, { wander: false, debug: true }, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  // The foe's own strikes aside
  const heard = () => toasts.filter((text) => !/^Wild Pidgeot used .+!$/.test(text))
  expect(await run('roar')).toBe('There\'s no wild Pokémon here.')
  await run('wild pidgeot male')
  await clock.advance(10000)
  expect(await run('roar')).toBe('Abra used Roar!')
  expect(await run('roar')).toBe('Wait for the move to end.')
  // Abra is still rearing back, so the foe stands its ground
  await clock.advance(1000)
  expect(heard()).toEqual(['A wild Pidgeot ♂ (Lv. 36) appeared!'])
  await clock.advance(500)
  expect(heard()).toEqual(['A wild Pidgeot ♂ (Lv. 36) appeared!', 'Wild Pidgeot fled!'])
  expect(await run('roar')).toBe('There\'s no wild Pokémon here.')
  await clock.advance(10000)
  expect(widths[widths.length - 1]).toBe(RASTER)
})

test('/pokemon run roars the wild mon off too', async ($, on) => {
  const { clock, toasts } = await inBattle($, on, {})
  expect((await $.command.run({ command: 'pokemon', args: 'run' })).text).toBe('Abra used Roar!')
  await clock.advance(1500)
  expect(toasts).toContain('Wild Pidgey fled!')
})

test('a roar waits for a thrown ball to settle', async ($, on) => {
  const { clock, toasts } = await inBattle($, on, {})
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('catch')).toBe('You threw a Poké Ball!')
  expect(await run('roar')).toBe('Wait for the ball to settle.')
  await clock.advance(1500)
  expect(toasts).not.toContain('Wild Pidgey fled!')
})

test('a Growlithe asked for its own Roar scares the foe off without a hit, and never picks Roar itself', async ($, on) => {
  const { clock, toasts } = await inBattle($, on, { mon: 'growlithe' })
  // Banked work spends on moves that hurt
  for (let k = 0; k < 3; k++) {
    await $.tool.call({ tool: 'Read', file_path: '/work/a.ts' })
    await clock.advance(9000)
  }
  expect(movesIn(toasts).length).toBeGreaterThan(0)
  expect(movesIn(toasts)).not.toContain('Growlithe used Roar!')
  expect((await $.command.run({ command: 'pokemon', args: 'attack roar' })).text).toBe('Growlithe used Roar!')
  await clock.advance(1500)
  expect(toasts[toasts.length - 1]).toBe('Wild Pidgey fled!')
})

test('a wild mon leaves when the shown mon goes to sleep', async ($, on) => {
  const toasts = toastsOf(on)
  const { clock } = await startedWith($, on, { wander: false, debug: true }, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.command.run({ command: 'pokemon', args: 'wild pidgey male' })
  await clock.advance(10000)
  await $.command.run({ command: 'pokemon', args: 'sleep' })
  await clock.advance(100)
  expect(toasts).toEqual(['A wild Pidgey ♂ (Lv. 5) appeared!', 'Wild Pidgey fled!'])
})

test('the widest battles fit the desktop Svg in its size limit', { timeoutMs: 60000 }, async ($, on) => {
  const { clock } = await startedWith($, on, { trainer: false, wander: false, debug: true }, 0)
  const widest = ['gyarados', 'pidgeot', 'fearow', 'dragonair']
  for (const home of widest) {
    for (const foe of widest) {
      await $.command.run({ command: 'pokemon', args: home })
      const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
      expect((await $.command.run({ command: 'pokemon', args: 'wild ' + foe + ' shiny' })).text).toBe('A wild ' + foe.charAt(0).toUpperCase() + foe.slice(1) + ' is on its way.')
      await clock.advance(10000)
      const svg = await ui.find({ type: 'Svg' })
      expect(svg.props.alt).toBe(home.charAt(0).toUpperCase() + home.slice(1) + ' vs. wild ' + foe.charAt(0).toUpperCase() + foe.slice(1))
      expect(svgOf(svg).length).toBeLessThan(131072)
      await $.command.run({ command: 'pokemon', args: 'run' })
      await clock.advance(10000)
      await ui.unmount()
    }
  }
})

const HP_GREEN = 0x48c858

// The home mon's moves, leaving out the foe's
const movesIn = (toasts: string[]) => toasts.filter((text) => / used .+!$/.test(text) && !text.startsWith('Wild '))

test('work during a battle fires a move at the foe, and the hit shrinks its HP bar', async ($, on) => {
  const { clock, blits, widths, toasts } = await inBattle($, on, {})
  const green = () => columnsIn(blits[blits.length - 1], widths[widths.length - 1], HP_GREEN).length
  // Pidgey's head is 13 pixels wide, so the bar takes 13 to sit in its middle
  expect(green()).toBe(13)
  await $.tool.call({ tool: 'Read', file_path: '/work/a.ts' })
  await clock.advance(100)
  // Teleport would leave the foe behind, so Confusion is the move that reaches it
  expect(movesIn(toasts)).toEqual(['Abra used Confusion!'])
  await clock.advance(5000)
  expect(green()).toBeLessThan(13)
})

// The raster as pixel rows, a color or null per pixel, two to a half block cell
function rasterPixels(cells: string, width: number): (number | null)[][] {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  const rows: (number | null)[][] = []
  const shown = (c: number) => (c === 0x01000000 ? null : c)
  for (let i = 0; i < words.length; i += 3) {
    const [code, fg, bg] = [words[i], words[i + 1], words[i + 2]]
    const cell = i / 3
    const [cx, cy] = [cell % width, Math.floor(cell / width)]
    const [top, bottom] = code === 0x2580 ? [fg, bg] : code === 0x2584 ? [bg, fg] : [bg, bg]
    rows[cy * 2] ??= []
    rows[cy * 2 + 1] ??= []
    rows[cy * 2][cx] = shown(top)
    rows[cy * 2 + 1][cx] = shown(bottom)
  }
  return rows
}

// Both foes' heads keep their columns across their idle frames, so whichever frame shows,
// the bar's middle and the head's land on the same pixel
for (const foe of ['snorlax', 'raichu']) {
  test(`the HP bar sits centred over a wild ${foe}'s head`, async ($, on) => {
    const { blits, widths } = await inBattle($, on, {}, foe)
    const pixels = rasterPixels(blits[blits.length - 1], widths[widths.length - 1])
    const barRow = pixels.findIndex((row) => row.includes(HP_GREEN))
    const bar = pixels[barRow].flatMap((c, x) => (c === HP_GREEN ? [x] : []))
    // The head is the foe's top 8 rows, from wherever its idle bob puts them, the scene's
    // leftmost run of painted columns, well clear of the home mon
    const top = pixels.findIndex((row, y) => y > barRow && row.some((c) => c !== null))
    const painted = new Set(pixels.slice(top, top + 8).flatMap((row) => row.flatMap((c, x) => (c === null ? [] : [x]))))
    let [left, right] = [Math.min(...painted), Math.min(...painted)]
    while (painted.has(right + 1) || painted.has(right + 2)) right += painted.has(right + 1) ? 1 : 2
    expect(bar[0] + bar[bar.length - 1]).toBe(left + right)
  })
}

// A caught species shows a tiny ball a pixel right of its HP bar, red on top
const OWNED_RED = 0xe03030
const ownedBallAt = (cells: string, width: number) => {
  const pixels = rasterPixels(cells, width)
  const barRow = pixels.findIndex((row) => row.includes(HP_GREEN))
  const right = pixels[barRow].lastIndexOf(HP_GREEN)
  return pixels[barRow - 1]?.[right + 2] === OWNED_RED
}

test('a wild foe already caught in the Pokédex has a ball beside its HP bar', async ($, on) => {
  const { blits, widths } = await inBattle($, on, { dex: { pidgey: { seen: 0, caught: 0 } } })
  expect(ownedBallAt(blits[blits.length - 1], widths[widths.length - 1])).toBe(true)
})

test('a wild foe only seen in the Pokédex has no ball beside its HP bar', async ($, on) => {
  const { blits, widths } = await inBattle($, on, { dex: { pidgey: { seen: 0 } } })
  expect(ownedBallAt(blits[blits.length - 1], widths[widths.length - 1])).toBe(false)
})

test('banked work fires one move at a time, at most one every six seconds', async ($, on) => {
  // A common Pidgey can turn weak after one strong hit, and the mon holds off a weak foe
  const { clock, toasts } = await inBattle($, on, {}, 'pidgeotto male')
  for (let k = 0; k < 3; k++) await $.tool.call({ tool: 'Read', file_path: '/work/a.ts' })
  await clock.advance(100)
  expect(movesIn(toasts).length).toBe(1)
  await clock.advance(5800)
  expect(movesIn(toasts).length).toBe(1)
  // A strike from the foe can put the next move off a little
  for (let k = 0; k < 8 && movesIn(toasts).length < 2; k++) await clock.advance(1000)
  expect(movesIn(toasts).length).toBe(2)
  // Work banks two moves at most
  await clock.advance(20000)
  expect(movesIn(toasts).length).toBe(2)
})

test('a sleeping mon makes no moves, and the foe leaves', async ($, on) => {
  const { clock, toasts } = await inBattle($, on, {})
  await $.command.run({ command: 'pokemon', args: 'sleep' })
  await $.tool.call({ tool: 'Read', file_path: '/work/a.ts' })
  await clock.advance(10000)
  expect(movesIn(toasts)).toEqual([])
  expect(toasts).toContain('Wild Pidgey fled!')
})

test('an evolving mon makes no moves until it has evolved', async ($, on) => {
  const stats = { charmander: { xp: 16 ** 3 } }
  const { clock, toasts } = await inBattle($, on, { mon: 'charmander', autoEvolve: false, stats })
  await $.command.run({ command: 'pokemon', args: 'evolve' })
  await $.tool.call({ tool: 'Read', file_path: '/work/a.ts' })
  await clock.advance(6000)
  expect(movesIn(toasts)).toEqual([])
  // A strike from the foe can put the first move off a little
  for (let k = 0; k < 8 && movesIn(toasts).length === 0; k++) await clock.advance(1000)
  expect(movesIn(toasts)).toEqual([expect.stringMatching(/^Charmeleon used /)])
})

test('/pokemon feed waits until the foe is gone', async ($, on) => {
  await inBattle($, on, {})
  const feed = await $.command.run({ command: 'pokemon', args: 'feed' })
  expect(feed.text).toBe('Not now, a wild Pidgey ♂ is right there!')
})

test('work wears a foe down until it is weak, the mon holds off then, and the foe leaves if no ball comes in time', async ($, on) => {
  const { clock, toasts } = await inBattle($, on, {})
  await weaken($, clock, toasts)
  const moves = movesIn(toasts).length
  // A common foe takes three hits, give or take one, so it's weak after one or two
  expect(moves).toBeGreaterThanOrEqual(1)
  expect(moves).toBeLessThanOrEqual(2)
  // The mon won't knock out a weak foe by itself
  for (let k = 0; k < 3; k++) {
    await $.tool.call({ tool: 'Read', file_path: '/work/a.ts' })
    await clock.advance(9000)
  }
  expect(movesIn(toasts).length).toBe(moves)
  expect(toasts).not.toContain('Wild Pidgey fled!')
  await clock.advance(90 * 1000)
  expect(toasts).toContain('Wild Pidgey fled!')
})

test('/pokemon attack knocks out a weak foe, which can\'t be caught and blinks away', async ($, on) => {
  const { clock, widths, toasts } = await inBattle($, on, {})
  await weaken($, clock, toasts)
  const fainted = (text: string) => text.startsWith('Wild Pidgey fainted! It can\'t be caught now.')
  for (let k = 0; k < 60 && !toasts.some(fainted); k++) {
    if (k % 12 === 0) await run($, 'attack')
    await clock.advance(500)
  }
  expect(toasts.some(fainted)).toBe(true)
  expect(await run($, 'catch')).toBe('There\'s no wild Pokémon here.')
  expect(widths[widths.length - 1]).toBeGreaterThan(RASTER)
  await clock.advance(3000)
  expect(widths[widths.length - 1]).toBe(RASTER)
  expect(toasts).not.toContain('Wild Pidgey fled!')
  expect(toasts.some((text) => text.startsWith('Gotcha!'))).toBe(false)
})

test('the foe strikes back now and then with its own moves, and a landed strike takes happiness', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, toasts } = await inBattle($, on, saved)
  await clock.advance(20000)
  const strikes = toasts.filter((text) => /^Wild Pidgey used (Gust|Sand Attack|Quick Attack)!$/.test(text))
  expect(strikes.length).toBeGreaterThanOrEqual(1)
  expect(movesIn(toasts)).toEqual([])
  expect(saved.stats.abra.happiness.value).toBeLessThan(80)
})

// Abra's happiness as saved, 80 before anything saves it
const happinessIn = (saved: Record<string, any>): number => saved.stats?.abra?.happiness?.value ?? 80

// Run the clock until count more strikes take happiness, and return what each took, to
// the nearest whole point since the meter drains a little between them
async function bitesTaken(clock, saved: Record<string, any>, count: number): Promise<number[]> {
  const bites: number[] = []
  let last = happinessIn(saved)
  for (let t = 0; t < 120000 && bites.length < count; t += 250) {
    await clock.advance(250)
    const now = happinessIn(saved)
    if (now !== last) bites.push(Math.round(last - now))
    last = now
  }
  return bites
}

const HEARTBREAK = 0xff4f8b

test('each strike left alone takes more, from a quarter heart to a half to a whole one, with a broken heart by the mon', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, blits } = await inBattle($, on, saved)
  expect(await bitesTaken(clock, saved, 4)).toEqual([5, 10, 20, 20])
  expect(blits.some((cells) => paints(cells, HEARTBREAK))).toBe(true)
})

test('catching at, attacking, or running from the foe makes its next strike small again', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock } = await inBattle($, on, saved)
  expect(await bitesTaken(clock, saved, 2)).toEqual([5, 10])
  expect((await $.command.run({ command: 'pokemon', args: 'catch' })).text).toBe('You threw a Poké Ball!')
  expect(await bitesTaken(clock, saved, 1)).toEqual([5])
})

test('a strike never takes happiness below one heart, so it never starts the faint clock', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { food: { value: 0, at: 0 }, happiness: { value: 30, at: 0 } } } }
  const { clock, toasts } = await inBattle($, on, saved)
  await clock.advance(60000)
  expect(toasts.filter((text) => text.startsWith('Wild Pidgey used ')).length).toBeGreaterThanOrEqual(2)
  expect(Math.abs(happinessIn(saved) - 20)).toBeLessThan(1e-5)
  expect(saved.stats.abra.starving).toBeUndefined()
})

test('a strike takes nothing from a mon at one heart or less', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { happiness: { value: 15, at: 0 } } } }
  const { clock, toasts, blits } = await inBattle($, on, saved)
  await clock.advance(40000)
  expect(toasts.filter((text) => text.startsWith('Wild Pidgey used ')).length).toBeGreaterThanOrEqual(2)
  expect(happinessIn(saved)).toBe(15)
  expect(blits.some((cells) => paints(cells, HEARTBREAK))).toBe(false)
})

test('with needs off, a strike takes nothing', async ($, on) => {
  const saved: Record<string, any> = { needs: false }
  const { clock, toasts } = await inBattle($, on, saved)
  await clock.advance(40000)
  expect(toasts.filter((text) => text.startsWith('Wild Pidgey used ')).length).toBeGreaterThanOrEqual(2)
  expect(saved.stats?.abra?.happiness).toBeUndefined()
})

test('a foe ignored until its turns run out takes a whole heart as it goes', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const aborted = { ...ANSWERED, reason: 'aborted', isAborted: true }
  const saved: Record<string, any> = {}
  const { clock, toasts } = await inBattle($, on, saved)
  for (let k = 0; k < 4; k++) await $.turn.complete(aborted)
  await clock.advance(500)
  expect(toasts).toContain('Wild Pidgey fled!')
  expect(Math.abs(happinessIn(saved) - 60)).toBeLessThan(0.5)
})

test('a foe you faced takes nothing as its turns run out', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const aborted = { ...ANSWERED, reason: 'aborted', isAborted: true }
  const saved: Record<string, any> = {}
  const { clock, toasts } = await inBattle($, on, saved)
  await $.command.run({ command: 'pokemon', args: 'attack' })
  for (let k = 0; k < 4; k++) await $.turn.complete(aborted)
  await clock.advance(500)
  expect(toasts).toContain('Wild Pidgey fled!')
  expect(happinessIn(saved)).toBe(80)
})

test('a foe left uncaught for four main turns moves on', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const { toasts } = await inBattle($, on, {})
  const aborted = { ...ANSWERED, reason: 'aborted', isAborted: true }
  for (let k = 0; k < 3; k++) await $.turn.complete(aborted)
  await $.turn.complete({ ...aborted, agentId: 'sub1' })
  expect(toasts).not.toContain('Wild Pidgey fled!')
  await $.turn.complete(aborted)
  expect(toasts).toContain('Wild Pidgey fled!')
})

test('a ball thrown at full HP always breaks free, and the foe fights on', async ($, on) => {
  const { clock, blits, widths, toasts } = await inBattle($, on, {})
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('catch')).toBe('You threw a Poké Ball!')
  expect(await run('catch')).toBe('Wait for the move to end.')
  await clock.advance(4000)
  expect(toasts).toContain('Oh no! It broke free!')
  expect(columnsIn(blits[blits.length - 1], widths[widths.length - 1], foeColor('abra', 'pidgey')).length).toBeGreaterThan(0)
  expect(await run('')).toContain(', a wild Pidgey ♂ is here (')
})

// Desktop stops a running turn when you send it a message, so its band throws the ball
test('the desktop band attacks and throws a ball from buttons while a foe is in battle', async ($, on) => {
  const { clock, toasts } = await inBattle($, on, {})
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ key: 'catch' })).toBeDefined()
  await ui.press({ key: 'catch' })
  expect(toasts).toContain('You threw a Poké Ball!')
  await clock.advance(100)
  expect(await ui.find({ key: 'catch' })).toBeUndefined()
  await clock.advance(4000)
  expect(toasts).toContain('Oh no! It broke free!')
  const before = toasts.length
  await ui.press({ key: 'attack' })
  expect(toasts.slice(before).some((text) => / used .+!/.test(text))).toBe(true)
})

test('the desktop battle buttons draw dim and only say why while the mon is busy', async ($, on) => {
  const { toasts } = await inBattle($, on, {})
  await $.command.run({ command: 'pokemon', args: 'pet' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ key: 'catch' })).props.dimColor).toBe(true)
  await ui.press({ key: 'catch' })
  expect(toasts).toContain('Abra is enjoying the pets. Try again in a moment.')
  expect(toasts).not.toContain('You threw a Poké Ball!')
  await ui.press({ key: 'attack' })
  expect(movesIn(toasts)).toEqual([])
})

test('the terminal band has no battle buttons, as /pokemon catch runs there mid-turn', async ($, on) => {
  const { band } = await inBattle($, on, {})
  expect(await band.find({ key: 'catch' })).toBeUndefined()
})

test('/pokemon catch needs a foe in battle', async ($, on) => {
  await startedWith($, on, {}, 0)
  const answer = await $.command.run({ command: 'pokemon', args: 'catch' })
  expect(answer.text).toBe('There\'s no wild Pokémon here.')
})

test('a weak foe is caught, joins the box parked at its first level in its own sex, and the strip shrinks back', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, widths, toasts } = await inBattle($, on, saved)
  await weaken($, clock, toasts)
  await catchFoe($, clock, toasts)
  expect(toasts).toContain('Gotcha! Pidgey was caught! It joined your box.')
  expect(saved.dex.pidgey).toEqual({ seen: expect.any(Number), caught: expect.any(Number) })
  expect(saved.stats.pidgey).toEqual({ xp: 5 ** 3, caught: true, sex: 'male', parked: true })
  expect(widths[widths.length - 1]).toBe(RASTER)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).not.toContain('wild')
})

test('catching a species already in the box leaves its record as it was', async ($, on) => {
  // A female, caught again as a male, stays the female she was
  const pidgey = { xp: 20 ** 3, nickname: 'Pidge', sex: 'female', parked: true, food: { value: 40, at: 0 } }
  const saved: Record<string, any> = { stats: { pidgey: structuredClone(pidgey) } }
  const { clock, toasts } = await inBattle($, on, saved)
  await weaken($, clock, toasts)
  await catchFoe($, clock, toasts)
  expect(toasts).toContain('Gotcha! Pidgey was caught! Pidgey is already in your box, so it\'s marked in your Pokédex.')
  expect(saved.stats.pidgey).toEqual(pidgey)
  expect(saved.dex.pidgey.caught).toEqual(expect.any(Number))
})

test('release keeps a caught species in the Pokédex, and the box marks it when raised again', async ($, on) => {
  const saved: Record<string, any> = { trainer: false }
  const { clock, toasts } = await inBattle($, on, saved)
  await weaken($, clock, toasts)
  await catchFoe($, clock, toasts)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('box')).toContain('\nPidgey ♂ ◓, Lv. 5')

  expect(await run('release pidgey')).toBe('You release Pidgey. Bye-bye, Pidgey!')
  expect(saved.stats.pidgey).toBeUndefined()
  expect(saved.dex.pidgey.caught).toEqual(expect.any(Number))

  await run('pidgey')
  await run('pet')
  await clock.advance(4000)
  expect(await run('box')).toMatch(/\nPidgey [♂♀] ◓, Lv\. 5 ●●●●○ ♥♥♥♥♥ \(active\)/)
})

test('a shiny foe paints the shiny palette, and catching it marks the Pokédex shiny', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, blits, widths, toasts } = await inBattle($, on, saved, 'pidgey shiny male')
  expect(toasts[0]).toBe('A shiny wild Pidgey ♂ (Lv. 5) appeared!')
  const shiny = foeColor('abra', 'pidgey', 'shiny')
  expect(SPRITES.pidgey.variants.default.palette.map((hex) => parseInt(hex.slice(1), 16))).not.toContain(shiny)
  expect(columnsIn(blits[blits.length - 1], widths[widths.length - 1], shiny).length).toBeGreaterThan(0)
  await weaken($, clock, toasts)
  await catchFoe($, clock, toasts)
  expect(saved.dex.pidgey.shiny).toBe(true)
  const dex = await $.command.run({ command: 'pokemon', args: 'dex' })
  expect(dex.text).toBe('Pokédex: seen 1, caught 1 of 151 (1 shiny).\n#016 Pidgey ◓ ✦')
})

test('a due encounter gate is claimed on a tool call, and the wild mon comes on the next check', async ($, on) => {
  const saved: Record<string, any> = { wildAt: { at: HOUR - MINUTE, by: 'other' } }
  const { clock, toasts, read } = await working($, on, saved)
  await read()
  const claim = saved.wildAt
  expect(claim.by).not.toBe('other')
  expect(claim.at).toBeGreaterThanOrEqual(HOUR + 20 * MINUTE)
  expect(claim.at).toBeLessThanOrEqual(HOUR + 40 * MINUTE)
  expect(toasts.filter((text) => APPEARED.test(text))).toEqual([])

  // Checks come at most every 30 seconds
  await read()
  await clock.advance(10000)
  expect(toasts.filter((text) => APPEARED.test(text))).toEqual([])
  await clock.advance(20000)
  await read()
  await clock.advance(10000)
  expect(toasts.filter((text) => APPEARED.test(text)).length).toBe(1)
  expect(saved.wildAt).toEqual(claim)
})

test('a claim another session took over brings no wild mon here', async ($, on) => {
  const saved: Record<string, any> = { wildAt: { at: HOUR - MINUTE, by: 'other' } }
  const { clock, toasts, read } = await working($, on, saved)
  await read()
  saved.wildAt = { at: HOUR + 30 * MINUTE, by: 'other' }
  await clock.advance(30000)
  await read()
  await clock.advance(10000)
  expect(toasts.filter((text) => APPEARED.test(text))).toEqual([])
  expect(saved.wildAt).toEqual({ at: HOUR + 30 * MINUTE, by: 'other' })
})

test('with no encounter gate yet, the first one is set five minutes out', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, toasts, read } = await working($, on, saved)
  await read()
  expect(saved.wildAt).toEqual({ at: HOUR + 5 * MINUTE, by: expect.any(String) })
  await clock.advance(30000)
  await read()
  await clock.advance(10000)
  expect(toasts.filter((text) => APPEARED.test(text))).toEqual([])
})

test('a subagent\'s tool calls don\'t check the encounter gate', async ($, on) => {
  const saved: Record<string, any> = { wildAt: { at: HOUR - MINUTE, by: 'other' } }
  const { read } = await working($, on, saved)
  await read('sub1')
  expect(saved.wildAt).toEqual({ at: HOUR - MINUTE, by: 'other' })
})
