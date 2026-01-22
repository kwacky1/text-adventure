export const posTraits = [
    ['resilient', 'Every turn has a 10% chance to heal', 'Has a higher chance of being cured of illness and infection'],
    ['satiated', 'Every other turn, hunger does not go down', 'Food items are more effective by 0.5 points'],
    ['friendly', 'Starts with higher relationships with other party members', 'Can never become cold with other party members'],
    ['scavenger', 'Every turn has a 10% chance to gain a random food item', 'Gets a food item from every zombie killed'],
    ['optimistic', 'Every turn has a 10% chance to raise morale', 'Morale cannot fall below bad'],
    ['fighter', 'Does an extra 1 damage for each attack', 'Has a 50% chance to damage two zombies at once']
];

export const negTraits = [
    ['vulnerable', 'Takes an extra 1 damage from each attack', 'Has a lower chance of curing illness and infection'],
    ['hungry', 'Every other turn, extra hunger is depleted', 'Rations and snack have no effect'],
    ['disconnected', 'Starts with lower relationships with other party members', 'Can never become family with other party members'],
    ['hypochondriac', 'Every turn has a 10% chance to use a medical item without benefit', 'Every turn has a 10% chance to display symptoms of illness despite not being sick'],
    ['depressed', 'Every turn has a 10% chance to lower morale', 'Morale cannot rise above good'],
    ['clumsy', 'Every turn has a 10% chance to get hurt', 'Does 1 less damage for each attack']
];

export const relationships = [
    'cold',
    'strangers',
    'acquaintances',
    'friends',
    'family'
];

export const attackDescriptions = {
    normal: [
        '[attacker] whacks a zombie in the head',
        '[attacker] swings wildly at a zombie',
        '[attacker] knocks a zombie back',
        '[attacker] digs their weapon into a zombie',
        '[attacker] slashes at a zombie',
        '[attacker] fires a shot at a zombie'
    ],
    critical: [
        '[attacker] lands a devastating blow!',
        '[attacker] finds a weak spot!',
        '[attacker] strikes true!'
    ]
};

export const zombieAttackDescriptions = [
    'claws at [NAME]\'s arm',
    'bites into [NAME]\'s shoulder',
    'swipes its hand across [NAME]\'s face',
    'lunges at [NAME]',
    'grabs at [NAME]\'s leg',
    'slams its head into [NAME]',
    'scratches at [NAME]\'s chest',
    'shoves [NAME] over'
];
