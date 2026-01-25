import { healthArray, hungerArray, moraleArray } from '../character.js';
import { context } from '../game-state.js';
import { food, medical, weapons } from '../party.js';
import { updateFoodAttributes, updateMedicalAttributes, updateWeaponAttributes } from './inventory.js';
import { relationships } from './constants.js';

export function updateStatBars(character) {
    const characterDiv = document.getElementById(character.name);
    if (characterDiv) {
        const healthBar = characterDiv.querySelector('.health');
        const hungerBar = characterDiv.querySelector('.hunger');
        const moraleBar = characterDiv.querySelector('.morale');
        
        if (healthBar) updateBar(healthBar, (character.health / (healthArray.length - 1)) * 100);
        if (hungerBar) updateBar(hungerBar, (character.hunger / (hungerArray.length - 1)) * 100);
        if (moraleBar) updateBar(moraleBar, (character.morale / (moraleArray.length - 1)) * 100);
    }
}

function updateBar(bar, value) {
    if (bar) {
        // Set both the width and background-color CSS variables for the shading
        bar.style.setProperty('--width', `${value}%`);
        bar.style.setProperty('--background-color', getBarColor(value));
    }
}

function getBarColor(percentage) {
    const lowThreshold = 30;
    const mediumThreshold = 60;
    if (percentage < lowThreshold) {
        return "rgba(128, 0, 0, 0.5)";
    } else if (percentage < mediumThreshold) {
        return "rgba(128, 128, 0, 0.5)";
    } else {
        return "rgba(0, 128, 0, 0.5)";
    }
}

export function addEvent(eventText, style = "default") {
    let currentEvents = '';
    const currentEventDiv = document.getElementById('currentEvent');
    if (currentEventDiv.innerHTML !== '') {
        currentEvents = currentEventDiv.innerHTML;
    }
    const sanitizedEventText = DOMPurify.sanitize(`<span class="${style}">${eventText}</span>`);
    currentEvents += ` ${sanitizedEventText}`;
    currentEventDiv.innerHTML = currentEvents.trim();
}

export function updateButtons(type, items, buttonText, updateFunction) {
    if (!items) return; // Early return for interaction buttons which don't use items
    if (items.length === 0) return;

    context.gameParty.characters.forEach(character => {
        const characterDiv = document.getElementById(character.name.split(' ').join(''));
        if (!characterDiv) return;

        const select = characterDiv.querySelector(`#${type}Select`);
        if (!select) return;

        // Check if this action type has already been used (weapons don't consume actions)
        if (type !== 'weapon') {
            const actionType = type; // 'food' or 'medical'
            if (character.actionsUsed && character.actionsUsed[actionType]) {
                select.disabled = true;
                return;
            }
        }
        
        // Re-enable if action hasn't been used (for turn reset)
        select.disabled = false;

        // Clear existing options except the first default option
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add options for each available item
        for (const item of items) {
            const itemName = item[0];
            if (context.gameParty.inventory.hasItem(itemName)) {
                const option = document.createElement('option');
                option.value = itemName;
                // Display damage for weapons, healing/hunger value for others
                if (type === 'weapon') {
                    option.textContent = `${itemName} (DMG: ${item[1]})`;
                } else {
                    option.textContent = `${itemName} (+${item[1]})`;
                }
                option.dataset.characterName = character.name;
                select.appendChild(option);
            }
        }

        // Make sure the change handler is attached
        if (!select.hasChangeHandler) {
            select.addEventListener('change', (event) => handleSelection(event, items, updateFunction));
            select.hasChangeHandler = true;
        }
    });
}

export function updateFoodButtons() {
    updateButtons('food', food, 'Feed', updateFoodAttributes);
}

export function updateMedicalButtons() {
    updateButtons('medical', medical, 'Heal', updateMedicalAttributes);
}

export function updateInteractionButtons() {
    // Update interaction dropdowns for each character
    context.gameParty.characters.forEach(character => {
        const characterDiv = document.getElementById(character.name.split(' ').join(''));
        if (!characterDiv) return;

        const interactionSelect = characterDiv.querySelector('#interactionSelect');
        if (!interactionSelect) return;

        // Check if interact action has already been used
        if (character.actionsUsed && character.actionsUsed.interact) {
            interactionSelect.disabled = true;
            return;
        }
        
        // Re-enable if action hasn't been used (for turn reset)
        interactionSelect.disabled = false;

        // Clear existing options except the first default option
        while (interactionSelect.options.length > 1) {
            interactionSelect.remove(1);
        }

        // Add interaction options for each other character
        context.gameParty.characters.forEach(targetCharacter => {
            if (targetCharacter !== character) {
                const interactOption = document.createElement('option');
                interactOption.value = 'interact';
                interactOption.textContent = `Talk to ${targetCharacter.name}`;
                interactOption.dataset.characterName = character.name;
                interactOption.dataset.targetName = targetCharacter.name;
                interactionSelect.appendChild(interactOption);
            }
        });

        // Make sure the change handler is attached
        if (!interactionSelect.hasChangeHandler) {
            interactionSelect.addEventListener('change', (event) => handleSelection(event, null, null));
            interactionSelect.hasChangeHandler = true;
        }
    });
}

export function handleSelection(event, items, updateCharacterAttributes) {
    try {
        const selectedItem = event.target.value;
        if (selectedItem === 'interact') {
            const characterName = event.target.selectedOptions[0].dataset.characterName;
            const targetName = event.target.selectedOptions[0].dataset.targetName;
            event.target.remove(event.target.selectedIndex);
            const character = context.gameParty.characters.find(char => char.name === characterName);
            const target = context.gameParty.characters.find(char => char.name === targetName);

            // Mark interact action as used and disable the dropdown
            character.actionsUsed.interact = true;
            event.target.disabled = true;
            event.target.selectedIndex = 0;

            // Remove the reciprocal interaction option
            const targetSelect = document.querySelector(`#${targetName.split(' ').join('')} #options #interactionSelect`);
            if (targetSelect) {
                const options = Array.from(targetSelect.options);
                const reciprocalOption = options.find(option => 
                    option.dataset.characterName === targetName && 
                    option.dataset.targetName === characterName
                );
                if (reciprocalOption) {
                    targetSelect.remove(reciprocalOption.index);
                }
            }

            // Calculate interaction probability modifier based on traits
            // friendly/optimistic: +10% positive each, disconnected/depressed: +10% negative each
            let positiveModifier = 0;
            for (const char of [character, target]) {
                if (char.posTrait === 'friendly') positiveModifier += 0.1;
                if (char.posTrait === 'optimistic') positiveModifier += 0.1;
                if (char.negTrait === 'disconnected') positiveModifier -= 0.1;
                if (char.negTrait === 'depressed') positiveModifier -= 0.1;
            }
            
            const chance = Math.random();
            // Adjust thresholds based on modifier (more positive = lower neutral threshold, higher positive threshold)
            const neutralThreshold = Math.max(0.2, Math.min(0.7, 0.5 - positiveModifier));
            const positiveThreshold = Math.max(0.5, Math.min(0.9, 0.75 + positiveModifier));
            
            if (chance <= neutralThreshold) {
                addEvent(`${target.name} is not interested in talking right now.`);
            } else if (chance <= positiveThreshold) {
                addEvent(`${target.name} is happy to chat.`);
                if (character.relationships.get(target) < 4) {
                    character.relationships.set(target, character.relationships.get(target) + 1);
                    target.relationships.set(character, target.relationships.get(character) + 1);
                    updateRelationships();
                }
            } else {
                addEvent(`${target.name} is feeling down.`);
            }
            
        } else {
            // For weapons, look up from the source weapons array since the filtered items may have changed
            const selectId = event.target.id;
            let item;
            if (selectId === 'weaponSelect') {
                item = weapons.find(w => w[0] === selectedItem);
            } else {
                item = items.find(i => i[0] === selectedItem);
            }
            
            if (item) {
                const characterName = event.target.selectedOptions[0].dataset.characterName;
                const character = context.gameParty.characters.find(char => char.name === characterName);

                if (character) {
                    // Use the inventory's removeItem method instead of directly manipulating inventoryMap
                    if (context.gameParty.inventory.hasItem(item[0])) {
                        // For weapons, get durability from inventory BEFORE removing
                        let itemDurability = null;
                        if (selectId === 'weaponSelect') {
                            const inventoryItem = context.gameParty.inventory.getItem(item[0]);
                            itemDurability = inventoryItem ? inventoryItem.value : null;
                        }
                        
                        context.gameParty.inventory.removeItem(item[0]);
                        
                        // Pass durability for weapons, use correct update function
                        if (selectId === 'weaponSelect') {
                            updateWeaponAttributes(character, item, itemDurability);
                        } else if (selectId === 'medicalSelect') {
                            // Check if a hypochondriac steals the medical item
                            const hypochondriacs = context.gameParty.characters.filter(
                                c => c.negTrait === 'hypochondriac' && c !== character
                            );
                            if (hypochondriacs.length > 0 && Math.random() < 0.2) {
                                // A random hypochondriac steals the item
                                const thief = hypochondriacs[Math.floor(Math.random() * hypochondriacs.length)];
                                addEvent(`${thief.name} panics and uses the ${item[0]} on themselves instead!`);
                                updateCharacterAttributes(thief, item);
                                thief.capAttributes();
                                thief.updateCharacter();
                                updateStatBars(thief);
                            } else {
                                updateCharacterAttributes(character, item);
                            }
                        } else {
                            updateCharacterAttributes(character, item);
                        }
                        
                        character.capAttributes();
                        character.updateCharacter();
                        updateStatBars(character);
                        context.gameParty.inventory.updateDisplay();
                        
                        // Mark action as used based on select type and disable the dropdown
                        if (selectId === 'foodSelect') {
                            character.actionsUsed.food = true;
                            event.target.disabled = true;
                        } else if (selectId === 'medicalSelect') {
                            character.actionsUsed.medical = true;
                            event.target.disabled = true;
                        }
                        // Weapons don't consume actions - don't disable
                        event.target.selectedIndex = 0;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error during event handling:', error);
    }
}

export function setPlayButton(display) {
    const playButton = document.getElementById('playButton');
    if (playButton) {
        if (display === 'show' || display === 'hide') {
            playButton.style.display = display === 'show' ? 'block' : 'none';
        } else {
            playButton.textContent = display;
            playButton.style.display = 'block';
        }
    }
}

export function updateRelationships() {
    for (const character of context.gameParty.characters) {
        const characterItem = document.getElementById(character.name);
        const relationshipsDiv = characterItem.querySelector('.relationships');
        relationshipsDiv.innerHTML = '<p>Relationships</p>';
        
        const relationshipsList = document.createElement('ul');
        relationshipsDiv.appendChild(relationshipsList);
        
        for (const [relatedCharacter, relationshipType] of character.relationships.entries()) {
            if (relatedCharacter !== character && context.gameParty.characters.includes(relatedCharacter)) {
                const relationshipItem = document.createElement('li');
                const relationshipName = relationships[relationshipType] || 'unknown';
                relationshipItem.textContent = `${relatedCharacter.name}: ${relationshipName}`;
                relationshipsList.appendChild(relationshipItem);
            }
        }
    }
}

export function clearAndPopulateOptions(character) {
    const characterItem = document.getElementById(character.name);
    if (!characterItem) return;

    const optionsDiv = characterItem.querySelector('#options');
    if (!optionsDiv) return;

    // Clear existing options
    optionsDiv.innerHTML = '';

    // Add new interaction options
    const interactionSelect = document.createElement('select');
    interactionSelect.id = 'interactionSelect';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select action...';
    interactionSelect.appendChild(defaultOption);

    // Add interaction options for each other character
    context.gameParty.characters.forEach(targetCharacter => {
        if (targetCharacter !== character) {
            const interactOption = document.createElement('option');
            interactOption.value = 'interact';
            interactOption.textContent = `Talk to ${targetCharacter.name}`;
            interactOption.dataset.characterName = character.name;
            interactOption.dataset.targetName = targetCharacter.name;
            interactionSelect.appendChild(interactOption);
        }
    });

    interactionSelect.addEventListener('change', (event) => handleSelection(event));
    optionsDiv.appendChild(interactionSelect);
}

export function checkPartyAlerts(character) {
    if (context.gameParty.characters.includes(character)) {
        const moralePercentage = (character.morale / (moraleArray.length - 1)) * 100;
        const hungerPercentage = (character.hunger / (hungerArray.length - 1)) * 100;
        const healthPercentage = (character.health / (healthArray.length - 1)) * 100;

        // Define threshold percentages
        const lowThreshold = 30;

        // Function to display a message when below a threshold
        if (moralePercentage < lowThreshold) {
            addEvent(`${character.name} is feeling ${moraleArray[Math.round(character.morale)]}.`);
        }
        if (hungerPercentage < lowThreshold) {
            addEvent(`${character.name} is ${hungerArray[Math.round(character.hunger)]}.`);
        }
        if (healthPercentage < lowThreshold) {
            addEvent(`${character.name} is ${healthArray[Math.round(character.health)]}.`);
        }
    }
}
