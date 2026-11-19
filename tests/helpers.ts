import { expect, mock, test as kitTest } from 'claude-code/testing'

// The test files run in parallel, one process each, so a test takes longer than it
// does alone. Each test gets this many milliseconds unless it asks for more, enough
// for a busy machine and still short enough to catch a test that hangs.
const DEFAULT_TIMEOUT_MS = 20000

export function test(name: string, options: any, fn?: any) {
  if (fn === undefined) return kitTest(name, { timeoutMs: DEFAULT_TIMEOUT_MS }, options)
  return kitTest(name, { timeoutMs: DEFAULT_TIMEOUT_MS, ...options }, fn)
}

export const BAND = {
  plugin: 'pokemon',
  component: 'AbovePrompt',
  requestId: 'band',
  viewport: { columns: 120, rows: 40 },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

export const THEIRS = { type: 'Text', props: {}, children: ['drawn by Claude Code'] }

// The strip is 40 columns. The raster adds 12 empty ones on its left, room for a bubble,
// and 6 under the level and text meters on its right, or 11 under emoji meters.
export const MARGIN = 12
export const STRIP = 40
export const PANEL = 6

export const RASTER = MARGIN + STRIP + PANEL

// Whether each cell paints anything: a glyph, or a space on a color of its own
export function paintedCells(cells: string): boolean[] {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  const out: boolean[] = []
  for (let i = 0; i < words.length; i += 3) out.push(words[i] !== 0x20 || words[i + 2] !== 0x01000000)
  return out
}

// Whether any cell paints a given color, as a foreground or a background
export function paints(cells: string, color: number): boolean {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  return Array.from(words).some((w, i) => i % 3 !== 0 && w === color)
}

// The desktop's Svg draws each pixel as a 4 px square, two pixel rows per band row
export const PIXEL_PX = 4

export function svgOf(element): string {
  return element.props.source
}

// The rightmost strip column that holds part of the sprite, ignoring the meters
export function rightEdge(cells: string): number {
  let edge = -1
  paintedCells(cells).forEach((painted, i) => {
    const column = (i % RASTER) - MARGIN
    if (painted && column >= 0 && column < STRIP) edge = Math.max(edge, column)
  })
  return edge
}

// Fire session.start with the stubs it needs, and collect every blit
export async function started($, on) {
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
  on('store.get', ($, e) => ({ value: e.key === 'trainer' ? false : undefined }))
  on('store.set', () => ({ value: undefined }))
  on('store.keys', () => ({ value: [] }))
  on('store.delete', () => ({ value: undefined }))
  return { clock, blits }
}

export const SPINNER = {
  plugin: 'pokemon',
  component: 'Spinner',
  requestId: 'main',
  viewport: BAND.viewport,
  props: { word: 'Thinking', message: 'Thinking', suffix: '…', mode: 'thinking' },
} as const

// The mean strip column of the cells painting a color, or null when none does
export function meanColumn(cells: string, color: number): number | null {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  const columns: number[] = []
  for (let i = 0; i < words.length; i += 3) {
    if (words[i + 1] === color || words[i + 2] === color) columns.push(((i / 3) % RASTER) - MARGIN)
  }
  return columns.length > 0 ? columns.reduce((a, b) => a + b, 0) / columns.length : null
}

// The bubble outline on a dark theme and on a light one
export const DARK_THEME_BUBBLE = 0xf0f0f0

export const BUBBLE_OUTLINE = DARK_THEME_BUBBLE

// The Zs on the dark theme
export const Z_COLOR = 0xe8e8ff

// Whether any cell paints a berry's body color, as a foreground or a background
export const BERRY_BODIES = [0x4a63d8, 0xf48fb1, 0xd81b60, 0xfdd835]

export const HOUR = 3600 * 1000

// A terminal known to draw Images, which the band tests run in unless they name another
export const GHOSTTY = { TERM_PROGRAM: 'ghostty' }

// Fire session.start with a saved store and a clock set to a given time
export async function startedWith($, on, saved: Record<string, unknown>, now: number, env: Record<string, string> = GHOSTTY, answer: (e: any) => object = () => ({}), hooks: (clock) => void = () => {}, lag = 0) {
  const clock = mock.clock(on, { now })
  const blits: string[] = []
  // Each blit's width in columns, and the blit itself, alongside blits
  const widths: number[] = []
  const sent: any[] = []
  on('ui.render', () => THEIRS)
  on('ui.blit', ($, e) => {
    const value = answer(e)
    if ('deny' in value || e.key !== 'pokemon') return { value }
    blits.push(e.cells ?? e.source.png)
    widths.push(e.columns)
    sent.push(e)
    return { value }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('env.get', ($, e) => ({ value: env[e.name] }))
  on('command.register', () => ({ value: undefined }))
  // lag ms of real time before a read of the records answers, as the engine's store can take
  on('store.get', ($, e) => (lag && e.key === 'stats' ? new Promise((resolve) => setTimeout(() => resolve({ value: saved[e.key] }), lag)) : { value: saved[e.key] }))
  on('store.set', ($, e) => {
    saved[e.key] = e.value
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(saved) }))
  on('store.delete', ($, e) => {
    delete saved[e.key]
    return { value: undefined }
  })
  hooks(clock)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  return { clock, blits, widths, sent }
}

// The frame on screen: the last blit, or the drawn frame while every tick has repeated it
export async function shown(ui, blits: string[]): Promise<string> {
  return blits[blits.length - 1] ?? (await ui.find({ key: 'pokemon' })).props.cells
}

export const ANSWERED = { turnId: 't', answer: 'ok', durationMs: 30000, isAborted: false, reason: 'answer' } as const

// Collect every toast
export function toastsOf(on): string[] {
  const toasts: string[] = []
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  return toasts
}

// Every color a blit paints, as a foreground or a background
export function colorsOf(cells: string): Set<number> {
  const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  return new Set(Array.from(words).filter((_, i) => i % 3 !== 0))
}

// An Image's PNG source by chunk type, read without inflating it
export function pngChunks(png: string): Map<string, Uint8Array> {
  const bytes = Uint8Array.fromBase64(png)
  const view = new DataView(bytes.buffer)
  const chunks = new Map<string, Uint8Array>()
  for (let at = 8; at < bytes.length; ) {
    const length = view.getUint32(at)
    chunks.set(String.fromCharCode(...bytes.subarray(at + 4, at + 8)), bytes.subarray(at + 8, at + 8 + length))
    at += 12 + length
  }
  return chunks
}

export function pngSize(png: string): { width: number; height: number } {
  const header = new DataView(pngChunks(png).get('IHDR').slice().buffer)
  return { width: header.getUint32(0), height: header.getUint32(4) }
}

// The opaque colors in an Image's PNG palette
export function imageColors(png: string): Set<number> {
  const chunks = pngChunks(png)
  const palette = chunks.get('PLTE')
  const alpha = chunks.get('tRNS')
  const colors = new Set<number>()
  for (let k = 0; k < palette.length / 3; k++) if (alpha[k] > 0) colors.add((palette[k * 3] << 16) | (palette[k * 3 + 1] << 8) | palette[k * 3 + 2])
  return colors
}

// The blit answer of a terminal that draws an Image as its alt, which then gets the small
// band in half blocks
export const DENY_IMAGES = { deny: 'the Image draws its alt here: the terminal draws no placeholder images' }

export const DOTS = 0x9a9ab0

// The Agent tool starting a subagent, as the engine raises it
export const spawnOf = (id: string) => ({
  tool_use_id: id,
  prompt: 'Count the files',
  description: 'Count files',
  subagentType: 'Explore',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5-5',
  background: false,
})

// The engine's agent list, with every spawned agent still running
export function runningAgents(on) {
  const ids: string[] = []
  on('agent.spawn', ($, e) => {
    ids.push('agent-' + e.tool_use_id)
    return { model: 'claude-haiku-4-5', agentId: 'agent-' + e.tool_use_id }
  })
  on('agent.list', () => ({ value: ids.map((id) => ({ id, description: 'Count files', type: 'Explore', status: 'running' })) }))
}

export const CONFUSION = 0xd88aff

// Answer every tool call at once
export function quickTools(on) {
  on('tool.call', () => ({ result: { stdout: 'ok', stderr: '', interrupted: false } }))
}

// Start a session with a wild foe standing in battle. saved is the store itself, so the
// test reads what the session writes.
export async function inBattle($, on, saved: Record<string, any>, foe = 'pidgey') {
  const toasts = toastsOf(on)
  quickTools(on)
  Object.assign(saved, { wander: false, debug: true, ...saved })
  const started = await startedWith($, on, saved, 0)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.command.run({ command: 'pokemon', args: 'wild ' + foe })
  await started.clock.advance(10000)
  return { ...started, toasts, band }
}

export const WEAK = 'Wild Pidgey is weak! Throw a ball with /pokemon catch. Another hit could knock it out.'

// Bank work until the foe in battle is weak
export async function weaken($, clock, toasts: string[], weak = WEAK) {
  for (let k = 0; k < 6 && !toasts.includes(weak); k++) {
    await $.tool.call({ tool: 'Read', file_path: '/work/a.ts' })
    await clock.advance(9000)
  }
  expect(toasts).toContain(weak)
}

// Throw balls at the foe until one holds
export async function catchFoe($, clock, toasts: string[], tries = 24) {
  for (let k = 0; k < tries && !toasts.some((text) => text.startsWith('Gotcha!')); k++) {
    await $.command.run({ command: 'pokemon', args: 'catch' })
    await clock.advance(6000)
  }
}

export const MINUTE = 60 * 1000
export const APPEARED = /^A (shiny )?wild .+ \(Lv\. \d+\) appeared!$/

// Start a session at an hour in with the band drawn and a turn running, so work can
// bring a wild mon
export async function working($, on, saved: Record<string, any>) {
  const toasts = toastsOf(on)
  quickTools(on)
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  Object.assign(saved, { wander: false, ...saved })
  const started = await startedWith($, on, saved, HOUR)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.turn.start({ text: 'hi', turnId: 't' })
  const read = async (agentId?: string) => {
    await $.tool.call({ tool: 'Read', file_path: '/work/a.ts', ...(agentId ? { agentId } : {}) })
    await started.clock.advance(100)
  }
  return { ...started, toasts, read }
}

export const run = async ($, args: string) => (await $.command.run({ command: 'pokemon', args })).text
