import { HEART_CELL, HEART_ICON, HEART_TOP, METER_STYLES } from './art.js'
import { DEFAULT_COLOR, IMAGE_UP, IMAGE_WAIT_TICKS } from './constants.js'
import { bandRows, bandZoom, isSmall, panelEdge, sceneColumns } from './layout.js'
import { STAT_ICONS } from './meters.js'
import { encodePng } from './png.js'
import { frameNow } from './scene.js'
import { S } from './state.js'
import { zoomedAt } from './zoom.js'

// The frame packed for the surface it shows on: Raster cells, a PNG for the small band's
// Image, or an Svg on the desktop, and the happiness meter's pixel hearts

const UPPER_HALF = 0x2580
const LOWER_HALF = 0x2584
const SPACE = 0x20

export const drawsImage = () => S.bandSurface === 'terminal' && isSmall() && !S.noImages && S.imageRetryAt === null
// The text hearts are pixel hearts on the same terminals, which learn from the hearts'
// blits whether the terminal draws them, even while the band is large
export const drawsHearts = () => S.bandSurface === 'terminal' && !S.emojiOn && S.needsOn && !S.noImages && S.imageRetryAt === null

const HERDR_HOSTS = ['com.googlecode.iterm2', 'com.mitchellh.ghostty', 'net.kovidgoyal.kitty']

// Only kitty, Ghostty, and newer iTerm2 builds draw kitty's image placeholders. Other
// terminals print them as boxes, as xterm.js does in VS Code and Obsidian, even when
// CLAUDE_CODE_FORCE_TERMINAL_IMAGES has the host send them and report them drawn. iTerm2
// before 3.7.5 and the 2026-09-18 nightly freezes a swapped Image's source.
export function drawsImages({ program, version, term, kittyWindow, bundle }) {
  if (kittyWindow || term === 'xterm-kitty' || term === 'xterm-ghostty' || program === 'ghostty') return true

  // herdr names itself in TERM_PROGRAM and draws its panes' images through the app around
  // it, which macOS still names here
  if (program === 'herdr') return HERDR_HOSTS.includes(bundle)
  if (program !== 'iTerm.app') return false
  const [major, minor, patch = ''] = String(version ?? '').split('.')
  if (Number(major) > 3 || (Number(major) === 3 && Number(minor) > 7)) return true
  if (Number(major) !== 3 || Number(minor) !== 7) return false
  const nightly = /^(\d{8})-nightly$/.exec(patch)
  return nightly ? Number(nightly[1]) >= 20260918 : Number(patch) >= 5
}

// /pokemon images auto trusts the terminal list above, and on and off override it
export const IMAGE_MODES = { auto: () => S.knownImages, on: () => true, off: () => false }
export function applyImageMode() {
  S.noImages = !IMAGE_MODES[S.imageMode]()
  S.imageRetryAt = null
  S.imageWait = IMAGE_WAIT_TICKS[0]
}

// The full-size frame, padded on the left and top to fill the zoomed box at its scale, so
// every pixel keeps its shape in it
function fullFrame(zoom) {
  const { at } = frameNow(true)
  const scene = sceneColumns()
  const width = Math.max(scene, Math.round(zoom.columns / zoom.scale))
  const height = Math.max(bandRows() * 2, Math.round((zoom.rows * 2) / zoom.scale))
  const [dx, dy] = [width - scene, height - bandRows() * 2]
  return { at: (cx, py) => at(cx - dx, py - dy), width, height }
}

// The last frame encoded, a color or -1 per full-size pixel, and its Image source
let encodedPixels = null
let encodedWidth = 0
let encodedSource = null

// The full-size frame as a PNG, each pixel IMAGE_UP wide and tall. A frame like the last
// one encoded reuses its PNG.
export function imageNow(zoom) {
  const { at, width, height } = fullFrame(zoom)
  const pixels = new Int32Array(width * height)
  let same = encodedPixels?.length === pixels.length && encodedWidth === width
  const edge = panelEdge(zoom)
  for (let py = 0; py < height; py++) {
    const panelFrom = zoomedAt(py, zoom.scale) >> 1 >= edge.row ? edge.column : Infinity
    for (let cx = 0; cx < width; cx++) {
      const c = at(cx, py)
      const i = py * width + cx
      pixels[i] = c === null || zoomedAt(cx, zoom.scale) >= panelFrom ? -1 : c
      if (same && pixels[i] !== encodedPixels[i]) same = false
    }
  }
  if (same) return encodedSource
  const span = width * IMAGE_UP * 4
  const bytes = new Uint8Array(span * height * IMAGE_UP)
  for (let py = 0; py < height; py++) {
    const line = py * IMAGE_UP * span
    for (let cx = 0; cx < width; cx++) {
      const c = pixels[py * width + cx]
      if (c < 0) continue
      for (let o = line + cx * IMAGE_UP * 4, end = o + IMAGE_UP * 4; o < end; o += 4) {
        bytes[o] = c >> 16
        bytes[o + 1] = (c >> 8) & 255
        bytes[o + 2] = c & 255
        bytes[o + 3] = 255
      }
    }
    for (let k = 1; k < IMAGE_UP; k++) bytes.copyWithin(line + k * span, line, line + span)
  }
  encodedPixels = pixels
  encodedWidth = width
  encodedSource = { png: encodePng(width * IMAGE_UP, height * IMAGE_UP, bytes) }
  return encodedSource
}

// Pack the current frame into Raster cells, two pixels per cell with half blocks
// It runs every tick, so it looks up no pixel under the panel, where none shows, and
// writes each cell's words in place.
export function cellsNow() {
  const { at, glyphs, zoom } = frameNow()
  const words = new Uint32Array(zoom.columns * zoom.rows * 3)
  const edge = panelEdge(zoom)
  for (let cy = 0; cy < zoom.rows; cy++) {
    const panelFrom = cy >= edge.row ? edge.column : zoom.columns
    for (let cx = 0; cx < zoom.columns; cx++) {
      const i = (cy * zoom.columns + cx) * 3
      let [code, fg, bg] = [SPACE, DEFAULT_COLOR, DEFAULT_COLOR]
      if (cx < panelFrom) {
        const upper = at(cx, cy * 2)
        const lower = at(cx, cy * 2 + 1)
        const glyph = glyphs.size > 0 ? glyphs.get(cx + ',' + cy) : undefined
        if (glyph) [code, fg, bg] = [glyph[0], glyph[1], upper ?? lower ?? DEFAULT_COLOR]
        // A cell one color top and bottom is a space on that background, which every
        // terminal fills edge to edge. Only a cell split in two needs a half block, whose
        // shape depends on the font and can leave thin seams between rows.
        else if (upper !== null && upper === lower) bg = upper
        else if (upper !== null) [code, fg, bg] = [UPPER_HALF, upper, lower ?? DEFAULT_COLOR]
        else if (lower !== null) [code, fg] = [LOWER_HALF, lower]
      }
      words[i] = code
      words[i + 1] = fg
      words[i + 2] = bg
    }
  }
  return new Uint8Array(words.buffer).toBase64()
}

const hexOf = (color) => '#' + color.toString(16).padStart(6, '0')

// Draw the current frame as SVG for the desktop, which has no Raster. Each pixel is a
// unit square, runs of one color in a row merged into one path per color. A glyph
// takes its whole cell, two pixels tall, over the cell's top color or else its bottom.
export function svgNow() {
  // A small band draws every full-size pixel, and the Svg's size scales them down
  const full = isSmall() ? fullFrame(bandZoom()) : null
  const { at, glyphs, zoom } = full ? { at: full.at, glyphs: new Map() } : frameNow()
  const width = full ? full.width : zoom.columns
  const height = full ? full.height : zoom.rows * 2
  const runs = new Map()
  const fill = (color, d) => runs.set(color, (runs.get(color) ?? '') + d)
  const edge = full ? null : panelEdge(zoom)
  const pixelAt = (cx, py) => {
    if (full) return at(cx, py)
    const cy = py >> 1
    if (cx >= edge.column && cy >= edge.row) return null
    return glyphs.size > 0 && glyphs.has(cx + ',' + cy) ? null : at(cx, py)
  }
  for (let py = 0; py < height; py++) {
    for (let cx = 0; cx < width; ) {
      const color = pixelAt(cx, py)
      let end = cx + 1
      while (end < width && pixelAt(end, py) === color) end++
      if (color !== null) fill(color, `M${cx} ${py}h${end - cx}v1h${cx - end}z`)
      cx = end
    }
  }
  let text = ''
  for (const [cell, [code, color]] of glyphs) {
    const [cx, cy] = cell.split(',').map(Number)
    if (cx < 0 || cx >= width || cy < 0 || cy >= zoom.rows) continue
    const under = at(cx, cy * 2) ?? at(cx, cy * 2 + 1)
    if (under !== null) fill(under, `M${cx} ${cy * 2}h1v2h-1z`)
    text += `<text x="${cx + 0.5}" y="${cy * 2 + 1.6}" fill="${hexOf(color)}">&#${code};</text>`
  }
  let paths = ''
  for (const [color, d] of runs) paths += `<path fill="${hexOf(color)}" d="${d}"/>`
  const font = text ? `<g font-family="monospace" font-size="2" text-anchor="middle">${text}</g>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${paths}${font}</svg>`
}

// The happiness meter as pixel hearts, one PNG per number filled, each pixel IMAGE_UP
// wide and tall like the small band's
const heartPngs = new Map()
export function heartsImage(filled) {
  if (heartPngs.has(filled)) return heartPngs.get(filled)
  const color = Number.parseInt(METER_STYLES.text.happiness.color.slice(1), 16)
  const width = STAT_ICONS * HEART_CELL * IMAGE_UP
  const height = 2 * HEART_CELL * IMAGE_UP
  const inHeart = (rx, ry) => (HEART_ICON[ry]?.[rx] ?? '.') !== '.'
  const bytes = new Uint8Array(width * height * 4)
  for (let k = 0; k < STAT_ICONS; k++) {
    HEART_ICON.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (!inHeart(rx, ry)) continue
        const rim = [1, 2].some((d) => !inHeart(rx - d, ry) || !inHeart(rx + d, ry) || !inHeart(rx, ry - d) || !inHeart(rx, ry + d))
        if (k >= filled && !rim) continue
        for (let py = (HEART_TOP + ry) * IMAGE_UP; py < (HEART_TOP + ry + 1) * IMAGE_UP; py++) {
          for (let px = (k * HEART_CELL + rx) * IMAGE_UP; px < (k * HEART_CELL + rx + 1) * IMAGE_UP; px++) {
            const o = (py * width + px) * 4
            bytes.set([color >> 16, (color >> 8) & 255, color & 255, 255], o)
          }
        }
      }
    })
  }
  const source = { png: encodePng(width, height, bytes) }
  heartPngs.set(filled, source)
  return source
}
