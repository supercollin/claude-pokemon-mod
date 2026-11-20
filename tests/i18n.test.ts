import { expect } from 'claude-code/testing'
import { languageOf } from '../hooks/i18n.js'
import { englishCommand } from '../hooks/aliases.js'
import { test, startedWith, inBattle, run, GHOSTTY } from './helpers.ts'

const FRENCH = { options: { language: 'fr' } }
const languageRow = (value) => ({ value: [{ key: 'language', label: 'Language', kind: 'text', value, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }] })
const EMPTY_BAG_FR = 'Ton sac est vide. Mets K.O. un Pokémon sauvage avec /pokemon attaque, et il lâchera peut-être un objet.'
const CHARMANDER = { mon: 'charmander', trainer: false, stats: { charmander: { xp: 10 ** 3, sex: 'male' } } }

test('Claude Code\'s language setting names French in any spelling, and any other language is English', () => {
  expect(languageOf('Français')).toBe('fr')
  expect(languageOf('french')).toBe('fr')
  expect(languageOf('fr')).toBe('fr')
  expect(languageOf('Default (English)')).toBe('en')
  expect(languageOf('Deutsch')).toBe('en')
})

test('a French command reads as its English one, with French mon names, and a nickname is kept as typed', () => {
  expect(englishCommand('attaque')).toBe('attack')
  expect(englishCommand('salamèche')).toBe('charmander')
  expect(englishCommand('équipe ajoute dracolosse')).toBe('party add dragonite')
  expect(englishCommand('relâche m. mime')).toBe('release mrmime')
  expect(englishCommand('utilise pierre foudre pikachu')).toBe('use pierre foudre pikachu')
  expect(englishCommand('attaque liste')).toBe('attack list')
  expect(englishCommand('nouveau vipélierre')).toBe('new snivy')
  expect(englishCommand('surnom salamèche')).toBe('nickname salamèche')
  expect(englishCommand('pikachu')).toBe('pikachu')
})

test('with the language option on fr, the band speaks French, with French names', FRENCH, async ($, on) => {
  await startedWith($, on, { ...CHARMANDER }, 0)
  expect(await run($, 'stats')).toMatch(/^Salamèche ♂, N\. 10, 1000 XP \(\d+ avant le N\. 11\)\. Peut devenir Reptincel au N\. 16\./)
  expect(await run($, 'capacités')).toMatch(/^Salamèche connaît .*Flammèche/)
  const help = await run($, 'aide')
  expect(help).toContain('Usage : /pokemon <option>')
  expect(help).toContain('  attaque [capacité]')
  expect(await run($, 'zzz')).toContain('Option inconnue « zzz »')
})

test('French and English commands both work whatever the language, items and moves by either name', async ($, on) => {
  await startedWith($, on, { ...CHARMANDER, bag: { rarecandy: 1 } }, 0)
  expect(await run($, 'utilise super bonbon')).toBe('You give Charmander a Rare Candy. It grew to Lv. 11!')
  expect(await run($, 'attaque flammèche')).toBe('Charmander used Ember!')
  expect(await run($, 'bulbizarre')).toBe('Now showing default Bulbasaur.')
})

test('a French wild foe appears with its French name, and a ball is thrown in French', FRENCH, async ($, on) => {
  const { toasts } = await inBattle($, on, {}, 'pidgey male')
  expect(toasts[0]).toBe('Un Roucool ♂ sauvage (N. 5) apparaît !')
  expect(await run($, 'capture')).toBe('Tu lances une Poké Ball !')
})

test('auto follows Claude Code\'s language setting', async ($, on) => {
  on('config.list', () => languageRow('français'))
  await startedWith($, on, { ...CHARMANDER }, 0, { ...GHOSTTY, LANG: 'en_US.UTF-8' })
  expect(await run($, 'sac')).toBe(EMPTY_BAG_FR)
})

test('auto follows the system\'s language when Claude Code\'s setting is left at its default', async ($, on) => {
  on('config.list', () => languageRow('Default (English)'))
  await startedWith($, on, { ...CHARMANDER }, 0, { ...GHOSTTY, LANG: 'fr_FR.UTF-8' })
  expect(await run($, 'sac')).toBe(EMPTY_BAG_FR)
})

test('Claude Code\'s language setting, once set, wins over the system\'s', async ($, on) => {
  on('config.list', () => languageRow('English'))
  await startedWith($, on, { ...CHARMANDER }, 0, { ...GHOSTTY, LANG: 'fr_FR.UTF-8' })
  expect(await run($, 'bag')).toMatch(/^Your bag is empty/)
})

test('LC_ALL names the system\'s language before LANG does', async ($, on) => {
  await startedWith($, on, { ...CHARMANDER }, 0, { ...GHOSTTY, LC_ALL: 'fr_CA.UTF-8', LANG: 'en_US.UTF-8' })
  expect(await run($, 'bag')).toBe(EMPTY_BAG_FR)
})
