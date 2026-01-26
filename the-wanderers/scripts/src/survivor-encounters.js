import { food, medical, weapons } from '../party.js';
import { addEvent, updateStatBars, updateFoodButtons, updateMedicalButtons, setPlayButton, updateRelationships, handleGameOver } from './ui.js';
import { addItemToInventory, updateWeaponButtons } from './inventory.js';
import { context } from '../game-state.js';
import { handleDeathEffects } from './events.js';
import {
    survivorAttackDescriptions,
    hostileSurvivorAttackDescriptions,
    merchantIntroductions,
    personInNeedIntroductions,
    hostileSurvivorIntroductions,
    survivorFleeMessages,
    survivorGiveUpMessages
} from './constants.js';
import { 
    recordMerchantTradeAccepted, 
    recordMerchantTradeDeclined, 
    recordMerchantStealAttempt,
    recordPersonInNeedHelped,
    recordPersonInNeedDeclined,
    recordHostileEncounter,
    recordHostileSurvivorKill,
    recordWeaponUse
} from './game-stats.js';

/**
 * Get a random element from an array
 * @param {Array} array - The array to pick from
 * @returns {*} A random element from the array
 */
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Check if any enemies remain in combat
 * @param {Array} combatants - All combatants in the fight
 * @param {Array} players - The player combatants
 * @returns {boolean} True if any enemies are still alive
 */
function hasEnemiesRemaining(combatants, players) {
    return combatants.some(c => !players.some(p => p.type === c.type));
}

/**
 * Get a random weapon, excluding fists (index 0)
 * @returns {Array} A random weapon item
 */
function getRandomWeaponExcludingFists() {
    return weapons[Math.floor(Math.random() * (weapons.length - 1)) + 1];
}

/**
 * Main entry point for survivor encounters
 * Called from events.js when a survivor encounter is triggered
 */
export function foundSurvivor() {
    setPlayButton('hide');
    
    // Randomly choose encounter type: 40% merchant, 30% person in need, 30% hostile
    const roll = Math.random();
    if (roll < 0.4) {
        merchantEncounter();
    } else if (roll < 0.7) {
        personInNeedEncounter();
    } else {
        hostileSurvivorEncounter();
    }
}

/**
 * Merchant encounter - offers trade
 */
function merchantEncounter() {
    const intro = getRandomElement(merchantIntroductions);
    addEvent(intro + '.');
    
    // Get a random item from a pool (food, medical, or weapon)
    const merchantItem = getRandomMerchantItem();
    
    // Get a random item from party inventory
    const partyItem = getRandomPartyItem();
    
    if (!partyItem) {
        addEvent('They look at your empty packs and walk away disappointed.');
        setPlayButton('show');
        return;
    }
    
    addEvent(`They offer to trade you a ${merchantItem[0]} for your ${partyItem.name}.`);
    
    const buttons = document.getElementById('gameButtons');
    clearCombatButtons(buttons);
    
    // In test environment, buttons may be null
    if (!buttons) {
        setPlayButton('show');
        return;
    }
    
    // Accept button
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept Trade';
    acceptButton.addEventListener('click', () => {
        // Remove party item from inventory
        context.gameParty.inventory.removeItem(partyItem.name);
        // Add merchant item to inventory
        addItemToInventory(merchantItem);
        addEvent(`You trade your ${partyItem.name} for the ${merchantItem[0]}.`);
        // Track accepted trade
        recordMerchantTradeAccepted();
        
        updateAllInventoryButtons();
        context.gameParty.inventory.updateDisplay();
        clearCombatButtons(buttons);
        setPlayButton('show');
    });
    buttons.appendChild(acceptButton);
    
    // Decline button
    const declineButton = document.createElement('button');
    declineButton.textContent = 'Decline';
    declineButton.addEventListener('click', () => {
        addEvent('You politely decline. The survivor nods and walks away.');
        // Track declined trade
        recordMerchantTradeDeclined();
        clearCombatButtons(buttons);
        setPlayButton('show');
    });
    buttons.appendChild(declineButton);
    
    // Steal button
    const stealButton = document.createElement('button');
    stealButton.textContent = 'Attempt to Steal';
    stealButton.addEventListener('click', () => {
        attemptSteal(merchantItem, buttons);
    });
    buttons.appendChild(stealButton);
}

/**
 * Attempt to steal from merchant
 * 50% hostile, 25% flee, 25% give up
 */
function attemptSteal(merchantItem, buttons) {
    clearCombatButtons(buttons);
    // Track steal attempt
    recordMerchantStealAttempt();
    
    const roll = Math.random();
    if (roll < 0.25) {
        // Survivor flees
        const fleeMsg = getRandomElement(survivorFleeMessages);
        addEvent(fleeMsg);
        setPlayButton('show');
    } else if (roll < 0.5) {
        // Survivor gives up the item
        const giveUpMsg = getRandomElement(survivorGiveUpMessages);
        addEvent(giveUpMsg);
        addItemToInventory(merchantItem);
        updateAllInventoryButtons();
        context.gameParty.inventory.updateDisplay();
        setPlayButton('show');
    } else {
        // Survivor becomes hostile (50%)
        addEvent('The survivor draws a weapon and attacks!');
        startHostileSurvivorCombat(1);
    }
}

/**
 * Person in need encounter - asks for food or medical
 */
function personInNeedEncounter() {
    const intro = getRandomElement(personInNeedIntroductions);
    addEvent(intro + '.');
    
    // Randomly ask for food or medical
    const wantsFood = Math.random() < 0.5;
    const itemType = wantsFood ? 'food' : 'medical';
    const itemPool = wantsFood ? food : medical;
    
    // Check if party has the item type
    const hasItem = itemPool.some(item => context.gameParty.inventory.hasItem(item[0]));
    
    if (wantsFood) {
        addEvent('They beg for something to eat.');
    } else {
        addEvent('They plead for medical supplies.');
    }
    
    const buttons = document.getElementById('gameButtons');
    clearCombatButtons(buttons);
    
    // In test environment, buttons may be null
    if (!buttons) {
        setPlayButton('show');
        return;
    }
    
    // Give button
    const giveButton = document.createElement('button');
    giveButton.textContent = hasItem ? `Give ${itemType}` : `No ${itemType} to give`;
    giveButton.disabled = !hasItem;
    giveButton.addEventListener('click', () => {
        // Find first available item of the type
        const itemToGive = itemPool.find(item => context.gameParty.inventory.hasItem(item[0]));
        if (itemToGive) {
            context.gameParty.inventory.removeItem(itemToGive[0]);
            addEvent(`You give them the ${itemToGive[0]}. They thank you profusely.`);
            // Track helping person in need
            recordPersonInNeedHelped();
            
            // Boost party morale
            context.gameParty.characters.forEach(character => {
                character.morale += 1;
                character.capAttributes();
                updateStatBars(character);
            });
            if (context.gameParty.characters.length === 1) {
                addEvent(`${context.gameParty.characters[0].name} feels good about helping someone in need.`);
            } else {
                addEvent('The party feels good about helping someone in need.');
            }
            
            updateAllInventoryButtons();
            context.gameParty.inventory.updateDisplay();
        }
        clearCombatButtons(buttons);
        setPlayButton('show');
    });
    buttons.appendChild(giveButton);
    
    // Decline button
    const declineButton = document.createElement('button');
    declineButton.textContent = 'Turn them away';
    declineButton.addEventListener('click', () => {
        clearCombatButtons(buttons);
        // Track declining person in need
        recordPersonInNeedDeclined();
        
        // 25% chance they become hostile
        if (Math.random() < 0.25) {
            addEvent('Desperation turns to rage. They attack!');
            startHostileSurvivorCombat(1);
        } else {
            addEvent('They look disappointed and shuffle away.');
            setPlayButton('show');
        }
    });
    buttons.appendChild(declineButton);
}

/**
 * Hostile survivor encounter - combat with no infection risk
 */
function hostileSurvivorEncounter() {
    // Number of enemies scales with party size for balance
    // Solo players always face 1 enemy, larger parties face 1-3
    const numberOfEnemies = Math.min(3, Math.floor(Math.random() * context.gameParty.characters.length) + 1);
    
    // Track hostile encounter
    recordHostileEncounter();
    
    // Use solo or group introductions based on party size
    const isSolo = context.gameParty.characters.length === 1;
    const introductions = isSolo ? hostileSurvivorIntroductions.solo : hostileSurvivorIntroductions.group;
    const intro = getRandomElement(introductions);
    addEvent(intro);
    
    if (numberOfEnemies > 1) {
        addEvent(`${numberOfEnemies} hostile survivors surround you!`);
    }
    
    startHostileSurvivorCombat(numberOfEnemies);
}

/**
 * Start combat with hostile survivors
 * Similar to zombie combat but no infection and different flavour
 */
function startHostileSurvivorCombat(numberOfEnemies) {
    const buttons = document.getElementById('gameButtons');
    clearCombatButtons(buttons);
    
    // Create survivors with 6-10 HP (tougher than zombies)
    const enemies = [];
    for (let i = 0; i < numberOfEnemies; i++) {
        const hp = 6 + Math.floor(Math.random() * 5); // 6-10 HP
        const morale = Math.floor(Math.random() * 10);
        const attack = 1 + Math.floor(Math.random() * 2); // 1-2 damage
        enemies.push({
            type: 'survivor',
            hp: hp,
            morale: morale,
            attack: attack
        });
    }
    
    const players = context.gameParty.characters
        .map(character => ({
            type: character.name,
            hp: character.health,
            morale: character.morale,
            attack: weapons[character.weapon][1]
        }));
    
    // Combine and sort by morale
    const combatants = players.concat(enemies);
    combatants.sort((a, b) => b.morale - a.morale);
    
    handleSurvivorTurn(0, combatants, players, setPlayButton);
}

/**
 * Handle a turn in survivor combat
 */
function handleSurvivorTurn(index, combatants, players, setPlayButton) {
    if (index >= combatants.length) {
        index = 0;
    }
    
    const current = combatants[index];
    const isPlayer = players.some(p => p.type === current.type);
    
    if (current.hp <= 0) {
        handleSurvivorTurn(index + 1, combatants, players, setPlayButton);
        return;
    }
    
    if (isPlayer) {
        handlePlayerSurvivorTurn(current, combatants, players, setPlayButton, index);
    } else {
        handleEnemySurvivorTurn(current, combatants, players, setPlayButton, index);
    }
}

/**
 * Handle player's turn in survivor combat
 */
function handlePlayerSurvivorTurn(current, combatants, players, setPlayButton, index) {
    const playerCharacter = context.gameParty.characters.find(c => c.name === current.type);
    
    if (!playerCharacter) {
        handleSurvivorTurn(index + 1, combatants, players, setPlayButton);
        return;
    }
    
    setPlayButton('hide');
    const buttons = document.getElementById('gameButtons');
    clearCombatButtons(buttons);
    
    const validTargets = combatants.filter(c => !players.some(p => p.type === c.type) && c.hp > 0);
    
    validTargets.forEach((target, targetIndex) => {
        const targetButton = document.createElement('button');
        targetButton.textContent = `Attack survivor ${targetIndex + 1} (${target.hp} HP)`;
        targetButton.addEventListener('click', () => {
            // Get current weapon damage (in case weapon was changed mid-combat)
            let damage = weapons[playerCharacter.weapon][1];
            // Add fighter bonus
            if (playerCharacter.posTrait === 'fighter') {
                damage += 1;
            }
            const roll = Math.random();
            
            if (roll < 0.1) {
                addEvent(`${current.type} misses the survivor!`);
            } else if (playerCharacter.negTrait === 'clumsy' && roll < 0.2) {
                playerCharacter.health -= 1;
                addEvent(`${current.type} swings wildly and hurts themself!`);
                updateStatBars(playerCharacter);
                if (playerCharacter.health <= 0) {
                    playerCharacter.health = 0;
                    addEvent(`${playerCharacter.name} has been knocked out by their own clumsiness!`);
                    handleDeathEffects(playerCharacter);
                    context.gameParty.removeCharacter(playerCharacter);
                }
            } else {
                if (roll > 0.9) {
                    damage *= 2;
                    addEvent(getRandomElement(survivorAttackDescriptions.critical)
                        .replace('[attacker]', current.type));
                } else {
                    // Use weapon-specific attack descriptions
                    const weaponName = weapons[playerCharacter.weapon][0];
                    const weaponDescriptions = survivorAttackDescriptions[weaponName] || survivorAttackDescriptions.fist;
                    addEvent(getRandomElement(weaponDescriptions)
                        .replace('[attacker]', current.type));
                }
                // Track weapon usage
                recordWeaponUse(weapons[playerCharacter.weapon][0]);
                target.hp -= damage;
                
                // Update weapon durability
                if (playerCharacter.weapon > 0) {
                    let durabilityLoss = 1;
                    if (playerCharacter.posTrait === 'fighter' && Math.random() < 0.5) {
                        durabilityLoss = 0;
                    } else if (playerCharacter.negTrait === 'clumsy') {
                        durabilityLoss = 2;
                    }
                    playerCharacter.weaponDurability -= durabilityLoss;
                    if (playerCharacter.weaponDurability <= 0) {
                        addEvent(`${playerCharacter.name}'s ${weapons[playerCharacter.weapon][0]} breaks!`);
                        playerCharacter.weapon = 0;
                        playerCharacter.weaponDurability = weapons[0][2];
                        current.attack = weapons[0][1];
                    }
                    updateStatBars(playerCharacter);
                    playerCharacter.updateCharacter();
                }
                
                if (target.hp <= 0) {
                    addEvent('The hostile survivor is defeated!');
                    // Track hostile survivor kill
                    recordHostileSurvivorKill();
                    const targetIndex = combatants.indexOf(target);
                    if (targetIndex > -1) {
                        combatants.splice(targetIndex, 1);
                    }
                    
                    if (!hasEnemiesRemaining(combatants, players)) {
                        survivorCombatVictory(buttons, setPlayButton);
                        return;
                    }
                }
            }
            
            if (hasEnemiesRemaining(combatants, players)) {
                clearCombatButtons(buttons);
                handleSurvivorTurn(index + 1, combatants, players, setPlayButton);
            }
        });
        buttons.appendChild(targetButton);
    });
}

/**
 * Handle enemy survivor's turn
 */
function handleEnemySurvivorTurn(combatant, combatants, players, setPlayButton, index) {
    setPlayButton('hide');
    const buttons = document.getElementById('gameButtons');
    clearCombatButtons(buttons);
    
    const attackButton = document.createElement('button');
    attackButton.textContent = 'The hostile survivor attacks!';
    attackButton.id = 'attackButton';
    attackButton.addEventListener('click', () => {
        const validTargets = context.gameParty.characters.filter(c => c.health > 0);
        if (validTargets.length === 0) {
            survivorCombatDefeat(buttons);
            return;
        }
        
        const target = getRandomElement(validTargets);
        const roll = Math.random();
        
        if (roll < 0.2) {
            addEvent(`The survivor misses ${target.name}!`);
        } else {
            const attackDesc = getRandomElement(hostileSurvivorAttackDescriptions)
                .replace('[NAME]', target.name);
            addEvent(`The survivor ${attackDesc}!`);
            target.health -= combatant.attack;
            if (target.negTrait === 'vulnerable') {
                target.health -= 1;
            }
            // No infection from survivor attacks
            if (target.health <= 0) {
                target.health = 0;
                addEvent(`${target.name} has been killed!`);
                handleDeathEffects(target);
                context.gameParty.removeCharacter(target);
                updateRelationships();
            }
            updateStatBars(target);
        }
        
        // Check if all players are dead
        if (!context.gameParty.characters.some(c => c.health > 0) || context.gameParty.characters.length === 0) {
            survivorCombatDefeat(buttons);
            return;
        }
        
        // Check for victory
        if (!hasEnemiesRemaining(combatants, players)) {
            survivorCombatVictory(buttons, setPlayButton);
            return;
        }
        
        clearCombatButtons(buttons);
        handleSurvivorTurn(index + 1, combatants, players, setPlayButton);
    });
    
    buttons.appendChild(attackButton);
}

/**
 * Handle survivor combat victory
 */
function survivorCombatVictory(buttons, setPlayButton) {
    addEvent('All hostile survivors have been defeated!');
    
    // Chance to loot items from defeated survivors
    if (Math.random() < 0.5) {
        const lootRoll = Math.random();
        if (lootRoll < 0.33) {
            const foodItem = getRandomElement(food);
            addEvent(`You find some ${foodItem[0]} on one of the survivors.`);
            addItemToInventory(foodItem);
            updateFoodButtons();
        } else if (lootRoll < 0.67) {
            const medItem = getRandomElement(medical);
            addEvent(`You find a ${medItem[0]} on one of the survivors.`);
            addItemToInventory(medItem);
            updateMedicalButtons();
        } else {
            const weaponItem = getRandomWeaponExcludingFists();
            addEvent(`You find a ${weaponItem[0]} on one of the survivors.`);
            addItemToInventory(weaponItem);
            updateWeaponButtons();
        }
    }
    
    // Morale boost for winning
    context.gameParty.characters.forEach(character => {
        if (character.health > 0) {
            character.morale++;
            character.capAttributes();
            updateStatBars(character);
        }
    });
    
    context.gameParty.inventory.updateDisplay();
    clearCombatButtons(buttons);
    setPlayButton('show');
}

/**
 * Handle survivor combat defeat
 */
function survivorCombatDefeat(buttons) {
    addEvent('Game Over - The entire party has been defeated!');
    handleGameOver(buttons);
}

/**
 * Get a random item that a merchant might offer
 */
function getRandomMerchantItem() {
    const roll = Math.random();
    if (roll < 0.4) {
        return getRandomElement(food);
    } else if (roll < 0.7) {
        return getRandomElement(medical);
    } else {
        return getRandomWeaponExcludingFists();
    }
}

/**
 * Get a random item from party inventory
 */
function getRandomPartyItem() {
    const allItems = context.gameParty.inventory.getAllItems();
    if (allItems.length === 0) {
        return null;
    }
    return getRandomElement(allItems);
}

/**
 * Helper to clear combat buttons
 */
function clearCombatButtons(buttons) {
    if (!buttons) return;
    Array.from(buttons.children).forEach(child => {
        if (child.id !== 'playButton') {
            child.remove();
        }
    });
}

/**
 * Helper to update all inventory buttons
 */
function updateAllInventoryButtons() {
    updateFoodButtons();
    updateMedicalButtons();
    updateWeaponButtons();
}
