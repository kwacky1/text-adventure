import { context, advanceDay, getFormattedDate } from './game-state.js';
import { food, medical } from './party.js';
import { updateStatBars, addEvent, setPlayButton, updateRelationships, updateInteractionButtons, checkPartyAlerts, updateFoodButtons, updateMedicalButtons } from './src/ui.js';
import { createCharacterForm } from './src/character-creation.js';
import { handleDeathEffects, getEvent } from './src/events.js';
import { posTraits, negTraits } from './src/constants.js';
import { checkPosTraitEvents, checkNegTraitEvents } from './src/traits.js';
import { updateWeaponButtons } from './src/inventory.js';
import { checkAgeEffects, checkBirthday } from './src/age-effects.js';
import { checkSeasonalEvents } from './src/seasonal-events.js';

export function playTurn() {
    // Move current events to turnX div
    const currentEventsDiv = document.getElementById('currentEvent');
    const currentEvents = currentEventsDiv.textContent;
    const eventsDiv = document.getElementById('events');
    const eventItem = document.createElement('div');
    eventItem.id = `turn${context.turnNumber}`;
    const dayCounter = document.getElementById('day');
    const timeLabel = context.timeOfDay === 'day' ? 'Day' : 'Night';
    dayCounter.textContent = `${timeLabel} (${getFormattedDate()})`;
    if (context.turnNumber % 2 === 0) {
        eventItem.classList.add('even');
    } else {
        eventItem.classList.add('odd');
    }
    eventItem.textContent = currentEvents;
    eventsDiv.insertBefore(eventItem, eventsDiv.children[1]);
    currentEventsDiv.textContent = '';
    setPlayButton('hide');
    
    // Check for seasonal events at the START of day turns (so UI matches the message)
    if (context.timeOfDay === 'day') {
        checkSeasonalEvents();
    }
    
    // Begin new turn
    // Reset actions for all characters at the start of each turn
    for (const character of context.gameParty.characters) {
        character.resetActions();
    }
    // Refresh all action dropdowns to re-enable them after reset
    updateFoodButtons();
    updateMedicalButtons();
    updateWeaponButtons();
    updateInteractionButtons();
    
    updateParty();
    if (context.gameParty.characters.length === 0) {
        const allButtons = document.getElementById('buttons');
        allButtons.remove();
        const partyInventoryDiv = document.getElementById('partyInventory');
        partyInventoryDiv.remove();
        const eventImage = document.getElementById('eventImage');
        if (eventImage) {
            eventImage.remove();
        }
        // output character is dead to the events div
        addEvent('The adventure has come to an end. You survived for ' + context.turnNumber + ' turns.');
    } else {
        const chance = Math.random();
        const specialEventOccurred = getEvent(chance);
        // Update inventory display - changed to use inventory.updateDisplay() directly
        context.gameParty.inventory.updateDisplay();
        context.turnNumber += 1;
        
        // Toggle time of day
        if (context.timeOfDay === 'day') {
            context.timeOfDay = 'night';
        } else {
            context.timeOfDay = 'day';
            advanceDay(); // Advance the calendar date
        }
        
        // Update button text even during special events
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.textContent = `Play Turn ${context.turnNumber}`;
        }
        
        // Only show play button if not in a special event (friend/combat)
        if (!specialEventOccurred) {
            setPlayButton('show');
        }
    }

    function updateParty() {
        // Create a copy of the array to iterate over, since we may remove characters
        const charactersToProcess = [...context.gameParty.characters];
        for (const character of charactersToProcess) {
            if (character.checkHunger()) {
                checkPosTraitEvents(character);
                checkNegTraitEvents(character);
                checkAgeEffects(character);
                checkBirthday(character);
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
                    handleDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                }
            } else {
                // Satiated characters cannot die from hunger - they survive at 0
                if (character.posTrait === 'satiated') {
                    character.hunger = 0;
                    addEvent(`${character.name} is starving but manages to hold on.`);
                } else {
                    addEvent(`${character.name} died of hunger.`);
                    handleDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                }
            }
            checkPartyAlerts(character);
        };
        updateInteractionButtons();
    }
}

createCharacterForm();