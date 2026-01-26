import { food, medical, weapons } from '../party.js';
import { addEvent, updateStatBars, updateFoodButtons, updateMedicalButtons, updateRelationships, setPlayButton } from './ui.js';
import { addItemToInventory, updateWeaponButtons } from './inventory.js';
import { context } from '../game-state.js';
import { foundEnemy } from './combat.js';
import { foundFriend } from './character-creation.js';
import { foundSurvivor } from './survivor-encounters.js';
import { recordPartyMemberLeft } from './game-stats.js';

/**
 * Check if a character is still viable (not dying from health, hunger, or morale)
 * @param {Object} character - The character to check
 * @returns {boolean} True if character is viable
 */
function isCharacterViable(character) {
    return character.health > 0 && character.hunger > 0 && character.morale > 0;
}

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

export function foundMedical(who) {
    const medicalType = medical[Math.floor(Math.random() * medical.length)];
    const location = medicalType[2][Math.floor(Math.random() * medicalType[2].length)];
    addEvent(`${who} found medical supplies (${medicalType[0]}) ${location}.`);
    addItemToInventory(medicalType);
    updateMedicalButtons();
}

export function foundFood(who) {
    const foodType = food[Math.floor(Math.random() * food.length)];
    const variation = foodType[2][Math.floor(Math.random() * foodType[2].length)];
    const location = foodType[3][Math.floor(Math.random() * foodType[3].length)];
    addEvent(`${who} found ${variation} (${foodType[0]}) ${location}.`);
    addItemToInventory(foodType);
    updateFoodButtons();
}

export function foundWeapon(who, id) {
    const weaponType = weapons[Math.floor(Math.random() * (weapons.length - 1)) + 1];
    addEvent(`${who} found a ${weaponType[0]}.`);
    
    // Simply add it to inventory and let the player decide who to give it to using the dropdown
    addItemToInventory(weaponType);
    context.gameParty.inventory.updateDisplay();
    updateWeaponButtons();
}

export function handleDeathEffects(character) {
    // Track this party member leaving
    recordPartyMemberLeft(character.name, context.turnNumber);
    
    // when a character dies check the relationships of the other characters and set morale accordingly
    /*
    Family -3
    Friends -2
    Acquaintances -1
    Strangers +0
    Cold +1
    */
    const dyingWeapon = weapons[character.weapon];
    const dyingWeaponDamage = dyingWeapon[1];
    
    // Find character with worst weapon who could benefit from the dying character's weapon
    let worstWeaponCharacter = null;
    let worstWeaponDamage = Infinity;
    
    for (const remainingCharacter of context.gameParty.characters) {
        if (remainingCharacter !== character) {
            const relationship = remainingCharacter.relationships.get(character);
            // Apply morale effects based on relationship
            if (relationship === 4) {
                remainingCharacter.morale -= 3;
            }
            if (relationship === 3) {
                remainingCharacter.morale -= 2;
            }
            if (relationship === 2) {
                remainingCharacter.morale -= 1;
            }
            if (relationship === 0) {
                remainingCharacter.morale += 1;
            }
            remainingCharacter.capAttributes();
            updateStatBars(remainingCharacter);
            
            // Check if this character has a worse weapon than the dying character
            // Only consider characters who are still viable
            const currentWeaponDamage = weapons[remainingCharacter.weapon][1];
            if (isCharacterViable(remainingCharacter) && currentWeaponDamage < dyingWeaponDamage && currentWeaponDamage < worstWeaponDamage) {
                worstWeaponCharacter = remainingCharacter;
                worstWeaponDamage = currentWeaponDamage;
            }
        }
    }

    // If someone could use the better weapon, give it to them
    if (worstWeaponCharacter) {
        const oldWeapon = weapons[worstWeaponCharacter.weapon];
        const oldWeaponName = oldWeapon[0];
        // If the old weapon wasn't fists, add it to inventory
        if (oldWeaponName !== 'fist') {
            addItemToInventory([oldWeaponName, worstWeaponCharacter.weaponDurability]);
            addEvent(`The party collects ${worstWeaponCharacter.name}'s ${oldWeaponName}.`);
        }
        worstWeaponCharacter.weapon = character.weapon;
        worstWeaponCharacter.weaponDurability = character.weaponDurability;
        worstWeaponCharacter.updateCharacter();
        addEvent(`${worstWeaponCharacter.name} takes ${character.name}'s ${dyingWeapon[0]}, replacing their ${oldWeaponName}.`);
    } else if (dyingWeapon[0] !== 'fist') {
        // If no one needs the weapon and it's not fists, add it to inventory
        // Only collect if there are viable party members remaining
        const livingCharacters = context.gameParty.characters.filter(c => c !== character && isCharacterViable(c));
        if (livingCharacters.length > 0) {
            addItemToInventory([dyingWeapon[0], character.weaponDurability]);
            addEvent(`The party collects ${character.name}'s ${dyingWeapon[0]}.`);
            context.gameParty.inventory.updateDisplay();
        }
    }
}

export function getEvent(chance) {
    let who = "The party";
    if (context.gameParty.characters.length === 1) {
        who = context.gameParty.characters[0].name;
    }
    const singlePlayerEvents = [
        `${who} watches the clouds go by.`,
        `${who} stays in bed all day.`
    ];
    let event;
    if (context.gameParty.characters.length > 1) {
        let pone = context.gameParty.characters[Math.floor(Math.random() * context.gameParty.characters.length)].name;
        let ptwo;
        do {
            ptwo = context.gameParty.characters[Math.floor(Math.random() * context.gameParty.characters.length)].name;
        } while (ptwo === pone);
        const multiPlayerEvents = [
            `${pone} spots a rabbit in a clearing and calls ${ptwo} to hunt for it, but it turns out to be a white bag rolling in the wind.`,
            `A zombie approaches the party but immediately collapses.`
        ];
        event = multiPlayerEvents[Math.floor(Math.random() * multiPlayerEvents.length)];
    } else {
        event = singlePlayerEvents[Math.floor(Math.random() * singlePlayerEvents.length)];
    }
    
    // Base probabilities adjusted for party size
    let friendChance = 0.2;
    let enemyChance = 0.1 + friendChance;
    let itemChance = 0.4 + enemyChance;
    let secondItem = 0 + itemChance;
    if (context.gameParty.characters.length == 2) {
        friendChance = 0.15;
        enemyChance = 0.15 + friendChance;
        itemChance = 0.45 + enemyChance;
        secondItem = 0.05 + itemChance;
    }
    if (context.gameParty.characters.length == 3) {
        friendChance = 0.1;
        enemyChance = 0.2 + friendChance;
        itemChance = 0.5 + enemyChance;
        secondItem = 0.1 + itemChance;
    }
    if (context.gameParty.characters.length == 4) {
        friendChance = 0;
        enemyChance = 0.2 + friendChance;
        itemChance = 0.55 + enemyChance;
        secondItem = 0.15 + itemChance;
    }
    
    // Adjust probabilities for night time
    const isNight = context.timeOfDay === 'night';
    if (isNight) {
        // No new friends at night
        friendChance = 0;
        // Higher zombie chance at night (+15%)
        enemyChance = 0.25 + friendChance;
        // Lower item find at night (reduced by 15%)
        const baseItemChance = context.gameParty.characters.length >= 3 ? 0.35 : 0.25;
        itemChance = baseItemChance + enemyChance;
        secondItem = itemChance; // No double items at night
    }
    
    const illnessChance = secondItem + 0.05;
    const miniEventChance = illnessChance + 0.05;
    
    // Track if we're in a special event that manages the play button itself
    let specialEventOccurred = false;
    
    if ((chance <= friendChance) && context.gameParty.characters.length < 4) {
        foundFriend();
        specialEventOccurred = true;
    } else if (chance > friendChance && chance <= enemyChance) {
        // 20% chance of survivor encounter, 80% zombie encounter
        if (Math.random() < 0.2) {
            foundSurvivor();
        } else {
            foundEnemy(context);
        }
        specialEventOccurred = true;
    } else if (chance > enemyChance && chance <= secondItem) {
        let items = 1;
        if (chance > itemChance && chance <= secondItem) {
            items = 2;
        }
        for (let i = 0; i < items; i++) {
            const whichItem = Math.random();
            if (whichItem <= 0.33) {
                foundFood(who);
            } else if (whichItem <= 0.67) {
                foundMedical(who);
            } else {
                foundWeapon(who, i);
            }
        }
    } else if (chance > secondItem && chance <= illnessChance) {
        const healthyCharacters = context.gameParty.characters.filter(character => !character.sick);
        if (healthyCharacters.length > 0) {
            const sickCharacter = healthyCharacters[Math.floor(Math.random() * healthyCharacters.length)];
            sickCharacter.health -= 1;
            sickCharacter.sick = true;
            event = `${sickCharacter.name} is feeling queasy.`;
            addEvent(event);
            if (sickCharacter.health <= 0) {
                addEvent(`${sickCharacter.name} succumbed to the sudden illness.`);
                handleDeathEffects(sickCharacter);
                context.gameParty.removeCharacter(sickCharacter);
                updateRelationships();
            } else {
                updateStatBars(sickCharacter);
            }
        } else {
            addEvent(event);
        }
    } else if (chance > illnessChance && chance <= miniEventChance) {
        if (context.gameParty.characters.length >= 3) {
            if (Math.random() < 0.5) {
                let name = context.gameParty.characters[Math.floor(Math.random() * context.gameParty.characters.length)].name;
                addEvent(`${name} found a pack of cards while looking through the ruins of a house. The party plays a few rounds.`);
                for (const character of context.gameParty.characters) {
                    character.morale += 1;
                    character.capAttributes();
                    updateStatBars(character);
                }
            } else {
                addEvent('Rain begins to pelt down as the party is trying to sleep. Their sleeping bags all end up getting soaked.');
                for (const character of context.gameParty.characters) {
                    character.morale -= 1;
                    character.capAttributes();
                    updateStatBars(character);
                }
            }
        }
        if (context.gameParty.characters.length === 2) {
            const index1 = Math.floor(Math.random() * context.gameParty.characters.length);
            const name1 = context.gameParty.characters[index1];
            let index2;
            do {
                index2 = Math.floor(Math.random() * context.gameParty.characters.length);
            } while (index2 === index1);
            const name2 = context.gameParty.characters[index2];
            
            // Calculate interaction probability modifier based on traits
            // Positive modifiers increase positive interaction chance
            // friendly: +20%, optimistic: -20% negative (same as +20% positive)
            // disconnected: +20% negative, depressed: -20% positive
            let positiveModifier = 0;
            
            // Check both characters' traits
            for (const char of [name1, name2]) {
                if (char.posTrait === 'friendly') positiveModifier += 0.2;
                if (char.posTrait === 'optimistic') positiveModifier += 0.2;
                if (char.negTrait === 'disconnected') positiveModifier -= 0.2;
                if (char.negTrait === 'depressed') positiveModifier -= 0.2;
            }
            
            // Base 50% for negative, modified by traits (clamped to 10%-90%)
            const negativeChance = Math.max(0.1, Math.min(0.9, 0.5 - positiveModifier));
            
            if (Math.random() < negativeChance) {
                let hasFood = false;
                for (const foodItem of food) {
                    if (context.gameParty.inventory.hasItem(foodItem[0])) {
                        const variation = foodItem[2][Math.floor(Math.random() * foodItem[2].length)];
                        addEvent(`${name1.name} and ${name2.name} are arguing over who gets to eat ${variation}.`);
                        name1.relationships.set(name2, name1.relationships.get(name2) - 1);
                        name2.relationships.set(name1, name2.relationships.get(name1) - 1);
                        updateRelationships();
                        hasFood = true;
                        break;
                    };
                };
                if (!hasFood) {
                    addEvent(event);
                }
            } else {
                addEvent(`It's cold tonight, and ${name1.name} and ${name2.name} sit together by the fire.`);
                name1.relationships.set(name2, name1.relationships.get(name2) + 1);
                name2.relationships.set(name1, name2.relationships.get(name1) + 1);
                updateRelationships();
            }
        }
        if (context.gameParty.characters.length === 1) {
            if (Math.random() < 0.5) {
                const character = context.gameParty.characters[0];
                character.health -= 1;
                addEvent(`${character.name} tripped over a loose brick and hurt their leg.`);
                if (character.health <= 0) {
                    addEvent(`${character.name} couldn't recover from the fall.`);
                    handleDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                } else {
                    updateStatBars(character);
                }
            } else {
                const character = context.gameParty.characters[0];
                character.morale += 1;
                character.capAttributes();
                updateStatBars(character);
                addEvent(`${character.name} finds an old piano and plays around a bit. They're not very good at it, but it was fun.`);
            }
        }
    } else {
        addEvent(event);
    }
    
    // Only show the play button if we're not in a special event that handles it itself
    if (!specialEventOccurred) {
        setPlayButton('show');
    }
    
    // Return whether a special event occurred so caller knows not to show play button
    return specialEventOccurred;
}
