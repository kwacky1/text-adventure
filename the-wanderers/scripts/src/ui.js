import { healthArray, hungerArray, moraleArray } from '../character.js';
import { context } from '../game-state.js';
import { food, medical, weapons } from '../party.js';
import { updateFoodAttributes, updateMedicalAttributes, updateWeaponAttributes } from './inventory.js';
import { relationships, relationshipEmojis } from './constants.js';
import { getGameStats, finalizeLongestSurvivor } from './game-stats.js';

export function updateStatBars(character) {
    const characterDiv = document.getElementById(character.getCharacterId());
    if (characterDiv) {
        const healthBar = characterDiv.querySelector('.health');
        const hungerBar = characterDiv.querySelector('.hunger');
        const moraleBar = characterDiv.querySelector('.morale');
        const weaponBar = characterDiv.querySelector('.weapon');
        
        if (healthBar) updateBar(healthBar, (character.health / (healthArray.length - 1)) * 100);
        if (hungerBar) updateBar(hungerBar, (character.hunger / (hungerArray.length - 1)) * 100);
        if (moraleBar) updateBar(moraleBar, (character.morale / (moraleArray.length - 1)) * 100);
        
        // Update weapon durability bar (only for non-fist weapons)
        if (weaponBar && character.weapon !== 0) {
            const maxDurability = weapons[character.weapon][2];
            updateBar(weaponBar, (character.weaponDurability / maxDurability) * 100);
        } else if (weaponBar) {
            // Fists have no durability bar - clear it
            updateBar(weaponBar, 0);
        }
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

    context.gameParty.characters.forEach(character => {
        const characterDiv = document.getElementById(character.getCharacterId());
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

        // If no items available, just leave the default option
        if (items.length === 0) return;

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
        const characterDiv = document.getElementById(character.getCharacterId());
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

            // Mark interact action as used for BOTH characters (prevents reciprocal interaction)
            character.actionsUsed.interact = true;
            target.actionsUsed.interact = true;
            event.target.disabled = true;
            event.target.selectedIndex = 0;

            // Remove the reciprocal interaction option and disable target's dropdown
            const targetSelect = document.querySelector(`#${target.getCharacterId()} #options #interactionSelect`);
            if (targetSelect) {
                targetSelect.disabled = true;
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
                }
            } else {
                addEvent(`${target.name} is feeling down.`);
            }
            
            // Update relationships display for both characters (to show new level and disable avatars)
            updateRelationships();
            
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
        const characterItem = document.getElementById(character.getCharacterId());
        if (!characterItem) continue;
        
        const relationshipsDiv = characterItem.querySelector('.relationships');
        if (!relationshipsDiv) continue;
        
        // Clear previous content (no header since it's inline with name)
        relationshipsDiv.innerHTML = '';
        
        // Create container for interaction avatars
        const interactionContainer = document.createElement('div');
        interactionContainer.className = 'interaction-avatars';
        
        // Check if this character can still interact
        const canInteract = !character.actionsUsed || !character.actionsUsed.interact;
        
        for (const [relatedCharacter, relationshipType] of character.relationships.entries()) {
            if (relatedCharacter !== character && context.gameParty.characters.includes(relatedCharacter)) {
                // Create avatar + relationship container
                const avatarWrapper = document.createElement('div');
                avatarWrapper.className = 'interaction-avatar-wrapper';
                
                // Create clickable button with mini avatar
                const avatarBtn = document.createElement('button');
                avatarBtn.className = 'interaction-avatar-btn';
                avatarBtn.title = canInteract 
                    ? `Talk to ${relatedCharacter.name} (${relationships[relationshipType] || 'unknown'})`
                    : `Already interacted this turn`;
                avatarBtn.disabled = !canInteract;
                
                // Create mini avatar layers container
                const avatarContainer = document.createElement('div');
                avatarContainer.className = 'mini-avatar-layers';
                
                // Skin layer
                const skinImg = document.createElement('img');
                skinImg.src = relatedCharacter.skin;
                skinImg.alt = '';
                skinImg.className = 'mini-avatar-layer';
                avatarContainer.appendChild(skinImg);
                
                // Hair layer
                const hairImg = document.createElement('img');
                hairImg.src = relatedCharacter.hair;
                hairImg.alt = '';
                hairImg.className = 'mini-avatar-layer';
                avatarContainer.appendChild(hairImg);
                
                // Shirt layer
                const shirtImg = document.createElement('img');
                shirtImg.src = relatedCharacter.shirt;
                shirtImg.alt = relatedCharacter.name;
                shirtImg.className = 'mini-avatar-layer';
                avatarContainer.appendChild(shirtImg);
                
                avatarBtn.appendChild(avatarContainer);
                
                // Add click handler for interaction
                if (canInteract) {
                    avatarBtn.addEventListener('click', () => {
                        handleInteraction(character, relatedCharacter);
                    });
                }
                
                avatarWrapper.appendChild(avatarBtn);
                
                // Add relationship emoji
                const relationshipLabel = document.createElement('span');
                relationshipLabel.className = 'relationship-emoji';
                relationshipLabel.textContent = relationshipEmojis[relationshipType] || '❓';
                relationshipLabel.title = relationships[relationshipType] || 'unknown';
                avatarWrapper.appendChild(relationshipLabel);
                
                interactionContainer.appendChild(avatarWrapper);
            }
        }
        
        relationshipsDiv.appendChild(interactionContainer);
    }
}

/**
 * Handle interaction between two characters via mini avatar click
 */
function handleInteraction(character, target) {
    // Mark interact action as used for BOTH characters (prevents reciprocal interaction)
    character.actionsUsed.interact = true;
    target.actionsUsed.interact = true;
    
    // Calculate interaction probability modifier based on traits
    let positiveModifier = 0;
    for (const char of [character, target]) {
        if (char.posTrait === 'friendly') positiveModifier += 0.1;
        if (char.posTrait === 'optimistic') positiveModifier += 0.1;
        if (char.negTrait === 'disconnected') positiveModifier -= 0.1;
        if (char.negTrait === 'depressed') positiveModifier -= 0.1;
    }
    
    const chance = Math.random();
    const neutralThreshold = Math.max(0.2, Math.min(0.7, 0.5 - positiveModifier));
    const positiveThreshold = Math.max(0.5, Math.min(0.9, 0.75 + positiveModifier));
    
    if (chance <= neutralThreshold) {
        addEvent(`${target.name} is not interested in talking right now.`);
    } else if (chance <= positiveThreshold) {
        addEvent(`${target.name} is happy to chat.`);
        if (character.relationships.get(target) < 4) {
            character.relationships.set(target, character.relationships.get(target) + 1);
            target.relationships.set(character, target.relationships.get(character) + 1);
        }
    } else {
        addEvent(`${target.name} is feeling down.`);
    }
    
    // Update relationships display for all characters (to show new relationship level and disable buttons)
    updateRelationships();
    
    // Also disable the dropdown
    updateInteractionButtons();
}

export function clearAndPopulateOptions(character) {
    const characterItem = document.getElementById(character.getCharacterId());
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

/**
 * Handle game over state - clears UI and shows final message with statistics
 * @param {HTMLElement} buttons - The game buttons container
 */
export function handleGameOver(buttons) {
    if (buttons) {
        Array.from(buttons.children).forEach(child => child.remove());
    }
    const playButton = document.getElementById('playButton');
    if (playButton) {
        playButton.remove();
    }
    const partyInventoryDiv = document.getElementById('partyInventory');
    if (partyInventoryDiv) {
        partyInventoryDiv.innerHTML = '';
    }
    const eventImage = document.getElementById('eventImage');
    if (eventImage) {
        eventImage.remove();
    }
    addEvent(`The adventure has come to an end. You survived for ${context.turnNumber} turns.`);
    
    // Finalize longest survivor stats for any characters still alive
    if (context.gameParty && context.gameParty.characters) {
        const remainingNames = context.gameParty.characters.map(c => c.name);
        finalizeLongestSurvivor(remainingNames, context.turnNumber);
    }
    
    // Display end game statistics
    displayEndGameStats();
}

/**
 * Display end game statistics in a styled panel
 */
function displayEndGameStats() {
    const stats = getGameStats();
    
    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'end-game-stats';
    statsContainer.innerHTML = '<h2>Adventure Statistics</h2>';
    
    // Create stats grid
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';
    
    // Combat stats section
    const combatSection = createStatsSection('Combat', [
        { label: 'Zombies Killed', value: stats.zombiesKilled },
        { label: 'Hostile Survivors Defeated', value: stats.hostileSurvivorsKilled },
        { label: 'Favourite Weapon', value: capitalizeFirst(stats.favouriteWeapon) }
    ]);
    statsGrid.appendChild(combatSection);
    
    // Party stats section
    const longestSurvivorText = stats.longestSurvivor.name 
        ? `${stats.longestSurvivor.name} (${stats.longestSurvivor.turns} turns)`
        : 'None';
    const partySection = createStatsSection('Party', [
        { label: 'Total Members Recruited', value: stats.totalPartyMembers },
        { label: 'Longest Survivor', value: longestSurvivorText }
    ]);
    statsGrid.appendChild(partySection);
    
    // Supplies stats section
    const suppliesSection = createStatsSection('Supplies', [
        { label: 'Food Eaten', value: stats.foodEaten },
        { label: 'Medical Items Used', value: stats.medicalUsed }
    ]);
    statsGrid.appendChild(suppliesSection);
    
    // Survivor encounters section
    const enc = stats.survivorEncounters;
    const encounterSection = createStatsSection('Survivor Encounters', [
        { label: 'Trades Accepted', value: enc.merchantTradesAccepted },
        { label: 'Trades Declined', value: enc.merchantTradesDeclined },
        { label: 'Steal Attempts', value: enc.merchantStealAttempts },
        { label: 'People Helped', value: enc.personInNeedHelped },
        { label: 'People Turned Away', value: enc.personInNeedDeclined },
        { label: 'Hostile Encounters', value: enc.hostileEncounters }
    ]);
    statsGrid.appendChild(encounterSection);
    
    statsContainer.appendChild(statsGrid);
    
    // Add to the image container (where campsite image was)
    const imageContainer = document.getElementById('imageContainer');
    if (imageContainer) {
        imageContainer.appendChild(statsContainer);
    } else {
        // Fallback to current events area if imageContainer doesn't exist
        const currentEventDiv = document.getElementById('currentEvent');
        if (currentEventDiv) {
            currentEventDiv.appendChild(statsContainer);
        }
    }
}

/**
 * Create a stats section with a title and list of stats
 * @param {string} title - Section title
 * @param {Array} statsList - Array of {label, value} objects
 * @returns {HTMLElement} The stats section element
 */
function createStatsSection(title, statsList) {
    const section = document.createElement('div');
    section.className = 'stats-section';
    
    const header = document.createElement('h3');
    header.textContent = title;
    section.appendChild(header);
    
    const list = document.createElement('ul');
    for (const stat of statsList) {
        const item = document.createElement('li');
        item.innerHTML = `<span class="stat-label">${stat.label}:</span> <span class="stat-value">${stat.value}</span>`;
        list.appendChild(item);
    }
    section.appendChild(list);
    
    return section;
}

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
    if (!str || str === 'None') return str || '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
