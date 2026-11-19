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
  deoxys_attack: 'Deoxys (Attack)',
  deoxys_defense: 'Deoxys (Defense)',
  deoxys_speed: 'Deoxys (Speed)',
  mimejr: 'Mime Jr.',
  porygonz: 'Porygon-Z',
}

// A form's name in parentheses, like "Rotom (Wash)", and a sprite for one sex none
const FORM_NAMES = /^(burmy|wormadam|shellos|gastrodon|rotom|giratina|shaymin|arceus)_(\w+)$/
const SEX_FORMS = /^(combee|gible|gabite|garchomp|hippopotas|hippowdon)_(male|female)$/

const capitalized = (word) => word.charAt(0).toUpperCase() + word.slice(1)

export function displayName(mon) {
  const form = mon.match(FORM_NAMES)
  if (form) return capitalized(form[1]) + ' (' + capitalized(form[2]) + ')'
  const sexed = mon.match(SEX_FORMS)
  if (sexed) return capitalized(sexed[1])
  return DISPLAY_NAMES[mon] ?? mon.split('_').map(capitalized).join(' ')
}
