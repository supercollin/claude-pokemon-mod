// How a mon's key reads in messages: "nidoran_female" is "Nidoran♀", "abra" is "Abra"
const DISPLAY_NAMES = {
  nidoran_female: 'Nidoran♀',
  nidoran_male: 'Nidoran♂',
  mrmime: 'Mr. Mime',
  farfetchd: "Farfetch'd",
  pikachu_female: 'Pikachu',
  venusaur_female: 'Venusaur',
  hooh: 'Ho-Oh',
  meganium_female: 'Meganium',
  steelix_female: 'Steelix',
  pichu_spiky_eared: 'Pichu',
  heracross_male: 'Heracross',
  heracross_female: 'Heracross',
  wobbuffet_male: 'Wobbuffet',
  wobbuffet_female: 'Wobbuffet',
  unown_exclamation: 'Unown !',
  unown_question: 'Unown ?',
}

export function displayName(mon) {
  return DISPLAY_NAMES[mon] ?? mon.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
