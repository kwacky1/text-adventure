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

export const attackDescriptions = {
    // Weapon-specific attack descriptions
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

// Survivor encounter constants
export const survivorAttackDescriptions = {
    // Weapon-specific attack descriptions for survivors
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
