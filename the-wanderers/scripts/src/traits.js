import { context } from '../game-state.js';
import { food, medical } from '../party.js';
import { addEvent, updateStatBars, updateRelationships, updateMedicalButtons, updateFoodButtons } from './ui.js';
import { handleDeathEffects } from './events.js';
import { addItemToInventory } from './inventory.js';

export function checkNegTraitEvents(character) {
    if (character.negTrait === 'hungry') {
        // every other turn, hunger goes up
        if (context.turnNumber % 2 === 0) {
            character.hunger -= 0.5;
        }
    }
    if (character.negTrait === 'hypochondriac') {
        // 10% chance of using a medical item without benefit
        if (Math.random() < 0.1) {
            // Collect medical items using the new Inventory class methods
            const medicalItems = [];
            medical.forEach(medItem => {
                if (context.gameParty.inventory.hasItem(medItem[0])) {
                    medicalItems.push(medItem[0]);
                }
            });

            if (medicalItems.length > 0) {
                const item = medicalItems[Math.floor(Math.random() * medicalItems.length)];
                context.gameParty.inventory.removeItem(item);
                addEvent(`${character.name} used the ${item} but it had no effect.`);
                updateMedicalButtons();
            }
        }
    }
    if (character.negTrait === 'depressed') {
        // 10% chance of decreasing morale
        if (Math.random() < 0.1) {
            character.morale -= 1;
            addEvent(`${character.name} has been crying.`);
        }
        // Can't go above good
        if (character.morale > 7) {
            character.morale -= 2;
        }
    }
    if (character.negTrait === 'clumsy') {
        // 10% chance of getting hurt
        if (Math.random() < 0.1) {
            character.health -= 1;
            addEvent(`${character.name} tripped and hurt themself.`);
            if (character.health <= 0) {
                handleDeathEffects(character);
                context.gameParty.removeCharacter(character);
                updateRelationships();
            } else {
                character.updateCharacter();
                updateStatBars(character);
            }
        }
    }
}

export function checkPosTraitEvents(character) {
    if (character.posTrait === 'resilient') {
        // 10% chance of healing
        if (Math.random() < 0.1) {
            character.health += 1;
            addEvent(`${character.name} is feeling a bit better.`);
        }
    }
    if (character.posTrait === 'satiated') {
        // every other turn, hunger goes down
        if (context.turnNumber % 2 === 0) {
            character.hunger += 0.5;
        }
    }
    if (character.posTrait === 'scavenger') {
        // 10% chance of finding an extra food item
        if (Math.random() < 0.1) {
            const foodType = food[Math.floor(Math.random() * food.length)];
            const variation = foodType[2][Math.floor(Math.random() * foodType[2].length)];
            addEvent(`${character.name} was able to scavenge ${variation} (${foodType[0]}).`);
            addItemToInventory(foodType);
            updateFoodButtons();
        }
    }
    if (character.posTrait === 'optimistic') {
        // 10% chance of increasing own morale
        if (Math.random() < 0.1) {
            character.morale += 1;
            addEvent(`${character.name} looks happy today.`);
        }
        // Can't go below bad
        if (character.morale < 2) {
            character.morale += 2;
            addEvent(`${character.name} clings on to hope`);
        }
    }
}
