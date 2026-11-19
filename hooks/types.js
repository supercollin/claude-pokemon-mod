// The Pokédex keys of each type but normal, in national order, as the games type them
// today, fairy included. A mon of two types is in both lists. The stones a mon drops by
// its type, and the plate for each type, are read from here.
export const TYPE_MONS = {
  bug: [
    'caterpie', 'metapod', 'butterfree', 'weedle', 'kakuna', 'beedrill', 'paras', 'parasect', 'venonat', 'venomoth', 'scyther', 'pinsir',
    'ledyba', 'ledian', 'spinarak', 'ariados', 'yanma', 'pineco', 'forretress', 'scizor', 'shuckle', 'heracross', 'wurmple', 'silcoon',
    'beautifly', 'cascoon', 'dustox', 'surskit', 'masquerain', 'nincada', 'ninjask', 'shedinja', 'volbeat', 'illumise', 'anorith', 'armaldo',
    'kricketot', 'kricketune', 'burmy', 'wormadam', 'mothim', 'combee', 'vespiquen', 'skorupi', 'yanmega',
  ],
  dark: [
    'umbreon', 'murkrow', 'sneasel', 'houndour', 'houndoom', 'tyranitar', 'poochyena', 'mightyena', 'nuzleaf', 'shiftry', 'sableye', 'carvanha',
    'sharpedo', 'cacturne', 'crawdaunt', 'absol', 'honchkrow', 'stunky', 'skuntank', 'spiritomb', 'drapion', 'weavile', 'darkrai',
  ],
  dragon: [
    'dratini', 'dragonair', 'dragonite', 'kingdra', 'vibrava', 'flygon', 'altaria', 'bagon', 'shelgon', 'salamence', 'latias', 'latios',
    'rayquaza', 'gible', 'gabite', 'garchomp', 'dialga', 'palkia', 'giratina',
  ],
  electric: [
    'pikachu', 'raichu', 'magnemite', 'magneton', 'voltorb', 'electrode', 'electabuzz', 'jolteon', 'zapdos', 'chinchou', 'lanturn', 'pichu',
    'mareep', 'flaaffy', 'ampharos', 'elekid', 'raikou', 'electrike', 'manectric', 'plusle', 'minun', 'shinx', 'luxio', 'luxray',
    'pachirisu', 'magnezone', 'electivire', 'rotom',
  ],
  fairy: [
    'clefairy', 'clefable', 'jigglypuff', 'wigglytuff', 'mrmime', 'cleffa', 'igglybuff', 'togepi', 'togetic', 'marill', 'azumarill', 'snubbull',
    'granbull', 'ralts', 'kirlia', 'gardevoir', 'azurill', 'mawile', 'mimejr', 'togekiss',
  ],
  fighting: [
    'mankey', 'primeape', 'poliwrath', 'machop', 'machoke', 'machamp', 'hitmonlee', 'hitmonchan', 'heracross', 'tyrogue', 'hitmontop', 'combusken',
    'blaziken', 'breloom', 'makuhita', 'hariyama', 'meditite', 'medicham', 'monferno', 'infernape', 'riolu', 'lucario', 'croagunk', 'toxicroak',
    'gallade',
  ],
  fire: [
    'charmander', 'charmeleon', 'charizard', 'vulpix', 'ninetales', 'growlithe', 'arcanine', 'ponyta', 'rapidash', 'magmar', 'flareon', 'moltres',
    'cyndaquil', 'quilava', 'typhlosion', 'slugma', 'magcargo', 'houndour', 'houndoom', 'magby', 'entei', 'hooh', 'torchic', 'combusken',
    'blaziken', 'numel', 'camerupt', 'torkoal', 'chimchar', 'monferno', 'infernape', 'magmortar', 'heatran',
  ],
  flying: [
    'charizard', 'butterfree', 'pidgey', 'pidgeotto', 'pidgeot', 'spearow', 'fearow', 'zubat', 'golbat', 'farfetchd', 'doduo', 'dodrio',
    'scyther', 'gyarados', 'aerodactyl', 'articuno', 'zapdos', 'moltres', 'dragonite', 'hoothoot', 'noctowl', 'ledyba', 'ledian', 'crobat',
    'togetic', 'natu', 'xatu', 'hoppip', 'skiploom', 'jumpluff', 'yanma', 'murkrow', 'gligar', 'delibird', 'mantine', 'skarmory',
    'lugia', 'hooh', 'beautifly', 'taillow', 'swellow', 'wingull', 'pelipper', 'masquerain', 'ninjask', 'swablu', 'altaria', 'tropius',
    'salamence', 'rayquaza', 'starly', 'staravia', 'staraptor', 'mothim', 'combee', 'vespiquen', 'drifloon', 'drifblim', 'honchkrow', 'chatot',
    'mantyke', 'togekiss', 'yanmega', 'gliscor',
  ],
  ghost: [
    'gastly', 'haunter', 'gengar', 'misdreavus', 'shedinja', 'sableye', 'shuppet', 'banette', 'duskull', 'dusclops', 'drifloon', 'drifblim',
    'mismagius', 'spiritomb', 'dusknoir', 'froslass', 'rotom', 'giratina',
  ],
  grass: [
    'bulbasaur', 'ivysaur', 'venusaur', 'oddish', 'gloom', 'vileplume', 'paras', 'parasect', 'bellsprout', 'weepinbell', 'victreebel', 'exeggcute',
    'exeggutor', 'tangela', 'chikorita', 'bayleef', 'meganium', 'bellossom', 'hoppip', 'skiploom', 'jumpluff', 'sunkern', 'sunflora', 'celebi',
    'treecko', 'grovyle', 'sceptile', 'lotad', 'lombre', 'ludicolo', 'seedot', 'nuzleaf', 'shiftry', 'shroomish', 'breloom', 'roselia',
    'cacnea', 'cacturne', 'lileep', 'cradily', 'tropius', 'turtwig', 'grotle', 'torterra', 'budew', 'roserade', 'wormadam', 'cherubi',
    'cherrim', 'carnivine', 'snover', 'abomasnow', 'tangrowth', 'leafeon', 'shaymin',
  ],
  ground: [
    'sandshrew', 'sandslash', 'nidoqueen', 'nidoking', 'diglett', 'dugtrio', 'geodude', 'graveler', 'golem', 'onix', 'cubone', 'marowak',
    'rhyhorn', 'rhydon', 'wooper', 'quagsire', 'gligar', 'steelix', 'swinub', 'piloswine', 'phanpy', 'donphan', 'larvitar', 'pupitar',
    'marshtomp', 'swampert', 'nincada', 'numel', 'camerupt', 'trapinch', 'vibrava', 'flygon', 'barboach', 'whiscash', 'baltoy', 'claydol',
    'groudon', 'torterra', 'gastrodon', 'gible', 'gabite', 'garchomp', 'hippopotas', 'hippowdon', 'rhyperior', 'gliscor', 'mamoswine',
  ],
  ice: [
    'dewgong', 'cloyster', 'jynx', 'lapras', 'articuno', 'sneasel', 'swinub', 'piloswine', 'delibird', 'smoochum', 'snorunt', 'glalie',
    'spheal', 'sealeo', 'walrein', 'regice', 'snover', 'abomasnow', 'weavile', 'glaceon', 'mamoswine', 'froslass',
  ],
  poison: [
    'bulbasaur', 'ivysaur', 'venusaur', 'weedle', 'kakuna', 'beedrill', 'ekans', 'arbok', 'nidoran_female', 'nidorina', 'nidoqueen', 'nidoran_male',
    'nidorino', 'nidoking', 'zubat', 'golbat', 'oddish', 'gloom', 'vileplume', 'venonat', 'venomoth', 'bellsprout', 'weepinbell', 'victreebel',
    'tentacool', 'tentacruel', 'grimer', 'muk', 'gastly', 'haunter', 'gengar', 'koffing', 'weezing', 'spinarak', 'ariados', 'crobat',
    'qwilfish', 'dustox', 'roselia', 'gulpin', 'swalot', 'seviper', 'budew', 'roserade', 'stunky', 'skuntank', 'skorupi', 'drapion',
    'croagunk', 'toxicroak',
  ],
  psychic: [
    'abra', 'kadabra', 'alakazam', 'slowpoke', 'slowbro', 'drowzee', 'hypno', 'exeggcute', 'exeggutor', 'starmie', 'mrmime', 'jynx',
    'mewtwo', 'mew', 'natu', 'xatu', 'espeon', 'slowking', 'unown', 'wobbuffet', 'girafarig', 'smoochum', 'lugia', 'celebi',
    'ralts', 'kirlia', 'gardevoir', 'meditite', 'medicham', 'spoink', 'grumpig', 'lunatone', 'solrock', 'baltoy', 'claydol', 'chimecho',
    'wynaut', 'beldum', 'metang', 'metagross', 'latias', 'latios', 'jirachi', 'deoxys', 'chingling', 'bronzor', 'bronzong', 'mimejr',
    'gallade', 'uxie', 'mesprit', 'azelf', 'cresselia',
  ],
  rock: [
    'geodude', 'graveler', 'golem', 'onix', 'rhyhorn', 'rhydon', 'omanyte', 'omastar', 'kabuto', 'kabutops', 'aerodactyl', 'sudowoodo',
    'shuckle', 'magcargo', 'corsola', 'larvitar', 'pupitar', 'tyranitar', 'nosepass', 'aron', 'lairon', 'aggron', 'lunatone', 'solrock',
    'lileep', 'cradily', 'anorith', 'armaldo', 'relicanth', 'regirock', 'cranidos', 'rampardos', 'shieldon', 'bastiodon', 'bonsly', 'rhyperior',
    'probopass',
  ],
  steel: [
    'magnemite', 'magneton', 'forretress', 'steelix', 'scizor', 'skarmory', 'mawile', 'aron', 'lairon', 'aggron', 'beldum', 'metang',
    'metagross', 'registeel', 'jirachi', 'empoleon', 'shieldon', 'bastiodon', 'bronzor', 'bronzong', 'lucario', 'magnezone', 'probopass', 'dialga',
    'heatran',
  ],
  water: [
    'squirtle', 'wartortle', 'blastoise', 'psyduck', 'golduck', 'poliwag', 'poliwhirl', 'poliwrath', 'tentacool', 'tentacruel', 'slowpoke', 'slowbro',
    'seel', 'dewgong', 'shellder', 'cloyster', 'krabby', 'kingler', 'horsea', 'seadra', 'goldeen', 'seaking', 'staryu', 'starmie',
    'magikarp', 'gyarados', 'lapras', 'vaporeon', 'omanyte', 'omastar', 'kabuto', 'kabutops', 'totodile', 'croconaw', 'feraligatr', 'chinchou',
    'lanturn', 'marill', 'azumarill', 'politoed', 'wooper', 'quagsire', 'slowking', 'qwilfish', 'corsola', 'remoraid', 'octillery', 'mantine',
    'kingdra', 'suicune', 'mudkip', 'marshtomp', 'swampert', 'lotad', 'lombre', 'ludicolo', 'wingull', 'pelipper', 'surskit', 'carvanha',
    'sharpedo', 'wailmer', 'wailord', 'barboach', 'whiscash', 'corphish', 'crawdaunt', 'feebas', 'milotic', 'spheal', 'sealeo', 'walrein',
    'clamperl', 'huntail', 'gorebyss', 'relicanth', 'luvdisc', 'kyogre', 'piplup', 'prinplup', 'empoleon', 'bibarel', 'buizel', 'floatzel',
    'shellos', 'gastrodon', 'finneon', 'lumineon', 'mantyke', 'palkia', 'phione', 'manaphy',
  ],
}
