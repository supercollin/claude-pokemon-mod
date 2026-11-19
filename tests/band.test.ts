import { expect, mock } from 'claude-code/testing'
import { closedEyes, eyesOf } from '../hooks/eyes.js'
import { SPRITES } from '../hooks/frames.js'
import { test, BAND, THEIRS, MARGIN, STRIP, PANEL, RASTER, paintedCells, paints, PIXEL_PX, svgOf, rightEdge, started, SPINNER, meanColumn, DARK_THEME_BUBBLE, BUBBLE_OUTLINE, Z_COLOR, BERRY_BODIES, HOUR, GHOSTTY, startedWith, shown, pngSize, imageColors, DENY_IMAGES, DOTS, } from './helpers.ts'

const EMOJI_PANEL = 11

function codePoints(cells: string): number[] {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  return Array.from(words).filter((_, i) => i % 3 === 0)
}

test('draws Abra by default as a half-block raster in the terminal band', async ($, on) => {
  on('ui.render', () => THEIRS)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const raster = await ui.find({ key: 'pokemon' })
  expect(raster).toBeDefined()
  expect(raster.props.columns).toBe(RASTER)
  expect(raster.props.rows).toBe(11)
  expect(codePoints(raster.props.cells)).toContain(0x2580)
})

test('cells one color top and bottom are spaces on that color, so no font can leave seams', async ($, on) => {
  on('ui.render', () => THEIRS)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const words = new Uint32Array(Uint8Array.fromBase64((await ui.find({ key: 'pokemon' })).props.cells).buffer)
  let solid = 0
  for (let i = 0; i < words.length; i += 3) {
    if (words[i] === 0x20 && words[i + 2] !== 0x01000000) solid += 1
    // A half block never has the same color on both halves
    if (words[i] === 0x2580) expect(words[i + 1]).not.toBe(words[i + 2])
  }
  expect(solid).toBeGreaterThan(20)
})

test('leaves the band alone during a survey, on either surface', async ($, on) => {
  on('ui.render', () => THEIRS)
  for (const surface of ['terminal', 'desktop'] as const) {
    const survey = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, hasSurvey: true } })
    expect(await survey.find({ key: 'pokemon' })).toBeUndefined()
    expect(await survey.find({ type: 'Svg' })).toBeUndefined()
    await survey.unmount()
  }
})

test('draws Abra as pixels in an Svg on desktop, with the level and meters beside it as text', async ($, on) => {
  await startedWith($, on, {}, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  expect(svg).toBeDefined()
  expect(await ui.find({ key: 'pokemon' })).toBeUndefined()
  // No panel on desktop: the scene is the margin and the strip, the meters beside it
  expect(svg.props.width).toBe((MARGIN + STRIP) * PIXEL_PX)
  expect(svg.props.height).toBe(11 * 2 * PIXEL_PX)
  expect(svg.props.alt).toBe('Abra')
  const source = svgOf(svg)
  expect(source).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 52 22"/)
  const abra = SPRITES.abra.variants.default.palette
  expect(abra.some((hex) => source.includes(`fill="${hex.toLowerCase()}"`))).toBe(true)
  expect(await ui.find({ type: 'Text', text: '●●●●○' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Lv ?\d+$/ })).toBeDefined()
})

test('the desktop draws the band again as the mon paces', async ($, on) => {
  const { clock } = await started($, on)
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, isWorking: true } })
  // The frame's key, pokemon-<n>, counting up from the last one found
  let n = 0
  const keyNow = async () => {
    for (let k = n; k < n + 100; k++) {
      if (await ui.find({ key: 'pokemon-' + k })) {
        n = k
        return k
      }
    }
    return undefined
  }
  const frames = [svgOf(await ui.find({ type: 'Svg' }))]
  const keys = [await keyNow()]
  for (let i = 0; i < 10; i++) {
    await clock.advance(150)
    frames.push(svgOf(await ui.find({ type: 'Svg' })))
    keys.push(await keyNow())
  }
  expect(keys.every((k) => k !== undefined)).toBe(true)
  expect(new Set(frames).size).toBeGreaterThan(3)
  // The desktop shows an Svg's first frame until its place in the tree changes, so each
  // new frame goes under a new key
  frames.forEach((frame, i) => {
    if (i > 0 && frame !== frames[i - 1]) expect(keys[i]).not.toBe(keys[i - 1])
  })
})

test('every mon fits the desktop Svg in its size limit', { timeoutMs: 60000 }, async ($, on) => {
  await startedWith($, on, {}, 0)
  for (const name of Object.keys(SPRITES)) {
    await $.command.run({ command: 'pokemon', args: name })
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(svgOf(await ui.find({ type: 'Svg' })).length).toBeLessThan(131072)
    await ui.unmount()
  }
})

test('leaves the band alone on surfaces without one of its own', async ($, on) => {
  on('ui.render', () => THEIRS)
  for (const surface of ['vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    await ui.unmount()
  }
})

test('paces while Claude works', async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.render', () => THEIRS)
  on('ui.blit', ($, e) => {
    if (e.key === 'pokemon') blits.push(e.cells ?? e.source.png)
    return { value: {} }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('command.register', () => ({ value: undefined }))
  on('store.get', () => ({ value: undefined }))

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  const drawn = (await ui.find({ key: 'pokemon' })).props.cells
  await clock.advance(50 * 30)
  expect(new Set(blits).size).toBeGreaterThan(5)
  // A tick that repeats the frame on screen sends nothing
  const frames = [drawn, ...blits]
  expect(frames.some((cells, i) => i > 0 && cells === frames[i - 1])).toBe(false)
})

test('/pokemon switches the mon and the variant, and saves both', async ($, on) => {
  mock.clock(on)
  const saved = new Map<string, unknown>()
  on('ui.render', () => THEIRS)
  on('store.get', ($, e) => ({ value: saved.get(e.key) }))
  on('store.set', ($, e) => {
    saved.set(e.key, e.value)
    return { value: undefined }
  })

  const mon = await $.command.run({ command: 'pokemon', args: 'bulbasaur' })
  expect(mon.text).toBe('Now showing default Bulbasaur.')
  const shiny = await $.command.run({ command: 'pokemon', args: 'shiny' })
  expect(shiny.text).toBe('Now showing shiny Bulbasaur.')
  expect(saved.get('mon')).toBe('bulbasaur')
  expect(saved.get('variant')).toBe('shiny')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'pokemon' })).props.rows).toBe(10)
})

test('/pokemon rejects an unknown name', async ($, on) => {
  mock.clock(on)
  const answer = await $.command.run({ command: 'pokemon', args: 'togepi' })
  expect(answer.text).toMatch(/^Unknown option "togepi"/)
  expect(answer.text).not.toContain('bulbasaur')
})

test('/pokemon help lists every option in groups, with each setting\'s value', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const help = async () => (await $.command.run({ command: 'pokemon', args: 'help' })).text.split('\n')
  const lines = await help()
  expect(lines[0]).toBe('Usage: /pokemon <option>')
  expect(lines).toContain('Care')
  expect(lines).toContain('  pet                 Pet it')
  expect(lines).toContain('  attack [move]       Use a random move, or the one named')
  expect(lines).toContain('  wander              on     Wander while idle')
  expect(lines).toContain('  size small|large    large  Band size')
  expect(lines).toContain('  images auto|on|off  auto   Pixel images or half blocks')
  await $.command.run({ command: 'pokemon', args: 'wander' })
  expect(await help()).toContain('  wander              off    Wander while idle')
  // Every option in the status line is in the help, which leaves out only itself
  const status = await $.command.run({ command: 'pokemon', args: '' })
  const options = status.text.match(/Options: (.*)\. \/pokemon help/)[1].split(', ')
  const listed = lines.filter((line) => line.startsWith('  ')).map((line) => line.trim().split(' ')[0])
  expect([...listed, 'help']).toEqual(options)
})

test('/pokemon help puts the debug options first, only while debug is on', async ($, on) => {
  const saved: Record<string, any> = {}
  await startedWith($, on, saved, 0)
  const help = async () => (await $.command.run({ command: 'pokemon', args: 'help' })).text.split('\n')
  expect(await help()).not.toContain('Debug')
  saved.debug = true
  const lines = await help()
  expect(lines.slice(0, 6)).toEqual([
    'Usage: /pokemon <option>',
    '',
    'Debug',
    '  wild [mon]          Call a wild mon now, or the one named; add shiny for its shiny colors',
    '  kill                Faint the mon now, or lose it under nuzlocke',
    '',
  ])
  expect(lines[6]).toBe('Pick')
})

test('/pokemon charmander draws Charmander', async ($, on) => {
  mock.clock(on)
  on('ui.render', () => THEIRS)
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  const answer = await $.command.run({ command: 'pokemon', args: 'charmander' })
  expect(answer.text).toBe('Now showing default Charmander.')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'pokemon' })).props.rows).toBe(10)
})

test('with wandering off, walks back to the right edge after a turn and idles there', async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.render', () => THEIRS)
  on('ui.blit', ($, e) => {
    if (e.key === 'pokemon') blits.push(e.cells)
    return { value: {} }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('command.register', () => ({ value: undefined }))
  on('store.get', ($, e) => ({ value: e.key === 'wander' ? false : undefined }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  const idle = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const home = rightEdge((await idle.find({ key: 'pokemon' })).props.cells)
  await idle.unmount()

  const busy = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(150 * 10)
  expect(rightEdge(blits[blits.length - 1])).toBeLessThan(home)
  await busy.unmount()

  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(150 * 40)
  expect(rightEdge(blits[blits.length - 1])).toBe(home)
})

test('every mon at home leaves a gap of at least three columns before the level and meters', { timeoutMs: 60000 }, async ($, on) => {
  await startedWith($, on, { wander: false }, 0)
  for (const name of Object.keys(SPRITES)) {
    await $.command.run({ command: 'pokemon', args: name })
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const edge = rightEdge((await ui.find({ key: 'pokemon' })).props.cells)
    expect({ name, ok: STRIP - 1 - edge >= 3 }).toEqual({ name, ok: true })
    await ui.unmount()
  }
})

test('the thought bubble leads on the side the pacing mon walks toward', { timeoutMs: 30000 }, async ($, on) => {
  // Bulbasaur's wide head leaves the bubble room on both sides for only a short stretch of
  // the strip, so this needs the margin on the left and the early turn on the right
  const BODY = 0x68d078
  const { clock, blits } = await startedWith($, on, { mon: 'bulbasaur', needs: false }, 0)
  await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(30000)
  let left = 0
  let right = 0
  for (let k = 1; k < blits.length; k++) {
    const was = meanColumn(blits[k - 1], BODY)
    const now = meanColumn(blits[k], BODY)
    const bubble = meanColumn(blits[k], BUBBLE_OUTLINE)
    if (was === null || now === null || bubble === null || Math.abs(now - was) < 0.5) continue
    // Only a real step counts: the body's mean moves by about a column
    if (Math.abs(now - was) > 2) continue
    if (now < was) {
      left += 1
      expect(bubble).toBeLessThan(now)
    } else {
      right += 1
      expect(bubble).toBeGreaterThan(now)
    }
  }
  expect(left).toBeGreaterThan(3)
  expect(right).toBeGreaterThan(3)
})

test('shows a thought bubble while Claude thinks', async ($, on) => {
  await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  const cells = (await ui.find({ key: 'pokemon' })).props.cells
  expect(paints(cells, BUBBLE_OUTLINE)).toBe(true)
  expect(paints(cells, DOTS)).toBe(true)
})

const LIGHT_THEME_BUBBLE = 0x4a4a58

const ENGINE = { plugin: 'engine', tier: 'core' } as const

test('a light theme draws a dark bubble, and switching to a dark theme draws it light again', async ($, on) => {
  const { clock, blits } = await started($, on)
  on('config.list', () => ({
    value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'light', provider: ENGINE, isLocked: false }],
  }))
  on('config.set', ($, e) => ({ value: e.value }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  const light = (await ui.find({ key: 'pokemon' })).props.cells
  expect(paints(light, LIGHT_THEME_BUBBLE)).toBe(true)
  expect(paints(light, DARK_THEME_BUBBLE)).toBe(false)

  const set = await $.config.set({ key: 'theme', value: 'dark', previous: 'light', provider: ENGINE, origin: { kind: 'composer' } })
  expect(set.value).toBe('dark')
  const seen = blits.length
  await clock.advance(1000)
  const dark = blits.slice(seen)
  expect(dark.length).toBeGreaterThan(0)
  expect(dark.every((cells) => paints(cells, DARK_THEME_BUBBLE) && !paints(cells, LIGHT_THEME_BUBBLE))).toBe(true)
})

test('hops when a turn ends', async ($, on) => {
  await started($, on)
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const before = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const still = (await before.find({ key: 'pokemon' })).props.cells
  await before.unmount()

  await $.turn.complete({ turnId: 't', answer: 'ok', durationMs: 1000, isAborted: false, usage: null })
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await after.find({ key: 'pokemon' })).props.cells).not.toBe(still)
})

test('falls asleep after five idle minutes', { timeoutMs: 30000 }, async ($, on) => {
  const { clock, blits } = await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(4 * 60 * 1000)
  expect(paints(blits[blits.length - 1], Z_COLOR)).toBe(false)
  // Out wandering, it walks home first, a column every 150 ms
  await clock.advance(66 * 1000)
  expect(paints(blits[blits.length - 1], Z_COLOR)).toBe(true)
})

test('a pet leaves a sleeping mon asleep, napping or tucked in, and still fills its happiness', { timeoutMs: 30000 }, async ($, on) => {
  const saved: Record<string, any> = { wander: false, stats: { abra: { food: { value: 50, at: 0 }, happiness: { value: 50, at: 0 } } } }
  const { clock, blits } = await startedWith($, on, saved, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text

  // Napping after five idle minutes
  await clock.advance(5 * 60 * 1000 + 1000)
  expect(paints(blits[blits.length - 1], Z_COLOR)).toBe(true)
  expect(await run('pet')).toMatch(/^Abra smiles in its sleep ♥/)
  await clock.advance(4000)
  expect(paints(blits[blits.length - 1], Z_COLOR)).toBe(true)
  // 50, less five minutes' drain, plus the pet's 25
  expect(Math.round(saved.stats.abra.happiness.value)).toBe(74)

  // Tucked in with /pokemon sleep
  await run('sleep')
  expect(await run('pet')).toMatch(/^Abra smiles in its sleep ♥/)
  await clock.advance(4000)
  expect(paints(blits[blits.length - 1], Z_COLOR)).toBe(true)
  expect(saved.stats.abra.asleep).toBe(true)
})

test('after five idle minutes, a mon out wandering walks home before it falls asleep', { timeoutMs: 30000 }, async ($, on) => {
  const { clock, blits } = await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const home = rightEdge((await ui.find({ key: 'pokemon' })).props.cells)
  await clock.advance(5 * 60 * 1000 + 6000)
  // Every frame with Zs shows it at home
  const zs = blits.filter((cells) => paints(cells, Z_COLOR))
  expect(zs.length).toBeGreaterThan(0)
  expect(zs.every((cells) => rightEdge(cells) === home)).toBe(true)
  expect(blits.some((cells) => rightEdge(cells) < home)).toBe(true)
})

test('wanders while idle by default, and /pokemon wander sends it home', async ($, on) => {
  const { clock, blits } = await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const home = rightEdge((await ui.find({ key: 'pokemon' })).props.cells)

  await clock.advance(30 * 1000)
  expect(blits.some((cells) => rightEdge(cells) < home)).toBe(true)

  const answer = await $.command.run({ command: 'pokemon', args: 'wander' })
  expect(answer.text).toBe('Abra is heading home.')
  await clock.advance(10 * 1000)
  expect(rightEdge(blits[blits.length - 1])).toBe(home)
})

test('/pokemon pet sends hearts up, then they fade', async ($, on) => {
  const { clock, blits } = await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...BAND, surface: 'terminal' })

  const answer = await $.command.run({ command: 'pokemon', args: 'pet' })
  expect(answer.text).toMatch(/^Abra .+ ♥$/)
  const hearty = (cells: string) => paints(cells, 0xff4f8b)
  await clock.advance(400)
  expect(hearty(blits[blits.length - 1])).toBe(true)
  await clock.advance(8000)
  expect(hearty(blits[blits.length - 1])).toBe(false)
})

function hasBerry(cells: string): boolean {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  return Array.from(words).some((w, i) => i % 3 !== 0 && BERRY_BODIES.includes(w))
}

test('/pokemon feed drops a random berry, the mon walks over and eats it, then says yum', async ($, on) => {
  const { clock, blits } = await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...BAND, surface: 'terminal' })

  const answer = await $.command.run({ command: 'pokemon', args: 'feed' })
  expect(answer.text).toMatch(/^You toss Abra (an oran|a pecha|a razz|a sitrus) berry \S+$/u)
  const busy = await $.command.run({ command: 'pokemon', args: 'feed' })
  expect(busy.text).toBe('Abra is busy eating. Try again in a moment.')

  await clock.advance(1000)
  expect(hasBerry(blits[blits.length - 1])).toBe(true)

  // Long enough to land, walk the whole strip, eat, and say "yum!"
  const seen = blits.length
  await clock.advance(150 * 40 + 2000)
  const later = blits.slice(seen)
  expect(later.some((cells) => paints(cells, 0xffd54f))).toBe(true)
  expect(hasBerry(blits[blits.length - 1])).toBe(false)
})

// The lowest pixel row a frame paints, two pixel rows per cell
function lowestPixel(cells: string): number {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  let lowest = -1
  for (let i = 0; i < words.length; i += 3) {
    const cy = Math.floor(i / 3 / RASTER)
    const solid = words[i] === 0x20 && words[i + 2] !== 0x01000000
    if (solid || words[i] === 0x2584 || (words[i] === 0x2580 && words[i + 2] !== 0x01000000)) lowest = Math.max(lowest, cy * 2 + 1)
    else if (words[i] === 0x2580) lowest = Math.max(lowest, cy * 2)
  }
  return lowest
}

test('a walking mon stands on the same ground as an idle one', async ($, on) => {
  // Bulbasaur's walk frames leave one more empty row under its feet than its idle frames
  const { clock, blits } = await startedWith($, on, { mon: 'bulbasaur', wander: false, needs: false }, 0)
  const idle = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(3000)
  const idleFrames = [(await idle.find({ key: 'pokemon' })).props.cells, ...blits]
  await idle.unmount()
  blits.length = 0
  const busy = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(3000)
  expect(blits.length).toBeGreaterThan(5)
  const ground = Math.max(...idleFrames.map(lowestPixel))
  expect(Math.max(...blits.map(lowestPixel))).toBe(ground)
  await busy.unmount()
})

test('a sleeping mon lies on the same ground as an idle one', async ($, on) => {
  // Bulbasaur sleeps in its first idle frame, which leaves an empty row under its feet
  const { clock, blits } = await startedWith($, on, { mon: 'bulbasaur', wander: false, needs: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(3000)
  const ground = Math.max(...[(await ui.find({ key: 'pokemon' })).props.cells, ...blits].map(lowestPixel))
  await $.command.run({ command: 'pokemon', args: 'sleep' })
  blits.length = 0
  await clock.advance(3000)
  expect(blits.length).toBeGreaterThan(0)
  expect(blits.every((cells) => lowestPixel(cells) === ground)).toBe(true)
})

test('draws food circles and happiness hearts at the right edge as text', async ($, on) => {
  await startedWith($, on, {}, 0, { TERM_PROGRAM: 'Apple_Terminal' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  // A new mon starts at 80%: four filled icons and one empty in each meter
  expect(await ui.find({ type: 'Text', text: '●●●●○' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '♥♥♥♥♡' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /🍓|💗/ })).toBeUndefined()
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
})

test('a terminal that draws Images shows the hearts as pixel hearts', async ($, on) => {
  const { clock } = await startedWith($, on, {}, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  // One cell per heart, each 14 pixels wide and 28 tall, 4 image pixels to a pixel
  const hearts = await ui.find({ type: 'Image', key: 'hearts' })
  expect(hearts.props.columns).toBe(5)
  expect(hearts.props.rows).toBe(1)
  expect(hearts.props.alt).toBe('♥♥♥♥♡')
  expect(pngSize(hearts.props.source.png)).toEqual({ width: 5 * 14 * 4, height: 28 * 4 })
  expect(imageColors(hearts.props.source.png)).toEqual(new Set([0xff5f9e]))
  expect(await ui.find({ type: 'Text', text: '♥♥♥♥♡' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '●●●●○' })).toBeDefined()
  await clock.advance(100)
  expect((await ui.find({ key: 'hearts' })).type).toBe('Image')
})

test('a terminal that draws an Image as its alt gets the hearts as text', async ($, on) => {
  const { clock } = await startedWith($, on, {}, 0, GHOSTTY, (e) => (e.cells ? {} : DENY_IMAGES))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  expect(await ui.find({ type: 'Image', key: 'hearts' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '♥♥♥♥♡' })).toBeDefined()
})

test('emoji meters keep their hearts as emoji where the terminal draws Images', async ($, on) => {
  const { clock } = await startedWith($, on, { emoji: true }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  expect(await ui.find({ type: 'Image', key: 'hearts' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '💗💗💗💗♡ ' })).toBeDefined()
})

test('/pokemon emoji swaps the meters for emoji in a wider panel, saves it, and swaps them back', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'pokemon' })).props.columns).toBe(RASTER)

  const emoji = await $.command.run({ command: 'pokemon', args: 'emoji' })
  expect(emoji.text).toBe('The meters show emoji: 🍓🍓🍓🍓○ 💗💗💗💗♡')
  expect(saved.emoji).toBe(true)
  await clock.advance(100)
  expect(await ui.find({ type: 'Text', text: '🍓🍓🍓🍓○ ' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '💗💗💗💗♡ ' })).toBeDefined()
  expect((await ui.find({ key: 'pokemon' })).props.columns).toBe(MARGIN + STRIP + EMOJI_PANEL)

  const text = await $.command.run({ command: 'pokemon', args: 'emoji' })
  expect(text.text).toBe('The meters show text icons: ●●●●○ ♥♥♥♥♡')
  expect(saved.emoji).toBe(false)
  await clock.advance(100)
  expect(await ui.find({ type: 'Text', text: '●●●●○' })).toBeDefined()
  expect((await ui.find({ key: 'pokemon' })).props.columns).toBe(RASTER)
})

test('a saved emoji choice draws emoji meters from the start', async ($, on) => {
  await startedWith($, on, { emoji: true }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '🍓🍓🍓🍓○ ' })).toBeDefined()
  expect((await ui.find({ key: 'pokemon' })).props.columns).toBe(MARGIN + STRIP + EMOJI_PANEL)
})

test('narrows the strip to keep the meters, and hides them when even the mon barely fits', async ($, on) => {
  await startedWith($, on, {}, 0)
  const narrow = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: 44 } })
  expect((await narrow.find({ key: 'pokemon' })).props.columns).toBe(44)
  expect(await narrow.find({ type: 'Text', text: /●/ })).toBeDefined()
  await narrow.unmount()
  const tight = SPRITES.abra.width + 5
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: tight } })
  expect((await ui.find({ key: 'pokemon' })).props.columns).toBe(tight)
  expect(await ui.find({ type: 'Text', text: /●/ })).toBeUndefined()
})

// The columns a mon at home keeps clear on its right, past the empty ones its frames leave:
// the fewest right of its idle and walk frames, or left of a walk frame, mirrored facing left
function homeGapOf(mon: string): number {
  const { width, variants } = SPRITES[mon]
  const { idle, walk } = variants.default
  const rights = [...idle, ...walk].flatMap(({ rows }) => rows.map((row) => row.search(/[^.]\.*$/)))
  const lefts = walk.flatMap(({ rows }) => rows.map((row) => row.search(/[^.]/)).filter((left) => left >= 0))
  return Math.max(0, 3 - Math.min(width - 1 - Math.max(...rights), ...lefts))
}

test('emoji meters need their wider panel to show beside a narrow strip, with the mon kept 3 columns clear', async ($, on) => {
  await startedWith($, on, { emoji: true }, 0)
  const fits = SPRITES.abra.width + homeGapOf('abra') + EMOJI_PANEL
  const wide = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: fits } })
  expect(await wide.find({ type: 'Text', text: /🍓/ })).toBeDefined()
  await wide.unmount()
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: fits - 1 } })
  expect(await ui.find({ type: 'Text', text: /🍓/ })).toBeUndefined()
})

test('a small band keeps the mon at home 3 columns clear of the meters on screen, as a large one does', async ($, on) => {
  const { clock } = await startedWith($, on, { mon: 'charizard', size: 'small', wander: false }, 0, { TERM_PROGRAM: 'Apple_Terminal' })
  for (const mon of ['charizard', 'dewgong']) {
    await $.command.run({ command: 'pokemon', args: mon })
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    await clock.advance(300)
    const { columns, cells } = (await ui.find({ key: 'pokemon' })).props
    const painted = paintedCells(cells)
    let right = -1
    for (let i = 0; i < painted.length; i++) if (painted[i]) right = Math.max(right, i % columns)
    // The panel takes the band's last PANEL columns, and its text starts a column in
    const empty = columns - PANEL + 1 - right - 1
    expect({ mon, clear: empty >= 3 }).toEqual({ mon, clear: true })
    await ui.unmount()
  }
})

test('a mon walking right stays 3 columns clear of the meters, large or small', { timeoutMs: 60000 }, async ($, on) => {
  const { clock, blits } = await startedWith($, on, { mon: 'tauros', wander: true }, 0, { TERM_PROGRAM: 'Apple_Terminal' })
  for (const size of ['large', 'small']) {
    await $.command.run({ command: 'pokemon', args: 'size ' + size })
    // The ones whose walk frames reached closest to the meters before
    for (const mon of ['tauros', 'arcanine', 'persian']) {
      await $.command.run({ command: 'pokemon', args: mon })
      const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
      await clock.advance(200)
      const band = (await ui.find({ key: 'pokemon' })).props
      blits.length = 0
      await clock.advance(90000)
      let right = -1
      for (const cells of [band.cells, ...blits]) {
        const painted = paintedCells(cells)
        for (let i = 0; i < painted.length; i++) if (painted[i]) right = Math.max(right, i % band.columns)
      }
      // The panel takes the band's last PANEL columns, and its text starts a column in
      expect({ size, mon, clear: band.columns - PANEL - right >= 3 }).toEqual({ size, mon, clear: true })
      await ui.unmount()
    }
  }
})

test('a bubble beside the head floats over the meters column instead of being cut off', async ($, on) => {
  const low = { value: 10, at: 0 }
  const { clock, blits } = await startedWith($, on, { wander: false, stats: { abra: { food: low, happiness: low } } }, 0)
  // A strip barely wider than Abra and its gap, so the bubble has no room on the left and goes right
  const strip = SPRITES.abra.width + homeGapOf('abra')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: strip + PANEL } })
  const raster = await ui.find({ key: 'pokemon' })
  expect(raster.props.columns).toBe(strip + PANEL)
  expect(await ui.find({ type: 'Text', text: /●/ })).toBeDefined()
  await clock.advance(100)
  const painted = paintedCells(await shown(ui, blits))
  const width = strip + PANEL
  const meterTop = raster.props.rows - 3
  const past = painted.filter((p, i) => p && i % width >= strip)
  const underMeters = painted.filter((p, i) => p && i % width >= strip && Math.floor(i / width) >= meterTop)
  expect(past.length).toBeGreaterThan(0)
  expect(underMeters.length).toBe(0)
})

test('food and happiness drain over real time while a session runs', async ($, on) => {
  const full = { value: 100, at: 0 }
  // Another session marked the store seen moments ago, so the whole time counts
  await startedWith($, on, { stats: { abra: { food: full, happiness: full } }, seenAt: 4 * HOUR - 5000 }, 4 * HOUR)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain('food 50%, happiness 67%')
})

test('time with Claude Code closed or the laptop off drains at a quarter speed', async ($, on) => {
  const full = { value: 100, at: 0 }
  const saved: Record<string, any> = { stats: { abra: { food: full, happiness: full }, pikachu: { food: { value: 40, at: 0 } } }, seenAt: 0 }
  await startedWith($, on, saved, 4 * HOUR)
  // 4 hours closed count as 1, plus the 10 s beat before the gap at full speed
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain('food 87%, happiness 92%')
  // Every mon's meters moved on and were saved, and the store is marked seen now
  expect(saved.stats.pikachu.food.at).toBe(0.75 * (4 * HOUR - 10 * 1000))
  expect(saved.stats.pikachu.food.value).toBe(40)
  expect(saved.seenAt).toBe(4 * HOUR)
})

test('switching away parks a mon, and its meters pick up where they stopped when it comes back', async ($, on) => {
  const full = { value: 100, at: 0 }
  const saved: Record<string, any> = { trainer: false, stats: { abra: { food: full, happiness: full } }, seenAt: 0 }
  await startedWith($, on, saved, 0)
  await $.command.run({ command: 'pokemon', args: 'bulbasaur' })
  expect(saved.stats.abra.parked).toBe(true)
  expect(saved.stats.abra.food.value).toBe(100)
})

test('a parked mon loses nothing while another one is shown, even across sessions', async ($, on) => {
  // Abra was parked at 60% food 8 hours ago, and another session has run since
  const saved: Record<string, any> = {
    mon: 'bulbasaur',
    stats: { abra: { food: { value: 60, at: 0 }, happiness: { value: 70, at: 0 }, parked: true } },
    seenAt: 8 * HOUR - 5000,
  }
  await startedWith($, on, saved, 8 * HOUR)
  await $.command.run({ command: 'pokemon', args: 'abra' })
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain('food 60%, happiness 70%')
  expect(saved.stats.abra.parked).toBeUndefined()
  expect(saved.stats.abra.food.at).toBe(8 * HOUR)
})

test('an open session keeps the store marked seen', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock } = await startedWith($, on, saved, 0)
  await clock.advance(30 * 1000)
  expect(saved.seenAt).toBeGreaterThanOrEqual(20 * 1000)
})

test('feeding fills food, petting fills happiness, and both are saved once the mon has eaten and enjoyed it', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { food: { value: 10, at: 0 }, happiness: { value: 10, at: 0 } } } }
  const { clock } = await startedWith($, on, saved, 0)
  await $.command.run({ command: 'pokemon', args: 'feed' })
  // Nothing fills while the berry falls
  const before = await $.command.run({ command: 'pokemon', args: '' })
  expect(before.text).toContain('food 10%, happiness 10%')
  // Long enough to land, walk the whole strip, and eat
  await clock.advance(150 * 40 + 2000)
  const fed = await $.command.run({ command: 'pokemon', args: '' })
  expect(fed.text).toContain('food 30%, happiness 15%')
  expect(Math.round(saved.stats.abra.food.value)).toBe(30)
  await $.command.run({ command: 'pokemon', args: 'pet' })
  // Nothing fills while the hearts float
  const petting = await $.command.run({ command: 'pokemon', args: '' })
  expect(petting.text).toContain('food 30%, happiness 15%')
  await clock.advance(4000)
  const after = await $.command.run({ command: 'pokemon', args: '' })
  expect(after.text).toContain('food 30%, happiness 40%')
  expect(Math.round(saved.stats.abra.happiness.value)).toBe(40)
})

test('while it eats or enjoys a pet, commands that change it wait, and the ones that only show something run', async ($, on) => {
  const saved: Record<string, any> = { mon: 'abra', stats: { abra: { xp: 900 } } }
  const { clock } = await startedWith($, on, saved, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  await run('feed')
  for (const args of ['pet', 'feed', 'release abra', 'pikachu', 'sleep', 'nickname Spoon', 'attack', 'shiny']) {
    expect(await run(args)).toBe('Abra is busy eating. Try again in a moment.')
  }
  expect(await run('stats')).toMatch(/^Abra, Lv\. 9,/)
  expect(await run('box')).toMatch(/^1 mon in your box:/)
  expect(await run('moves')).toMatch(/^Abra knows /)
  await clock.advance(150 * 40 + 2000)
  await run('pet')
  expect(await run('release abra')).toBe('Abra is enjoying the pets. Try again in a moment.')
  await clock.advance(4000)
  expect(await run('release abra')).toMatch(/^You release Abra\./)
  expect(saved.stats.abra).toBeUndefined()
})

test('a mon as happy as can be still enjoys a pet, but it fills no meter and doesn\'t count as one', async ($, on) => {
  const saved: Record<string, any> = { pets: 5, stats: { abra: { food: { value: 50, at: 0 }, happiness: { value: 90, at: 0 } } } }
  await startedWith($, on, saved, 0)
  const answer = await $.command.run({ command: 'pokemon', args: 'pet' })
  expect(answer.text).toMatch(/♥ Abra is already as happy as can be\.$/)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain('food 50%, happiness 90%')
  expect(saved.pets).toBe(5)
})

test('a full mon still eats the berry, but it fills no meter and doesn\'t count as a feed', async ($, on) => {
  const saved: Record<string, any> = { feeds: 4, stats: { abra: { food: { value: 90, at: 0 }, happiness: { value: 50, at: 0 } } } }
  await startedWith($, on, saved, 0)
  const answer = await $.command.run({ command: 'pokemon', args: 'feed' })
  expect(answer.text).toMatch(/Abra is already full, so it just nibbles it\.$/)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain('food 90%, happiness 50%')
  expect(saved.feeds).toBe(4)
})

test('/pokemon sleep slows both meters, even between sessions, and shows in the status', async ($, on) => {
  const full = { value: 100, at: 0 }
  await startedWith($, on, { stats: { abra: { food: full, happiness: full, asleep: true } } }, 8 * HOUR)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain('food 50%, happiness 83%')
  expect(status.text).toContain('Abra Lv. 5, asleep')
})

test('/pokemon sleep tucks the mon in until Claude starts working, and saves the meters at each switch', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { food: { value: 100, at: 0 }, happiness: { value: 100, at: 0 } } } }
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  const { clock } = await startedWith($, on, saved, 4 * HOUR)
  const tucked = await $.command.run({ command: 'pokemon', args: 'sleep' })
  expect(tucked.text).toContain('falls asleep')
  expect(saved.stats.abra.asleep).toBe(true)
  expect(saved.stats.abra.food).toEqual({ value: 50, at: 4 * HOUR })

  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(60 * 1000)
  expect(saved.stats.abra.asleep).toBe(true)

  await $.turn.start({ text: 'hi', turnId: 't' })
  await clock.advance(100)
  expect(saved.stats.abra.asleep).toBe(false)
  expect(saved.stats.abra.food.at).toBeGreaterThan(4 * HOUR)

  const busy = await $.command.run({ command: 'pokemon', args: 'sleep' })
  expect(busy.text).toContain("can't sleep while Claude is working")
})

test('/pokemon sleep goes by the turn events, not the band\'s isWorking', async ($, on) => {
  const saved: Record<string, any> = {}
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  await startedWith($, on, saved, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  const tucked = await $.command.run({ command: 'pokemon', args: 'sleep' })
  expect(tucked.text).toContain('falls asleep')
  await $.command.run({ command: 'pokemon', args: 'sleep' })

  await $.turn.start({ text: 'hi', turnId: 't' })
  const busy = await $.command.run({ command: 'pokemon', args: 'sleep' })
  expect(busy.text).toContain("can't sleep while Claude is working")
  await $.turn.complete({ turnId: 't', answer: 'ok', durationMs: 1000, isAborted: false, usage: null })
  const after = await $.command.run({ command: 'pokemon', args: 'sleep' })
  expect(after.text).toContain('falls asleep')
})

test('a sleeping mon shuts its eyes', async ($, on) => {
  const EYE_WHITE = 0xe8e8f8
  const saved: Record<string, any> = { mon: 'pikachu' }
  await startedWith($, on, saved, 0)
  const awake = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(paints((await awake.find({ key: 'pokemon' })).props.cells, EYE_WHITE)).toBe(true)
  await awake.unmount()
  await $.command.run({ command: 'pokemon', args: 'sleep' })
  const asleep = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(paints((await asleep.find({ key: 'pokemon' })).props.cells, EYE_WHITE)).toBe(false)
})

test('a sleeping Gengar shuts its eyes, which have no white highlight', async ($, on) => {
  const EYE_PINK = 0xf8a8a0
  await startedWith($, on, { mon: 'gengar' }, 0)
  const awake = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(paints((await awake.find({ key: 'pokemon' })).props.cells, EYE_PINK)).toBe(true)
  await awake.unmount()
  await $.command.run({ command: 'pokemon', args: 'sleep' })
  const asleep = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(paints((await asleep.find({ key: 'pokemon' })).props.cells, EYE_PINK)).toBe(false)
})

// Every frame of every mon with its eyes shut
function shutFrames() {
  const frames: any[] = []
  for (const [mon, sprite] of Object.entries(SPRITES)) {
    for (const [variant, sheet] of Object.entries(sprite.variants)) {
      for (const view of ['idle', 'walk']) {
        for (const [i, { rows }] of sheet[view].entries()) {
          const boxes = eyesOf(mon, variant, view, i)
          const where = `${mon} ${variant} ${view} ${i}`
          frames.push({ mon, where, rows, palette: sheet.palette, boxes, shut: closedEyes(rows, sheet.palette, boxes) })
        }
      }
    }
  }
  return frames
}

test('shutting the eyes keeps every frame\'s size and palette', { timeoutMs: 30000 }, async () => {
  for (const { rows, palette, shut } of shutFrames()) {
    expect(shut.length).toBe(rows.length)
    for (const [y, row] of shut.entries()) {
      expect(row.length).toBe(rows[y].length)
      for (const letter of row) if (letter !== '.') expect(letter.charCodeAt(0) - 97).toBeLessThan(palette.length)
    }
  }
})

test('every frame of every mon has its eyes marked', async () => {
  expect(shutFrames().filter(({ boxes }) => !Array.isArray(boxes)).map(({ where }) => where)).toEqual([])
})

test('shutting the eyes paints skin over each eye and a lid on its bottom row, and nothing else', async () => {
  const wrong: string[] = []
  for (const { where, rows, boxes: marked, shut } of shutFrames()) {
    const boxes = marked ?? []
    const inBox = (x, y) => boxes.some(([bx, by, w, h]) => x >= bx && x < bx + w && y >= by && y < by + h)
    for (const [y, row] of rows.entries()) {
      for (const [x, letter] of [...row].entries()) if (!inBox(x, y) && shut[y][x] !== letter) wrong.push(`${where} changed (${x}, ${y}) outside the eyes`)
    }
    for (const [bx, by, w, h] of boxes) {
      const skin = new Set()
      const lid = new Set()
      for (let y = by; y < by + h; y++) {
        for (let x = bx; x < bx + w; x++) if (shut[y][x] !== '.') (y === by + h - 1 ? lid : skin).add(shut[y][x])
      }
      if (skin.size > 1) wrong.push(`${where} left more than skin in the eye at (${bx}, ${by})`)
      if (lid.size !== 1 || skin.has([...lid][0])) wrong.push(`${where} has no lid on the eye at (${bx}, ${by})`)
    }
    if (boxes.length > 0 && shut.every((row, y) => row === rows[y])) wrong.push(`${where} didn't change`)
  }
  expect(wrong).toEqual([])
})

test('ghosts, dark and rocky bodies, and dot-eyed mons shut their eyes on every frame', async () => {
  const mons = ['gengar', 'gastly', 'haunter', 'charizard', 'golem', 'magnemite', 'voltorb', 'tangela', 'ditto']
  const open = shutFrames().filter(({ mon, rows, shut }) => mons.includes(mon) && shut.every((row, y) => row === rows[y]))
  expect(open.map(({ where }) => where)).toEqual([])
})

test('/pokemon sleep walks the mon home before it shuts its eyes', async ($, on) => {
  const EYE_WHITE = 0xe8e8f8
  const { clock, blits } = await startedWith($, on, { mon: 'pikachu', wander: false }, 0)
  const idle = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const home = rightEdge((await idle.find({ key: 'pokemon' })).props.cells)
  await idle.unmount()

  const busy = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(150 * 8)
  await busy.unmount()
  await $.command.run({ command: 'pokemon', args: 'sleep' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(150)
  const walking = await shown(ui, blits)
  expect(rightEdge(walking)).toBeLessThan(home)
  expect(paints(walking, EYE_WHITE)).toBe(true)

  await clock.advance(150 * 40)
  const asleep = await shown(ui, blits)
  expect(rightEdge(asleep)).toBe(home)
  expect(paints(asleep, EYE_WHITE)).toBe(false)
})

test('/pokemon sleep again wakes the mon up', async ($, on) => {
  const saved: Record<string, any> = {}
  await startedWith($, on, saved, 0)
  await $.command.run({ command: 'pokemon', args: 'sleep' })
  const woken = await $.command.run({ command: 'pokemon', args: 'sleep' })
  expect(woken.text).toBe('Abra wakes up.')
  expect(saved.stats.abra.asleep).toBe(false)
})

test('/pokemon sleep works in an idle session while Claude works in another', async ($, on) => {
  // A fresh busy mark, as an earlier version left while its session was mid-turn
  const saved: Record<string, any> = { 'busy:other': 0 }
  await startedWith($, on, saved, 0)
  const slept = await $.command.run({ command: 'pokemon', args: 'sleep' })
  expect(slept.text).toMatch(/falls asleep/)
  expect(saved.stats.abra.asleep).toBe(true)
})

test('a save here lands on the XP and meters another session saved since the last sync', async ($, on) => {
  const saved: Record<string, any> = { mon: 'abra', stats: { abra: { xp: 100, food: { value: 50, at: 0 }, happiness: { value: 10, at: 0 } } } }
  const { clock } = await startedWith($, on, saved, 0)
  await $.command.run({ command: 'pokemon', args: 'pet' })
  // Before this session syncs, another one earns XP and feeds the same mon
  saved.stats = { abra: { xp: 900, food: { value: 70, at: 0 }, happiness: { value: 10, at: 0 } } }
  // The pet pays out once its hearts have floated away
  await clock.advance(4000)
  expect(saved.stats.abra.xp).toBe(900)
  expect(Math.round(saved.stats.abra.food.value)).toBe(70)
  expect(Math.round(saved.stats.abra.happiness.value)).toBe(35)
})

test('put to bed in another session, the mon wakes as soon as Claude works here', async ($, on) => {
  const saved: Record<string, any> = {}
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  const { clock } = await startedWith($, on, saved, 0)
  await $.turn.start({ text: 'hi', turnId: 't' })
  // Another session tucks it in, as its /pokemon sleep would
  saved.stats = { abra: { asleep: true, food: { value: 80, at: 0 }, happiness: { value: 80, at: 0 } } }
  await clock.advance(3000)
  expect(saved.stats.abra.asleep).toBe(false)
})

test('feeding or petting in another session shows here within a second', async ($, on) => {
  const saved: Record<string, any> = { mon: 'abra', stats: { abra: { food: { value: 30, at: 0 }, happiness: { value: 30, at: 0 } } } }
  const { clock } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '●●○○○' })).toBeDefined()
  // Another session feeds it, as its /pokemon feed would
  saved.stats = { abra: { food: { value: 50, at: 0 }, happiness: { value: 35, at: 0 } } }
  await clock.advance(1100)
  expect(await ui.find({ type: 'Text', text: '●●●○○' })).toBeDefined()
})

test('a release keeps the records other sessions saved, and one in another session shows here', async ($, on) => {
  const saved: Record<string, any> = { mon: 'abra', stats: { abra: { xp: 900, nickname: 'Spoon' }, pikachu: { xp: 1728 } } }
  const { clock } = await startedWith($, on, saved, 0)
  // Another session raises Bulbasaur after this one started
  saved.stats = { ...saved.stats, bulbasaur: { xp: 125 } }
  expect((await $.command.run({ command: 'pokemon', args: 'release pikachu' })).text).toBe('You release Pikachu. Bye-bye, Pikachu!')
  expect(Object.keys(saved.stats).sort()).toEqual(['abra', 'bulbasaur'])
  // Another session releases the shown mon
  saved.stats = { bulbasaur: { xp: 125 } }
  await clock.advance(1100)
  expect((await $.command.run({ command: 'pokemon', args: 'stats' })).text).toMatch(/^Abra, Lv\. 5,/)
})

test('each feed adds exactly one food icon', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { food: { value: 39, at: 0 }, happiness: { value: 50, at: 0 } } } }
  const { clock } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '●●○○○' })).toBeDefined()
  await $.command.run({ command: 'pokemon', args: 'feed' })
  // The meter fills once the berry is eaten
  await clock.advance(15 * 1000)
  expect(await ui.find({ type: 'Text', text: '●●●○○' })).toBeDefined()
})

test('a mon picked in another session doesn\'t switch this one', async ($, on) => {
  const saved: Record<string, any> = { mon: 'abra', stats: { abra: { xp: 900 } } }
  const { clock } = await startedWith($, on, saved, 0)
  // Another session picks Seel, as its /pokemon seel would
  saved.mon = 'seel'
  saved.stats = { ...saved.stats, seel: { xp: 1728 } }
  await clock.advance(3000)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toMatch(/^Showing default Abra Lv\. 9/)
})

test('a mon evolved in another session evolves here too, and picking the old one shows it again', async ($, on) => {
  const saved: Record<string, any> = { trainer: false, mon: 'charmander', stats: { charmander: { xp: 3000, nickname: 'Embers' } } }
  const { clock } = await startedWith($, on, saved, 0)
  // Another session evolves it, as its moveRecord would
  saved.stats = { charmeleon: { xp: 4096, nickname: 'Embers' } }
  saved.evolved = { charmander: 'charmeleon' }
  await clock.advance(1100)
  expect((await $.command.run({ command: 'pokemon', args: 'stats' })).text).toMatch(/^Embers \(Charmeleon\), Lv\./)
  expect(saved.stats.charmander).toBeUndefined()

  await $.command.run({ command: 'pokemon', args: 'charmander' })
  expect(saved.evolved).toEqual({})
  await clock.advance(1100)
  expect((await $.command.run({ command: 'pokemon', args: 'stats' })).text).toMatch(/^Charmander, Lv\. 5,/)
})

test('a new session starts with the mon last picked in any session, and old per-session keys are cleared', async ($, on) => {
  const saved: Record<string, any> = { trainer: false, mon: 'abra', 'mon:old-session': { name: 'ditto', at: 0 }, 'busy:old-session': 0 }
  await startedWith($, on, saved, 0)
  await $.command.run({ command: 'pokemon', args: 'ditto' })
  expect(saved.mon).toBe('ditto')
  saved.mon = 'bulbasaur'
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toMatch(/^Showing default Bulbasaur /)
  expect(Object.keys(saved).some((key) => key.startsWith('mon:') || key.startsWith('busy:'))).toBe(false)
})

test('put to bed in another session showing the same mon, it sleeps here too', async ($, on) => {
  const saved: Record<string, any> = { mon: 'abra', stats: { abra: { food: { value: 80, at: 0 }, happiness: { value: 80, at: 0 } } } }
  const { clock } = await startedWith($, on, saved, 0)
  // Another session tucks it in, as its /pokemon sleep would
  saved.stats = { abra: { asleep: true, food: { value: 80, at: 0 }, happiness: { value: 80, at: 0 } } }
  await clock.advance(1100)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain('Abra Lv. 5, asleep')
})

test('a mon parked by a session that switched away keeps draining while this one shows it', async ($, on) => {
  const full = { value: 100, at: 0 }
  const saved: Record<string, any> = { mon: 'abra', stats: { abra: { food: full, happiness: full } } }
  const { clock } = await startedWith($, on, saved, 4 * HOUR)
  // Another session showing Abra switches away, parking it at its meters as of now
  saved.stats = { abra: { food: { value: 50, at: 4 * HOUR }, happiness: { value: 200 / 3, at: 4 * HOUR }, parked: true } }
  await clock.advance(1100)
  expect(saved.stats.abra.parked).toBeUndefined()
  expect(saved.stats.abra.food).toEqual({ value: 50, at: 4 * HOUR })
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toContain('food 50%, happiness 67%')
})

test('saving this mon\'s meters keeps the records other sessions saved', async ($, on) => {
  const saved: Record<string, any> = { mon: 'abra' }
  const { clock } = await startedWith($, on, saved, 0)
  // Another session feeds its Seel after this one started
  saved.stats = { seel: { food: { value: 100, at: 0 }, happiness: { value: 90, at: 0 } } }
  await $.command.run({ command: 'pokemon', args: 'pet' })
  // The happiness is paid once the hearts have floated away
  await clock.advance(10 * 1000)
  expect(saved.stats.seel.food.value).toBe(100)
  expect(saved.stats.abra.happiness).toBeDefined()
})

test('a hungry idle mon shows a berry bubble until it is fed', async ($, on) => {
  const low = { value: 15, at: 0 }
  const fine = { value: 90, at: 0 }
  const { clock, blits } = await startedWith($, on, { stats: { abra: { food: low, happiness: fine } } }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  const hungry = await shown(ui, blits)
  expect(paints(hungry, BUBBLE_OUTLINE)).toBe(true)
  expect(paints(hungry, 0xd84040)).toBe(true)
  expect(paints(hungry, 0xf0609a)).toBe(false)

  await $.command.run({ command: 'pokemon', args: 'feed' })
  await $.command.run({ command: 'pokemon', args: 'feed' })
  await clock.advance(10 * 1000)
  expect(paints(blits[blits.length - 1], 0xd84040)).toBe(false)
})

test('a lonely idle mon shows a heart bubble', async ($, on) => {
  const low = { value: 10, at: 0 }
  const fine = { value: 90, at: 0 }
  const { clock, blits } = await startedWith($, on, { stats: { abra: { food: fine, happiness: low } } }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), 0xf0609a)).toBe(true)
})

const PANE = {
  plugin: 'pokemon',
  component: 'Pane',
  requestId: 'pokemon',
  viewport: { columns: 200, rows: 50, isFullscreen: true },
  props: {
    title: 'Pokémon',
    isFocused: false,
    bodyColumns: 98,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 46 },
    view: {},
  },
} as const

// Answers the pane calls as a fullscreen terminal does, keeping what was asked
function paneEngine(on) {
  const opened: any[] = []
  const closed: any[] = []
  on('ui.open', ($, e) => {
    opened.push(e)
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, e) => {
    closed.push(e)
    return { value: undefined }
  })
  return { opened, closed }
}

test('/pokemon pane moves the scene from the band into a pane half the terminal wide', async ($, on) => {
  const saved: Record<string, unknown> = { mon: 'abra' }
  const { opened } = paneEngine(on)
  await startedWith($, on, saved, 0)
  const answer = await $.command.run({ command: 'pokemon', args: 'pane' })
  expect(answer.text).toContain('pane')
  expect(opened).toHaveLength(1)
  expect(opened[0].id).toBe('pokemon')
  expect(opened[0].columns ?? 0).toBe(Math.floor(Number(saved.paneColumns)))
  expect(saved.pane).toBe(true)
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await pane.find({ key: 'pokemon' })).toBeDefined()
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ key: 'pokemon' })).toBeUndefined()
})

test('/pokemon pane again brings the scene back to the band', async ($, on) => {
  const saved: Record<string, unknown> = { mon: 'abra' }
  const { closed } = paneEngine(on)
  await startedWith($, on, saved, 0)
  await $.command.run({ command: 'pokemon', args: 'pane' })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const answer = await $.command.run({ command: 'pokemon', args: 'pane' })
  expect(answer.text).toContain('back above the prompt')
  expect(closed.map((e) => e.id)).toEqual(['pokemon'])
  expect(saved.pane).toBe(false)
  await pane.unmount()
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ key: 'pokemon' })).toBeDefined()
})

test('a session that left the scene in the pane opens it again on start', async ($, on) => {
  const { opened } = paneEngine(on)
  await startedWith($, on, { mon: 'abra', pane: true, paneColumns: 90 }, 0)
  expect(opened.map((e) => [e.id, e.columns])).toEqual([['pokemon', 90]])
})
