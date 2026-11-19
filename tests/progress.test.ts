import { expect, mock } from 'claude-code/testing'
import { SPRITES } from '../hooks/frames.js'
import { test, BAND, paints, started, HOUR, GHOSTTY, startedWith, shown, ANSWERED, toastsOf, run } from './helpers.ts'

// Mons start at Lv. 5, and Lv. n takes n ** 3 XP
const START_XP = 125

test('a turn that ends with an answer earns XP and saves it, and other turns earn none', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const saved: Record<string, any> = {}
  await startedWith($, on, saved, 0)
  await $.turn.complete({ ...ANSWERED, reason: 'aborted', isAborted: true })
  await $.turn.complete({ ...ANSWERED, reason: 'error' })
  await $.turn.complete({ ...ANSWERED, agentId: 'sub1' })
  expect(saved.stats).toBeUndefined()
  await $.turn.complete(ANSWERED)
  expect(saved.stats.abra.xp).toBeGreaterThan(START_XP)
})

test('care scales XP, so the same turn earns more at full meters than at empty ones', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const full = { value: 100, at: 0 }
  const empty = { value: 0, at: 0 }
  const saved: Record<string, any> = { stats: { abra: { food: full, happiness: full }, bulbasaur: { food: empty, happiness: empty } } }
  await startedWith($, on, saved, 0)
  await $.turn.complete(ANSWERED)
  await $.command.run({ command: 'pokemon', args: 'bulbasaur' })
  await $.turn.complete(ANSWERED)
  expect(saved.stats.abra.xp - START_XP).toBeGreaterThan(saved.stats.bulbasaur.xp - START_XP)
})

test('a level-up evolves Charmander into Charmeleon, and its record moves along', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  // One XP short of Lv. 16, where Charmander evolves
  const saved: Record<string, any> = { mon: 'charmander', wander: false, stats: { charmander: { xp: 16 ** 3 - 1 } } }
  const { clock, blits } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'pokemon' })).props.rows).toBe(10)

  await $.turn.complete(ANSWERED)
  expect(toasts).toEqual(['Charmander grew to Lv. 16!'])
  await clock.advance(50)
  expect(toasts[1]).toBe('What? Charmander is evolving!')
  // The band grows to fit Charmeleon, the taller of the two
  const band = (await ui.find({ key: 'pokemon' })).props
  expect(band.rows).toBe(12)

  const seen = blits.length
  await clock.advance(7100)
  const frames = blits.slice(seen)
  expect(frames.length).toBeGreaterThan(50)
  expect(frames.every((cells) => cells.length === band.cells.length)).toBe(true)
  expect(toasts[2]).toBe('Congratulations! Your Charmander evolved into Charmeleon!')
  expect(saved.mon).toBe('charmeleon')
  expect(saved.stats.charmander).toBeUndefined()
  expect(saved.stats.charmeleon.xp).toBeGreaterThanOrEqual(16 ** 3)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toMatch(/^Showing default Charmeleon Lv\. 16 \(food 80%, happiness 80%\)/)
})

test('with autoevolve off, a level-up waits for /pokemon evolve, and turning it back on evolves once idle', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  const saved: Record<string, any> = { mon: 'charmander', wander: false, stats: { charmander: { xp: 16 ** 3 - 1, sex: 'male' } } }
  const { clock } = await startedWith($, on, saved, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('autoevolve')).toBe('Charmander waits for /pokemon evolve when it reaches its evolution level.')
  expect(saved.autoEvolve).toBe(false)

  await $.turn.complete(ANSWERED)
  expect(toasts).toEqual(['Charmander grew to Lv. 16!', 'Charmander is ready to evolve into Charmeleon! /pokemon evolve lets it.'])
  await clock.advance(1000)
  expect(toasts).toHaveLength(2)
  expect(await run('stats')).toMatch(/^Charmander ♂, Lv\. 16, .* Ready to evolve into Charmeleon\. \/pokemon evolve lets it\./)

  expect(await run('autoevolve')).toBe('Charmander evolves on its own once idle at its evolution level.')
  await clock.advance(50)
  expect(toasts[2]).toBe('What? Charmander is evolving!')
})

test('/pokemon stop during the evolution keeps Charmander', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  const saved: Record<string, any> = { mon: 'charmander', stats: { charmander: { xp: 16 ** 3 - 1 } } }
  const { clock } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const stop = () => $.command.run({ command: 'pokemon', args: 'stop' })
  expect((await stop()).text).toBe('Charmander isn\'t evolving.')

  await $.turn.complete(ANSWERED)
  await clock.advance(2000)
  const pet = await $.command.run({ command: 'pokemon', args: 'pet' })
  expect(pet.text).toBe('Charmander is evolving! /pokemon stop cancels it.')
  expect((await stop()).text).toBe('Huh? Charmander stopped evolving!')
  expect((await ui.find({ key: 'pokemon' })).props.rows).toBe(10)

  await clock.advance(8000)
  expect(toasts).toEqual(['Charmander grew to Lv. 16!', 'What? Charmander is evolving!'])
  expect(saved.mon).toBe('charmander')
  expect(saved.stats.charmander.xp).toBeGreaterThanOrEqual(16 ** 3)
})

test('/pokemon evolve uses a stone or a trade, lists Eevee\'s choices, and says when a level evolution comes', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  // Charmander at Lv. 9, and a stone each for Pikachu and Eevee and a cable for Kadabra
  const saved: Record<string, any> = { trainer: false, mon: 'pikachu', stats: { charmander: { xp: 9 ** 3 } }, bag: { thunderstone: 2, linkcable: 1 } }
  const { clock } = await startedWith($, on, saved, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text

  expect(await run('evolve')).toBe('You use a Thunder Stone on Pikachu.')
  expect(await run('evolve')).toBe('Pikachu is busy right now.')
  await clock.advance(7100)
  expect(saved.mon).toBe('raichu')
  expect(toasts).toEqual(['What? Pikachu is evolving!', 'Congratulations! Your Pikachu evolved into Raichu!'])

  await run('eevee')
  const choices = 'Eevee can become Vaporeon with a Water Stone, Jolteon with a Thunder Stone, Flareon with a Fire Stone, Espeon at a level-up with full hearts by day, or Umbreon at a level-up with full hearts by night.'
  expect(await run('evolve')).toMatch(new RegExp('^' + choices.replace(/\./g, '\\.') + ' Try /pokemon evolve (vaporeon|jolteon|flareon|espeon|umbreon)\\.$'))
  expect(await run('evolve jolteon')).toBe('You use a Thunder Stone on Eevee.')
  await clock.advance(7100)
  expect(saved.mon).toBe('jolteon')

  await run('kadabra')
  expect(await run('evolve')).toBe('You trade Kadabra to a friend, and they trade it right back.')
  await clock.advance(7100)
  expect(saved.mon).toBe('alakazam')

  expect(saved.bag).toEqual({})

  await run('charizard')
  expect(await run('evolve')).toBe('Charizard doesn\'t evolve.')
  await run('charmander')
  expect(await run('evolve')).toBe('Charmander evolves into Charmeleon at Lv. 16. It\'s Lv. 9.')
})

// The evolved mon used to show its own first level, like Raichu at Lv 5, until the band was
// drawn again, as the engine's store answered after the first frame
test('an evolved mon shows its own level from the first frame, however slow the store', { timeoutMs: 30000 }, async ($, on) => {
  const saved: Record<string, any> = { trainer: false, mon: 'pikachu', wander: false, bag: { thunderstone: 1 }, stats: { pikachu: { xp: 30 ** 3 } } }
  const { clock } = await startedWith($, on, saved, 0, GHOSTTY, () => ({}), () => {}, 20)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const levels = new Set<string>()
  expect(await run($, 'evolve')).toBe('You use a Thunder Stone on Pikachu.')
  for (let t = 0; t < 120; t++) {
    await clock.advance(100)
    if (saved.mon === 'raichu' || t > 60) levels.add((await band.find({ type: 'Text', text: /^Lv/ }))?.text)
    // Real time for the slow reads to answer once the evolution is done
    if (t > 75) await new Promise((resolve) => setTimeout(resolve, 5))
  }
  expect(saved.mon).toBe('raichu')
  expect([...levels]).toEqual(['Lv 30'])
})

for (const caught of [true, false]) {
  test(`a raised mon whose species is ${caught ? '' : 'not '}caught evolves ${caught ? 'keeping' : 'without'} its ◓ in the box`, { timeoutMs: 30000 }, async ($, on) => {
    const dex = caught ? { pikachu: { seen: 0, caught: 0 } } : {}
    const saved: Record<string, any> = { trainer: false, mon: 'pikachu', wander: false, bag: { thunderstone: 1 }, dex, stats: { pikachu: { xp: 30 ** 3 } } }
    const { clock } = await startedWith($, on, saved, 0)
    expect(await run($, 'box')).toContain(caught ? 'Pikachu ♂ ◓, Lv. 30' : 'Pikachu ♂, Lv. 30')
    await run($, 'evolve')
    await clock.advance(7200)
    expect(saved.mon).toBe('raichu')
    expect(Boolean(saved.stats.raichu.caught)).toBe(caught)
    expect(await run($, 'box')).toContain(caught ? 'Raichu ♂ ◓, Lv. 30' : 'Raichu ♂, Lv. 30')
  })
}

test('/pokemon shows the level in its status and above the meters', async ($, on) => {
  // Lv. 12
  await startedWith($, on, { mon: 'charmander', stats: { charmander: { xp: 12 ** 3 } } }, 0)
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).toMatch(/^Showing default Charmander Lv\. 12, wandering \(food 80%, happiness 80%\)\. Options: /)
  const wide = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await wide.find({ type: 'Text', text: 'Lv 12' })).toBeDefined()
  await wide.unmount()
  // Too narrow for the meters, the level line hides with them
  const tight = SPRITES.charmander.width + 5
  const narrow = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: tight } })
  expect(await narrow.find({ type: 'Text', text: /^Lv/ })).toBeUndefined()
})

test('/pokemon needs hides the meters and the need bubbles, and turning it back on shows them', async ($, on) => {
  const saved: Record<string, any> = { stats: { abra: { food: { value: 10, at: 0 }, happiness: { value: 90, at: 0 } } } }
  const { clock, blits } = await startedWith($, on, saved, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await clock.advance(100)
  expect(paints(await shown(ui, blits), 0xd84040)).toBe(true)

  const off = await $.command.run({ command: 'pokemon', args: 'needs' })
  expect(off.text).toBe('Needs are off. Abra won\'t get hungry or lonely.')
  expect(saved.needs).toBe(false)
  await clock.advance(100)
  expect(paints(await shown(ui, blits), 0xd84040)).toBe(false)
  expect(await ui.find({ type: 'Text', text: /●/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'Lv 5' })).toBeDefined()

  const on2 = await $.command.run({ command: 'pokemon', args: 'needs' })
  expect(on2.text).toBe('Needs are on. Keep Abra fed and happy.')
  expect(saved.needs).toBe(true)
  await clock.advance(100)
  expect(paints(await shown(ui, blits), 0xd84040)).toBe(true)
  expect(await ui.find({ type: 'Text', text: '●○○○○' })).toBeDefined()
})

test('display names read like the games', async ($, on) => {
  await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const switched = await $.command.run({ command: 'pokemon', args: 'nidoran_female' })
  expect(switched.text).toBe('Now showing default Nidoran♀.')
  expect((await $.command.run({ command: 'pokemon', args: 'wander' })).text).toBe('Nidoran♀ is heading home.')
  expect((await $.command.run({ command: 'pokemon', args: 'attack' })).text).toMatch(/^Nidoran♀ used /)
})

test('/pokemon moves lists the moves of the mon shown or the one named, and so does attack list', async ($, on) => {
  await started($, on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'pokemon', args: 'pikachu' })
  const own = await $.command.run({ command: 'pokemon', args: 'moves' })
  expect(own.text).toBe('Pikachu knows Thunderbolt, Quick Attack, Thunder, Agility.')
  expect((await $.command.run({ command: 'pokemon', args: 'attack list' })).text).toBe(own.text)
  const other = await $.command.run({ command: 'pokemon', args: 'moves mrmime' })
  expect(other.text).toBe('Mr. Mime knows Barrier, Confusion, Double Slap.')
  expect((await $.command.run({ command: 'pokemon', args: 'moves togepi' })).text).toMatch(/^Unknown mon "togepi"/)
  // Listing moves doesn't play one
  expect((await $.command.run({ command: 'pokemon', args: 'attack' })).text).toMatch(/^Pikachu used /)
})

test('/pokemon stats shows the level, the XP to the next one, the evolution, the meters, and the counts', async ($, on) => {
  await startedWith($, on, { mon: 'charmander', pets: 3, feeds: 2 }, 0)
  const stats = await $.command.run({ command: 'pokemon', args: 'stats' })
  expect(stats.text).toBe(
    'Charmander, Lv. 5, 125 XP (91 to Lv. 6). Can become Charmeleon at Lv. 16. Food 80%, happiness 80%. 3 pets, 2 feeds.',
  )
})

test('/pokemon box lists every raised mon by level, then name, with meters drained to now and the active one marked', async ($, on) => {
  const full = { value: 100, at: 0 }
  const low = { value: 10, at: 0 }
  const stats = {
    pikachu: { xp: 12 ** 3, food: full, happiness: full },
    charizard: { xp: 40 ** 3, sex: 'female', food: low, happiness: { value: 50, at: 0 } },
    bulbasaur: { xp: 12 ** 3, sex: 'male' },
    nidoran_female: { xp: 5 ** 3 },
  }
  await startedWith($, on, { mon: 'pikachu', stats }, 4 * HOUR)
  const box = await $.command.run({ command: 'pokemon', args: 'box' })
  expect(box.text).toBe(
    [
      '4 mons in your box:',
      'Charizard ♀, Lv. 40 ○○○○○ ♥♡♡♡♡',
      'Bulbasaur ♂, Lv. 12 ●●●●○ ♥♥♥♥♡',
      'Pikachu ♂, Lv. 12 ●●●○○ ♥♥♥♥♡ (active)',
      'Nidoran♀, Lv. 5 ●●●●○ ♥♥♥♥♡',
    ].join('\n'),
  )
})

test('/pokemon box lists emoji meters once /pokemon emoji turns them on', async ($, on) => {
  const stats = { pikachu: { xp: 12 ** 3, food: { value: 50, at: 0 }, happiness: { value: 10, at: 0 } } }
  await startedWith($, on, { mon: 'pikachu', stats }, 0)
  await $.command.run({ command: 'pokemon', args: 'emoji' })
  const box = await $.command.run({ command: 'pokemon', args: 'box' })
  expect(box.text).toBe('1 mon in your box:\nPikachu ♂, Lv. 12 🍓🍓🍓○ ○ 💗♡ ♡ ♡ ♡ (active)\nOnly Pikachu so far. /pokemon <mon> picks another.')
})

test('/pokemon box leaves out the meters with needs off', async ($, on) => {
  await startedWith($, on, { mon: 'pikachu', needs: false, stats: { pikachu: { xp: 12 ** 3 }, charizard: { xp: 40 ** 3, sex: 'male' } } }, 0)
  const box = await $.command.run({ command: 'pokemon', args: 'box' })
  expect(box.text).toBe('2 mons in your box:\nCharizard ♂, Lv. 40\nPikachu ♂, Lv. 12 (active)')
})

test('/pokemon box marks the caught mons, an evolved catch included, in level order', async ($, on) => {
  const stats = {
    pikachu: { xp: 12 ** 3 },
    pidgeotto: { xp: 20 ** 3, caught: true, sex: 'female' },
    snorlax: { xp: 30 ** 3, sex: 'male' },
    charizard: { xp: 40 ** 3, sex: 'male' },
  }
  await startedWith($, on, { mon: 'pikachu', needs: false, stats, dex: { snorlax: { seen: 0, caught: 0 } } }, 0)
  const box = await $.command.run({ command: 'pokemon', args: 'box' })
  expect(box.text).toBe(
    [
      '4 mons in your box:',
      'Charizard ♂, Lv. 40',
      'Snorlax ♂ ◓, Lv. 30',
      'Pidgeotto ♀ ◓, Lv. 20',
      'Pikachu ♂, Lv. 12 (active)',
    ].join('\n'),
  )
})

test('/pokemon box says when the box is empty, or holds only the active mon', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock } = await startedWith($, on, saved, 0)
  const run = async () => (await $.command.run({ command: 'pokemon', args: 'box' })).text
  expect(await run()).toBe('Your box is empty. Pet or feed Abra, or finish a turn, to start raising it.')
  await $.command.run({ command: 'pokemon', args: 'pet' })
  // The pet pays out once its hearts have floated away
  await clock.advance(4000)
  expect(await run()).toMatch(/^1 mon in your box:\nAbra [♂♀], Lv\. 5 ●●●●○ ♥♥♥♥♥ \(active\)\nOnly Abra so far\. \/pokemon <mon> picks another\.$/)
})

test('/pokemon dex counts nothing before any wild mon turns up', async ($, on) => {
  await startedWith($, on, {}, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('dex')).toBe('Pokédex: seen 0, caught 0 of 151. No wild mons met yet.')
  expect(await run('dex pidgey')).toBe('#016 Pidgey, common. Not seen yet.')
  expect(await run('dex agumon')).toBe('Unknown mon "agumon". See /pokemon list for every mon.')
})

test('/pokemon dex lists caught mons in dex order, then the ones only seen', async ($, on) => {
  // Only a caught entry's shiny flag counts
  const dex = {
    snorlax: { seen: 3, caught: 4 },
    pidgey: { seen: 1, caught: 2, shiny: true },
    rattata: { seen: 5, shiny: true },
    venusaur: { seen: 6 },
    agumon: { seen: 7, caught: 7 },
  }
  await startedWith($, on, { dex }, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('dex')).toBe(
    ['Pokédex: seen 4, caught 2 of 151 (1 shiny).', '#016 Pidgey ◓ ✦', '#143 Snorlax ◓', 'Seen: Venusaur, Rattata'].join('\n'),
  )
  expect(await run('dex pidgey')).toBe('#016 Pidgey, common. Caught ◓ ✦.')
  expect(await run('dex snorlax')).toBe('#143 Snorlax, rare. Caught ◓.')
  // A female sprite shares its base form's entry
  expect(await run('dex venusaur_female')).toBe('#003 Venusaur, rare. Seen, not caught yet.')
  expect(await run('dex mew')).toBe('#151 Mew, legendary. Not seen yet.')
})

test('/pokemon release drops a mon from the box, so it starts over at its first level with fresh meters', async ($, on) => {
  const low = { value: 10, at: 0 }
  const saved: Record<string, any> = { mon: 'pikachu', stats: { pikachu: { xp: 12 ** 3, food: low, happiness: low }, charizard: { xp: 40 ** 3 } } }
  await startedWith($, on, saved, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text

  expect(await run('release')).toBe('Name the mon to release, like /pokemon release pikachu. /pokemon box lists yours.')
  expect(await run('release agumon')).toBe('Unknown mon "agumon". /pokemon box lists yours.')
  expect(await run('release bulbasaur')).toBe('Bulbasaur isn\'t in your box.')

  expect(await run('release charizard')).toBe('You release Charizard. Bye-bye, Charizard!')
  expect(Object.keys(saved.stats)).toEqual(['pikachu'])

  expect(await run('release pikachu')).toBe('You release Pikachu. Bye-bye, Pikachu! A fresh Pikachu takes its place.')
  expect(saved.stats).toEqual({})
  expect(saved.mon).toBe('pikachu')
  expect(await run('box')).toBe('Your box is empty. Pet or feed Pikachu, or finish a turn, to start raising it.')
  expect(await run('')).toContain('Pikachu Lv. 5, wandering (food 80%, happiness 80%)')
})

test('/pokemon release waits while the mon evolves', async ($, on) => {
  await startedWith($, on, { mon: 'pikachu', stats: { pikachu: { xp: 12 ** 3 } } }, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text
  expect(await run('evolve')).toBe('You use a Thunder Stone on Pikachu.')
  expect(await run('release pikachu')).toBe('Pikachu is evolving! /pokemon stop cancels it.')
})

test('/pokemon nickname names the active mon, keeps its case, and its species name takes it away', async ($, on) => {
  const saved: Record<string, any> = { mon: 'pikachu', stats: { pikachu: { xp: 12 ** 3 } } }
  const { clock } = await startedWith($, on, saved, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text

  expect(await run('nickname')).toBe('Name it with /pokemon nickname <name>, up to 12 characters.')
  expect(await run('nickname Sir Sparks A Lot')).toBe('That\'s too long. A nickname fits 12 characters.')
  expect(await run('nickname  Sparky ')).toBe('Pikachu is now Sparky!')
  expect(saved.stats.pikachu).toEqual({ xp: 12 ** 3, sex: 'male', nickname: 'Sparky' })
  expect(await run('nickname')).toBe('Pikachu goes by Sparky. Name it with /pokemon nickname <name>, up to 12 characters.')
  expect(await run('nickname Zappy')).toBe('Sparky is now Zappy!')

  expect(await run('pet')).toMatch(/^Zappy /)
  // The pet pays out once its hearts have floated away
  await clock.advance(4000)
  expect(await run('stats')).toMatch(/^Zappy \(Pikachu ♂\), Lv\. 12,/)
  expect(await run('box')).toBe('1 mon in your box:\nZappy (Pikachu ♂), Lv. 12 ●●●●○ ♥♥♥♥♥ (active)\nOnly Zappy so far. /pokemon <mon> picks another.')
  expect(await run('')).toContain('Zappy Lv. 12')

  expect(await run('nickname PIKACHU')).toBe('Zappy is just Pikachu again.')
  expect(saved.stats.pikachu.nickname).toBeUndefined()
  expect(await run('nickname pikachu')).toBe('Pikachu has no nickname.')
})

test('a nickname with no other record leaves no record behind when taken away, and release drops it', async ($, on) => {
  const saved: Record<string, any> = { mon: 'abra' }
  await startedWith($, on, saved, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text

  await run('nickname Spoony')
  await run('nickname abra')
  expect(saved.stats).toEqual({})

  await run('nickname Spoony')
  expect(await run('release abra')).toBe('You release Spoony. Bye-bye, Spoony! A fresh Abra takes its place.')
  expect(saved.stats).toEqual({})
})

test('a nickname carries through evolution', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  const saved: Record<string, any> = { mon: 'pikachu', stats: { pikachu: { xp: 12 ** 3 } } }
  const { clock } = await startedWith($, on, saved, 0)
  const run = async (args: string) => (await $.command.run({ command: 'pokemon', args })).text

  await run('nickname Sparky')
  expect(await run('evolve')).toBe('You use a Thunder Stone on Sparky.')
  await clock.advance(7100)
  expect(toasts).toEqual(['What? Sparky is evolving!', 'Congratulations! Your Sparky evolved into Raichu!'])
  expect(saved.stats).toEqual({ raichu: { xp: 12 ** 3, sex: 'male', nickname: 'Sparky' } })
  expect(await run('nickname')).toBe('Raichu goes by Sparky. Name it with /pokemon nickname <name>, up to 12 characters.')
})

test('/pokemon list names every mon, and the hint and status stay short', async ($, on) => {
  mock.clock(on)
  let hint = ''
  on('command.register', ($, e) => {
    hint = e.argumentHint
    return { value: undefined }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('store.get', () => ({ value: undefined }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  expect(hint).toBe('[<mon>|default|shiny|new|list|pet|feed|sleep|revive|nickname|attack|moves|catch|roar|evolve|stop|bag|use|stats|box|party|dex|release|wander|needs|emoji|size|images|pane|sync|autoevolve|nuzlocke|trainer|gen|help]')

  const list = await $.command.run({ command: 'pokemon', args: 'list' })
  expect(list.text).toMatch(/^\d+ mons: abra, /)
  expect(list.text).toContain('charmander')
  const status = await $.command.run({ command: 'pokemon', args: '' })
  expect(status.text).not.toContain('charmander')
})
