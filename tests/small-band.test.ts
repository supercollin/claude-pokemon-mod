import { expect, mock } from 'claude-code/testing'
import { DOT_EYED, keptEyesOf, pupilsOf } from '../hooks/eyes.js'
import { SPRITES } from '../hooks/frames.js'
import { encodePng } from '../hooks/png.js'
import { zoomedPixel } from '../hooks/zoom.js'
import { test, BAND, THEIRS, MARGIN, STRIP, PANEL, RASTER, paints, PIXEL_PX, svgOf, started, SPINNER, BUBBLE_OUTLINE, Z_COLOR, BERRY_BODIES, GHOSTTY, startedWith, shown, colorsOf, pngSize, imageColors, DENY_IMAGES, DOTS, } from './helpers.ts'

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of bytes) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}

function adler32(bytes: number[]): number {
  let [a, b] = [1, 0]
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

// Each chunk of a PNG, in order, with whether its CRC matches
function pngParts(png: string): { type: string; data: Uint8Array; crcOk: boolean }[] {
  const bytes = Uint8Array.fromBase64(png)
  const view = new DataView(bytes.buffer)
  const parts = []
  for (let at = 8; at < bytes.length; ) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
    const crcOk = crc32(bytes.subarray(at + 4, at + 8 + length)) === view.getUint32(at + 8 + length)
    parts.push({ type, data: bytes.subarray(at + 8, at + 8 + length), crcOk })
    at += 12 + length
  }
  return parts
}

test('png.js writes a valid paletted PNG, with every chunk checksummed', async () => {
  // Red, see-through, blue, red
  const rgba = new Uint8Array([255, 0, 0, 255, 9, 9, 9, 0, 0, 0, 255, 255, 255, 0, 0, 255])
  const png = encodePng(2, 2, rgba)
  expect(Array.from(Uint8Array.fromBase64(png).subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const parts = pngParts(png)
  expect(parts.map((part) => part.type)).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'])
  expect(parts.every((part) => part.crcOk)).toBe(true)
  expect(pngSize(png)).toEqual({ width: 2, height: 2 })
  // 8 bits per index, a palette of colors in order of first use, the see-through one black
  expect(Array.from(parts[0].data.subarray(8))).toEqual([8, 3, 0, 0, 0])
  expect(Array.from(parts[1].data)).toEqual([255, 0, 0, 0, 0, 0, 0, 0, 255])
  expect(Array.from(parts[2].data)).toEqual([255, 0, 255])
  // A zlib stream of one final fixed Huffman block, ending in the Adler-32 of the rows,
  // each filtered against the one above
  const idat = parts[3].data
  expect([idat[0], idat[1], idat[2] & 7]).toEqual([0x78, 0x01, 3])
  const sum = new DataView(idat.slice(-4).buffer).getUint32(0)
  expect(sum).toBe(adler32([2, 0, 1, 2, 2, 255]))
  expect(parts[4].data.length).toBe(0)

  // Past 256 colors, the pixels go out as RGBA
  const many = new Uint8Array(32 * 32 * 4).map((_, i) => [(i >> 2) & 255, i >> 10, 0, 255][i % 4])
  const rgbaParts = pngParts(encodePng(32, 32, many))
  expect(rgbaParts.map((part) => part.type)).toEqual(['IHDR', 'IDAT', 'IEND'])
  expect(rgbaParts[0].data[9]).toBe(6)
  expect(rgbaParts.every((part) => part.crcOk)).toBe(true)
})

test('png.js encodes a sprite frame the same way every time, in a small part of its RGBA', async () => {
  const { palette, idle } = SPRITES.gyarados.variants.default
  const [width, height, up] = [64, SPRITES.gyarados.height + 4, 4]
  const rgba = new Uint8Array(width * up * height * up * 4)
  idle[0].rows.forEach((row, y) =>
    [...row].forEach((letter, x) => {
      if (letter === '.') return
      const hex = parseInt(palette[letter.charCodeAt(0) - 97].slice(1), 16)
      for (let dy = 0; dy < up; dy++) {
        for (let dx = 0; dx < up; dx++) rgba.set([hex >> 16, (hex >> 8) & 255, hex & 255, 255], (((y + 2) * up + dy) * width * up + (x + 10) * up + dx) * 4)
      }
    }),
  )
  const png = encodePng(width * up, height * up, rgba)
  expect(encodePng(width * up, height * up, rgba)).toBe(png)
  expect(pngSize(png)).toEqual({ width: width * up, height: height * up })
  expect(pngParts(png).every((part) => part.crcOk)).toBe(true)
  expect(Uint8Array.fromBase64(png).length).toBeLessThan(rgba.length / 20)
})

test('a refused frame, as when a resize remounts the band, asks for a redraw at most once a second', async ($, on) => {
  const clock = mock.clock(on)
  let renders = 0
  let refuse = false
  on('ui.render', () => {
    renders += 1
    return THEIRS
  })
  on('ui.blit', () => ({ value: refuse ? { deny: 'not mounted' } : {} }))
  on('ui.log', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('command.register', () => ({ value: undefined }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(500)
  const before = renders

  refuse = true
  await clock.advance(500)
  expect(renders).toBe(before + 1)
  await clock.advance(1000)
  expect(renders).toBe(before + 2)
})

test('a short pane shrinks the band to fit, and a very short one shows a one-line badge', async ($, on) => {
  const { clock, blits } = await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  // Abra needs 11 rows, so 6 rows shrink the 40 column strip to 22
  const short = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, maxRows: 6 } })
  const raster = (await short.find({ key: 'pokemon' })).props
  expect(raster.rows).toBe(6)
  expect(raster.columns).toBe(22)
  expect(colorsOf(raster.cells).size).toBeGreaterThan(3)
  await clock.advance(2000)
  expect(blits.length).toBeGreaterThan(0)
  expect(blits.every((cells) => cells.length === raster.cells.length)).toBe(true)
  await short.unmount()

  const tiny = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, maxRows: 3 } })
  expect(await tiny.find({ key: 'pokemon' })).toBeUndefined()
  expect(await tiny.find({ type: 'Text', text: /^Abra Lv 5$/ })).toBeDefined()
  expect(await tiny.find({ type: 'Text', text: ' ●●●●○' })).toBeDefined()
})

// A small band lays out like a full-size one, its margin and panel included, at half
// the columns. Abra's 11 rows halve to 6, the full-size scene padded to 12 on top.
const SMALL = (MARGIN + STRIP + 2 * PANEL) / 2

// The env.get stub for a terminal, by the names TERM_PROGRAM and TERM_PROGRAM_VERSION
function terminalEnv(on, env: Record<string, string>) {
  on('env.get', ($, e) => ({ value: env[e.name] }))
}

test('/pokemon size small halves the band, saves it, and large brings it back', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, sent } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const full = (await ui.find({ key: 'pokemon' })).props
  expect(full.columns).toBe(RASTER)

  const small = await $.command.run({ command: 'pokemon', args: 'size small' })
  expect(small.text).toBe('The band is small.')
  expect(saved.size).toBe('small')
  await clock.advance(100)
  // The terminal scales the Image, so it holds every full-size pixel, 4 wide and tall
  const image = await ui.find({ type: 'Image', key: 'pokemon' })
  expect(image.key).toBe('pokemon')
  expect(image.props.rows).toBe(Math.ceil(full.rows / 2))
  expect(image.props.columns).toBe(SMALL)
  expect(pngSize(image.props.source.png)).toEqual({ width: SMALL * 2 * 4, height: 12 * 2 * 4 })
  expect(imageColors(image.props.source.png).size).toBeGreaterThan(3)
  expect(await ui.find({ type: 'Text', text: '●●●●○' })).toBeDefined()

  // Later frames swap the one Image's source, as new frames do a Raster's cells
  const from = sent.length
  await clock.advance(2000)
  const swaps = sent.slice(from)
  expect(swaps.length).toBeGreaterThan(0)
  expect(swaps.every((e) => e.key === 'pokemon' && e.source && e.columns === SMALL && e.rows === image.props.rows)).toBe(true)
  expect(swaps.some((e, i) => i > 0 && e.source.png === swaps[i - 1].source.png)).toBe(false)
  expect(await ui.findAll({ type: 'Image', key: 'pokemon' })).toHaveLength(1)

  const status = await $.command.run({ command: 'pokemon', args: 'size' })
  expect(status.text).toBe('The band is small. Sizes: small, large.')
  const unknown = await $.command.run({ command: 'pokemon', args: 'size huge' })
  expect(unknown.text).toBe('Unknown size "huge". Try one of: small, large.')
  expect(saved.size).toBe('small')

  await $.command.run({ command: 'pokemon', args: 'size large' })
  expect(saved.size).toBe('large')
  await clock.advance(100)
  expect((await ui.find({ key: 'pokemon' })).props.columns).toBe(RASTER)
  expect(await ui.find({ type: 'Image', key: 'pokemon' })).toBeUndefined()
})

// Start a session with the small size saved, each blit answered by answer
async function startedSmall($, on, answer: (e: any) => object) {
  const clock = mock.clock(on)
  on('ui.render', () => THEIRS)
  on('ui.blit', ($, e) => ({ value: answer(e) }))
  on('ui.log', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  terminalEnv(on, GHOSTTY)
  on('command.register', () => ({ value: undefined }))
  on('store.get', ($, e) => ({ value: e.key === 'size' ? 'small' : undefined }))
  on('store.set', () => ({ value: undefined }))
  on('store.keys', () => ({ value: [] }))
  on('store.delete', () => ({ value: undefined }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return clock
}

test('a terminal that draws an Image as its alt gets the small band in half blocks, asking again less and less often', async ($, on) => {
  const kinds: string[] = []
  const clock = await startedSmall($, on, (e) => {
    kinds.push(e.cells ? 'cells' : 'image')
    return e.cells ? {} : { deny: 'the Image draws its alt here: the terminal draws no placeholder images' }
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Image' })).toBeDefined()

  await clock.advance(200)
  const raster = await ui.find({ key: 'pokemon' })
  expect(raster.type).toBe('Raster')
  expect(raster.props.columns).toBe(SMALL)
  expect(colorsOf(raster.props.cells).size).toBeGreaterThan(3)
  const asked = kinds.filter((kind) => kind === 'image').length
  expect(asked).toBeGreaterThan(0)
  await clock.advance(1000)
  expect(kinds.filter((kind) => kind === 'image')).toHaveLength(asked)
  expect(kinds).toContain('cells')

  // The waits go 2, 4, 8, 16, and 32 seconds, so a minute holds only a few asks
  await clock.advance(60 * 1000)
  const retries = kinds.filter((kind) => kind === 'image').length - asked
  expect(retries).toBeGreaterThanOrEqual(3)
  expect(retries).toBeLessThanOrEqual(8)
  expect((await ui.find({ key: 'pokemon' })).type).toBe('Raster')
})

test('a terminal whose graphics are not ready yet gets the small band back as an Image', async ($, on) => {
  let ready = false
  const answers: boolean[] = []
  const clock = await startedSmall($, on, (e) => {
    if (e.cells) return {}
    answers.push(ready)
    return ready ? {} : { deny: 'the Image draws its alt here: kitty graphics not asked yet' }
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(200)
  expect((await ui.find({ key: 'pokemon' })).type).toBe('Raster')

  ready = true
  await clock.advance(3000)
  const image = await ui.find({ key: 'pokemon' })
  expect(image.type).toBe('Image')
  expect(image.props.columns).toBe(SMALL)
  const from = answers.length
  await clock.advance(2000)
  expect(answers.length).toBeGreaterThan(from)
  expect(answers.slice(from).every(Boolean)).toBe(true)

  // Once it has drawn Images, a deny is brief, so the Image comes back after the first wait
  // The deny comes with the next changed frame, well inside the 2 s wait
  ready = false
  await clock.advance(1000)
  expect((await ui.find({ key: 'pokemon' })).type).toBe('Raster')
  ready = true
  await clock.advance(3000)
  expect((await ui.find({ key: 'pokemon' })).type).toBe('Image')
})

test('only kitty, Ghostty, and iTerm2 builds whose Image swaps work draw the small band as an Image, and the rest draw half blocks no shorter than Diglett', { timeoutMs: 30000 }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: any[] = []
  let env: Record<string, string> = {}
  on('ui.render', () => THEIRS)
  on('ui.blit', ($, e) => {
    if (e.key === 'pokemon') blits.push(e)
    return { value: {} }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('env.get', ($, e) => ({ value: env[e.name] }))
  on('command.register', () => ({ value: undefined }))
  on('store.get', ($, e) => ({ value: e.key === 'size' ? 'small' : undefined }))
  on('store.set', () => ({ value: undefined }))
  on('store.keys', () => ({ value: [] }))
  on('store.delete', () => ({ value: undefined }))
  const iterm = (version?: string) => (version ? { TERM_PROGRAM: 'iTerm.app', TERM_PROGRAM_VERSION: version } : { TERM_PROGRAM: 'iTerm.app' })
  const cases: [Record<string, string>, boolean][] = [
    [iterm('3.7.3'), false],
    [iterm('3.7.4'), false],
    [iterm('3.6.9'), false],
    [iterm('3.7.5'), true],
    [iterm('3.7.6'), true],
    [iterm('3.7.20260901-nightly'), false],
    [iterm(), false],
    [iterm('3.7.20261008-nightly'), true],
    [iterm('3.8.0'), true],
    [{ TERM_PROGRAM: 'ghostty', TERM_PROGRAM_VERSION: '1.2.0' }, true],
    [{ TERM: 'xterm-kitty' }, true],
    [{ KITTY_WINDOW_ID: '1' }, true],
    [{ TERM_PROGRAM: 'vscode', TERM_PROGRAM_VERSION: '1.105.0' }, false],
    [{ TERM_PROGRAM: 'Apple_Terminal', TERM_PROGRAM_VERSION: '466' }, false],
    [{ TERM_PROGRAM: 'WezTerm' }, false],
    [{ TERM_PROGRAM: 'tmux' }, false],
    // herdr draws images only through an app that draws them itself
    [{ TERM_PROGRAM: 'herdr', TERM_PROGRAM_VERSION: '0.9.3', __CFBundleIdentifier: 'com.googlecode.iterm2' }, true],
    [{ TERM_PROGRAM: 'herdr', __CFBundleIdentifier: 'com.mitchellh.ghostty' }, true],
    [{ TERM_PROGRAM: 'herdr', __CFBundleIdentifier: 'com.apple.Terminal' }, false],
    [{ TERM_PROGRAM: 'herdr' }, false],
    // Obsidian's terminal, xterm.js like VS Code's, sets no TERM_PROGRAM of its own
    [{ TERM: 'xterm-256color' }, false],
  ]
  for (const [terminal, image] of cases) {
    env = terminal
    const where = JSON.stringify(terminal)
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
    blits.length = 0
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    await clock.advance(1000)
    const band = await ui.find({ key: 'pokemon' })
    expect({ where, type: band.type }).toEqual({ where, type: image ? 'Image' : 'Raster' })
    expect({ where, swaps: blits.length > 0 && blits.every((e) => (image ? e.source : e.cells)) }).toEqual({ where, swaps: true })
    // Abra's 11 rows halve to 6 in an Image, and stop at a full-size Diglett's 7 in half blocks
    expect({ where, rows: band.props.rows }).toEqual({ where, rows: image ? 6 : 7 })
    await ui.unmount()
  }
})

test('/pokemon images on and off override the terminal list, are saved, and auto goes back to it', async ($, on) => {
  const saved: Record<string, any> = { size: 'small' }
  const { clock } = await startedWith($, on, saved, 0, { TERM: 'xterm-256color' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const drawn = async () => {
    await clock.advance(100)
    return [(await ui.find({ key: 'pokemon' })).type, (await ui.find({ key: 'hearts' }))?.type ?? 'Text']
  }
  expect(await drawn()).toEqual(['Raster', 'Text'])
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('images')).toBe('Images are auto, so the band draws half blocks. Modes: auto, on, off.')

  expect(await run('images on')).toBe('Images are on, so the band draws images.')
  expect(saved.images).toBe('on')
  expect(await drawn()).toEqual(['Image', 'Image'])

  expect(await run('images auto')).toBe('Images are auto, so the band draws half blocks.')
  expect(await drawn()).toEqual(['Raster', 'Text'])
  expect(await run('images sixel')).toBe('Unknown mode "sixel". Try one of: auto, on, off.')
})

test('/pokemon images off draws half blocks and text hearts even where the terminal draws Images', async ($, on) => {
  const { clock } = await startedWith($, on, { size: 'small', images: 'off' }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  expect((await ui.find({ key: 'pokemon' })).type).toBe('Raster')
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '♥♥♥♥♡' })).toBeDefined()
})

test('a half block small band shrinks no shorter than a full-size Diglett', async ($, on) => {
  const { clock } = await startedWith($, on, { trainer: false, size: 'small' }, 0, { TERM_PROGRAM: 'Apple_Terminal' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  // Diglett stays at its full 7 rows, Bulbasaur's 10 stop at 7, and Gyarados's 17 halve to 9
  for (const [mon, rows] of [['diglett', 7], ['bulbasaur', 7], ['gyarados', 9]] as const) {
    await $.command.run({ command: 'pokemon', args: mon })
    await clock.advance(100)
    const band = await ui.find({ key: 'pokemon' })
    expect({ mon, type: band.type, rows: band.props.rows }).toEqual({ mon, type: 'Raster', rows })
  }
  const result = await $.command.run({ command: 'pokemon', args: 'size small' })
  expect(result.text).toBe('The band is small.')
})

// How many pixels paint a color, two per cell with half blocks
function pixelCount(cells: string, color: number): number {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  let count = 0
  for (let i = 0; i < words.length; i += 3) {
    const [cp, fg, bg] = [words[i], words[i + 1], words[i + 2]]
    const pair = cp === 0x2580 ? [fg, bg] : cp === 0x2584 ? [bg, fg] : cp === 0x20 ? [bg, bg] : []
    count += pair.filter((c) => c === color).length
  }
  return count
}

test('a half block small band draws a smaller thought bubble around small icon art', async ($, on) => {
  const { clock } = await startedWith($, on, { mon: 'gyarados', size: 'small' }, 0, {}, (e) => (e.source ? DENY_IMAGES : {}))
  await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(200)
  const raster = (await ui.find({ key: 'pokemon' })).props
  // The small 7 by 7 outline is 20 pixels, and the tail one more
  expect(pixelCount(raster.cells, BUBBLE_OUTLINE)).toBe(21)
  expect(paints(raster.cells, DOTS)).toBe(true)
})

test('a half block small band draws whole Zs and a small whole berry instead of specks', async ($, on) => {
  const { clock, blits } = await startedWith($, on, { mon: 'gyarados', size: 'small', wander: false }, 0, {}, (e) => (e.source ? DENY_IMAGES : {}))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.command.run({ command: 'pokemon', args: 'feed' })
  await clock.advance(1000)
  const falling = await shown(ui, blits)
  // The small berry's body is two pixels either side of its highlight
  expect(BERRY_BODIES.filter((c) => pixelCount(falling, c) === 2)).toHaveLength(1)

  await clock.advance(60 * 1000)
  await $.command.run({ command: 'pokemon', args: 'sleep' })
  await clock.advance(2000)
  // Each small Z is seven pixels, and two or three are in the air at once
  const zs = pixelCount(await shown(ui, blits), Z_COLOR)
  expect(zs).toBeGreaterThan(0)
  expect(zs).toBeLessThanOrEqual(3 * 7)
})

test('a shrunk mon with dot eyes keeps a pixel of every eye, facing you or walking, line eyes included', () => {
  const cases = [['pikachu', 'idle', 2], ['pidgey', 'idle', 2], ['wartortle', 'idle', 2], ['gyarados', 'idle', 2], ['snorlax', 'idle', 2], ['snorlax', 'walk', 1], ['abra', 'walk', 1]] as const
  for (const [mon, view, eyes] of cases) {
    const sprite = SPRITES[mon]
    const { palette } = sprite.variants.default
    const rows = sprite.variants.default[view][0].rows
    const colorOf = (x: number, y: number) => ((rows[y]?.[x] ?? '.') === '.' ? null : parseInt(palette[rows[y].charCodeAt(x) - 97].slice(1), 16))
    const pupils = pupilsOf(rows, palette, keptEyesOf(mon, 'default', view, 0))
    expect(pupils.length).toBe(eyes)
    const scale = 16 / sprite.height
    // Wherever the blocks fall as the mon walks, each eye's own zoomed pixel shows its pupil
    for (let dx = 0; dx < 3; dx++) {
      const columns = sprite.width + dx
      const pixelAt = (x: number, y: number) => (x < dx || x >= columns ? null : colorOf(x - dx, y))
      const shifted = pupils.map(([x, y]) => [x + dx, y, colorOf(x, y)] as const)
      const at = zoomedPixel(pixelAt, { columns, pixels: sprite.height, scale, pupils: shifted })
      // The zoomed pixel whose block holds full-size pixel v, cut as the zoom cuts them
      const cellOf = (v: number, size: number) => {
        const count = Math.round(size * scale)
        let t = 0
        while (t + 1 < count && Math.ceil(((t + 1) * size) / count) <= v) t++
        return t
      }
      for (const [x, y, color] of shifted) expect(at(cellOf(x, columns), cellOf(y, sprite.height))).toBe(color)
    }
  }
})

test('a shrunk mon with eyes bigger than a dot keeps the eyes the votes give it', () => {
  for (const mon of ['pikachu', 'bulbasaur', 'pidgey', 'snorlax', 'abra']) expect(DOT_EYED.has(mon)).toBe(true)
  for (const mon of ['jigglypuff', 'machoke', 'charizard', 'gengar']) {
    expect(DOT_EYED.has(mon)).toBe(false)
    const { palette } = SPRITES[mon].variants.default
    for (const view of ['idle', 'walk'] as const) {
      expect(pupilsOf(SPRITES[mon].variants.default[view][0].rows, palette, keptEyesOf(mon, 'default', view, 0))).toEqual([])
    }
  }
})

test("a shrunk Bulbasaur's eyes both show its dark pupil, not one glint and one gray", () => {
  const sprite = SPRITES.bulbasaur
  const { palette, idle } = sprite.variants.default
  const pupils = pupilsOf(idle[0].rows, palette, keptEyesOf('bulbasaur', 'default', 'idle', 0))
  expect(pupils.map(([x, y]) => idle[0].rows[y][x])).toEqual(['i', 'i'])
  // At the half block scale, wherever the blocks fall, each eye is one pupil pixel and
  // none of its glint or red is left beside it
  const colorOf = (l: string) => parseInt(palette[l.charCodeAt(0) - 97].slice(1), 16)
  const rows = idle[0].rows
  const scale = 0.7
  for (let dx = 0; dx < 4; dx++) {
    const columns = sprite.width + dx
    const pixelAt = (x: number, y: number) => {
      const l = x < dx || x >= columns ? '.' : (rows[y]?.[x - dx] ?? '.')
      return l === '.' ? null : colorOf(l)
    }
    const shifted = pupils.map(([x, y, box, skin, inked]) => [x + dx, y, colorOf('i'), [box[0] + dx, box[1], box[2], box[3], colorOf(skin), [...inked].map(colorOf)]])
    const at = zoomedPixel(pixelAt, { columns, pixels: sprite.height, scale, pupils: shifted })
    const shown = { i: 0, other: 0 }
    for (let ty = 0; ty < Math.round(sprite.height * scale); ty++) {
      for (let tx = 0; tx < Math.round(columns * scale); tx++) {
        const c = at(tx, ty)
        if (c === colorOf('i')) shown.i++
        else if (['h', 'j', 'k'].some((l) => colorOf(l) === c)) shown.other++
      }
    }
    expect(shown).toEqual({ i: 2, other: 0 })
  }
})

test('a small band keeps animating through an attack, a pet, and a feed', async ($, on) => {
  const { clock, sent } = await startedWith($, on, { size: 'small', wander: false }, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  // The Image swaps over two seconds, and the colors they paint
  const swapsOver = async () => {
    const from = sent.length
    await clock.advance(2000)
    const swaps = sent.slice(from)
    expect(swaps.every((e) => e.source && e.key === 'pokemon')).toBe(true)
    return { pngs: new Set<string>(swaps.map((e) => e.source.png)), colors: new Set(swaps.flatMap((e) => [...imageColors(e.source.png)])) }
  }
  await clock.advance(5000)
  const idle = await swapsOver()

  await $.command.run({ command: 'pokemon', args: 'attack' })
  const attack = await swapsOver()
  expect([...attack.pngs].filter((png) => !idle.pngs.has(png)).length).toBeGreaterThan(3)

  await clock.advance(5000)
  await $.command.run({ command: 'pokemon', args: 'pet' })
  const pet = await swapsOver()
  expect(idle.colors.has(0xff4f8b)).toBe(false)
  expect(pet.colors.has(0xff4f8b)).toBe(true)

  await clock.advance(5000)
  await $.command.run({ command: 'pokemon', args: 'feed' })
  const feed = await swapsOver()
  expect(BERRY_BODIES.some((color) => idle.colors.has(color))).toBe(false)
  expect(BERRY_BODIES.some((color) => feed.colors.has(color))).toBe(true)
})

test('a short pane that shrinks a small band further lays it out no wider than large', async ($, on) => {
  await startedWith($, on, {}, 0)
  const columns: Record<string, number> = {}
  for (const size of ['large', 'small']) {
    await $.command.run({ command: 'pokemon', args: 'size ' + size })
    // Abra's 11 rows would halve to 6, so a 5 row pane shrinks either size to the same scale
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, maxRows: 5 } })
    const band = (await ui.find({ key: 'pokemon' })).props
    expect(band.rows).toBe(5)
    columns[size] = band.columns
    expect(await ui.find({ type: 'Text', text: '●●●●○' })).toBeDefined()
    await ui.unmount()
  }
  expect(columns.small).toBeLessThanOrEqual(columns.large)
})

test('a battle that fits a large band fits a small one in the same pane', async ($, on) => {
  const { clock } = await startedWith($, on, { mon: 'charizard', emoji: true, wander: false, debug: true }, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  for (const size of ['large', 'small']) {
    await run('size ' + size)
    // The narrowest band a large Charizard battles a Gyarados in, with emoji meters
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: 82 } })
    expect({ size, reply: await run('wild gyarados') }).toEqual({ size, reply: 'A wild Gyarados is on its way.' })
    await clock.advance(10000)
    expect((await ui.find({ key: 'pokemon' })).props.columns).toBeLessThanOrEqual(82)
    await run('run')
    await clock.advance(10000)
    await ui.unmount()
  }
})

// The pixel rows a half-block raster columns wide paints in any of colors
function rowsPainted(cells: string, columns: number, colors: number[]): number {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  const rows = new Set<number>()
  for (let i = 0; i < words.length; i += 3) {
    const [cp, fg, bg] = [words[i], words[i + 1], words[i + 2]]
    const pair = cp === 0x2580 ? [fg, bg] : cp === 0x2584 ? [bg, fg] : cp === 0x20 ? [bg, bg] : []
    const row = Math.floor(i / 3 / columns) * 2
    pair.forEach((c, k) => colors.includes(c) && rows.add(row + k))
  }
  return rows.size
}

test('a half block small band draws a short foe as tall as its own small band, no shorter than a large Diglett', async ($, on) => {
  const { clock, blits, widths } = await startedWith($, on, { mon: 'snorlax', wander: false, debug: true }, 0, { TERM_PROGRAM: 'Apple_Terminal' })
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  // Diglett's colors from its head to its mound, all but the black and gray Snorlax paints
  const DIGLETT = [0x403010, 0x987838, 0x704820, 0xc8c8c8, 0x707070, 0x680828, 0xd04068, 0xe87098, 0x982048, 0xa8a8a8]
  const tall: Record<string, number> = {}
  for (const size of ['large', 'small']) {
    await run('size ' + size)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: 120 } })
    expect(await run('wild diglett')).toBe('A wild Diglett is on its way.')
    await clock.advance(10000)
    const columns = widths[widths.length - 1] ?? (await ui.find({ key: 'pokemon' })).props.columns
    tall[size] = rowsPainted(await shown(ui, blits), columns, DIGLETT)
    await run('run')
    await clock.advance(10000)
    await ui.unmount()
  }
  // At half scale beside Snorlax, a 12 px Diglett would paint 6 rows. A small Diglett on
  // show stays full size in half blocks, so as a foe it paints as many as at large too,
  // give or take a row the shrink rounds off.
  expect(tall.small).toBeGreaterThanOrEqual(tall.large - 1)
  expect(tall.large).toBe(12)
})

// A small band's rows with the home mon alone, as the second mon, and then beside a wild first
async function smallBattleRows($, on, env: Record<string, string>, [first, second]: [string, string]) {
  const { clock } = await startedWith($, on, { trainer: false, mon: first, size: 'small', wander: false, debug: true }, 0, env)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: 120 } })
  const rows = async () => {
    await clock.advance(200)
    return (await ui.find({ key: 'pokemon' })).props.rows
  }
  const alone = await rows()
  await run(second)
  const home = await rows()
  expect(await run('wild ' + first)).toMatch(/^A wild .+ is on its way\.$/)
  await clock.advance(10000)
  return { alone, home, battle: await rows() }
}

test('a small band draws a foe as tall as it would be on show, growing the band for a big one', async ($, on) => {
  const { alone, home, battle } = await smallBattleRows($, on, {}, ['snorlax', 'jigglypuff'])
  expect(home).toBeLessThan(alone)
  expect(battle).toBe(alone)
})

test('a half block small band draws a big foe as tall as it would be on show too', async ($, on) => {
  const { alone, home, battle } = await smallBattleRows($, on, { TERM_PROGRAM: 'Apple_Terminal' }, ['snorlax', 'jigglypuff'])
  expect(home).toBeLessThan(alone)
  // Give or take a row the half blocks round off
  expect(Math.abs(battle - alone)).toBeLessThanOrEqual(1)
})

// A wild Snorlax beside Jigglypuff in a 12 row band, which fits only Jigglypuff's 9 at full
// size, as the sprite's columns and rows at home and then in battle
async function tallFoeShown($, on, surface: 'terminal' | 'desktop') {
  const { clock } = await startedWith($, on, { mon: 'jigglypuff', wander: false, debug: true }, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  const ui = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, maxRows: 12 } })
  const shown = async () => {
    await clock.advance(200)
    if (surface === 'terminal') return (await ui.find({ key: 'pokemon' })).props
    const { width, height } = (await ui.find({ type: 'Svg' })).props
    return { columns: width / PIXEL_PX, rows: height / PIXEL_PX / 2 }
  }
  const home = await shown()
  expect(await run('wild snorlax')).toMatch(/^A wild .+ is on its way\.$/)
  await clock.advance(10000)
  return { home, battle: await shown() }
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`a foe too tall for a short band on ${surface} shrinks to fit it, and the home mon keeps its size`, async ($, on) => {
    const { home, battle } = await tallFoeShown($, on, surface)
    expect(home.rows).toBe(9)
    expect(battle.rows).toBe(12)
    // Shrinking the whole scene to fit Snorlax would take its columns down with it
    expect(battle.columns).toBeGreaterThanOrEqual(home.columns)
  })
}

test('a saved small size draws the band small from the start, and a short pane still shrinks it', async ($, on) => {
  await startedWith($, on, { size: 'small' }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Image' })).props.columns).toBe(SMALL)
  await ui.unmount()

  // Abra's 11 rows would halve to 6, so a 5 row pane shrinks it further
  const short = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, maxRows: 5 } })
  expect((await short.find({ type: 'Image' })).props.rows).toBe(5)
})

test('a small band on desktop draws every full-size pixel into a half-size Svg', async ($, on) => {
  await startedWith($, on, { size: 'small' }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  // No panel on desktop: the margin and the strip, at half the columns, the meters beside
  expect(svg.props.width).toBe(((MARGIN + STRIP) / 2) * PIXEL_PX)
  expect(svg.props.height).toBe(6 * 2 * PIXEL_PX)
  expect(svgOf(svg)).toMatch(/viewBox="0 0 52 24"/)
  expect(await ui.find({ type: 'Text', text: '●●●●○' })).toBeDefined()
})
