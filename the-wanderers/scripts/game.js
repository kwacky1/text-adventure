var turnNumber = 1;

import { context, getEvent, addItemToInventory, updateStatBars, addEvent, posTraits, negTraits, updateRelationships, updateFoodButtons, updateMedicalButtons, checkDeathEffects, updateInteractionButtons, createCharacterForm, checkPartyAlerts, setPlayButton } from './helpers.js';
import { food, medical } from './party.js';

function playTurn() {
    // Move current events to turnX div
    const currentEventsDiv = document.getElementById('currentEvent')
    const currentEvents = currentEventsDiv.textContent;
    const eventsDiv = document.getElementById('events');
    const eventItem = document.createElement('div');
    eventItem.id = `turn${turnNumber}`;
    const dayCounter = document.getElementById('day');
    dayCounter.textContent = `Day ${turnNumber}`;
    if (turnNumber % 2 === 0) {
        eventItem.classList.add('even');
    } else {
        eventItem.classList.add('odd');
    }
    eventItem.textContent = currentEvents;
    eventsDiv.insertBefore(eventItem, eventsDiv.children[1]);
    currentEventsDiv.textContent = '';
    setPlayButton('hide');
    // Begin new turn
    updateParty();
    if (context.gameParty.characters.length === 0) {
        const allButtons = document.getElementById('buttons');
        allButtons.remove();
        const partyInventoryDiv = document.getElementById('partyInventory');
        partyInventoryDiv.remove();
        const eventImage = document.getElementById('eventImage');
        eventImage.remove();
        // output character is dead to the events div
        addEvent('The adventure has come to an end. You survived for ' + turnNumber + ' turns.');
    } else {
        const chance = Math.random();
        getEvent(chance);
        // Update inventory display - changed to use inventory.updateDisplay() directly
        context.gameParty.inventory.updateDisplay();
        turnNumber += 1;
        setPlayButton(`Play Turn ${turnNumber}`)
    }

    function updateParty() {
        for (const character of context.gameParty.characters) {
            if (character.checkHunger()) {
                checkPosTraitEvents(character);
                checkNegTraitEvents(character);
                // Make sure attributes are within bounds
                character.capAttributes();
                updateStatBars(character);
                if (character.sick || character.infected) {
                    if (Math.random() < 0.1) {
                        character.morale -= 1;
                        addEvent(`${character.name} is not feeling very well.`);
                        updateStatBars(character);
                    }
                    if (Math.random() < 0.1) {
                        character.health -= 1;
                        addEvent(`${character.name} is feeling worse.`);
                        updateStatBars(character);
                    }
                }
                if (character.infected) {
                    if (Math.random() < 0.1) {
                        addEvent(`${character.name} is feeling angry.`);
                    }
                    if (Math.random() < 0.1) {
                        character.posTrait = posTraits[Math.floor(Math.random() * posTraits.length)][0];
                        character.negTrait = negTraits[Math.floor(Math.random() * negTraits.length)][0];
                        addEvent(`${character.name} is feeling strange.`);
                        updateStatBars(character);
                    }
                }                if (character.morale <= 0 && context.gameParty.characters.length > 1) {
                    // Calculate average relationship level (0=cold to 4=family)
                    let totalRelationship = 0;
                    let otherCharacters = context.gameParty.characters.filter(c => c !== character);
                    for (const other of otherCharacters) {
                        totalRelationship += character.relationships.get(other);
                    }
                    let avgRelationship = totalRelationship / otherCharacters.length;
                    
                    // Higher chance to steal if relationships are bad (cold/strangers)
                    // Base 10% chance, goes up to 50% for cold relationships
                    let stealChance = 0.1 + (0.4 * (1 - (avgRelationship / 4)));
                    
                    if (Math.random() < stealChance) {
                        // Try to steal something
                        let allItems = [];
                        // Add all food items
                        food.forEach(f => {
                            if (context.gameParty.inventory.hasItem(f[0])) {
                                allItems.push(f[0]);
                            }
                        });
                        // Add all medical items
                        medical.forEach(m => {
                            if (context.gameParty.inventory.hasItem(m[0])) {
                                allItems.push(m[0]);
                            }
                        });
                        
                        if (allItems.length > 0) {
                            // Steal 1-2 random items
                            let itemsToSteal = Math.min(1 + Math.floor(Math.random() * 2), allItems.length);
                            for (let i = 0; i < itemsToSteal; i++) {
                                let stolenItem = allItems[Math.floor(Math.random() * allItems.length)];
                                context.gameParty.inventory.removeItem(stolenItem);
                                addEvent(`${character.name} took some ${stolenItem} with them.`, "orange");
                                allItems = allItems.filter(item => item !== stolenItem);
                            }
                            context.gameParty.inventory.updateDisplay();
                        }
                    }
                    
                    addEvent(`${character.name} has lost all hope. They have left the party.`);
                    checkDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                }
            } else {
                addEvent(`${character.name} died of hunger.`);
                checkDeathEffects(character);
                context.gameParty.removeCharacter(character);
                updateRelationships();
            }
            checkPartyAlerts(character);
        };
        updateInteractionButtons();
    }


    function checkNegTraitEvents(character) {
        if (character.negTrait === 'hungry') {
            // every other turn, hunger goes up
            if (turnNumber % 2 === 0) {
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
                    checkDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                } else {
                    character.updateCharacter();
                    updateStatBars(character);
                }
            }
        }
    }

    function checkPosTraitEvents(character) {
        if (character.posTrait === 'resilient') {
            // 10% chance of healing
            if (Math.random() < 0.1) {
                character.health += 1;
                addEvent(`${character.name} is feeling a bit better.`);
            }
        }
        if (character.posTrait === 'satiated') {
            // every other turn, hunger goes down
            if (turnNumber % 2 === 0) {
                character.hunger += 0.5;
            }
        }
        if (character.posTrait === 'scavenger') {
            // 10% chance of finding an extra food item
            if (Math.random() < 0.1) {
                const foodType = food[Math.floor(Math.random() * food.length)];
                const variation = foodType[2][Math.floor(Math.random() * foodType[2].length)];
                addEvent(`${character.name} was able to scavenge ${variation}.`);
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
}

createCharacterForm();

export { playTurn };