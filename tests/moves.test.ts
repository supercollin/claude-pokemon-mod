import { expect } from 'claude-code/testing'
import { test, BAND, MARGIN, STRIP, RASTER, paints, rightEdge, started, startedWith, shown, colorsOf, CONFUSION } from './helpers.ts'

test('/pokemon attack plays a random move, then ends', async ($, on) => {
  const { clock, blits } = await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  const still = blits[blits.length - 1]

  const answer = await $.command.run({ command: 'pokemon', args: 'attack' })
  expect(answer.text).toMatch(/^Abra used (Teleport|Confusion)!$/)
  const seen = blits.length
  await clock.advance(1000)
  expect(blits.slice(seen).some((cells) => cells !== still)).toBe(true)

  await clock.advance(2000)
  const again = await $.command.run({ command: 'pokemon', args: 'attack' })
  expect(again.text).toMatch(/^Abra used /)
})

test('/pokemon attack while attacking says the mon is busy', async ($, on) => {
  await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'pokemon', args: 'attack' })
  const busy = await $.command.run({ command: 'pokemon', args: 'attack' })
  expect(busy.text).toBe('Abra is still attacking.')
})

test('/pokemon attack <move> picks that move and draws it in its color', async ($, on) => {
  const { clock, blits } = await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...BAND, surface: 'terminal' })

  const answer = await $.command.run({ command: 'pokemon', args: 'attack CON-fusion' })
  expect(answer.text).toBe('Abra used Confusion!')
  const seen = blits.length
  await clock.advance(1000)
  expect(blits.slice(seen).some((cells) => paints(cells, 0xd88aff))).toBe(true)
  await clock.advance(2000)
  expect(paints(blits[blits.length - 1], 0xd88aff)).toBe(false)

  const unknown = await $.command.run({ command: 'pokemon', args: 'attack flamethrower' })
  expect(unknown.text).toBe('Abra doesn\'t know "flamethrower". Its moves: Teleport, Confusion.')
})

test('Teleport blinks the mon to another spot in the strip', async ($, on) => {
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const home = rightEdge((await ui.find({ key: 'pokemon' })).props.cells)

  const answer = await $.command.run({ command: 'pokemon', args: 'attack teleport' })
  expect(answer.text).toBe('Abra used Teleport!')
  // Past the sparkles and before it walks home, the mon stands somewhere new
  await clock.advance(50 * 34)
  const landed = blits[blits.length - 1]
  expect(rightEdge(landed)).toBeGreaterThan(-1)
  expect(rightEdge(landed)).not.toBe(home)
})

test('Transform shows another mon for a while, then turns back', async ($, on) => {
  const { clock, blits } = await startedWith($, on, { wander: false, mon: 'ditto' }, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(1000)
  const own = new Set(blits.flatMap((cells) => [...colorsOf(cells)]))

  const answer = await $.command.run({ command: 'pokemon', args: 'attack transform' })
  expect(answer.text).toBe('Ditto used Transform!')
  const seen = blits.length
  await clock.advance(3000)
  const during = blits.slice(seen, seen + 70)
  expect(during.some((cells) => [...colorsOf(cells)].some((c) => !own.has(c)))).toBe(true)

  await clock.advance(1000)
  expect([...colorsOf(blits[blits.length - 1])].every((c) => own.has(c))).toBe(true)
  // The band is back to its own size
  expect(blits[blits.length - 1].length).toBe(blits[0].length)
})

test('Transform can pick a mon taller than the caster, and the band grows to fit it', async ($, on) => {
  const { clock, blits } = await startedWith($, on, { wander: false, mon: 'ditto' }, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(1000)
  const own = blits[blits.length - 1].length

  // Almost every other mon is taller than Ditto, so a few tries all but surely land one
  let grew = false
  for (let i = 0; i < 5 && !grew; i++) {
    const seen = blits.length
    await $.command.run({ command: 'pokemon', args: 'attack transform' })
    await clock.advance(4000)
    grew = blits.slice(seen).some((cells) => cells.length > own)
  }
  expect(grew).toBe(true)
  expect(blits[blits.length - 1].length).toBe(own)
})

test('Splash just hops, and nothing happens', async ($, on) => {
  await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'pokemon', args: 'magikarp' })
  const answer = await $.command.run({ command: 'pokemon', args: 'attack splash' })
  expect(answer.text).toBe('Magikarp used Splash!\nBut nothing happened!')
})

test('every move of every mon plays to the end without breaking a frame', { timeoutMs: 120000 }, async ($, on) => {
  const { clock, blits } = await started($, on)
  // A frame that throws is logged, so each line names the move that broke
  const broken: string[] = []
  let playing = ''
  on('ui.log', ($, e) => {
    broken.push(playing + ': ' + e.text)
    return { value: undefined }
  })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const list = await $.command.run({ command: 'pokemon', args: 'list' })
  const mons = list.text.replace(/^\d+ mons: /, '').split(', ')
  for (const mon of mons) {
    await $.command.run({ command: 'pokemon', args: mon })
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const size = (await ui.find({ key: 'pokemon' })).props.cells.length
    const help = await $.command.run({ command: 'pokemon', args: 'attack ?' })
    const moves = help.text.replace(/^.* Its moves: /, '').replace(/\.$/, '').split(', ')
    for (const move of moves) {
      playing = mon + ' ' + move
      const answer = await $.command.run({ command: 'pokemon', args: 'attack ' + move })
      expect(answer.text).toContain(' used ' + move + '!')
      const seen = blits.length
      // Only as long as the move plays: "attack ?" says it's still attacking until it's
      // done, then a few ticks more for the frame it ends on
      for (let ticks = 0; (await $.command.run({ command: 'pokemon', args: 'attack ?' })).text.endsWith(' is still attacking.'); ticks += 4) {
        if (ticks > 200) throw new Error(playing + ' is still attacking after 200 ticks')
        await clock.advance(50 * 4)
      }
      await clock.advance(50 * 4)
      expect(broken).toEqual([])
      const frames = blits.slice(seen)
      expect(frames.length).toBeGreaterThan(0)
      // Transform grows the band to fit a taller mon, then shrinks it back
      if (move === 'Transform') expect(frames[frames.length - 1].length).toBe(size)
      else expect(frames.every((cells) => cells.length === size)).toBe(true)
    }
    await ui.unmount()
  }
})

// The strip columns where a color shows, as a foreground or a background
function columnsPainting(cells: string, color: number): number[] {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  const columns: number[] = []
  for (let i = 0; i < words.length; i += 3) {
    if (words[i + 1] === color || words[i + 2] === color) columns.push(((i / 3) % RASTER) - MARGIN)
  }
  return columns
}

test('a mon walking right near the right edge aims its move left, across the open strip', async ($, on) => {
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const idle = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const home = rightEdge((await idle.find({ key: 'pokemon' })).props.cells)
  await idle.unmount()

  // Pace eight columns left while Claude works, then walk five of them back toward home
  const busy = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(150 * 8)
  await busy.unmount()
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(150 * 5)
  expect(rightEdge(await shown(ui, blits))).toBeLessThan(home)

  const answer = await $.command.run({ command: 'pokemon', args: 'attack confusion' })
  expect(answer.text).toBe('Abra used Confusion!')
  const seen = blits.length
  await clock.advance(50 * 50)
  // The vortex spins far out on the left, not squeezed against the right edge
  const purple = blits.slice(seen).flatMap((cells) => columnsPainting(cells, CONFUSION))
  expect(Math.min(...purple)).toBeLessThan(STRIP / 4)
})

test('a mon mid-strip backs up to the edge before its move shows, and stays busy meanwhile', async ($, on) => {
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const idle = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const home = rightEdge((await idle.find({ key: 'pokemon' })).props.cells)
  await idle.unmount()

  // Pace eight columns left while Claude works, so the left side has more room
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(150 * 8)
  expect(rightEdge(await shown(ui, blits))).toBeLessThan(home - 5)

  await $.command.run({ command: 'pokemon', args: 'attack confusion' })
  await clock.advance(50)
  const frames = [await shown(ui, blits)]
  const again = await $.command.run({ command: 'pokemon', args: 'attack' })
  expect(again.text).toBe('Abra is still attacking.')
  for (let k = 1; k < 20; k++) {
    await clock.advance(50)
    frames.push(await shown(ui, blits))
  }
  // Nothing is drawn while it steps back, and the move shows once it is home
  const first = frames.findIndex((cells) => paints(cells, CONFUSION))
  expect(first).toBeGreaterThan(4)
  expect(rightEdge(frames[first - 1])).toBeGreaterThan(home - 3)
})
