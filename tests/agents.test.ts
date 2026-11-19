import { expect } from 'claude-code/testing'
import { test, BAND, STRIP, PANEL, RASTER, paints, svgOf, rightEdge, started, SPINNER, meanColumn, BUBBLE_OUTLINE, startedWith, shown, DOTS, spawnOf, runningAgents, CONFUSION } from './helpers.ts'

// The shell prompt and the pencil in the bubble, the thinking dots, the "!", a Poké Ball's
// red top and white bottom, and the +n label, on the dark theme
const SHELL_ICON = 0x5fe08a
const PENCIL_ICON = 0xffc83d
const DISC_ICON = 0xd4d4e0

const ALERT = 0xff3d3d
const BALL_TOP = 0xe03030
const BALL_BOTTOM = 0xf0f0f4
const PARTY_LABEL = 0xb4b4c8

// Answer every tool call two seconds later on the mocked clock, so a call stays in flight
function slowTools(on, clock) {
  on('tool.call', async () => {
    await clock.sleep(2000)
    return { result: { stdout: 'ok', stderr: '', interrupted: false } }
  })
}

// Every color the bottom row of cells paints, where a ball rests on the ground
function groundColors(cells: string): Set<number> {
  const words = Array.from(new Uint32Array(Uint8Array.fromBase64(cells).buffer)).slice(-RASTER * 3)
  return new Set(words.filter((_, i) => i % 3 !== 0))
}

test('the bubble shows the main loop\'s running tool while Claude works', async ($, on) => {
  const { clock, blits } = await started($, on)
  slowTools(on, clock)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })

  const bash = $.tool.call({ tool: 'Bash', command: 'ls' })
  await clock.advance(100)
  const running = await shown(ui, blits)
  expect(paints(running, SHELL_ICON)).toBe(true)
  expect(paints(running, DOTS)).toBe(false)
  await clock.advance(2000)
  await bash
  await clock.advance(100)
  const done = await shown(ui, blits)
  expect(paints(done, SHELL_ICON)).toBe(false)
  expect(paints(done, DOTS)).toBe(true)

  // A subagent's call shows as its Poké Ball, not in the bubble
  const sub = $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'sub1' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), SHELL_ICON)).toBe(false)
  await clock.advance(2000)
  await sub

  const edit = $.tool.call({ tool: 'Edit', file_path: '/work/a.ts', old_string: 'a', new_string: 'b' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), PENCIL_ICON)).toBe(true)
  await clock.advance(2000)
  await edit
})

test('a skill shows a TM disc in the bubble, from the main loop or a subagent', async ($, on) => {
  on('skill.prompt', (_, e) => ({ text: e.text }))
  on('command.run', (_, e) => ({ text: 'ran /' + e.command }))
  on('command.list', () => ({
    value: [
      { name: 'commit', description: 'Commit the work', source: 'user' },
      { name: 'compact', description: 'Compact the context', source: 'builtin' },
    ],
  }))
  const { clock, blits } = await started($, on)
  slowTools(on, clock)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })

  const skill = $.tool.call({ tool: 'Skill', skill: 'commit' })
  await clock.advance(100)
  const running = await shown(ui, blits)
  expect(paints(running, DISC_ICON)).toBe(true)
  expect(paints(running, SHELL_ICON)).toBe(false)
  await clock.advance(2000)
  await skill
  await clock.advance(100)
  expect(paints(await shown(ui, blits), DISC_ICON)).toBe(false)

  // A subagent's skill shows the disc too, over the Agent call's Poké Ball
  const agent = $.tool.call({ tool: 'Agent', prompt: 'commit it' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), DISC_ICON)).toBe(false)
  const sub = $.tool.call({ tool: 'Skill', skill: 'commit', agentId: 'sub1' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), DISC_ICON)).toBe(true)
  await clock.advance(2000)
  await sub
  await agent
  await clock.advance(100)
  expect(paints(await shown(ui, blits), DISC_ICON)).toBe(false)

  // A skill typed as /name runs as a command with no Skill call, and shows the disc
  // for three seconds even while Claude isn't working. A built-in command doesn't.
  await ui.unmount()
  const idle = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.command.run({ command: 'commit', args: '' })
  await clock.advance(100)
  expect(paints(await shown(idle, blits), DISC_ICON)).toBe(true)
  await clock.advance(2500)
  expect(paints(await shown(idle, blits), DISC_ICON)).toBe(true)
  await clock.advance(600)
  expect(paints(await shown(idle, blits), DISC_ICON)).toBe(false)
  await $.command.run({ command: 'compact', args: '' })
  await clock.advance(100)
  expect(paints(await shown(idle, blits), DISC_ICON)).toBe(false)

  // The event the typings promise for a skill's prompt holds the disc too
  await $.skill.prompt({ skill: 'commit', text: 'Commit the work.' })
  await clock.advance(100)
  expect(paints(await shown(idle, blits), DISC_ICON)).toBe(true)
})

test('a permission request stops the mon with a "!" until its call resolves or you answer', async ($, on) => {
  const { clock, blits } = await started($, on)
  slowTools(on, clock)
  on('classic.PermissionRequest', () => ({}))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  await clock.advance(1000)

  const bash = $.tool.call({ tool: 'Bash', command: 'rm -rf build' })
  await clock.advance(100)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } })
  await clock.advance(100)
  const alerted = await shown(ui, blits)
  expect(paints(alerted, ALERT)).toBe(true)
  // Pacing moves a column every 150 ms, so an edge that holds means the mon stands still
  const seen = blits.length
  await clock.advance(1500)
  const still = [alerted, ...blits.slice(seen)].map(rightEdge)
  expect(Math.max(...still) - Math.min(...still)).toBeLessThan(2)

  // The call waiting on the dialog resolves once you answer it, and the pacing resumes
  await clock.advance(1000)
  await bash
  await clock.advance(100)
  expect(paints(await shown(ui, blits), ALERT)).toBe(false)
  const resumed = blits.length
  await clock.advance(1500)
  const pacing = blits.slice(resumed).map(rightEdge)
  expect(Math.max(...pacing) - Math.min(...pacing)).toBeGreaterThan(2)

  await $.classic.PermissionRequest({ tool_name: 'Write', tool_input: { file_path: '/work/a.ts', content: '' } })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), ALERT)).toBe(true)
  await $.command.run({ command: 'pokemon', args: '' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), ALERT)).toBe(false)
})

const SWEAT = 0x6ec8ff
const REFUSAL = 'The user doesn\'t want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file).'

// Answer each Bash call as core does: `false` errors, `refused` is turned down at the
// dialog, `blocked` is denied by the permission check, `hooked` by a hook, and the rest run
function bashTools($, on) {
  on('tool.check', (_, e) => ((e.input as any)?.command === 'blocked' ? { decision: 'deny', reason: 'Bash(blocked) is denied' } : { decision: 'allow' }))
  on('tool.call', { tool: 'Bash' }, async (_, e) => {
    const failed = (text: string) => ({ isError: true as const, result: text, text })
    if (e.command === 'false') return failed('Exit code 1')
    if (e.command === 'refused') return failed(REFUSAL)
    if (e.command === 'hooked') return { deny: 'Not here.' }
    if (e.command === 'blocked') {
      await $.tool.check({ tool: 'Bash', input: { command: e.command }, tool_use_id: e.tool_use_id })
      return failed('Permission to use Bash has been denied.')
    }
    return { result: { stdout: 'ok', stderr: '', interrupted: false } }
  })
}

test('the sweat drop goes on the other side of the head from a bubble in the left margin', { timeoutMs: 30000 }, async ($, on) => {
  const BODY = 0x68d078
  bashTools($, on)
  const { clock, blits } = await startedWith($, on, { mon: 'bulbasaur', needs: false }, 0)
  await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  // Pace left until the mon turns at the strip's left edge, where the bubble only fits in
  // the margin
  let lowest = Infinity
  for (let k = 0; k < 200; k++) {
    await clock.advance(150)
    const now = meanColumn(blits[blits.length - 1], BODY) ?? Infinity
    if (now > lowest) break
    lowest = now
  }
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.advance(300)
  const cells = blits[blits.length - 1]
  const body = meanColumn(cells, BODY) as number
  expect(meanColumn(cells, BUBBLE_OUTLINE)).toBeLessThan(body)
  expect(meanColumn(cells, SWEAT)).toBeGreaterThan(body)
})

test('a mon released in another session stays released when this one switches to it', async ($, on) => {
  const saved: Record<string, any> = { trainer: false, mon: 'abra', stats: { abra: { xp: 900 }, pikachu: { xp: 1728, nickname: 'Zappy' } } }
  await startedWith($, on, saved, 0)
  // Another session releases Pikachu after this one loaded it
  saved.stats = { abra: { xp: 900 } }
  await $.command.run({ command: 'pokemon', args: 'pikachu' })
  expect(saved.stats.pikachu).toBeUndefined()
  expect((await $.command.run({ command: 'pokemon', args: 'stats' })).text).toMatch(/^Pikachu ♂, Lv\. 5,/)
  await $.command.run({ command: 'pokemon', args: 'abra' })
  expect((await $.command.run({ command: 'pokemon', args: 'box' })).text).not.toContain('Pikachu')
})

test('a failed tool call shakes the mon in place with a sweat drop for about a second', async ($, on) => {
  bashTools($, on)
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  const home = rightEdge(await shown(ui, blits))
  expect(paints(await shown(ui, blits), SWEAT)).toBe(false)

  const failed = await $.tool.call({ tool: 'Bash', command: 'false' })
  expect(failed.isError).toBe(true)
  const seen = blits.length
  await clock.advance(500)
  const shaking = blits.slice(seen)
  expect(shaking.length).toBeGreaterThan(0)
  expect(shaking.every((cells) => paints(cells, SWEAT))).toBe(true)
  expect(shaking.some((cells) => rightEdge(cells) !== home)).toBe(true)
  await clock.advance(1000)
  expect(paints(await shown(ui, blits), SWEAT)).toBe(false)
  expect(rightEdge(await shown(ui, blits))).toBe(home)

  // A second failure mid-flinch starts it over, so the drop outlasts the first one
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.advance(600)
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.advance(900)
  expect(paints(await shown(ui, blits), SWEAT)).toBe(true)
  await clock.advance(500)
  expect(paints(await shown(ui, blits), SWEAT)).toBe(false)
})

test('a call turned down, denied, or run by a subagent leaves the mon calm', async ($, on) => {
  bashTools($, on)
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const calm = async (call: Promise<unknown>) => {
    await call
    const seen = blits.length
    await clock.advance(500)
    return [await shown(ui, blits), ...blits.slice(seen)].every((cells) => !paints(cells, SWEAT))
  }
  expect(await calm($.tool.call({ tool: 'Bash', command: 'ls' }))).toBe(true)
  expect(await calm($.tool.call({ tool: 'Bash', command: 'refused' }))).toBe(true)
  expect(await calm($.tool.call({ tool: 'Bash', command: 'blocked', tool_use_id: 'blocked-1' }))).toBe(true)
  expect(await calm($.tool.call({ tool: 'Bash', command: 'hooked' }))).toBe(true)
  expect(await calm($.tool.call({ tool: 'Bash', command: 'false', agentId: 'sub1' }))).toBe(true)
  expect(await calm($.tool.call({ tool: 'Bash', command: 'false' }))).toBe(false)
})

test('a move under way or a "!" wins over the flinch', async ($, on) => {
  bashTools($, on)
  on('classic.Notification', () => ({}))
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  await $.command.run({ command: 'pokemon', args: 'attack confusion' })
  await clock.advance(100)
  await $.tool.call({ tool: 'Bash', command: 'false' })
  const seen = blits.length
  await clock.advance(1000)
  expect(blits.slice(seen).some((cells) => paints(cells, CONFUSION))).toBe(true)
  expect(blits.slice(seen).every((cells) => !paints(cells, SWEAT))).toBe(true)
  await clock.advance(3000)

  await $.classic.Notification({ message: 'Claude needs your input', notification_type: 'elicitation_dialog' })
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.advance(300)
  const alerted = await shown(ui, blits)
  expect(paints(alerted, ALERT)).toBe(true)
  expect(paints(alerted, SWEAT)).toBe(false)
})

test('a minute after a turn with no word from you, a "!" shows for two minutes', { timeoutMs: 30000 }, async ($, on) => {
  const { clock, blits } = await started($, on)
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  await $.turn.complete({ turnId: 't1', answer: 'ok', durationMs: 1000, isAborted: false, reason: 'answer' })
  await clock.advance(55 * 1000)
  expect(paints(await shown(ui, blits), ALERT)).toBe(false)
  await clock.advance(10 * 1000)
  expect(paints(await shown(ui, blits), ALERT)).toBe(true)
  await clock.advance(2 * 60 * 1000)
  expect(paints(await shown(ui, blits), ALERT)).toBe(false)

  // A /pokemon command within the minute shows you're here, so no "!" comes
  await $.turn.complete({ turnId: 't2', answer: 'ok', durationMs: 1000, isAborted: false, reason: 'answer' })
  await $.command.run({ command: 'pokemon', args: '' })
  await clock.advance(70 * 1000)
  expect(paints(await shown(ui, blits), ALERT)).toBe(false)
})

test('a subagent drops a Poké Ball onto the ground, and it pops when its turn ends', async ($, on) => {
  runningAgents(on)
  on('turn.complete', () => ({ text: '' }))
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(1000)
  const falling = await shown(ui, blits)
  expect(paints(falling, BALL_TOP)).toBe(true)
  expect(groundColors(falling).has(BALL_BOTTOM)).toBe(false)
  await clock.advance(2000)
  expect(groundColors(await shown(ui, blits)).has(BALL_BOTTOM)).toBe(true)

  await $.turn.complete({ turnId: 's1', answer: 'done', durationMs: 3000, isAborted: false, reason: 'answer', agentId: 'agent-t1' })
  await clock.advance(1000)
  const popped = await shown(ui, blits)
  expect(paints(popped, BALL_TOP)).toBe(false)
  expect(paints(popped, BALL_BOTTOM)).toBe(false)
})

test('a teammate in its own pane pops its ball once the agent list shows it idle', async ($, on) => {
  // A pane teammate's id is its address, and its turn never completes in this process
  let status = 'running'
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'designer@team' }))
  on('agent.list', () => ({ value: [{ id: 'designer@team', teammateId: 'designer@team', description: 'Design', type: 'teammate', status }] }))
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(6000)
  expect(groundColors(await shown(ui, blits)).has(BALL_BOTTOM)).toBe(true)

  status = 'idle'
  await clock.advance(4000)
  const popped = await shown(ui, blits)
  expect(paints(popped, BALL_TOP)).toBe(false)
  expect(paints(popped, BALL_BOTTOM)).toBe(false)
})

test('past five subagents, the last slot counts the rest as +n', async ($, on) => {
  runningAgents(on)
  const { clock, blits } = await startedWith($, on, { wander: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  for (let k = 0; k < 5; k++) await $.agent.spawn(spawnOf('t' + k))
  await clock.advance(3000)
  expect(paints(await shown(ui, blits), PARTY_LABEL)).toBe(false)
  for (let k = 5; k < 8; k++) await $.agent.spawn(spawnOf('t' + k))
  await clock.advance(3000)
  expect(paints(await shown(ui, blits), PARTY_LABEL)).toBe(true)
})

// Pikachu's yellow and Charmander's orange, colors Abra and the balls don't paint
const PIKACHU = 0xf8d050
const CHARMANDER = 0xf88838
// A box beside Abra: Pikachu at Lv. 12 comes out first, then Charmander at Lv. 8
const PARTY_BOX = { pikachu: { xp: 12 ** 3 }, charmander: { xp: 8 ** 3, sex: 'male' } }
// The band's whole width while a party mon is out: the strip takes all the room
const FULL = BAND.props.bodyColumns

test('a party mon steps out of a subagent\'s ball, and the strip widens to the whole band', async ($, on) => {
  runningAgents(on)
  const { clock, blits, widths } = await startedWith($, on, { wander: false, stats: PARTY_BOX }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(500)
  // The strip widens as the ball drops, and Pikachu waits in it until it lands
  expect(widths[widths.length - 1]).toBe(FULL)
  expect(paints(await shown(ui, blits), PIKACHU)).toBe(false)
  await clock.advance(3500)
  const out = await shown(ui, blits)
  expect(paints(out, PIKACHU)).toBe(true)
  expect(paints(out, CHARMANDER)).toBe(false)
})

test('party mons come out one after the other, each from a flash that shows before it does', async ($, on) => {
  runningAgents(on)
  const { clock, blits } = await startedWith($, on, { wander: false, stats: PARTY_BOX }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.agent.spawn(spawnOf('t1'))
  await $.agent.spawn(spawnOf('t2'))
  // Both balls have landed and Pikachu's has opened, but it's still inside its flash
  await clock.advance(2750)
  const flashing = await shown(ui, blits)
  expect(paints(flashing, PIKACHU)).toBe(false)
  expect(paints(flashing, CHARMANDER)).toBe(false)
  // Pikachu is out, and Charmander's ball waits its turn
  await clock.advance(250)
  const first = await shown(ui, blits)
  expect(paints(first, PIKACHU)).toBe(true)
  expect(paints(first, CHARMANDER)).toBe(false)
  await clock.advance(500)
  const both = await shown(ui, blits)
  expect(paints(both, PIKACHU)).toBe(true)
  expect(paints(both, CHARMANDER)).toBe(true)
})

test('the desktop draws a party mon in its Svg too', async ($, on) => {
  runningAgents(on)
  const { clock } = await startedWith($, on, { wander: false, stats: PARTY_BOX }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  expect(svgOf(await ui.find({ type: 'Svg' }))).toContain('fill="#f8d050"')
})

test('a party mon shows its own agent\'s tool in its bubble', async ($, on) => {
  runningAgents(on)
  const { clock, blits } = await startedWith($, on, { wander: false, stats: PARTY_BOX }, 0, {}, undefined, (clock) => slowTools(on, clock))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  expect(paints(await shown(ui, blits), SHELL_ICON)).toBe(false)

  // Claude isn't working, so the lead shows no bubble: the prompt is Pikachu's
  const bash = $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'agent-t1' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), SHELL_ICON)).toBe(true)
  await clock.advance(2000)
  await bash
  await clock.advance(100)
  expect(paints(await shown(ui, blits), SHELL_ICON)).toBe(false)

  const edit = $.tool.call({ tool: 'Edit', file_path: '/work/a.ts', old_string: 'a', new_string: 'b', agentId: 'agent-t1' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), PENCIL_ICON)).toBe(true)
  await clock.advance(2000)
  await edit
})

test('a party mon shows dots while its agent thinks', async ($, on) => {
  runningAgents(on)
  const { clock, blits } = await startedWith($, on, { wander: false, stats: PARTY_BOX }, 0, {}, undefined, (clock) => {
    on('turn.step', async function* (_, e) {
      yield { kind: 'thinking', index: 0, text: 'Counting' }
      await clock.sleep(2000)
      yield { kind: 'text', index: 1, text: 'Done' }
      yield { kind: 'stop', stopReason: 'end_turn', usage: null }
      return { turnId: e.turnId, index: e.index, answer: 'Done', toolUses: [], stopReason: 'end_turn', usage: null }
    })
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  expect(paints(await shown(ui, blits), DOTS)).toBe(false)

  const step = $.turn.step({ turnId: 's1', index: 0, model: 'claude-haiku-4-5', messageCount: 1, agentId: 'agent-t1' })
  const read = (async () => {
    for await (const _ of step);
  })()
  await clock.advance(500)
  expect(paints(await shown(ui, blits), DOTS)).toBe(true)
  await clock.advance(2000)
  await read
  await clock.advance(100)
  expect(paints(await shown(ui, blits), DOTS)).toBe(false)
})

test('a party mon goes back into its ball when its agent finishes, and the strip shrinks back', async ($, on) => {
  runningAgents(on)
  on('turn.complete', () => ({ text: '' }))
  const { clock, blits, widths } = await startedWith($, on, { wander: false, stats: PARTY_BOX }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  expect(paints(await shown(ui, blits), PIKACHU)).toBe(true)

  await $.turn.complete({ turnId: 's1', answer: 'done', durationMs: 3000, isAborted: false, reason: 'answer', agentId: 'agent-t1' })
  // It hops and turns red on its way in, and its ball stays until it's in
  await clock.advance(600)
  expect(paints(await shown(ui, blits), BALL_TOP)).toBe(true)
  await clock.advance(3000)
  const back = await shown(ui, blits)
  expect(paints(back, PIKACHU)).toBe(false)
  expect(paints(back, BALL_TOP)).toBe(false)
  expect(widths[widths.length - 1]).toBe(RASTER)
})

test('a subagent past the room keeps a closed ball, with its mon waiting inside', async ($, on) => {
  runningAgents(on)
  const { clock, blits } = await startedWith($, on, { wander: false, stats: PARTY_BOX }, 0)
  // 25 columns beside the lead's strip fit Pikachu's 16 column body and its gap, not Charmander's too
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: PANEL + STRIP + 25 } })
  await $.agent.spawn(spawnOf('t1'))
  await $.agent.spawn(spawnOf('t2'))
  await clock.advance(4000)
  const cells = await shown(ui, blits)
  expect(paints(cells, PIKACHU)).toBe(true)
  expect(paints(cells, CHARMANDER)).toBe(false)
  expect(paints(cells, BALL_TOP)).toBe(true)
  const party = await $.command.run({ command: 'pokemon', args: 'party' })
  expect(party.text).toContain('Charmander ♂, Lv. 8, working for Count files, waiting in its ball for room')
})

test('with no other mon in the box, a subagent is just a ball', async ($, on) => {
  runningAgents(on)
  const { clock, blits, widths } = await startedWith($, on, { wander: false, stats: { abra: { xp: 20 ** 3 } } }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  const cells = await shown(ui, blits)
  expect(groundColors(cells).has(BALL_BOTTOM)).toBe(true)
  expect(widths.every((w) => w === RASTER)).toBe(true)
  const party = await $.command.run({ command: 'pokemon', args: 'party' })
  expect(party.text).toBe('Your party is empty. Raise or catch another mon, and it comes out of a subagent\'s Poké Ball to work beside Abra.')
})

test('/pokemon party lists the party, highest level first, and the agent each one works for', async ($, on) => {
  runningAgents(on)
  const stats = { ...PARTY_BOX, squirtle: { xp: 6 ** 3, nickname: 'Shelly', sex: 'male' }, bulbasaur: { xp: 30 ** 3, fainted: { ms: 0, at: 0 } } }
  const { clock } = await startedWith($, on, { wander: false, stats }, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  const party = await $.command.run({ command: 'pokemon', args: 'party' })
  expect(party.text).toBe(['3 mons in your party, beside Abra:', 'Pikachu ♂, Lv. 12, working for Count files', 'Charmander ♂, Lv. 8, free', 'Shelly (Squirtle ♂), Lv. 6, free'].join('\n'))
})

test('/pokemon party add and remove pick who comes out, in the order added', async ($, on) => {
  runningAgents(on)
  const stats = { ...PARTY_BOX, squirtle: { xp: 6 ** 3, sex: 'male' } }
  const { clock, blits } = await startedWith($, on, { wander: false, stats }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const party = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text

  expect(await party('party remove pikachu')).toBe('Pikachu leaves your party.')
  expect(await party('party remove pikachu')).toBe('Pikachu isn\'t in your party.')
  expect(await party('party add pikachu')).toBe('Pikachu joins your party.')
  expect(await party('party add pikachu')).toBe('Pikachu is already in your party.')
  expect(await party('party add abra')).toBe('Abra is the mon on show. Pick another with /pokemon <mon> first.')
  expect(await party('party add mew')).toBe('Mew isn\'t in your box. Catch one, or pick it with /pokemon mew.')
  expect(await party('party add pidgey2')).toBe('Unknown mon "pidgey2". /pokemon box lists yours.')
  expect(await party('party')).toBe(['3 mons in your party, beside Abra:', 'Charmander ♂, Lv. 8, free', 'Squirtle ♂, Lv. 6, free', 'Pikachu ♂, Lv. 12, free'].join('\n'))

  // Charmander, first in the picked order, comes out ahead of the higher level Pikachu
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  const out = await shown(ui, blits)
  expect(paints(out, CHARMANDER)).toBe(true)
  expect(paints(out, PIKACHU)).toBe(false)
})

test('/pokemon party assign ties a mon to an agent type, and the rest of the party comes out for the others', async ($, on) => {
  runningAgents(on)
  const { clock, blits } = await startedWith($, on, { wander: false, stats: PARTY_BOX }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const party = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await party('party assign explore charmander')).toBe('Charmander comes out for every explore subagent.')

  // Charmander comes out for Explore ahead of the higher level Pikachu
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  let out = await shown(ui, blits)
  expect(paints(out, CHARMANDER)).toBe(true)
  expect(paints(out, PIKACHU)).toBe(false)

  // Another agent type gets the party, which no longer holds Charmander. Pikachu waits in
  // its ball while Charmander's stroll has it standing in Pikachu's spot.
  await $.agent.spawn({ ...spawnOf('t2'), subagentType: 'Plan' })
  for (let k = 0; k < 60 && !paints(await shown(ui, blits), PIKACHU); k++) await clock.advance(1000)
  out = await shown(ui, blits)
  expect(paints(out, PIKACHU)).toBe(true)
  expect(await party('party')).toBe(['2 mons in your party, beside Abra:', 'Charmander ♂, Lv. 8, for explore, working for Count files', 'Pikachu ♂, Lv. 12, working for Count files'].join('\n'))
})

test('a mon assigned to an agent type stays in its ball for other types', async ($, on) => {
  runningAgents(on)
  const { clock, blits } = await startedWith($, on, { wander: false, stats: PARTY_BOX, partyAgents: { explore: 'pikachu' } }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.agent.spawn({ ...spawnOf('t1'), subagentType: 'general-purpose' })
  await clock.advance(4000)
  const out = await shown(ui, blits)
  expect(paints(out, CHARMANDER)).toBe(true)
  expect(paints(out, PIKACHU)).toBe(false)
})

test('/pokemon party assign and unassign are saved, and a mon works for one agent type at a time', async ($, on) => {
  const saved: Record<string, any> = { wander: false, stats: PARTY_BOX }
  await startedWith($, on, saved, 0)
  const party = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await party('party assign explore')).toBe('Name the agent type and the mon, like /pokemon party assign explore abra.')
  expect(await party('party assign explore abra')).toBe('Abra is the mon on show. Pick another with /pokemon <mon> first.')
  expect(await party('party assign explore mew')).toBe('Mew isn\'t in your box. Catch one, or pick it with /pokemon mew.')
  expect(await party('party assign explore pidgey2')).toBe('Unknown mon "pidgey2". /pokemon box lists yours.')
  expect(await party('party assign Explore pikachu')).toBe('Pikachu comes out for every explore subagent.')
  expect(saved.partyAgents).toEqual({ explore: 'pikachu' })
  expect(await party('party assign code-reviewer pikachu')).toBe('Pikachu comes out for every code-reviewer subagent. It no longer comes out for explore.')
  expect(saved.partyAgents).toEqual({ 'code-reviewer': 'pikachu' })
  expect(await party('party unassign explore')).toBe('No mon is assigned to explore.')
  expect(await party('party unassign code-reviewer')).toBe('Pikachu no longer comes out for code-reviewer.')
  expect(saved.partyAgents).toEqual({})
})

test('/pokemon party add refuses a sixth mon, and an emptied party stays empty', async ($, on) => {
  const stats = Object.fromEntries(['pikachu', 'charmander', 'squirtle', 'bulbasaur', 'pidgey', 'rattata'].map((name, i) => [name, { xp: (10 - i) ** 3 }]))
  await startedWith($, on, { wander: false, stats }, 0)
  const party = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await party('party add rattata')).toBe('Your party is full at 5. Take one out with /pokemon party remove <mon> first.')
  for (const name of ['pikachu', 'charmander', 'squirtle', 'bulbasaur', 'pidgey']) await party('party remove ' + name)
  expect(await party('party')).toBe('Your party is empty. Add a mon from your box with /pokemon party add <mon>.')
})
