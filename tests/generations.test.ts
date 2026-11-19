import { expect, mock } from 'claude-code/testing'
import { SPRITES } from '../hooks/frames.js'
import { dropOf, findItem, heldItemsOf, stonesOf } from '../hooks/items.js'
import { dexKey, dexNumber, genOf, pickWild, tierOf } from '../hooks/dex.js'
import { levelEvolutionOf, levelUpEvolutionOf, preEvolutionOf, startLevel } from '../hooks/evolutions.js'
import { displayName } from '../hooks/names.js'
import { test, BAND, THEIRS, startedWith, ANSWERED, toastsOf, spawnOf, runningAgents, inBattle, WEAK, weaken, catchFoe, APPEARED, run } from './helpers.ts'

// Diglett's idle GIF, served for every file of a fetched mon
const GIF = 'R0lGODlhIAAgAIMAAAAAAJh4OHBwcEBAQAAAAEAwEHBIIKioqJggSGgIKMjIyNBAaOhwmAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJHgAAACwAAAAAIAAgAAAIiQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJcmKBkyc1FgjAkmUBjCtbtnxpMabMADQrEjCgoKUCAwQsDti50wBQoAMoDhCwM8ECBgsSABWQNOJSAVQJINi6U8CBA1UfLj2AdSgBAljLCph41SvZAWDDKl06IOlShgEBACH5BAkeAAAALAAAAAAgACAAgwAAAHBwcJh4OEBAQEAwEAAAAHBIIKioqJggSGgIKMjIyNBAaOhwmAAAAAAAAAAAAAiLAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWLGDNq3Mixo8ePIEOKHHmRgEmTGgkIWLmSAEaVLFm6tAgzpoCZFQkYUMBSgQGcFAsYEGpg6FCLA4QmWMBgQYKhAygOCCC0AIKrVQNEjTg1QACdBcL+PHBAa0StAch29Xqg69azXcsOcHtR61yBUxkGBAA7'

// Answers GitHub and PokéAPI the way /pokemon new reads them. gens maps each generation
// to the mons in it, and status, when given, answers every GitHub request.
function serveMons(on, gens: Record<number, string[]>, { status = 200, types = ['water'] } = {}) {
  const asked: string[] = []
  on('http.fetch', ($, e) => {
    asked.push(e.url)
    const reply = (code: number, body: unknown) => ({ value: { status: code, ok: code < 300, headers: {}, text: JSON.stringify(body) } })
    if (e.url.startsWith('https://pokeapi.co/')) return reply(200, { types: types.map((name) => ({ type: { name } })) })
    if (status !== 200) return reply(status, {})
    const [, gen, name] = e.url.match(/media\/gen(\d)(?:\/([^/]+))?/) ?? []
    if (!name) return reply(200, (gens[Number(gen)] ?? []).map((n) => ({ name: n, type: 'dir' })))
    return gens[Number(gen)]?.includes(name) ? reply(200, { content: GIF, encoding: 'base64' }) : reply(404, {})
  })
  return asked
}

// A store in memory the test can read back, answering $.store as the engine does
function memoryStore(on, entries: Record<string, unknown> = {}) {
  const held = new Map<string, unknown>(Object.entries(entries))
  on('store.get', ($, e) => ({ value: held.get(e.key) }))
  on('store.set', ($, e) => {
    held.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...held.keys()] }))
  on('store.delete', ($, e) => {
    held.delete(e.key)
    return { value: undefined }
  })
  return held
}

test('/pokemon new fetches a mon from the generation that has it, saves it, and shows it', async ($, on) => {
  mock.clock(on)
  const store = memoryStore(on)
  on('ui.render', () => THEIRS)
  const asked = serveMons(on, { 3: ['mudkip'] })
  const answer = await $.command.run({ command: 'pokemon', args: 'new mudkip' })
  expect(answer.text).toBe('Fetched gen 3 Mudkip. It knows Water Gun, Bubble Beam, Tackle. Now showing default Mudkip.')
  expect(asked.some((url) => url.includes('/gen1/mudkip/'))).toBe(true)
  expect(store.get('mon')).toBe('mudkip')
  const saved = store.get('custom:mudkip') as { gen: number; sprite: typeof SPRITES.diglett }
  expect(saved.gen).toBe(3)
  // Decoded the way the build decodes Diglett's own idle GIF, on every sheet
  const { idle, palette } = SPRITES.diglett.variants.default
  expect(saved.sprite.variants.default.palette).toEqual(palette)
  expect(saved.sprite.variants.shiny.walk.map((f) => f.ms)).toEqual(idle.map((f) => f.ms))
  expect(saved.sprite.variants.default.idle.map((f) => f.rows.join('').replace(/\./g, ''))).toEqual(idle.map((f) => f.rows.join('').replace(/\./g, '')))
  expect((await $.command.run({ command: 'pokemon', args: 'attack list' })).text).toBe('Mudkip knows Water Gun, Bubble Beam, Tackle.')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'pokemon' })).props.rows).toBe(7)
})

test('a mon fetched in another session loads at session start', async ($, on) => {
  mock.clock(on)
  const sprite = SPRITES.diglett
  mock.store(on, { mon: 'snivy', 'custom:snivy': { gen: 5, sprite, moves: ['Ember', 'Tackle'] } })
  on('ui.render', () => THEIRS)
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  on('env.get', () => ({ value: undefined }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  expect((await $.command.run({ command: 'pokemon', args: '' })).text).toMatch(/^Showing default Snivy Lv\. /)
  expect((await $.command.run({ command: 'pokemon', args: 'list' })).text).toMatch(/, snivy$/)
  expect((await $.command.run({ command: 'pokemon', args: 'moves' })).text).toBe('Snivy knows Ember, Tackle.')
  expect((await $.command.run({ command: 'pokemon', args: 'dex snivy' })).text).toBe("Snivy isn't in the Pokédex. Only gen 1, 2, 3, and 4 mons appear in the wild.")
})

test('/pokemon new gen3 picks a gen 3 mon you do not have yet', async ($, on) => {
  mock.clock(on)
  mock.store(on, { 'custom:mudkip': { gen: 3, sprite: SPRITES.diglett, moves: ['Tackle'] } })
  on('ui.render', () => THEIRS)
  serveMons(on, { 3: ['mudkip', 'treecko'] }, { types: ['grass'] })
  const answer = await $.command.run({ command: 'pokemon', args: 'new gen3' })
  expect(answer.text).toMatch(/^Fetched gen 3 Treecko\. It knows Vine Whip, Razor Leaf, Tackle\./)
  expect((await $.command.run({ command: 'pokemon', args: 'new random gen3' })).text).toBe('You already have every gen 3 mon.')
})

test('/pokemon new explains a mon it cannot fetch', async ($, on) => {
  mock.clock(on)
  const store = memoryStore(on)
  serveMons(on, { 3: ['mudkip'] })
  expect((await $.command.run({ command: 'pokemon', args: 'new togepi' })).text).toBe(
    "Couldn't fetch togepi: No mon named \"togepi\" in generations 1, 2, 3, 4, 5.",
  )
  expect((await $.command.run({ command: 'pokemon', args: 'new pikachu' })).text).toBe('Pikachu is already here. /pokemon pikachu shows it.')
  expect(store.has('mon')).toBe(false)
})

test('/pokemon new says when GitHub refuses for the hourly limit', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  serveMons(on, {}, { status: 403 })
  expect((await $.command.run({ command: 'pokemon', args: 'new mudkip' })).text).toBe(
    "Couldn't fetch mudkip: GitHub's hourly limit for anonymous requests is used up. Try again in a while.",
  )
})

// Starts a session over the store, so its tick loop runs the cross-session sync
async function startSession($, on) {
  on('ui.render', () => THEIRS)
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  on('env.get', () => ({ value: undefined }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
}

test('with sync on, a session follows the mon picked in another, fetched mons included', async ($, on) => {
  const clock = mock.clock(on)
  const store = memoryStore(on, { mon: 'abra' })
  await startSession($, on)
  expect((await $.command.run({ command: 'pokemon', args: 'sync' })).text).toBe(
    'Sync is on. Every open session shows Abra, and follows the next mon you pick.',
  )
  expect(store.get('sync')).toBe(true)
  // Another session picks Vulpix, then fetches Torchic
  store.set('mon', 'vulpix')
  await clock.advance(50 * 25)
  expect((await $.command.run({ command: 'pokemon', args: '' })).text).toMatch(/^Showing default Vulpix /)
  store.set('custom:torchic', { gen: 3, sprite: SPRITES.diglett, moves: ['Ember'] })
  store.set('mon', 'torchic')
  await clock.advance(50 * 25)
  expect((await $.command.run({ command: 'pokemon', args: '' })).text).toMatch(/^Showing default Torchic /)
})

test('with sync off, each session keeps its own mon', async ($, on) => {
  const clock = mock.clock(on)
  const store = memoryStore(on, { mon: 'abra' })
  await startSession($, on)
  store.set('mon', 'vulpix')
  await clock.advance(50 * 25)
  expect((await $.command.run({ command: 'pokemon', args: '' })).text).toMatch(/^Showing default Abra /)
  expect((await $.command.run({ command: 'pokemon', args: 'sync' })).text).toMatch(/^Sync is on/)
  expect((await $.command.run({ command: 'pokemon', args: 'sync' })).text).toBe('Sync is off. Each session keeps the mon picked in it.')
})

test('a knockout drops an item one time in 5: its own type\'s stone, or a Link Cable or Rare Candy, the same for the same foe', () => {
  const count = (key: string) => {
    const drops: Record<string, number> = {}
    let none = 0
    for (let seed = 0; seed < 18000; seed++) {
      const item = dropOf(key, seed, [1])
      if (item) drops[item] = (drops[item] ?? 0) + 1
      else none++
    }
    return { drops, none }
  }
  const vulpix = count('vulpix')
  const pidgey = count('pidgey')
  expect(dropOf('vulpix', 42)).toBe(dropOf('vulpix', 42))
  expect(Object.keys(vulpix.drops).sort()).toEqual(['firestone', 'linkcable', 'rarecandy'])
  expect(Object.keys(count('ponyta').drops).sort()).toEqual(['firestone', 'linkcable', 'rarecandy'])
  expect(Object.keys(count('pikachu').drops).sort()).toEqual(['linkcable', 'rarecandy', 'thunderstone'])
  // A foe with no stone type drops only a Link Cable or Rare Candy
  expect(Object.keys(pidgey.drops).sort()).toEqual(['linkcable', 'rarecandy'])
  expect(stonesOf('pikachu', [1])).toEqual(['thunderstone'])
  expect(stonesOf('pidgey')).toEqual([])
  expect(vulpix.none / 18000).toBeGreaterThan(0.76)
  expect(vulpix.none / 18000).toBeLessThan(0.84)
  for (const { drops } of [vulpix, pidgey]) {
    expect(drops.rarecandy / 18000).toBeGreaterThan(0.008)
    expect(drops.rarecandy / 18000).toBeLessThan(0.019)
    expect(drops.linkcable / 18000).toBeGreaterThan(0.008)
    expect(drops.linkcable / 18000).toBeLessThan(0.022)
  }
})

test('item names match loosely', () => {
  expect(['Thunder Stone', 'thunderstone', 'THUNDER', 'thunder-stone'].map(findItem)).toEqual(Array(4).fill('thunderstone'))
  expect(findItem('candy')).toBe('rarecandy')
  expect(findItem('link cable')).toBe('linkcable')
  expect(['King\'s Rock', 'kings rock', 'metal coat', 'dragon scale', 'Up-Grade', 'upgrade'].map(findItem)).toEqual(['kingsrock', 'kingsrock', 'metalcoat', 'dragonscale', 'upgrade', 'upgrade'])
  // Scale names both the Dragon Scale and the Deep Sea Scale
  expect(findItem('scale')).toBeNull()
  expect(findItem('stone')).toBeNull()
  expect(findItem('potion')).toBeNull()
  expect(findItem('tooth')).toBe('deepseatooth')
  expect(findItem('deep sea scale')).toBe('deepseascale')
})

test('the first bag grants the item every stone or trade mon in the box needs, and /pokemon bag lists it', async ($, on) => {
  const stats = {
    pikachu: { xp: 12 ** 3 }, eevee: { xp: 10 ** 3 }, kadabra: { xp: 20 ** 3 }, charmander: { xp: 9 ** 3 },
    growlithe: { xp: 15 ** 3, ranAway: { at: 0, variant: 'default' } }, vulpix: { dead: { at: 0 } },
  }
  const saved: Record<string, any> = { mon: 'charmander', stats }
  await startedWith($, on, saved, 0)
  expect(await run($, 'bag')).toBe('Your bag:\nFire Stone, 1\nWater Stone, 1\nThunder Stone, 2\nLeaf Stone, 1\nIce Stone, 1\nLink Cable, 1')
  expect(saved.bag).toEqual({ thunderstone: 2, waterstone: 1, firestone: 1, leafstone: 1, icestone: 1, linkcable: 1 })
  // Made once, the bag is never granted again
  saved.bag = {}
  expect(await run($, 'bag')).toBe('Your bag is empty. Knock out a wild mon with /pokemon attack, and it may drop an item.')
})

test('a stone or trade evolution needs its item, says which is missing, and spends it once the evolution is done', { timeoutMs: 30000 }, async ($, on) => {
  const saved: Record<string, any> = { trainer: false, mon: 'pikachu', bag: { moonstone: 1 } }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'evolve')).toBe('Pikachu needs a Thunder Stone to evolve into Raichu. Wild mons you knock out drop items now and then, and /pokemon bag lists yours.')
  await run($, 'kadabra')
  expect(await run($, 'evolve')).toBe('Kadabra needs a Link Cable to evolve into Alakazam. Wild mons you knock out drop items now and then, and /pokemon bag lists yours.')

  saved.bag = { thunderstone: 1 }
  await run($, 'pikachu')
  expect(await run($, 'evolve')).toBe('You use a Thunder Stone on Pikachu.')
  await clock.advance(1000)
  // Stopped, the evolution keeps the stone
  expect(await run($, 'stop')).toBe('Huh? Pikachu stopped evolving!')
  expect(saved.bag).toEqual({ thunderstone: 1 })
  expect(await run($, 'use thunder stone')).toBe('You use a Thunder Stone on Pikachu.')
  await clock.advance(7100)
  expect(saved.mon).toBe('raichu')
  expect(saved.bag).toEqual({})
})

test('/pokemon use takes an item by a loose name, and a stone on a mon is the same as evolve', { timeoutMs: 30000 }, async ($, on) => {
  const saved: Record<string, any> = { trainer: false, mon: 'eevee', bag: { firestone: 1, waterstone: 1 } }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'use')).toBe('Name the item, like /pokemon use rare candy. /pokemon bag lists yours.')
  expect(await run($, 'use potion')).toBe('Unknown item "potion". Items: Fire Stone, Water Stone, Thunder Stone, Leaf Stone, Moon Stone, Sun Stone, Shiny Stone, Dusk Stone, Dawn Stone, Ice Stone, King\'s Rock, Metal Coat, Dragon Scale, Up-Grade, Deep Sea Tooth, Deep Sea Scale, Protector, Electirizer, Magmarizer, Dubious Disc, Reaper Cloth, Razor Claw, Razor Fang, Oval Stone, Link Cable, Rare Candy.')
  expect(await run($, 'use moon stone')).toBe('Eevee can\'t use a Moon Stone.')
  expect(await run($, 'use fire stone growlithe')).toBe('Show Growlithe first with /pokemon growlithe, then use the Fire Stone.')
  expect(await run($, 'use FireStone eevee')).toBe('You use a Fire Stone on Eevee.')
  await clock.advance(7100)
  expect(saved.mon).toBe('flareon')
  expect(saved.bag).toEqual({ waterstone: 1 })
})

// Cyndaquil as /pokemon new saves it, one XP short of Lv. 14, where it evolves
const fetchedCyndaquil = () => ({
  mon: 'cyndaquil',
  wander: false,
  stats: { cyndaquil: { xp: 14 ** 3 - 1 } },
  'custom:cyndaquil': { gen: 2, sprite: SPRITES.diglett, moves: ['Ember', 'Tackle'] },
})

test('a level-up evolves a fetched gen 2 mon, fetching the mon it becomes first', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  const asked = serveMons(on, { 2: ['quilava'] }, { types: ['fire'] })
  const saved: Record<string, any> = fetchedCyndaquil()
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'stats')).toMatch(/ Can become Quilava at Lv\. 14\./)

  await $.turn.complete(ANSWERED)
  expect(toasts).toEqual(['Cyndaquil grew to Lv. 14!'])
  expect(asked.some((url) => url.includes('/gen2/quilava/'))).toBe(true)
  expect(saved['custom:quilava'].gen).toBe(2)
  await clock.advance(50)
  expect(toasts[1]).toBe('What? Cyndaquil is evolving!')
  await clock.advance(7100)
  expect(toasts[2]).toBe('Congratulations! Your Cyndaquil evolved into Quilava!')
  expect(saved.mon).toBe('quilava')
  expect(saved.stats.cyndaquil).toBeUndefined()
  expect(saved.stats.quilava.xp).toBeGreaterThanOrEqual(14 ** 3)
  expect(await run($, 'moves')).toBe('Quilava knows Ember, Flamethrower, Tackle.')
})

test('an evolution keeps the mon\'s sex and shows its sprite for it, a female Wynaut becoming the female Wobbuffet', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  const asked = serveMons(on, { 2: ['wobbuffet_female'] }, { types: ['psychic'] })
  const saved: Record<string, any> = {
    mon: 'wynaut',
    wander: false,
    stats: { wynaut: { xp: 15 ** 3 - 1, sex: 'female' } },
    'custom:wynaut': { gen: 3, sprite: SPRITES.diglett, moves: ['Tackle'] },
  }
  const { clock } = await startedWith($, on, saved, 0)
  await $.turn.complete(ANSWERED)
  await clock.advance(7200)
  expect(toasts).toContain('Congratulations! Your Wynaut evolved into Wobbuffet!')
  expect(asked.some((url) => url.includes('/gen2/wobbuffet_female/'))).toBe(true)
  expect(saved.mon).toBe('wobbuffet_female')
  expect(saved.stats.wobbuffet_female.sex).toBe('female')
  expect(await run($, 'stats')).toMatch(/^Wobbuffet ♀, Lv\. 15,/)
})

test('a gen 2 evolution that can\'t be fetched waits, and says why', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  serveMons(on, {}, { status: 403 })
  const saved: Record<string, any> = fetchedCyndaquil()
  const { clock } = await startedWith($, on, saved, 0)
  await $.turn.complete(ANSWERED)
  const why = 'Cyndaquil can\'t evolve into Quilava yet: GitHub\'s hourly limit for anonymous requests is used up. Try again in a while.'
  expect(toasts).toEqual(['Cyndaquil grew to Lv. 14!', why])
  await clock.advance(1000)
  expect(saved.mon).toBe('cyndaquil')
  expect(saved['custom:quilava']).toBeUndefined()
  expect(await run($, 'evolve')).toBe(why)
})

test('Gloom becomes Vileplume with a Leaf Stone, or a fetched Bellossom with a Sun Stone', { timeoutMs: 30000 }, async ($, on) => {
  serveMons(on, { 2: ['bellossom'] }, { types: ['grass'] })
  const saved: Record<string, any> = { trainer: false, mon: 'gloom', bag: { sunstone: 1 } }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'evolve')).toMatch(/^Gloom can become Vileplume with a Leaf Stone or Bellossom with a Sun Stone\. Try \/pokemon evolve (vileplume|bellossom)\.$/)
  expect(await run($, 'use sun stone')).toBe('You use a Sun Stone on Gloom.')
  await clock.advance(7100)
  expect(saved.mon).toBe('bellossom')
  expect(saved.bag).toEqual({})
  expect(saved['custom:bellossom'].gen).toBe(2)
})

test('a foe that holds a trade item drops it now and then, only while the item\'s generation is in the wild, and the same foe always drops the same', () => {
  const count = (key: string, gens = [1, 2]) => {
    const drops: Record<string, number> = {}
    for (let seed = 0; seed < 18000; seed++) {
      const item = dropOf(key, seed, gens)
      if (item) drops[item] = (drops[item] ?? 0) + 1
    }
    return drops
  }
  const magnemite = count('magnemite')
  const dropped = Object.values(magnemite).reduce((sum, n) => sum + n, 0)
  expect(Object.keys(magnemite).sort()).toEqual(['linkcable', 'metalcoat', 'rarecandy', 'thunderstone'])
  // About 1 drop in 12 is the held item
  expect(magnemite.metalcoat / dropped).toBeGreaterThan(0.05)
  expect(magnemite.metalcoat / dropped).toBeLessThan(0.12)
  expect(Object.keys(count('porygon'))).toContain('upgrade')
  expect(Object.keys(count('horsea'))).toContain('dragonscale')
  expect(Object.keys(count('slowpoke'))).toContain('kingsrock')
  expect(heldItemsOf('pidgey')).toEqual([])
  // The Metal Coat and Up-Grade came in gen 2, so with gen 1 alone they don't drop
  expect(Object.keys(count('magnemite', [1])).sort()).toEqual(['linkcable', 'rarecandy', 'thunderstone'])
  expect(Object.keys(count('porygon', [1])).sort()).toEqual(['linkcable', 'rarecandy'])
  expect(Object.keys(count('pidgey')).some((item) => ['kingsrock', 'metalcoat', 'dragonscale', 'upgrade'].includes(item))).toBe(false)
  expect(dropOf('magnemite', 42)).toBe(dropOf('magnemite', 42))
})

test('gen 2 foes drop their own type\'s stone, Sun Stone included, and the items their line holds, and no other stone', () => {
  const kinds = (key: string) => {
    const drops = new Set<string>()
    for (let seed = 0; seed < 6000; seed++) {
      const item = dropOf(key, seed, [1, 2])
      if (item) drops.add(item)
    }
    return [...drops].sort()
  }
  expect(kinds('cyndaquil')).toEqual(['firestone', 'linkcable', 'rarecandy'])
  expect(kinds('sunkern')).toEqual(['leafstone', 'linkcable', 'rarecandy', 'sunstone'])
  expect(kinds('togepi')).toEqual(['linkcable', 'moonstone', 'rarecandy'])
  expect(kinds('steelix')).toContain('metalcoat')
  expect(kinds('kingdra')).toEqual(['dragonscale', 'linkcable', 'rarecandy', 'waterstone'])
  expect(stonesOf('hooh', [1, 2])).toEqual(['firestone', 'sunstone'])
  // Porygon2 holds the Up-Grade, and with gen 4 on the Dubious Disc it trades into Porygon-Z with
  expect(heldItemsOf('porygon2', [1, 2])).toEqual(['upgrade'])
  expect(heldItemsOf('porygon2')).toEqual(['upgrade', 'dubiousdisc'])
  // A gen 2 foe with no stone type drops no stone, as gen 1's don't
  expect(kinds('aipom')).toEqual(['linkcable', 'rarecandy'])
  expect(kinds('porygon')).toEqual(['linkcable', 'rarecandy', 'upgrade'])
})

test('Clamperl trades into Huntail holding a Deep Sea Tooth or Gorebyss holding a Deep Sea Scale', { timeoutMs: 30000 }, async ($, on) => {
  const asked = serveMons(on, { 3: ['gorebyss'] }, { types: ['water'] })
  const saved: Record<string, any> = {
    trainer: false,
    mon: 'clamperl',
    bag: { deepseascale: 1 },
    'custom:clamperl': { gen: 3, sprite: SPRITES.diglett, moves: ['Tackle'], by: 'new' },
  }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'evolve')).toMatch(
    /^Clamperl can become Huntail by trade holding a Deep Sea Tooth or Gorebyss by trade holding a Deep Sea Scale\. Try \/pokemon evolve (huntail|gorebyss)\.$/,
  )
  expect(await run($, 'evolve huntail')).toBe('Clamperl needs a Deep Sea Tooth to evolve into Huntail. Wild mons you knock out drop items now and then, and /pokemon bag lists yours.')
  expect(await run($, 'use deep sea scale')).toBe('You trade Clamperl holding a Deep Sea Scale to a friend, and they trade it right back.')
  await clock.advance(7100)
  expect(saved.mon).toBe('gorebyss')
  expect(saved.bag).toEqual({})
  expect(asked.some((url) => url.includes('/gen3/gorebyss/'))).toBe(true)
})

test('a Dawn Stone makes a male Kirlia Gallade, and a female Kirlia says only a male can', { timeoutMs: 30000 }, async ($, on) => {
  const asked = serveMons(on, { 4: ['gallade'] }, { types: ['psychic', 'fighting'] })
  const kirlia = (sex: string) => ({
    trainer: false,
    mon: 'kirlia',
    bag: { dawnstone: 1 },
    stats: { kirlia: { xp: 20 ** 3, sex } },
    'custom:kirlia': { gen: 3, sprite: SPRITES.diglett, moves: ['Confusion'], by: 'new' },
  })
  const saved: Record<string, any> = kirlia('female')
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'stats')).toMatch(/ Can become Gardevoir at Lv\. 30\. /)
  expect(await run($, 'evolve gallade')).toBe('Only a male Kirlia can become Gallade.')
  expect(await run($, 'use dawn stone')).toBe('Only a male Kirlia can become Gallade.')
  saved.stats.kirlia.sex = 'male'
  await run($, 'kirlia')
  expect(await run($, 'stats')).toMatch(/ Can become Gardevoir at Lv\. 30 or Gallade with a Dawn Stone\. /)
  expect(await run($, 'use dawn stone')).toBe('You use a Dawn Stone on Kirlia.')
  await clock.advance(7100)
  expect(saved.mon).toBe('gallade')
  expect(saved.stats.gallade.sex).toBe('male')
  expect(saved.bag).toEqual({})
  expect(asked.some((url) => url.includes('/gen4/gallade/'))).toBe(true)
})

test('Burmy at 20 becomes the Wormadam of its cloak when female and Mothim when male', () => {
  expect(levelEvolutionOf('burmy_sandy', 'female')).toEqual({ into: 'wormadam_sandy', level: 20, sex: 'female' })
  expect(levelEvolutionOf('burmy_sandy', 'male')).toEqual({ into: 'mothim', level: 20, sex: 'male' })
  expect(levelEvolutionOf('burmy_trash', null)).toBeNull()
  expect(startLevel('wormadam_trash')).toBe(20)
  expect(preEvolutionOf('mothim')).toBe('burmy')
  expect(levelEvolutionOf('snorunt', 'female')?.into).toBe('glalie')
})

test('Mantyke levels up into Mantine with a Remoraid on show or in the party', () => {
  const at = (team: string[]) => ({ level: 12, food: 0, hearts: 0, full: 5, time: 'day', sex: 'male', team })
  expect(levelUpEvolutionOf('mantyke', at(['remoraid']))?.into).toBe('mantine')
  expect(levelUpEvolutionOf('mantyke', at(['octillery', 'pikachu']))).toBeNull()
})

for (const [hour, evolves] of [[22, true], [12, false]] as const) {
  test(`a Razor Claw ${evolves ? 'makes Sneasel Weavile at night' : 'waits for the night'}`, { timeoutMs: 30000 }, async ($, on) => {
    serveMons(on, { 4: ['weavile'] }, { types: ['dark', 'ice'] })
    const now = new Date(2026, 10, 17, hour).getTime()
    const saved: Record<string, any> = { trainer: false, mon: 'sneasel', bag: { razorclaw: 1 }, stats: { sneasel: { xp: 20 ** 3, sex: 'female' } } }
    saved['custom:sneasel'] = { gen: 2, sprite: SPRITES.diglett, moves: ['Scratch'], by: 'new' }
    const { clock } = await startedWith($, on, saved, now)
    if (evolves) {
      expect(await run($, 'use razor claw')).toBe('You use a Razor Claw on Sneasel.')
      await clock.advance(7100)
      expect(saved.mon).toBe('weavile')
    } else {
      expect(await run($, 'use razor claw')).toBe('Sneasel evolves into Weavile with a Razor Claw by night. It\'s day now.')
      expect(saved.bag).toEqual({ razorclaw: 1 })
    }
  })
}

test('gen 4 foes drop their own type\'s stone, gen 4\'s new stones included, and the lines that evolve with an item hold it', () => {
  const kinds = (key: string) => {
    const drops = new Set<string>()
    for (let seed = 0; seed < 6000; seed++) {
      const item = dropOf(key, seed)
      if (item) drops.add(item)
    }
    return [...drops].sort()
  }
  expect(kinds('chimchar')).toEqual(['firestone', 'linkcable', 'rarecandy'])
  expect(kinds('drifloon')).toEqual(['duskstone', 'linkcable', 'rarecandy'])
  expect(kinds('snover')).toEqual(['icestone', 'leafstone', 'linkcable', 'rarecandy'])
  expect(kinds('bronzor')).toEqual(['dawnstone', 'linkcable', 'metalcoat', 'rarecandy'])
  expect(kinds('togekiss')).toEqual(['linkcable', 'rarecandy', 'shinystone'])
  expect(kinds('rhyhorn')).toEqual(['linkcable', 'protector', 'rarecandy'])
  expect(kinds('electabuzz')).toEqual(['electirizer', 'linkcable', 'rarecandy', 'thunderstone'])
  expect(kinds('magby')).toEqual(['firestone', 'linkcable', 'magmarizer', 'rarecandy'])
  expect(kinds('happiny')).toEqual(['linkcable', 'ovalstone', 'rarecandy'])
  expect(heldItemsOf('dusclops')).toEqual(['reapercloth'])
  expect(heldItemsOf('sneasel')).toEqual(['razorclaw'])
  expect(heldItemsOf('gligar')).toEqual(['razorfang'])
  expect(kinds('starly')).toEqual(['linkcable', 'rarecandy'])
})

test('an older foe drops a newer generation\'s items by its type once that generation is in the wild', () => {
  const kinds = (key: string, gens: number[]) => {
    const drops = new Set<string>()
    for (let seed = 0; seed < 6000; seed++) {
      const item = dropOf(key, seed, gens)
      if (item) drops.add(item)
    }
    return [...drops].sort()
  }
  expect(kinds('gastly', [1])).toEqual(['linkcable', 'rarecandy'])
  expect(kinds('gastly', [1, 4])).toEqual(['duskstone', 'linkcable', 'rarecandy'])
  // A foe of two types drops either stone
  expect(kinds('sneasel', [1, 2, 4])).toEqual(['duskstone', 'icestone', 'linkcable', 'rarecandy', 'razorclaw'])
  expect(kinds('clefairy', [1])).toEqual(['linkcable', 'moonstone', 'rarecandy'])
  expect(kinds('clefairy', [1, 4])).toEqual(['linkcable', 'moonstone', 'rarecandy', 'shinystone'])
  expect(kinds('clamperl', [1, 3])).toEqual(['deepseascale', 'deepseatooth', 'linkcable', 'rarecandy', 'waterstone'])
  expect(kinds('onix', [1, 2])).toEqual(['linkcable', 'metalcoat', 'rarecandy'])
  expect(kinds('dratini', [1])).toEqual(['linkcable', 'rarecandy'])
  expect(stonesOf('abra', [1, 4])).toEqual(['dawnstone'])
})

test('gen 3 foes drop their own type\'s stone, and Carvanha and Relicanth the Deep Sea items', () => {
  const kinds = (key: string) => {
    const drops = new Set<string>()
    for (let seed = 0; seed < 6000; seed++) {
      const item = dropOf(key, seed, [1, 2, 3])
      if (item) drops.add(item)
    }
    return [...drops].sort()
  }
  expect(kinds('torchic')).toEqual(['firestone', 'linkcable', 'rarecandy'])
  expect(kinds('lotad')).toEqual(['leafstone', 'linkcable', 'rarecandy', 'waterstone'])
  expect(kinds('seedot')).toEqual(['leafstone', 'linkcable', 'rarecandy'])
  expect(kinds('skitty')).toEqual(['linkcable', 'moonstone', 'rarecandy'])
  expect(kinds('solrock')).toEqual(['linkcable', 'rarecandy', 'sunstone'])
  expect(kinds('carvanha')).toEqual(['deepseatooth', 'linkcable', 'rarecandy', 'waterstone'])
  expect(kinds('relicanth')).toEqual(['deepseascale', 'linkcable', 'rarecandy', 'waterstone'])
  expect(kinds('zigzagoon')).toEqual(['linkcable', 'rarecandy'])
})

test('Onix trades into a fetched Steelix holding a Metal Coat, which it spends, and a Link Cable alone won\'t do', { timeoutMs: 30000 }, async ($, on) => {
  serveMons(on, { 2: ['steelix'] }, { types: ['steel', 'ground'] })
  const saved: Record<string, any> = { trainer: false, mon: 'onix', bag: { linkcable: 1 } }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'stats')).toMatch(/ Can become Steelix by trade holding a Metal Coat\./)
  expect(await run($, 'evolve')).toBe('Onix needs a Metal Coat to evolve into Steelix. Wild mons you knock out drop items now and then, and /pokemon bag lists yours.')
  expect(await run($, 'use link cable')).toBe('Onix can\'t use a Link Cable.')
  expect(await run($, 'use upgrade')).toBe('Onix can\'t use an Up-Grade.')

  saved.bag = { metalcoat: 1, linkcable: 1 }
  expect(await run($, 'use metal coat')).toBe('You trade Onix holding a Metal Coat to a friend, and they trade it right back.')
  await clock.advance(7100)
  expect(saved.mon).toBe('steelix')
  expect(saved.bag).toEqual({ linkcable: 1 })
  expect(saved['custom:steelix'].gen).toBe(2)
})

test('Poliwhirl becomes Poliwrath with a Water Stone, or a fetched Politoed by trade holding a King\'s Rock', { timeoutMs: 30000 }, async ($, on) => {
  serveMons(on, { 2: ['politoed'] }, { types: ['water'] })
  const saved: Record<string, any> = { trainer: false, mon: 'poliwhirl', bag: { kingsrock: 1 } }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'evolve')).toMatch(/^Poliwhirl can become Poliwrath with a Water Stone or Politoed by trade holding a King's Rock\. Try \/pokemon evolve (poliwrath|politoed)\.$/)
  expect(await run($, 'evolve politoed')).toBe('You trade Poliwhirl holding a King\'s Rock to a friend, and they trade it right back.')
  await clock.advance(7100)
  expect(saved.mon).toBe('politoed')
  expect(saved.bag).toEqual({})
})

test('a fetched Magby evolves into the bundled Magmar at Lv. 30', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  const saved: Record<string, any> = {
    mon: 'magby',
    wander: false,
    stats: { magby: { xp: 30 ** 3 - 1 } },
    'custom:magby': { gen: 2, sprite: SPRITES.diglett, moves: ['Ember', 'Tackle'] },
  }
  const { clock } = await startedWith($, on, saved, 0)
  await $.turn.complete(ANSWERED)
  expect(toasts[0]).toBe('Magby grew to Lv. 30!')
  await clock.advance(7200)
  expect(toasts.at(-1)).toBe('Congratulations! Your Magby evolved into Magmar!')
  expect(saved.mon).toBe('magmar')
})

// Golbat one XP short of Lv. 30, with its hearts at happiness
const golbatAt = (happiness: number, more: Record<string, unknown> = {}) => ({
  mon: 'golbat',
  wander: false,
  stats: { golbat: { xp: 30 ** 3 - 1, happiness: { value: happiness, at: 0 }, food: { value: 100, at: 0 } } },
  ...more,
})

test('Golbat levels up with full hearts into a fetched Crobat, and not with fewer', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  serveMons(on, { 2: ['crobat'] }, { types: ['poison', 'flying'] })
  const saved: Record<string, any> = golbatAt(100)
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'stats')).toMatch(/ Can become Crobat at a level-up with full hearts\./)
  expect(await run($, 'evolve')).toBe('Golbat can become Crobat at a level-up with full hearts.')
  await $.turn.complete(ANSWERED)
  expect(toasts[0]).toBe('Golbat grew to Lv. 30!')
  await clock.advance(7200)
  expect(toasts.at(-1)).toBe('Congratulations! Your Golbat evolved into Crobat!')
  expect(saved.mon).toBe('crobat')
  expect(saved.stats.crobat.readyFor).toBeUndefined()
})

test('Golbat with fewer than full hearts levels up and stays Golbat', { timeoutMs: 30000 }, async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const asked = serveMons(on, { 2: ['crobat'] }, { types: ['poison', 'flying'] })
  const saved: Record<string, any> = golbatAt(60)
  const { clock } = await startedWith($, on, saved, 0)
  await $.turn.complete(ANSWERED)
  await clock.advance(7200)
  expect(saved.mon).toBe('golbat')
  expect(asked).toEqual([])
  expect(await run($, 'evolve')).toBe('Golbat can become Crobat at a level-up with full hearts.')
})

test('with needs off, a level-up counts as full hearts', { timeoutMs: 30000 }, async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  serveMons(on, { 2: ['crobat'] }, { types: ['poison', 'flying'] })
  const saved: Record<string, any> = golbatAt(0, { needs: false })
  const { clock } = await startedWith($, on, saved, 0)
  await $.turn.complete(ANSWERED)
  await clock.advance(7200)
  expect(saved.mon).toBe('crobat')
})

test('with autoevolve off, a level-up with full hearts makes Golbat ready, and /pokemon evolve lets it', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  serveMons(on, { 2: ['crobat'] }, { types: ['poison', 'flying'] })
  const saved: Record<string, any> = golbatAt(100, { autoEvolve: false })
  const { clock } = await startedWith($, on, saved, 0)
  await $.turn.complete(ANSWERED)
  expect(toasts).toEqual(['Golbat grew to Lv. 30!', 'Golbat is ready to evolve into Crobat! /pokemon evolve lets it.'])
  expect(saved.stats.golbat.readyFor).toBe('crobat')
  expect(await run($, 'stats')).toMatch(/ Ready to evolve into Crobat\. \/pokemon evolve lets it\./)
  expect(await run($, 'evolve')).toBe('You let Golbat evolve.')
  await clock.advance(7200)
  expect(saved.mon).toBe('crobat')
})

for (const [hour, into, other] of [[12, 'espeon', 'umbreon'], [22, 'umbreon', 'espeon']] as const) {
  test(`Eevee levels up with full hearts at ${hour}:00 into a fetched ${into}`, { timeoutMs: 30000 }, async ($, on) => {
    on('turn.complete', () => ({ text: '' }))
    const asked = serveMons(on, { 2: ['espeon', 'umbreon'] }, { types: ['psychic'] })
    const saved: Record<string, any> = {
      mon: 'eevee',
      wander: false,
      stats: { eevee: { xp: 20 ** 3 - 1, happiness: { value: 100, at: 0 }, food: { value: 100, at: 0 } } },
    }
    const noon = new Date(2026, 10, 17, hour).getTime()
    saved.stats.eevee.happiness.at = noon
    saved.stats.eevee.food.at = noon
    const { clock } = await startedWith($, on, saved, noon)
    await $.turn.complete(ANSWERED)
    await clock.advance(7200)
    expect(saved.mon).toBe(into)
    expect(asked.some((url) => url.includes('/gen2/' + other + '/'))).toBe(false)
  })
}

test('a Rare Candy with full hearts grows a fetched Pichu into Pikachu', { timeoutMs: 30000 }, async ($, on) => {
  const saved: Record<string, any> = {
    mon: 'pichu',
    wander: false,
    bag: { rarecandy: 1 },
    stats: { pichu: { xp: 10 ** 3, sex: 'male', happiness: { value: 100, at: 0 }, food: { value: 100, at: 0 } } },
    'custom:pichu': { gen: 2, sprite: SPRITES.diglett, moves: ['Thunder Shock', 'Tackle'] },
  }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'use rare candy')).toBe('You give Pichu a Rare Candy. It grew to Lv. 11!')
  await clock.advance(7200)
  expect(saved.mon).toBe('pikachu')
})

test('gen 3 families take their tiers and start levels from Ruby and Sapphire, and Azurill leaves Marill gen 2\'s tier', () => {
  expect(tierOf('treecko')).toBe('common')
  expect(tierOf('grovyle')).toBe('uncommon')
  expect(tierOf('sceptile')).toBe('rare')
  expect(tierOf('metagross')).toBe('rare')
  expect(tierOf('sableye')).toBe('uncommon')
  expect(startLevel('grovyle')).toBe(16)
  expect(startLevel('ludicolo')).toBe(14)
  expect(startLevel('salamence')).toBe(50)
  expect(preEvolutionOf('marill')).toBe('azurill')
  expect(tierOf('azurill')).toBe('rare')
  expect(tierOf('marill')).toBe('common')
  expect(tierOf('azumarill')).toBe('uncommon')
  expect(startLevel('marill')).toBe(5)
})

test('gen 4 families take their tiers and start levels from Diamond and Pearl, and its forms and sexes evolve on their own', () => {
  expect(tierOf('turtwig')).toBe('common')
  expect(tierOf('torterra')).toBe('rare')
  expect(tierOf('gible')).toBe('rare')
  expect(tierOf('rotom')).toBe('rare')
  expect(tierOf('arceus')).toBe('legendary')
  expect(tierOf('vespiquen')).toBe('uncommon')
  expect(tierOf('hippowdon')).toBe('uncommon')
  expect(tierOf('gastrodon')).toBe('uncommon')
  expect(startLevel('grotle')).toBe(18)
  expect(startLevel('garchomp_female')).toBe(48)
  expect(startLevel('hippowdon_female')).toBe(34)
  expect(startLevel('vespiquen')).toBe(21)
  expect(startLevel('gastrodon_west')).toBe(30)
  expect(preEvolutionOf('vespiquen')).toBe('combee')
  expect(preEvolutionOf('gabite_female')).toBe('gible')
  // Only a female Combee evolves, and each sea and sex keeps to its own line
  expect(levelEvolutionOf('combee_male')).toBeNull()
  expect(levelEvolutionOf('combee_female')).toEqual({ into: 'vespiquen', level: 21 })
  expect(levelEvolutionOf('shellos_east')?.into).toBe('gastrodon_east')
  expect(levelEvolutionOf('gible_female')?.into).toBe('gabite_female')
  expect(levelEvolutionOf('hippopotas_male')?.into).toBe('hippowdon_male')
  // A move the games wait for is the level it's learned at
  expect(levelEvolutionOf('aipom')).toEqual({ into: 'ambipom', level: 32 })
  expect(levelEvolutionOf('bonsly')).toEqual({ into: 'sudowoodo', level: 17 })
  expect(startLevel('ambipom')).toBe(32)
  // A bundled mon keeps its gen 1 tier and start level when it only grows into a gen 4 mon
  expect(tierOf('magneton')).toBe('uncommon')
  expect(tierOf('mrmime')).toBe('uncommon')
  expect(startLevel('mrmime')).toBe(5)
  expect(tierOf('mimejr')).toBe('rare')
  expect(displayName('mimejr')).toBe('Mime Jr.')
  expect(displayName('porygonz')).toBe('Porygon-Z')
  expect(displayName('rotom_wash')).toBe('Rotom (Wash)')
  expect(displayName('burmy_sandy')).toBe('Burmy (Sandy)')
  expect(displayName('combee_female')).toBe('Combee')
  expect(displayName('garchomp_female')).toBe('Garchomp')
  expect(dexNumber('turtwig')).toBe(387)
  expect(dexNumber('arceus_fire')).toBe(493)
})

test('gen 4 in the wild: Burmy in a cloak, Combee and Gible by sex, Rotom in a forme, and Arceus always Normal', () => {
  let seed = 3
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const picks = Array.from({ length: 20000 }, () => pickWild(random, [1, 4]))
  expect(picks.filter((pick) => genOf(pick.mon) === 4).length).toBeGreaterThan(5000)
  for (const pick of picks) expect(pick.key).toBe(dexKey(pick.mon))
  const of = (key: string) => picks.filter((pick) => pick.key === key)
  expect(of('burmy').every((pick) => /^burmy_(plant|sandy|trash)$/.test(pick.mon))).toBe(true)
  expect(of('combee').every((pick) => pick.mon === 'combee_' + pick.sex)).toBe(true)
  expect(of('combee').filter((pick) => pick.sex === 'male').length).toBeGreaterThan(of('combee').filter((pick) => pick.sex === 'female').length)
  expect(of('gible').every((pick) => pick.mon === (pick.sex === 'female' ? 'gible_female' : 'gible'))).toBe(true)
  expect(of('rotom').some((pick) => pick.mon !== 'rotom')).toBe(true)
  expect(of('rotom').every((pick) => pick.sex === null)).toBe(true)
  expect(of('arceus').every((pick) => pick.mon === 'arceus')).toBe(true)
})

test('/pokemon new fetches Mime Jr. from its mimeJr folder, and a form takes its species\' types when PokéAPI has none for it', { timeoutMs: 30000 }, async ($, on) => {
  const asked = serveMons(on, { 4: ['mimeJr', 'combee_female'] }, { types: ['psychic'] })
  const saved: Record<string, any> = { trainer: false }
  await startedWith($, on, saved, 0)
  expect(await run($, 'new mimejr')).toMatch(/Mime Jr\./)
  expect(asked.some((url) => url.includes('/gen4/mimeJr/'))).toBe(true)
  expect(asked.some((url) => url.endsWith('/pokemon-form/mime-jr'))).toBe(true)
  expect(saved['custom:mimejr'].gen).toBe(4)
})

test('a Rare Candy with full hearts grows a fetched Azurill into Marill, fetched from gen 2', { timeoutMs: 30000 }, async ($, on) => {
  const asked = serveMons(on, { 2: ['marill'] }, { types: ['water'] })
  const saved: Record<string, any> = {
    mon: 'azurill',
    wander: false,
    bag: { rarecandy: 1 },
    stats: { azurill: { xp: 10 ** 3, happiness: { value: 100, at: 0 }, food: { value: 100, at: 0 } } },
    'custom:azurill': { gen: 3, sprite: SPRITES.diglett, moves: ['Bubble', 'Tackle'] },
  }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'use rare candy')).toBe('You give Azurill a Rare Candy. It grew to Lv. 11!')
  await clock.advance(7200)
  expect(saved.mon).toBe('marill')
  expect(asked.some((url) => url.includes('/gen2/marill/'))).toBe(true)
  expect(saved['custom:marill'].gen).toBe(2)
})

test('a fetched Skitty becomes a fetched Delcatty with a Moon Stone', { timeoutMs: 30000 }, async ($, on) => {
  const asked = serveMons(on, { 3: ['delcatty'] }, { types: ['normal'] })
  const saved: Record<string, any> = {
    trainer: false,
    mon: 'skitty',
    bag: { moonstone: 1 },
    'custom:skitty': { gen: 3, sprite: SPRITES.diglett, moves: ['Tackle'], by: 'new' },
  }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'evolve')).toBe('You use a Moon Stone on Skitty.')
  await clock.advance(7100)
  expect(saved.mon).toBe('delcatty')
  expect(saved.bag).toEqual({})
  expect(asked.some((url) => url.includes('/gen3/delcatty/'))).toBe(true)
  expect(saved['custom:delcatty'].gen).toBe(3)
})

test('chance picks Wurmple\'s evolution once, Feebas needs full food, and Wobbuffet keeps gen 2\'s tier', () => {
  const at = (level: number, more: Record<string, unknown> = {}) => ({ level, food: 0, hearts: 0, full: 5, time: 'day', ...more })
  expect(levelEvolutionOf('wurmple')).toBeNull()
  expect(levelUpEvolutionOf('wurmple', at(6, { random: () => 0 }))).toBeNull()
  expect(levelUpEvolutionOf('wurmple', at(7, { random: () => 0 }))?.into).toBe('silcoon')
  expect(levelUpEvolutionOf('wurmple', at(7, { random: () => 0.99 }))?.into).toBe('cascoon')
  // A pick already made stays
  expect(levelUpEvolutionOf('wurmple', at(8, { random: () => 0, kept: 'cascoon' }))?.into).toBe('cascoon')
  expect(levelEvolutionOf('wynaut')).toEqual({ into: 'wobbuffet_male', level: 15 })
  expect(levelUpEvolutionOf('feebas', at(9, { food: 5 }))?.into).toBe('milotic')
  expect(levelUpEvolutionOf('feebas', at(9, { food: 4, hearts: 5 }))).toBeNull()
  expect(preEvolutionOf('wobbuffet_male')).toBe('wynaut')
  expect(startLevel('wobbuffet_female')).toBe(15)
  expect(tierOf('wobbuffet')).toBe('uncommon')
  expect(tierOf('wynaut')).toBe('rare')
  expect(tierOf('silcoon')).toBe('uncommon')
  expect(tierOf('dustox')).toBe('rare')
  expect(tierOf('milotic')).toBe('rare')
  expect(startLevel('ninjask')).toBe(20)
})

test('Wurmple reaching Lv. 7 evolves into Silcoon or Cascoon, picked by chance', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  serveMons(on, { 3: ['silcoon', 'cascoon'] }, { types: ['bug'] })
  const saved: Record<string, any> = {
    mon: 'wurmple',
    wander: false,
    stats: { wurmple: { xp: 7 ** 3 - 1 } },
    'custom:wurmple': { gen: 3, sprite: SPRITES.diglett, moves: ['Tackle'] },
  }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'stats')).toMatch(/ Can become Silcoon or Cascoon at Lv\. 7, by chance\./)
  expect(await run($, 'evolve')).toBe('Wurmple can become Silcoon or Cascoon at Lv. 7, by chance.')
  await $.turn.complete(ANSWERED)
  expect(toasts[0]).toBe('Wurmple grew to Lv. 7!')
  await clock.advance(7200)
  expect(['silcoon', 'cascoon']).toContain(saved.mon)
  expect(toasts).toContain('Congratulations! Your Wurmple evolved into ' + (saved.mon === 'silcoon' ? 'Silcoon' : 'Cascoon') + '!')
  expect(saved.stats[saved.mon].readyFor).toBeUndefined()
})

test('Nincada evolving into Ninjask puts a Shedinja in the box too, caught at its level', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  on('turn.complete', () => ({ text: '' }))
  const asked = serveMons(on, { 3: ['ninjask', 'shedinja'] }, { types: ['bug'] })
  const saved: Record<string, any> = {
    mon: 'nincada',
    wander: false,
    stats: { nincada: { xp: 20 ** 3 - 1 } },
    'custom:nincada': { gen: 3, sprite: SPRITES.diglett, moves: ['Tackle'] },
  }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'stats')).toMatch(/ Can become Ninjask at Lv\. 20\./)
  await $.turn.complete(ANSWERED)
  await clock.advance(7200)
  expect(saved.mon).toBe('ninjask')
  expect(asked.some((url) => url.includes('/gen3/shedinja/'))).toBe(true)
  expect(saved.stats.shedinja).toEqual({ xp: 20 ** 3, caught: true, parked: true })
  expect(typeof saved.dex.shedinja.caught).toBe('number')
  expect(toasts).toContain('Shedinja joined your box too!')
  expect(await run($, 'shedinja')).toMatch(/^Now showing default Shedinja/)
})

test('a Rare Candy with full food grows a fetched Feebas into Milotic, whatever its hearts', { timeoutMs: 30000 }, async ($, on) => {
  serveMons(on, { 3: ['milotic'] }, { types: ['water'] })
  const saved: Record<string, any> = {
    mon: 'feebas',
    wander: false,
    bag: { rarecandy: 1 },
    stats: { feebas: { xp: 10 ** 3, happiness: { value: 0, at: 0 }, food: { value: 100, at: 0 } } },
    'custom:feebas': { gen: 3, sprite: SPRITES.diglett, moves: ['Tackle'] },
  }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'evolve')).toBe('Feebas can become Milotic at a level-up with full food.')
  expect(await run($, 'use rare candy')).toBe('You give Feebas a Rare Candy. It grew to Lv. 11!')
  await clock.advance(7200)
  expect(saved.mon).toBe('milotic')
})

// A fetched Tyrogue one XP short of Lv. 20, with its meters at food and happiness
const tyrogueAt = (food: number, happiness: number, more: Record<string, unknown> = {}) => ({
  mon: 'tyrogue',
  wander: false,
  stats: { tyrogue: { xp: 20 ** 3 - 1, food: { value: food, at: 0 }, happiness: { value: happiness, at: 0 } } },
  'custom:tyrogue': { gen: 2, sprite: SPRITES.diglett, moves: ['Karate Chop', 'Tackle'] },
  ...more,
})

for (const [food, happiness, into] of [[100, 40, 'hitmonlee'], [40, 100, 'hitmonchan'], [100, 90, 'hitmontop']] as const) {
  test(`Tyrogue at Lv. 20 with food ${food}% and happiness ${happiness}% becomes ${into}`, { timeoutMs: 30000 }, async ($, on) => {
    on('turn.complete', () => ({ text: '' }))
    serveMons(on, { 2: ['hitmontop'] }, { types: ['fighting'] })
    const saved: Record<string, any> = tyrogueAt(food, happiness)
    const { clock } = await startedWith($, on, saved, 0)
    await $.turn.complete(ANSWERED)
    await clock.advance(7200)
    expect(saved.mon).toBe(into)
  })
}

test('Tyrogue says how it evolves, and with needs off becomes Hitmontop', { timeoutMs: 30000 }, async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  serveMons(on, { 2: ['hitmontop'] }, { types: ['fighting'] })
  const saved: Record<string, any> = tyrogueAt(100, 20, { needs: false })
  const { clock } = await startedWith($, on, saved, 0)
  const ways = 'Hitmonlee at Lv. 20 with more food than hearts, Hitmonchan at Lv. 20 with more hearts than food, or Hitmontop at Lv. 20 with as much food as hearts'
  expect(await run($, 'stats')).toContain(' Can become ' + ways + '.')
  expect(await run($, 'evolve hitmonlee')).toBe('Tyrogue can become Hitmonlee at Lv. 20 with more food than hearts.')
  await $.turn.complete(ANSWERED)
  await clock.advance(7200)
  expect(saved.mon).toBe('hitmontop')
  expect(saved['custom:hitmontop'].gen).toBe(2)
})

test('a gen 1 mon with a gen 2 baby or a gen 2 evolution keeps its wild tier and start level', () => {
  for (const mon of ['pikachu', 'clefairy', 'jigglypuff']) {
    expect(tierOf(mon)).toBe('common')
    expect(startLevel(mon)).toBe(startLevel('pidgey'))
  }
  for (const mon of ['jynx', 'electabuzz', 'magmar', 'onix']) {
    expect(tierOf(mon)).toBe('uncommon')
    expect(startLevel(mon)).toBe(startLevel('pidgey'))
  }
  expect(tierOf('scyther')).toBe('rare')
  for (const mon of ['hitmonlee', 'hitmonchan']) {
    expect(tierOf(mon)).toBe('rare')
    expect(startLevel(mon)).toBe(startLevel('pidgey'))
  }
  expect(tierOf('seadra')).toBe('uncommon')
  expect(startLevel('seadra')).toBe(32)
  expect(startLevel('steelix')).toBe(startLevel('onix'))
  expect(startLevel('kingdra')).toBe(32)
})

test('Rare Candy raises a level, evolves the shown mon at its level, and a box mon once it\'s shown', { timeoutMs: 30000 }, async ($, on) => {
  const toasts = toastsOf(on)
  const stats = {
    charmander: { xp: 15 ** 3 + 10 },
    bulbasaur: { xp: 15 ** 3, sex: 'male', parked: true },
    abra: { xp: 30 ** 3, fainted: { ms: 0, at: 0 }, parked: true },
    pidgey: { xp: 9 ** 3, ranAway: { at: 0, variant: 'default' } },
  }
  const saved: Record<string, any> = { mon: 'charmander', wander: false, stats, bag: { rarecandy: 2 } }
  const { clock } = await startedWith($, on, saved, 0)
  expect(await run($, 'use rare candy abra')).toBe('Abra has fainted, and a Rare Candy won\'t revive it. /pokemon revive takes it to a Pokémon Center.')
  expect(await run($, 'use rare candy pidgey')).toBe('Pidgey ran away. It may turn up in the wild.')
  expect(await run($, 'use rare candy squirtle')).toBe('Squirtle isn\'t in your box. /pokemon box lists yours.')
  expect(saved.bag).toEqual({ rarecandy: 2 })

  expect(await run($, 'use candy bulbasaur')).toBe('You give Bulbasaur a Rare Candy. It grew to Lv. 16!')
  expect(saved.stats.bulbasaur).toEqual({ xp: 16 ** 3, sex: 'male', parked: true, evolveReady: true })
  expect(await run($, 'use rare candy')).toBe('You give Charmander a Rare Candy. It grew to Lv. 16!')
  expect(saved.bag).toEqual({})
  expect(await run($, 'use rare candy')).toBe('You have no Rare Candy. Wild mons you knock out drop one now and then.')
  await clock.advance(9000)
  expect(saved.mon).toBe('charmeleon')

  await run($, 'bulbasaur')
  await clock.advance(9000)
  expect(saved.mon).toBe('ivysaur')
  expect(saved.stats.ivysaur.evolveReady).toBeUndefined()
  expect(toasts).toContain('Congratulations! Your Bulbasaur evolved into Ivysaur!')
})

test('a knocked out foe drops an item into the bag, or nothing', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, toasts } = await inBattle($, on, saved)
  await weaken($, clock, toasts)
  const fainted = /^Wild Pidgey fainted! It can't be caught now\.( It dropped a (Link Cable|Rare Candy), and it's in your bag\.)?$/
  for (let k = 0; k < 60 && !toasts.some((text) => fainted.test(text)); k++) {
    if (k % 12 === 0) await run($, 'attack')
    await clock.advance(500)
  }
  const toast = toasts.find((text) => fainted.test(text))
  expect(toast).toBeDefined()
  expect(Object.values(saved.bag ?? {})).toEqual(toast?.includes('dropped') ? [1] : [])
})

test('a long answered turn now and then turns up a Rare Candy, and a short one never does', { timeoutMs: 60000 }, async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const saved: Record<string, any> = { bag: {} }
  await startedWith($, on, saved, 0)
  for (let k = 0; k < 40; k++) await $.turn.complete(ANSWERED)
  expect(saved.bag).toEqual({})
  for (let k = 0; k < 150; k++) await $.turn.complete({ ...ANSWERED, durationMs: 150000 })
  expect(saved.bag.rarecandy).toBeGreaterThan(0)
})

test('a party mon earns half XP for its own subagent\'s answered turns, and evolves once it\'s shown', { timeoutMs: 30000 }, async ($, on) => {
  runningAgents(on)
  on('turn.complete', () => ({ text: '' }))
  const toasts = toastsOf(on)
  const saved: Record<string, any> = { wander: false, stats: { abra: { xp: 20 ** 3 }, charmander: { xp: 16 ** 3 - 5, sex: 'male', parked: true } } }
  const { clock } = await startedWith($, on, saved, 0)
  await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.agent.spawn(spawnOf('t1'))
  await clock.advance(4000)
  await $.turn.complete({ ...ANSWERED, agentId: 'agent-t1', reason: 'aborted', isAborted: true })
  expect(saved.stats.charmander.xp).toBe(16 ** 3 - 5)
  expect(saved.stats.abra.xp).toBe(20 ** 3)
  await clock.advance(4000)

  await $.agent.spawn(spawnOf('t2'))
  await clock.advance(4000)
  await $.turn.complete({ ...ANSWERED, agentId: 'agent-t2' })
  // Half of 10 + 2 x 15, 1.25 times for a 30 s turn, 1.3 times at 80% meters
  expect(saved.stats.charmander.xp).toBe(16 ** 3 - 5 + 33)
  expect(saved.stats.charmander.evolveReady).toBe(true)
  expect(saved.stats.abra.xp).toBe(20 ** 3)
  expect(toasts).toContain('Charmander grew to Lv. 16 working beside Abra!')
  expect(await run($, 'party')).toBe('1 mon in your party, beside Abra:\nCharmander ♂, Lv. 16, ready to evolve, free')

  await run($, 'charmander')
  await clock.advance(9000)
  expect(saved.mon).toBe('charmeleon')
})

// A gen 2 mon saved as fetched, by 'new', 'wild', or 'evolution', or with no by as saved
// before by existed
const fetchedAs = (by?: string) => ({ gen: 2, sprite: SPRITES.diglett, moves: ['Tackle'], ...(by ? { by } : {}) })

test('a generation stays out of the wild until it\'s turned on, and every form of a mon is one Pokédex entry', () => {
  let seed = 1
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const gen1 = Array.from({ length: 4000 }, () => pickWild(random))
  expect(gen1.every((pick) => genOf(pick.mon) === 1)).toBe(true)
  const both = Array.from({ length: 4000 }, () => pickWild(random, [1, 2]))
  expect(both.filter((pick) => genOf(pick.mon) === 2).length).toBeGreaterThan(1000)
  for (const pick of both) expect(pick.key).toBe(dexKey(pick.mon))
  expect(both.some((pick) => pick.mon.startsWith('unown_'))).toBe(true)
  expect(both.some((pick) => pick.mon === 'unown')).toBe(false)
  expect(dexNumber('chikorita')).toBe(152)
  expect(dexNumber('unown_question')).toBe(201)
  expect(dexNumber('hooh')).toBe(250)
  expect(tierOf('celebi')).toBe('legendary')
  expect(tierOf('pichu')).toBe('rare')
  expect(tierOf('chikorita')).toBe('common')
  expect(tierOf('bayleef')).toBe('uncommon')
  // Gen 3 stays out until it's on too, and Deoxys's formes are its one entry
  expect(both.some((pick) => genOf(pick.mon) === 3)).toBe(false)
  const withGen3 = Array.from({ length: 4000 }, () => pickWild(random, [1, 3]))
  expect(withGen3.filter((pick) => genOf(pick.mon) === 3).length).toBeGreaterThan(1000)
  expect(withGen3.some((pick) => genOf(pick.mon) === 2)).toBe(false)
  expect(dexNumber('treecko')).toBe(252)
  expect(dexNumber('deoxys_speed')).toBe(386)
  expect(genOf('deoxys_attack')).toBe(3)
  expect(tierOf('deoxys_defense')).toBe('legendary')
  expect(tierOf('rayquaza')).toBe('legendary')
  expect(tierOf('bagon')).toBe('rare')
  expect(tierOf('azurill')).toBe('rare')
})

test('/pokemon gen <N> turns a generation on and off, saved across sessions, and the Pokédex counts it', async ($, on) => {
  const saved: Record<string, any> = { mon: 'pidgey', trainer: false }
  await startedWith($, on, saved, 0)
  const how = '/pokemon gen <N> turns gen 2, gen 3, or gen 4 on or off.'
  expect(await run($, 'gen')).toBe('In the wild: gen 1. ' + how)
  expect(await run($, 'dex')).toBe('Pokédex: seen 0, caught 0 of 151. No wild mons met yet.')
  expect(await run($, 'dex chikorita')).toBe('#152 Chikorita, common. It turns up in the wild once gen 2 is on: /pokemon gen 2 turns it on.')
  expect(await run($, 'gen 2')).toBe('Gen 2 is on. Its mons turn up in the wild too, each fetched from GitHub the first time you meet one.')
  expect(saved.gens).toEqual([2])
  expect(await run($, 'gen')).toBe('In the wild: gen 1 and 2. ' + how)
  expect(await run($, 'dex')).toBe('Pokédex: seen 0, caught 0 of 251. No wild mons met yet.')
  expect(await run($, 'dex chikorita')).toBe('#152 Chikorita, common. Not seen yet.')
  expect(await run($, 'help')).toContain('gen <N>')
  expect(await run($, 'gen 1')).toBe('Gen 1 is always in the wild. ' + how)
  expect(await run($, 'gen 5')).toBe('Gen 5 isn\'t in the wild yet. ' + how)
  // Gen 3 comes in the same way
  expect(await run($, 'dex deoxys')).toBe('#386 Deoxys, legendary. It turns up in the wild once gen 3 is on: /pokemon gen 3 turns it on.')
  expect(await run($, 'gen 3')).toBe('Gen 3 is on. Its mons turn up in the wild too, each fetched from GitHub the first time you meet one.')
  expect(await run($, 'gen')).toBe('In the wild: gen 1, 2, and 3. ' + how)
  expect(await run($, 'dex')).toBe('Pokédex: seen 0, caught 0 of 386. No wild mons met yet.')
  expect(await run($, 'gen 3')).toBe('Gen 3 is off. Its mons no longer turn up in the wild. The ones in your box stay.')
  // And gen 4
  expect(await run($, 'dex arceus')).toBe('#493 Arceus, legendary. It turns up in the wild once gen 4 is on: /pokemon gen 4 turns it on.')
  expect(await run($, 'gen 4')).toBe('Gen 4 is on. Its mons turn up in the wild too, each fetched from GitHub the first time you meet one.')
  expect(await run($, 'dex')).toBe('Pokédex: seen 0, caught 0 of 358. No wild mons met yet.')
  expect(await run($, 'gen 4')).toBe('Gen 4 is off. Its mons no longer turn up in the wild. The ones in your box stay.')
  expect(await run($, 'gen two')).toBe('Unknown generation "two". ' + how)
  expect(await run($, 'gen2')).toBe('Gen 2 is off. Its mons no longer turn up in the wild. The ones in your box stay.')
  expect(saved.gens).toEqual([])
  // A mon named like gen isn't the command
  expect(await run($, 'gengar')).toBe('Now showing default Gengar.')
})

test('a gen 2 mon met for the first time is fetched from gen 2 and saved as a wild fetch', { timeoutMs: 30000 }, async ($, on) => {
  const asked = serveMons(on, { 2: ['celebi'] }, { types: ['psychic', 'grass'] })
  const saved: Record<string, any> = { gens: [2] }
  const { toasts } = await inBattle($, on, saved, 'celebi')
  expect(asked.some((url) => url.includes('/gen2/celebi/'))).toBe(true)
  expect(asked.some((url) => url.includes('/gen1/'))).toBe(false)
  expect(saved['custom:celebi'].by).toBe('wild')
  expect(toasts.filter((text) => APPEARED.test(text))).toEqual(['A wild Celebi (Lv. 5) appeared!'])
})

test('a gen 2 mon that can\'t be fetched gives way to a gen 1 one', { timeoutMs: 30000 }, async ($, on) => {
  serveMons(on, {}, { status: 403 })
  const saved: Record<string, any> = { gens: [2] }
  const { toasts } = await inBattle($, on, saved, 'celebi')
  const appeared = toasts.filter((text) => APPEARED.test(text))
  expect(appeared.length).toBe(1)
  expect(appeared[0]).not.toContain('Celebi')
  expect(saved['custom:celebi']).toBeUndefined()
})

test('a caught Unown of any form is the one Unown entry, listed with gen 2 off too', { timeoutMs: 30000 }, async ($, on) => {
  const saved: Record<string, any> = { gens: [2], 'custom:unown_b': fetchedAs('wild') }
  const { clock, toasts } = await inBattle($, on, saved, 'unown_b')
  await weaken($, clock, toasts, WEAK.replace('Pidgey', 'Unown B'))
  await catchFoe($, clock, toasts)
  expect(toasts).toContain('Gotcha! Unown B was caught! It joined your box.')
  expect(saved.dex.unown.caught).toEqual(expect.any(Number))
  expect(await run($, 'dex')).toBe('Pokédex: seen 1, caught 1 of 251.\n#201 Unown ◓')
  await run($, 'gen 2')
  expect(await run($, 'dex')).toBe('Pokédex: seen 1, caught 1 of 151.\n#201 Unown ◓')
})

test('in trainer mode only a mon fetched with /pokemon new is free to show, and a generation on keeps its mons to the wild', { timeoutMs: 30000 }, async ($, on) => {
  const saved: Record<string, any> = {
    mon: 'pidgey',
    stats: { pidgey: { xp: 5 ** 3 } },
    'custom:mudkip': { ...fetchedAs(), gen: 3 },
    'custom:chikorita': fetchedAs('wild'),
    'custom:quilava': fetchedAs('evolution'),
  }
  await startedWith($, on, saved, 0)
  expect(await run($, 'mudkip')).toBe('Now showing default Mudkip.')
  expect(await run($, 'chikorita')).toMatch(/^Trainer mode is on, so you can only switch to mons in your box\. Catch a wild Chikorita/)
  expect(await run($, 'quilava')).toMatch(/^Trainer mode is on, so you can only switch to mons in your box\. Catch a wild Quilava/)

  await run($, 'gen 2')
  expect(await run($, 'new chikorita')).toBe('Gen 2 is on, so catch Chikorita in the wild, or turn gen 2 off with /pokemon gen 2.')
  expect(await run($, 'new gen2')).toBe('Gen 2 is on, so catch gen 2 mons in the wild, or turn gen 2 off with /pokemon gen 2.')
  expect(saved['custom:chikorita'].by).toBe('wild')

  // Off again, /pokemon new makes it free to show without fetching it again
  await run($, 'gen 2')
  expect(await run($, 'new chikorita')).toBe('Chikorita is already here. /pokemon chikorita shows it.')
  expect(saved['custom:chikorita'].by).toBe('new')
  expect(await run($, 'chikorita')).toBe('Now showing default Chikorita.')
})
