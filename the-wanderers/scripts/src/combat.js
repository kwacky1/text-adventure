import { addEvent, updateStatBars, setPlayButton as setPlayButtonUI, updateRelationships, handleGameOver } from './ui.js';
import { weapons } from '../party.js';
import { context } from '../game-state.js';
import { handleDeathEffects, singleZombieVariations, multiZombieVariations } from './events.js';
import { attackDescriptions } from './constants.js';
import { isHalloween, getHalloweenZombieDescription } from './seasonal-events.js';
import { recordZombieKill, recordWeaponUse } from './game-stats.js';

function handlePlayerTurn(current, combatants, players, context, setPlayButton, index) {
    const playerCharacter = context.gameParty.characters.find(c => c.name === current.type);
    
    // Skip turn if player died (removed from party)
    if (!playerCharacter) {
        handleTurn(index + 1, combatants, players, context, setPlayButton);
        return;
    }
    
    // Ensure play button stays hidden
    setPlayButton('hide');
    const buttons = document.getElementById('gameButtons');
    // Clear only combat buttons, not the play button
    Array.from(buttons.children).forEach(child => {
        if (child.id !== 'playButton') {
            child.remove();
        }
    });

    // Filter out dead enemies and show attack options directly
    const validTargets = combatants.filter(c => !players.some(p => p.type === c.type) && c.hp > 0);
    
    validTargets.forEach(target => {
        const targetButton = document.createElement('button');
        targetButton.textContent = `Attack zombie (${target.hp} HP)`;
        targetButton.addEventListener('click', () => {
            // Get current weapon damage (in case weapon was changed mid-combat)
            let damage = weapons[playerCharacter.weapon][1];
            // Add fighter bonus
            if (playerCharacter.posTrait === 'fighter') {
                damage += 1;
            }
            const roll = Math.random();
            
            if (roll < 0.1) { // 10% chance to miss
                addEvent(`${current.type} misses the zombie!`);
            } else if (playerCharacter.negTrait === 'clumsy' && roll < 0.2) {
                // Clumsy characters have 10% chance to hurt themselves
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
                if (roll > 0.9) { // 10% chance for critical hit
                    damage *= 2;
                    addEvent(attackDescriptions.critical[Math.floor(Math.random() * attackDescriptions.critical.length)]
                        .replace('[attacker]', current.type));
                } else {
                    // Use weapon-specific attack descriptions
                    const weaponName = weapons[playerCharacter.weapon][0];
                    const weaponDescriptions = attackDescriptions[weaponName] || attackDescriptions.fist;
                    addEvent(weaponDescriptions[Math.floor(Math.random() * weaponDescriptions.length)]
                        .replace('[attacker]', current.type));
                }
                // Track weapon usage
                recordWeaponUse(weapons[playerCharacter.weapon][0]);
                target.hp -= damage;
                
                // Update weapon durability
                if (playerCharacter.weapon > 0) {  // If not using fists
                    // Fighter: 50% chance to preserve durability
                    // Clumsy: Uses 2 durability instead of 1
                    let durabilityLoss = 1;
                    if (playerCharacter.posTrait === 'fighter' && Math.random() < 0.5) {
                        durabilityLoss = 0;
                    } else if (playerCharacter.negTrait === 'clumsy') {
                        durabilityLoss = 2;
                    }
                    playerCharacter.weaponDurability -= durabilityLoss;
                    if (playerCharacter.weaponDurability <= 0) {
                        addEvent(`${playerCharacter.name}'s ${weapons[playerCharacter.weapon][0]} breaks!`);
                        playerCharacter.weapon = 0;  // Back to fists
                        playerCharacter.weaponDurability = weapons[0][2];
                        current.attack = weapons[0][1];
                    }
                    updateStatBars(playerCharacter);
                    playerCharacter.updateCharacter();
                }
                
                if (target.hp <= 0) {
                    addEvent('The zombie is defeated!');
                    // Track the zombie kill with the weapon used
                    const weaponName = weapons[playerCharacter.weapon][0];
                    recordZombieKill(weaponName);
                    // Remove the dead enemy from combatants
                    const targetIndex = combatants.indexOf(target);
                    if (targetIndex > -1) {
                        combatants.splice(targetIndex, 1);
                    }
                    // Check if all enemies are defeated
                    if (!combatants.some(c => !players.some(p => p.type === c.type))) {
                        addEvent('All enemies have been defeated!');
                        // Increase morale for surviving characters
                        context.gameParty.characters.forEach(character => {
                            if (character.health > 0) {
                                character.morale++;
                                character.capAttributes();
                                updateStatBars(character);
                            }
                        });
                        // Clear combat buttons but keep the play button
                        Array.from(buttons.children).forEach(child => {
                            if (child.id !== 'playButton') {
                                child.remove();
                            }
                        });
                        setPlayButton('show');
                        return; // Exit combat
                    }
                }
            }
            
            // Only continue to next turn if we haven't already ended combat
            if (combatants.some(c => !players.some(p => p.type === c.type))) {
                // Clear only combat buttons, not the play button
                Array.from(buttons.children).forEach(child => {
                    if (child.id !== 'playButton') {
                        child.remove();
                    }
                });
                handleTurn(index + 1, combatants, players, context, setPlayButton);
            }
        });
        buttons.appendChild(targetButton);
    });
}

function handleEnemyTurn(combatant, players, combatants, context, setPlayButton, index) {
    // Ensure play button stays hidden
    setPlayButton('hide');
    const buttons = document.getElementById('gameButtons');
    // Clear only combat buttons, not the play button
    Array.from(buttons.children).forEach(child => {
        if (child.id !== 'playButton') {
            child.remove();
        }
    });
    
    const attackButton = document.createElement('button');
    attackButton.textContent = `The ${combatant.type} attacks!`;
    attackButton.id = 'attackButton';
    attackButton.addEventListener('click', () => {
        const validTargets = context.gameParty.characters.filter(c => c.health > 0);
        if (validTargets.length === 0) {
            addEvent('The party has been defeated...');
            handleGameOver(buttons);
            return;
        }
        
        const target = validTargets[Math.floor(Math.random() * validTargets.length)];
        const roll = Math.random();
        
        if (roll < 0.2) { // 20% chance to miss
            addEvent(`The zombie misses ${target.name}!`);
        } else {
            addEvent(`The zombie attacks ${target.name}!`);
            target.health -= combatant.attack;
            if (target.negTrait === 'vulnerable') {
                target.health -= 1;
            }
            if (Math.random() < 0.05) {
                target.infected = true;
            }
            if (target.health <= 0) {
                target.health = 0;
                addEvent(`${target.name} has been killed!`);
                handleDeathEffects(target);
                context.gameParty.removeCharacter(target);
                updateRelationships();
                if (target.infected) {
                    handleInfectedPlayerDeath(target, combatants);
                }
            }
            updateStatBars(target);
        }
        
        // Check if all players are dead
        if (!context.gameParty.characters.some(c => c.health > 0) || context.gameParty.characters.length === 0) {
            addEvent('Game Over - The entire party has been defeated!');
            handleGameOver(buttons);
            return;
        }
        
        // Check if there are any enemies left after potential infected player death
        if (!combatants.some(c => !players.some(p => p.type === c.type))) {
            addEvent('All enemies have been defeated!');
            // Increase morale for surviving characters
            context.gameParty.characters.forEach(character => {
                if (character.health > 0) {
                    character.morale++;
                    character.capAttributes();
                    updateStatBars(character);
                }
            });
            // Clear only combat buttons, not the play button
            Array.from(buttons.children).forEach(child => {
                if (child.id !== 'playButton') {
                    child.remove();
                }
            });
            setPlayButton('show');
            return;
        }

        // Only continue to next turn if combat isn't over
        // Clear only combat buttons, not the play button
        Array.from(buttons.children).forEach(child => {
            if (child.id !== 'playButton') {
                child.remove();
            }
        });
        handleTurn(index + 1, combatants, players, context, setPlayButton);
    });
    
    buttons.appendChild(attackButton);
}

function handleInfectedPlayerDeath(character, combatants) {
    combatants.push({
        type: 'enemy',
        hp: 4 + Math.floor(Math.random() * 4),
        morale: Math.floor(Math.random() * 10),
        attack: weapons[character.weapon][1]
    });
    addEvent(`${character.name} has become a zombie!`);
}

function handleTurn(index, combatants, players, context, setPlayButton) {
    if (index >= combatants.length) {
        index = 0;
    }

    const current = combatants[index];
    const isPlayer = players.some(p => p.type === current.type);

    if (current.hp <= 0) {
        handleTurn(index + 1, combatants, players, context, setPlayButton);
        return;
    }

    if (isPlayer) {
        handlePlayerTurn(current, combatants, players, context, setPlayButton, index);
    } else {
        handleEnemyTurn(current, players, combatants, context, setPlayButton, index);
    }
}

function foundEnemy(context) {
    // Hide the play button immediately when combat starts
    setPlayButtonUI('hide');
    
    const enemy = [['zombie']];
    var numberOfEnemies = Math.floor(Math.random() * context.gameParty.characters.length) + 1;
    
    if (numberOfEnemies == 1) {
        if (isHalloween()) {
            addEvent(getHalloweenZombieDescription());
        } else {
            const variation = singleZombieVariations[Math.floor(Math.random() * singleZombieVariations.length)];
            addEvent(`A zombie ${variation}!`);
        }
    } else {
        if (isHalloween()) {
            addEvent(`🎃 ${numberOfEnemies} costumed zombies emerge from the darkness!`);
            for (let i = 0; i < Math.min(numberOfEnemies, 2); i++) {
                addEvent(getHalloweenZombieDescription());
            }
        } else {
            const variation = multiZombieVariations[Math.floor(Math.random() * multiZombieVariations.length)];
            addEvent(`${numberOfEnemies} zombies ${variation}!`);
        }
    }

    // create array of enemies with random morale from 0 to 9
    var enemies = [];
    for (var i = 0; i < numberOfEnemies; i++) {
        const hp = 4 + Math.floor(Math.random() * 4);
        const morale = Math.floor(Math.random() * 10);
        const attack = 1;
        enemies.push({
            type: enemy[0][0],
            hp: hp,
            morale: morale,
            attack: attack
        });
    }

    var players = context.gameParty.characters
        .map(character => ({
            type: character.name,
            hp: character.health,
            morale: character.morale,
            attack: weapons[character.weapon][1]
        }));

    // Combine enemies and players into a single array
    var combatants = players.concat(enemies.map(enemy => ({
        type: 'enemy',
        hp: enemy.hp,
        morale: enemy.morale,
        attack: enemy.attack
    })));

    // Sort the combined array by morale
    combatants.sort((a, b) => b.morale - a.morale);
    
    // Start the turn-based combat
    handleTurn(0, combatants, players, context, setPlayButtonUI);
}

export { handleTurn, foundEnemy };