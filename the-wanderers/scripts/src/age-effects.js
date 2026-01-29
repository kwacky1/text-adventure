import { context } from '../game-state.js';
import { food, medical, weapons } from '../party.js';
import { addEvent, updateStatBars, updateFoodButtons, updateMedicalButtons, updateRelationships } from './ui.js';
import { addItemToInventory, updateWeaponButtons } from './inventory.js';
import { ageArray } from '../character.js';
import { handleDeathEffects } from './events.js';

// Age category constants
export const AGE_TEEN = 0;    // 0-30 years
export const AGE_ADULT = 1;   // 31-60 years
export const AGE_ELDER = 2;   // 61+ years

/**
 * Check and apply age-related effects each turn.
 * Teens get bonuses from positive trait effects.
 * Elders get penalties from negative trait effects.
 * @param {Character} character - The character to check
 */
export function checkAgeEffects(character) {
    const ageCategory = character.getAgeCategory();
    
    // Apply age-based modifiers
    switch (ageCategory) {
        case AGE_TEEN:
            applyTeenEffects(character);
            break;
        case AGE_ADULT:
            // Adults have baseline effects - no special modifiers
            break;
        case AGE_ELDER:
            applyElderEffects(character);
            break;
    }
}

/**
 * Apply teen effects - bonuses from positive traits
 * @param {Character} character 
 */
function applyTeenEffects(character) {
    // Teens get enhanced positive trait effects (extra 5% chance for positive trait triggers)
    switch (character.posTrait) {
        case 'resilient':
            // Extra 5% chance of healing
            if (Math.random() < 0.05) {
                character.health += 1;
                addEvent(`${character.name}'s youthful energy helps them recover faster.`);
            }
            break;
        case 'satiated':
            // Occasional extra hunger restoration
            if (Math.random() < 0.05) {
                character.hunger += 0.5;
                addEvent(`${character.name}'s young metabolism is working well.`);
            }
            break;
        case 'optimistic':
            // Extra morale boost chance
            if (Math.random() < 0.05) {
                character.morale += 1;
                addEvent(`${character.name}'s youthful optimism is contagious.`);
            }
            break;
        case 'scavenger':
            // Extra chance to find food
            if (Math.random() < 0.05) {
                const foodType = food[Math.floor(Math.random() * food.length)];
                const variation = foodType[2][Math.floor(Math.random() * foodType[2].length)];
                addEvent(`${character.name}'s sharp young eyes spotted ${variation} (${foodType[0]}).`);
                addItemToInventory(foodType);
                updateFoodButtons();
            }
            break;
        case 'fighter':
            // Fighter bonus is applied in combat, not here
            break;
        case 'friendly':
            // Friendly effects are handled in relationship system
            break;
    }
}

/**
 * Apply elder effects - penalties from negative traits
 * @param {Character} character 
 */
function applyElderEffects(character) {
    // Elders get enhanced negative trait effects (extra 5% chance for negative trait triggers)
    switch (character.negTrait) {
        case 'vulnerable':
            // Extra chance of taking damage
            if (Math.random() < 0.05) {
                character.health -= 1;
                addEvent(`${character.name}'s aging body is feeling fragile.`);
                if (character.health <= 0) {
                    character.health = 0;
                    addEvent(`${character.name}'s frail body gave out.`);
                    handleDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                } else {
                    updateStatBars(character);
                }
            }
            break;
        case 'hungry':
            // Extra hunger depletion
            if (Math.random() < 0.05) {
                character.hunger -= 0.5;
                addEvent(`${character.name}'s metabolism is struggling.`);
            }
            break;
        case 'depressed':
            // Extra morale loss
            if (Math.random() < 0.05) {
                character.morale -= 1;
                addEvent(`${character.name} seems weary today.`);
            }
            break;
        case 'clumsy':
            // Extra chance of getting hurt
            if (Math.random() < 0.05) {
                character.health -= 1;
                addEvent(`${character.name}'s joints aren't what they used to be.`);
                if (character.health <= 0) {
                    character.health = 0;
                    addEvent(`${character.name} took a bad fall and didn't get back up.`);
                    handleDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                } else {
                    updateStatBars(character);
                }
            }
            break;
        case 'hypochondriac':
            // Extra chance of wasting medical supplies
            if (Math.random() < 0.05) {
                const medicalItems = [];
                medical.forEach(medItem => {
                    if (context.gameParty.inventory.hasItem(medItem[0])) {
                        medicalItems.push(medItem[0]);
                    }
                });
                if (medicalItems.length > 0) {
                    const item = medicalItems[Math.floor(Math.random() * medicalItems.length)];
                    context.gameParty.inventory.removeItem(item);
                    addEvent(`${character.name}'s worries got the better of them. They used ${item} unnecessarily.`);
                    updateMedicalButtons();
                }
            }
            break;
        case 'disconnected':
            // Disconnected effects are handled in relationship system
            break;
    }
}

/**
 * Check if it's a character's birthday and apply birthday effects
 * @param {Character} character - The character to check
 * @returns {boolean} - True if it was their birthday
 */
export function checkBirthday(character) {
    if (!character.isBirthday()) {
        return false;
    }
    
    // Check if age category changed (they aged up)
    const oldAgeCategory = character.age;
    const newAgeCategory = character.getAgeCategory();
    
    if (oldAgeCategory !== newAgeCategory) {
        character.age = newAgeCategory;
        const ageLabels = ['teen', 'adult', 'elder'];
        addEvent(`${character.name} is now ${ageLabels[newAgeCategory]}!`);
        
        // Update age display in UI
        const characterDiv = document.getElementById(character.getCharacterId());
        if (characterDiv) {
            const ageElement = characterDiv.querySelector('.age');
            if (ageElement) {
                ageElement.innerHTML = `Age: <span class="statValue">${ageArray[newAgeCategory]}</span>`;
                ageElement.title = `Actual age: ${character.getActualAge()} (born ${character.getBirthdayString()}, ${character.birthYear})`;
            }
        }
    }
    
    const actualAge = character.getActualAge();
    addEvent(`🎂 Happy Birthday, ${character.name}! They are now ${actualAge} years old!`);
    
    // Birthday character gets +1 extra morale
    character.morale += 1;
    
    // Party celebration message and morale boost
    if (context.gameParty.characters.length === 1) {
        // Solo player - they celebrate alone
        addEvent(`${character.name} takes a moment to celebrate.`);
    } else {
        // Multiple party members - everyone celebrates
        for (const partyMember of context.gameParty.characters) {
            if (partyMember !== character) {
                partyMember.morale += 1;
                partyMember.capAttributes();
                updateStatBars(partyMember);
            }
        }
        addEvent(`The party celebrates ${character.name}'s birthday!`);
    }
    
    // Cap and update the birthday character's stats
    character.capAttributes();
    updateStatBars(character);
    
    // Give birthday gifts - dessert + random item (weapon/medical)
    giveBirthdayGift(character);
    
    return true;
}

/**
 * Give birthday gifts to a character
 * @param {Character} character - The birthday character
 */
function giveBirthdayGift(character) {
    const isSolo = context.gameParty.characters.length === 1;
    
    // Always give dessert
    const dessert = food.find(f => f[0] === 'dessert');
    if (dessert) {
        const variation = dessert[2][Math.floor(Math.random() * dessert[2].length)];
        if (isSolo) {
            addEvent(`${character.name} found ${variation} as a birthday treat!`);
        } else {
            addEvent(`${character.name} received ${variation} as a birthday treat!`);
        }
        addItemToInventory(dessert);
        updateFoodButtons();
    }
    
    // 50/50 chance of weapon or medical item
    if (Math.random() < 0.5) {
        // Give medical item
        const medicalType = medical[Math.floor(Math.random() * medical.length)];
        if (isSolo) {
            addEvent(`${character.name} also found a ${medicalType[0]}!`);
        } else {
            addEvent(`${character.name} also received a ${medicalType[0]} as a gift!`);
        }
        addItemToInventory(medicalType);
        updateMedicalButtons();
    } else {
        // Give weapon
        const weaponType = weapons[Math.floor(Math.random() * (weapons.length - 1)) + 1]; // Exclude fist
        // Randomize durability to 50-100% of max
        const maxDurability = weaponType[2];
        const durability = Math.floor(maxDurability * (0.5 + Math.random() * 0.5));
        if (isSolo) {
            addEvent(`${character.name} also found a ${weaponType[0]}!`);
        } else {
            addEvent(`${character.name} also received a ${weaponType[0]} as a gift!`);
        }
        addItemToInventory([weaponType[0], durability]);
        updateWeaponButtons();
    }
    
    // Update inventory display
    context.gameParty.inventory.updateDisplay();
}
