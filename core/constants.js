/**
 * Core game constants - shared across all platforms
 */

export const posTraits = [
    ['resilient', 'Every turn has a 10% chance to heal', 'Has a higher chance of being cured of illness and infection'],
    ['satiated', 'Cannot die from hunger - survives at 0', 'Food items are more effective by 0.5 points'],
    ['friendly', 'Starts with higher relationships with other party members', 'Higher chance of positive interactions'],
    ['scavenger', 'Every turn has a 10% chance to gain a random food item', 'Gets a food item from every zombie killed'],
    ['optimistic', 'Lower chance of negative interactions', 'Morale cannot fall below bad'],
    ['fighter', 'Does an extra 1 damage for each attack', '50% chance to preserve weapon durability']
];

export const negTraits = [
    ['vulnerable', 'Takes an extra 1 damage from each attack', 'Has a lower chance of curing illness and infection'],
    ['hungry', 'Every other turn, extra hunger is depleted', 'Rations and snack have no effect'],
    ['disconnected', 'Starts with lower relationships with other party members', 'Higher chance of negative interactions'],
    ['hypochondriac', 'Every turn has a 10% chance to use a medical item without benefit', '20% chance to steal medical items meant for others'],
    ['depressed', 'Lower chance of positive interactions', 'Morale cannot rise above good'],
    ['clumsy', '10% chance to hurt self when attacking', 'Uses double weapon durability']
];

export const relationships = [
    'cold',
    'strangers',
    'acquaintances',
    'friends',
    'family'
];

export const relationshipEmojis = [
    '❄️',  // cold
    '👤',  // strangers
    '🤝',  // acquaintances
    '😊',  // friends
    '❤️'   // family
];

export const hungerArray = [
    'near death',
    'near death',
    'starving',
    'starving',
    'hungry',
    'hungry',
    'fine',
    'fine',
    'full',
    'full'
];

export const ageArray = [
    'teen',
    'adult',
    'elder'
];

export const moraleArray = [
    'terrible',
    'terrible',
    'bad',
    'bad',
    'ok',
    'ok',
    'good',
    'good',
    'excellent',
    'excellent'
];

export const healthArray = [
    'near death',
    'near death',
    'gravely injured',
    'gravely injured',
    'badly injured',
    'badly injured',
    'slightly injured',
    'slightly injured',
    'fine',
    'fine'
];

export const food = [
    ['rations', 0.5, [
        'a packet of chips',
        'some crackers',
        'some jerky',
        'an energy bar',
        'some fruit mix',
        'a box of biscuits',
        'a packet of oatmeal'
    ], [
        'in a child\'s lunch box outside an old school',
        'tucked inside a torn military jacket',
        'stashed on the bottom row of a broken vending machine',
        'hidden under the floorboards of a small barricaded cabin'
    ]],
    ['snack', 1, [
        'an apple',
        'a block of cheese',
        'a packet of instant noodles',
        'a tub of peanut butter',
        'a jar of pickles',
        'a can of fish',
        'a pickled egg'
    ], [
        'in the back of the pantry of a ruined house',
        'under a pile of smashed dishes on the floor of a kitchen',
        'inside a backpack hidden in the bushes',
        'in the clutches of a decayed corpse'
    ]],
    ['dish', 2, [
        'a can of soup',
        'a pack of frozen vegetables',
        'a can of beans',
        'a tin of tomatoes',
        'a frozen pie',
        'a bowl of pasta',
        'a can of stew'
    ], [
        'inside a toppled over microwave',
        'sitting on a rusted stovetop',
        'stuffed beside old batteries in a kitchen drawer'
    ]],
    ['meal', 3, [
        'a frozen roast chicken',
        'a frozen pizza',
        'some pre-packaged curry',
        'some packaged dumplings',
        'a frozen tv dinner',
        'some mystery pasta',
        'a really big block of cheese'
    ], [
        'buried under rubble at the bottom of a grocery store freezer',
        'in a backpack beside a burned out fire pit',
        'somehow stuffed into a small mailbox'
    ]],
    ['dessert', 2, [
        'a tub of ice cream',
        'a small chocolate cake',
        'a glazed donut',
        'a packet of marshmallows',
        'a can of whipped cream',
        'a tin of pudding'
    ], [
        'inside a barely functioning minifridge',
        'nearly crushed under a collapsed bunk bed',
        'stuffed in the kitchen of a doll house'
    ]]
];

export const medical = [
    ['band aid', 1, [
        'in a child\'s backpack',
        'stuck to the inside of a locker',
        'inside a cracked first aid box'
    ]],
    ['bandage', 2, [
        'in the bathroom of an abandoned house',
        'in the backpack of a dead zombie',
        'buried under some rubble'
    ]],
    ['medicine', 3, [
        'left on the floor of an abandoned clinic',
        'in a wrecked ambulance',
        'hidden in a bathroom cabinet'
    ]],
    ['first aid kit', 4, [
        'in a worn first aid kit',
        'under some floorboards',
        'inside a damaged vending machine'
    ]]
];

export const weapons = [
    ['fist', 1, 100],
    ['stick', 2, 4],
    ['knife', 3, 12],
    ['pistol', 4, 8]
];

export const attackDescriptions = {
    fist: [
        '[attacker] throws a punch at a zombie.',
        '[attacker] swings wildly at a zombie.',
        '[attacker] lands a solid hit on a zombie.',
        '[attacker] shoves a zombie back.'
    ],
    stick: [
        '[attacker] whacks a zombie in the head.',
        '[attacker] swings wildly at a zombie.',
        '[attacker] knocks a zombie back.',
        '[attacker] cracks a zombie across the skull.'
    ],
    knife: [
        '[attacker] slashes at a zombie.',
        '[attacker] stabs at a zombie.',
        '[attacker] digs their knife into a zombie.',
        '[attacker] drives the blade into a zombie.'
    ],
    pistol: [
        '[attacker] fires a shot at a zombie.',
        '[attacker] takes aim and shoots a zombie.',
        '[attacker] squeezes off a round at a zombie.',
        '[attacker] puts a bullet in a zombie.'
    ],
    critical: [
        '[attacker] lands a devastating blow!',
        '[attacker] finds a weak spot!',
        '[attacker] strikes true!'
    ]
};

export const zombieAttackDescriptions = [
    'claws at [NAME]\'s arm.',
    'bites into [NAME]\'s shoulder.',
    'swipes its hand across [NAME]\'s face.',
    'lunges at [NAME].',
    'grabs at [NAME]\'s leg.',
    'slams its head into [NAME].',
    'scratches at [NAME]\'s chest.',
    'shoves [NAME] over.'
];

export const survivorAttackDescriptions = {
    fist: [
        '[attacker] throws a punch at the survivor.',
        '[attacker] swings wildly at the survivor.',
        '[attacker] lands a solid hit on the survivor.',
        '[attacker] shoves the survivor back.'
    ],
    stick: [
        '[attacker] whacks the survivor in the head.',
        '[attacker] swings their stick at the survivor.',
        '[attacker] knocks the survivor back.',
        '[attacker] cracks the survivor across the skull.'
    ],
    knife: [
        '[attacker] slashes at the survivor.',
        '[attacker] stabs at the survivor.',
        '[attacker] digs their knife into the survivor.',
        '[attacker] drives the blade into the survivor.'
    ],
    pistol: [
        '[attacker] fires a shot at the survivor.',
        '[attacker] takes aim and shoots at the survivor.',
        '[attacker] squeezes off a round at the survivor.',
        '[attacker] puts a bullet in the survivor.'
    ],
    critical: [
        '[attacker] lands a devastating blow on the survivor!',
        '[attacker] finds an opening!',
        '[attacker] strikes true!'
    ]
};

export const hostileSurvivorAttackDescriptions = [
    'swings a weapon at [NAME].',
    'lunges at [NAME] with a makeshift club.',
    'throws a punch at [NAME].',
    'kicks at [NAME].',
    'slashes at [NAME] with a blade.',
    'shoves [NAME] hard.'
];

export const merchantIntroductions = [
    'A lone survivor emerges from behind a ruined building',
    'A wandering trader approaches your camp',
    'A scavenger waves you down from across the street',
    'An old survivor with a heavy pack calls out to you',
    'A nervous-looking trader shuffles toward you'
];

export const personInNeedIntroductions = [
    'A desperate survivor stumbles toward your camp',
    'A wounded stranger calls out for help',
    'A starving survivor approaches, barely able to stand',
    'A frightened survivor emerges from hiding',
    'A survivor with hollow eyes begs for assistance'
];

export const hostileSurvivorIntroductions = {
    solo: [
        'A hostile survivor ambushes you!',
        'A raider emerges from the shadows!',
        'A desperate survivor attacks without warning!',
        'A bandit blocks your path!',
        'A hostile scavenger attacks!'
    ],
    group: [
        'A group of hostile survivors ambush your camp!',
        'Raiders emerge from the shadows!',
        'Desperate survivors attack without warning!',
        'Bandits surround your party!',
        'A gang of hostile scavengers attacks!'
    ]
};

export const survivorFleeMessages = [
    'The survivor panics and runs away!',
    'The trader flees into the ruins!',
    'The merchant escapes before you can act!',
    'The survivor disappears into the shadows!'
];

export const survivorGiveUpMessages = [
    'The frightened survivor drops the item and runs!',
    'The trader surrenders the item without a fight!',
    'The merchant hands over the goods, trembling!',
    'The survivor throws the item at you and flees!'
];

export const singleZombieVariations = [
    'ambushes the camp from the bushes',
    'lurches out from the doorway of an abandoned building',
    'crawls out from under a car wreck',
    'lunges through a cracked window',
    'drops from the trees'
];

export const multiZombieVariations = [
    'barrage through an old wooden fence',
    'creep out from the shadows of a collapsed building',
    'shamble down the road towards you'
];

export const newCharacterFlavour = [
    'They tell you they haven\'t found any shelter for days.',
    'They breathlessly explain that their previous camp was destroyed by zombies.',
    'They tell you they can help you.',
    'They\'re looking around suspiciously, but keep telling you they definitely weren\'t followed.',
    'They look distraught.',
    'They mutter about having not talked to anyone in weeks.',
    'They insist they\'re immune to the infection.',
    'They\'re covered in branches and leaves and claim to be a survival expert.',
    'They laugh a little too hard when you ask whether they\'ve been exposed to the infection.',
    'They hide their bandaged arm behind themself.',
    'They look you dead in the eye and promise they\'d never eat a person.',
    'They call you an unfamiliar name and seem disappointed when you correct them.'
];

// Default names for CLI/Discord (no API needed)
export const defaultNames = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
    'Skyler', 'Charlie', 'Dakota', 'Hayden', 'Jamie', 'Jesse', 'Kendall', 'Logan',
    'Parker', 'Peyton', 'Reese', 'Rowan', 'Sam', 'Sydney', 'Cameron', 'Devon',
    'Drew', 'Elliot', 'Finley', 'Harper', 'Kai', 'Lane', 'Max', 'Nico',
    'Oakley', 'Phoenix', 'River', 'Sage', 'Shay', 'Spencer', 'Tatum', 'Val'
];
