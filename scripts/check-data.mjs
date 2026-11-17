#!/usr/bin/env node

// Checks that the mod's tables agree with each other: every move has an effect, every
// mon has sprites and moves, evolutions name real mons without loops, levels round-trip,
// the generated frames match their mon's size and palette, every frame's eyes are
// marked inside it, and the Pokédex holds every mon once with a known tier.
//
// node scripts/check-data.mjs

import { effectOf } from '../hooks/attacks.js'
import { BUNDLED_DEX, BUNDLED_GENS, GEN_DEX, GENS, LEGENDARY, NATIONAL_DEX, RARE, TIERS, WILD_FORMS, dexKey, tierOf } from '../hooks/dex.js'
import { EVOLUTIONS, FETCHED } from '../hooks/evolutions.js'
import { EYES, eyesOf } from '../hooks/eyes.js'
import { ITEM_ART } from '../hooks/art.js'
import { ITEMS, itemFor } from '../hooks/items.js'
import { SPRITES } from '../hooks/frames.js'
import { MAX_LEVEL, levelAt, xpAt } from '../hooks/levels.js'
import { MOVE_FX, MOVES } from '../hooks/moves.js'
import { displayName } from '../hooks/names.js'

const problems = []
const fail = (text) => problems.push(text)
const mons = Object.keys(SPRITES)

for (const [name, fx] of Object.entries(MOVE_FX)) {
  if (effectOf(fx.effect) !== fx.effect) fail(`move ${name} plays unknown effect ${fx.effect}`)
}

for (const [mon, moves] of Object.entries(MOVES)) {
  if (!SPRITES[mon]) fail(`moveset for ${mon}, which has no sprites`)
  for (const entry of moves) {
    const name = typeof entry === 'string' ? entry : entry.name
    if (!MOVE_FX[name]) fail(`${mon} knows ${name}, which has no entry in MOVE_FX`)
  }
}

for (const mon of mons) {
  if (!MOVES[mon]?.length) fail(`${mon} has no moves`)
  if (!displayName(mon)) fail(`${mon} has no display name`)
}

// A mon an evolution names is bundled, or fetched at runtime and listed in FETCHED
const named = new Set()
const known = (mon) => {
  named.add(mon)
  return SPRITES[mon] || FETCHED.includes(mon)
}

for (const [mon, entries] of Object.entries(EVOLUTIONS)) {
  if (!known(mon)) fail(`evolutions for ${mon}, which has no sprites and isn't in FETCHED`)
  for (const entry of entries) {
    if (!known(entry.into)) fail(`${mon} evolves into ${entry.into}, which has no sprites and isn't in FETCHED`)
    const ways = ['level', 'item', 'trade', 'happy', 'time', 'more'].filter((key) => entry[key] !== undefined).join('+')
    if (!['level', 'item', 'trade', 'item+trade', 'happy', 'happy+time', 'level+more'].includes(ways)) {
      fail(`${mon} into ${entry.into} needs a level, an item, a trade, a trade and an item, full hearts with or without a time of day, or a level and a meter`)
    }
    if (entry.happy !== undefined && entry.happy !== true) fail(`${mon} into ${entry.into} has happy ${entry.happy}`)
    if (entry.time !== undefined && !['day', 'night'].includes(entry.time)) fail(`${mon} into ${entry.into} has time ${entry.time}`)
    if (entry.more !== undefined && !['food', 'happiness', 'neither'].includes(entry.more)) fail(`${mon} into ${entry.into} has more ${entry.more}`)
    if (entry.item !== undefined && !ITEMS.some((item) => item.key === itemFor(entry) && item.name === entry.item)) fail(`${mon} into ${entry.into} needs ${entry.item}, which isn't an item`)
    if (entry.level !== undefined && !(entry.level > 1 && entry.level <= MAX_LEVEL)) fail(`${mon} evolves at level ${entry.level}`)
  }
}

for (const mon of FETCHED) {
  if (SPRITES[mon]) fail(`${mon} is in FETCHED but bundled`)
  if (!named.has(mon)) fail(`${mon} is in FETCHED but no evolution names it`)
  if (!displayName(mon)) fail(`${mon} has no display name`)
}
if (new Set(FETCHED).size !== FETCHED.length) fail('FETCHED names a mon twice')
for (const { key } of ITEMS) if (!ITEM_ART[key]) fail(`${key} has no art`)

// Following evolutions from any mon must end, or a chain loops back on itself
for (const start of Object.keys(EVOLUTIONS)) {
  const seen = new Set()
  const walk = (mon) => {
    if (seen.has(mon)) return fail(`evolution loop through ${mon}`)
    seen.add(mon)
    for (const entry of EVOLUTIONS[mon] ?? []) walk(entry.into)
    seen.delete(mon)
  }
  walk(start)
}

for (let level = 2; level <= MAX_LEVEL; level++) {
  if (levelAt(xpAt(level)) !== level || levelAt(xpAt(level) - 1) !== level - 1) fail(`levelAt is off at level ${level}`)
}

for (const mon of mons) {
  const { width, height, variants } = SPRITES[mon]
  for (const [variant, sheet] of Object.entries(variants)) {
    const letters = new Set(sheet.palette.map((_, i) => String.fromCharCode(97 + i)))
    for (const anim of ['idle', 'walk']) {
      sheet[anim].forEach((frame, k) => {
        const where = `${mon} ${variant} ${anim} frame ${k}`
        if (frame.rows.length !== height) fail(`${where} has ${frame.rows.length} rows, not ${height}`)
        if (frame.rows.some((row) => row.length !== width)) fail(`${where} has a row that isn't ${width} wide`)
        if (frame.rows.some((row) => [...row].some((ch) => ch !== '.' && !letters.has(ch)))) fail(`${where} uses a color outside its palette`)
        if (!(frame.ms > 0)) fail(`${where} has no duration`)
      })
    }
  }
}

for (const mon of Object.keys(EYES)) if (!SPRITES[mon]) fail(`eyes for ${mon}, which has no sprites`)

for (const mon of mons) {
  if (!EYES[mon]) fail(`${mon} has no eyes marked`)
  const { width, height, variants } = SPRITES[mon]
  for (const [variant, sheet] of Object.entries(variants)) {
    for (const anim of ['idle', 'walk']) {
      const marked = (EYES[mon]?.[variant] ?? EYES[mon])?.[anim]
      if (marked && marked.length !== sheet[anim].length) fail(`${mon} ${variant} ${anim} has eyes for ${marked.length} frames, not ${sheet[anim].length}`)
      sheet[anim].forEach((frame, k) => {
        for (const box of eyesOf(mon, variant, anim, k) ?? []) {
          const [x, y, w, h] = box
          const where = `${mon} ${variant} ${anim} frame ${k} eye ${JSON.stringify(box)}`
          if (box.length !== 4 || !box.every(Number.isInteger)) fail(`${where} isn't [x, y, width, height]`)
          else if (x < 0 || y < 0 || x + w > width || y + h > height) fail(`${where} is outside the ${width}x${height} frame`)
          else if (w < 1 || h < 1) fail(`${where} is empty`)
          else if (![...frame.rows[y + h - 1].slice(x, x + w)].some((ch) => ch !== '.')) fail(`${where} has no lid row on the sprite`)
        }
      })
    }
  }
}

// Each generation's size in the national Pokédex, to catch a mon left out or put in twice
const GEN_SIZES = { 1: 151, 2: 100, 3: 135, 4: 107, 5: 156 }
for (const gen of GENS) {
  const dex = GEN_DEX[gen]
  if (dex.length !== GEN_SIZES[gen]) fail(`the gen ${gen} Pokédex has ${dex.length} entries, not ${GEN_SIZES[gen]}`)
  for (const mon of dex) {
    if (!displayName(mon)) fail(`Pokédex entry ${mon} has no display name`)
    if (BUNDLED_GENS.includes(gen) && !SPRITES[mon]) fail(`Pokédex entry ${mon} has no sprites`)
    if (!BUNDLED_GENS.includes(gen) && SPRITES[mon]) fail(`gen ${gen} Pokédex entry ${mon} is bundled`)
    for (const form of WILD_FORMS[mon] ?? []) if (dexKey(form) !== mon) fail(`${form} doesn't count as ${mon} in the Pokédex`)
  }
}
if (new Set(NATIONAL_DEX).size !== NATIONAL_DEX.length) fail('the Pokédex lists a mon twice')
for (const mon of mons) if (!BUNDLED_DEX.includes(dexKey(mon))) fail(`${mon} has no Pokédex entry`)
for (const mon of FETCHED) if (!NATIONAL_DEX.includes(dexKey(mon))) fail(`${mon} is in FETCHED but not in the Pokédex`)
for (const mon of [...LEGENDARY, ...RARE]) if (!NATIONAL_DEX.includes(mon)) fail(`tier list names ${mon}, which isn't in the Pokédex`)
for (const mon of NATIONAL_DEX) if (!TIERS[tierOf(mon)]) fail(`${mon} has unknown tier ${tierOf(mon)}`)

if (problems.length > 0) {
  for (const problem of problems) console.error(problem)
  console.error(`${problems.length} problems`)
  process.exit(1)
}
const moves = Object.values(MOVES).flat().length
const tiersOf = (dex) => Object.keys(TIERS).map((tier) => `${dex.filter((mon) => tierOf(mon) === tier).length} ${tier}`).join(', ')
const gens = GENS.map((gen) => `gen ${gen} ${GEN_DEX[gen].length} (${tiersOf(GEN_DEX[gen])})`).join(', ')
console.log(`${mons.length} mons, ${Object.keys(MOVE_FX).length} moves (${moves} in movesets), ${Object.keys(EVOLUTIONS).length} evolving mons, Pokédex ${gens}: all consistent`)
