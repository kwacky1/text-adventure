import { healthArray, hungerArray, moraleArray } from '../character.js';
import { context } from '../game-state.js';
import { food, medical } from '../party.js';
import { updateFoodAttributes, updateMedicalAttributes } from './inventory.js';

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

        // Check if this action type has already been used
        const actionType = type; // 'food' or 'medical'
        if (character.actionsUsed && character.actionsUsed[actionType]) {
            select.disabled = true;
            return;
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
                option.textContent = `${itemName} (+${item[1]})`; 
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

            const chance = Math.random();
            if (chance <= 0.5) {
                addEvent(`${target.name} is not interested in talking right now.`);
            } else if (chance <= 0.75) {
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
            const item = items.find(i => i[0] === selectedItem);
            if (item) {
                const characterName = event.target.selectedOptions[0].dataset.characterName;
                const character = context.gameParty.characters.find(char => char.name === characterName);

                if (character) {
                    // Use the inventory's removeItem method instead of directly manipulating inventoryMap
                    if (context.gameParty.inventory.hasItem(item[0])) {
                        context.gameParty.inventory.removeItem(item[0]);
                        updateCharacterAttributes(character, item);
                        character.capAttributes();
                        character.updateCharacter();
                        updateStatBars(character);
                        context.gameParty.inventory.updateDisplay();
                        
                        // Mark action as used based on select type and disable the dropdown
                        const selectId = event.target.id;
                        if (selectId === 'foodSelect') {
                            character.actionsUsed.food = true;
                        } else if (selectId === 'medicalSelect') {
                            character.actionsUsed.medical = true;
                        }
                        event.target.disabled = true;
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
                relationshipItem.textContent = `${relatedCharacter.name}: ${relationshipType}`;
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
