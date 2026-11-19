import { expect } from 'claude-code/testing'
import { pickWild } from '../hooks/dex.js'
import { femaleEighthsOf, fixedSexOf, randomSex, sexedSprite, withSexMark } from '../hooks/genders.js'
import { test, BAND, startedWith, inBattle, weaken, catchFoe, WEAK, run } from './helpers.ts'

test('a sprite pins down the sex it shows, and a sex picks the sprite for it', () => {
  expect(fixedSexOf('pikachu_female')).toBe('female')
  // Pikachu has a female sprite, so its base sprite is the male
  expect(fixedSexOf('pikachu')).toBe('male')
  expect(fixedSexOf('wobbuffet_male')).toBe('male')
  expect(fixedSexOf('nidoran_female')).toBe('female')
  expect(fixedSexOf('tauros')).toBe('male')
  expect(fixedSexOf('abra')).toBeNull()
  expect(fixedSexOf('magnemite')).toBeNull()

  expect(sexedSprite('pikachu', 'female')).toBe('pikachu_female')
  expect(sexedSprite('pikachu_female', 'male')).toBe('pikachu')
  expect(sexedSprite('wobbuffet_male', 'female')).toBe('wobbuffet_female')
  expect(sexedSprite('meganium', 'female')).toBe('meganium_female')
  expect(sexedSprite('abra', 'female')).toBe('abra')
  expect(sexedSprite('unown_a', null)).toBe('unown_a')

  expect(femaleEighthsOf('charmander')).toBe(1)
  expect(femaleEighthsOf('abra')).toBe(2)
  expect(femaleEighthsOf('pidgey')).toBe(4)
  expect(femaleEighthsOf('unown_b')).toBeNull()
  expect(randomSex('charmander', () => 0.1)).toBe('female')
  expect(randomSex('charmander', () => 0.2)).toBe('male')
  expect(randomSex('chansey', () => 0.99)).toBe('female')
  expect(randomSex('staryu', () => 0)).toBeNull()

  expect(withSexMark('Pikachu', 'female')).toBe('Pikachu ♀')
  expect(withSexMark('Nidoran♀', 'female')).toBe('Nidoran♀')
  expect(withSexMark('Magnemite', null)).toBe('Magnemite')
})

test('a wild mon\'s sex follows its species\' share of females, and a female shows her own sprite', () => {
  let seed = 7
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const picks = Array.from({ length: 4000 }, () => pickWild(random, [1, 2]))
  for (const pick of picks) {
    if (femaleEighthsOf(pick.mon) === null) expect(pick.sex).toBeNull()
    else expect(sexedSprite(pick.mon, pick.sex)).toBe(pick.mon)
  }
  const pikachus = picks.filter((pick) => pick.key === 'pikachu')
  expect(pikachus.some((pick) => pick.mon === 'pikachu_female' && pick.sex === 'female')).toBe(true)
  expect(pikachus.some((pick) => pick.mon === 'pikachu' && pick.sex === 'male')).toBe(true)
  expect(picks.filter((pick) => pick.key === 'heracross').every((pick) => pick.mon === 'heracross_' + pick.sex)).toBe(true)
  expect(picks.filter((pick) => pick.key === 'nidoran_male').every((pick) => pick.sex === 'male')).toBe(true)
})

test('records saved before mons had a sex get one at start, the one their sprite shows when it shows one', async ($, on) => {
  const stats = {
    pikachu: { xp: 10 ** 3 },
    pikachu_female: { xp: 10 ** 3, parked: true },
    charmander: { xp: 10 ** 3, parked: true },
    nidoran_male: { xp: 10 ** 3, parked: true },
    magnemite: { xp: 10 ** 3, parked: true },
    abra: { dead: { at: 0 } },
    pidgey: { xp: 10 ** 3, sex: 'female', parked: true },
  }
  const saved: Record<string, any> = { mon: 'pikachu', stats }
  await startedWith($, on, saved, 0)
  expect(saved.stats.pikachu.sex).toBe('male')
  expect(saved.stats.pikachu_female.sex).toBe('female')
  expect(['male', 'female']).toContain(saved.stats.charmander.sex)
  expect(saved.stats.nidoran_male.sex).toBe('male')
  expect(saved.stats.magnemite).toEqual({ xp: 10 ** 3, parked: true })
  expect(saved.stats.abra).toEqual({ dead: { at: 0 } })
  expect(saved.stats.pidgey.sex).toBe('female')
  expect(await run($, 'box')).toContain('\nPikachu ♀, Lv. 10')
  expect(await run($, 'box')).toContain('\nMagnemite, Lv. 10')
})

test('the band shows the mon\'s sex over its level, and a genderless mon shows none', async ($, on) => {
  await startedWith($, on, { mon: 'abra', stats: { abra: { xp: 10 ** 3, sex: 'female' }, magnemite: { xp: 10 ** 3, parked: true } }, trainer: false }, 0)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '♀' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Lv 10' })).toBeDefined()
  await run($, 'magnemite')
  expect(await ui.find({ type: 'Text', text: '♀' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '♂' })).toBeUndefined()
})

test('a female foe shows her own sprite, and catching her puts a female in the box', async ($, on) => {
  const saved: Record<string, any> = {}
  const { clock, toasts } = await inBattle($, on, saved, 'pikachu female')
  expect(toasts[0]).toBe('A wild Pikachu ♀ (Lv. 5) appeared!')
  await weaken($, clock, toasts, WEAK.replace('Pidgey', 'Pikachu'))
  await catchFoe($, clock, toasts)
  expect(toasts).toContain('Gotcha! Pikachu was caught! It joined your box.')
  expect(saved.stats.pikachu_female).toEqual({ xp: 5 ** 3, caught: true, sex: 'female', parked: true })
  expect(saved.stats.pikachu).toBeUndefined()
  expect(saved.dex.pikachu.caught).toEqual(expect.any(Number))
})
