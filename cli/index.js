#!/usr/bin/env node
/**
 * CLI entry point for The Wanderers
 * Run with: node cli/index.js
 */

import { GameSession, GameEngine, posTraits, negTraits, food, medical, weapons } from '../core/index.js';
import { CliRenderer } from './cli-renderer.js';

async function main() {
    const renderer = new CliRenderer();
    await renderer.initialize();

    // Create game session
    const session = new GameSession({
        isMultiplayer: false,
        useApiNames: true
    });

    // Fetch names from randomuser.me API
    await renderer.displayEvent('Fetching character names...', { type: 'info' });
    await session.initializeNames();

    const engine = new GameEngine(session, renderer);

    // Create first character
    await renderer.displayEvent('A lone survivor sets up camp in the wilderness...', { type: 'info' });
    
    const suggestedName = session.getNextName();
    const characterData = await renderer.promptCharacterCreation([suggestedName]);
    // Use name from character creation, or fall back to suggested name
    if (!characterData.name) {
        characterData.name = suggestedName;
    }
    
    await engine.initializeGame(characterData);
    // Party status is shown by initializeGame, no need to show again

    // Main game loop
    while (!session.isGameOver()) {
        // Show current turn info before menu (end of previous turn actions)
        await renderer.updateTurnDisplay(
            session.turnNumber,
            session.timeOfDay,
            session.getFormattedDate(),
            true  // isEndOfTurn - we're at the end, waiting for player input
        );

        // Player action menu
        const action = await promptMainAction(renderer, session);
        
        if (action === 'play') {
            // playTurn will show its own turn display at the start
            await engine.playTurn();
            await renderer.displayPartyStatusCompact(session.party.characters);
            await renderer.displayInventoryCompact(session.party.inventory);
        } else if (action === 'interact') {
            await handleInteraction(renderer, session, engine);
        } else if (action === 'inventory') {
            await handleInventoryAction(renderer, session, engine);
        } else if (action === 'status') {
            await renderer.displayPartyStatus(session.party.characters);
            await renderer.displayInventory(session.party.inventory);
        } else if (action === 'quit') {
            const confirm = await renderer.promptConfirm('Are you sure you want to quit?');
            if (confirm) {
                const stats = session.endGame();
                await renderer.handleGameOver(stats);
                await renderer.dispose();
                return; // Exit function completely to avoid duplicate stats
            }
        }
    }

    // Game over (party wiped)
    if (session.isGameOver()) {
        // Only show if not already ended by quit
        if (session.status !== 'ended') {
            const stats = session.endGame();
            await renderer.handleGameOver(stats);
        }
    }

    await renderer.dispose();
}

async function promptMainAction(renderer, session) {
    // Check if any character can initiate an interaction (hasn't used their interact action)
    // and there's at least one other character to talk to
    const hasInteractionTargets = session.party.characters.some(c => !c.actionsUsed.interact) && 
        session.party.size >= 2;
    
    const options = [
        { id: 'play', shortcut: 'p', label: `Play Turn ${session.turnNumber}`, description: 'Advance to next turn' },
        { id: 'interact', shortcut: 'i', label: 'Talk', description: 'Have a character talk to another', disabled: !hasInteractionTargets },
        { id: 'inventory', shortcut: 'u', label: 'Use Item', description: 'Use food, medical, or equip weapon' },
        { id: 'status', shortcut: 's', label: 'View Status', description: 'See party and inventory details' },
        { id: 'quit', shortcut: 'q', label: 'Quit Game', description: 'Exit the game' }
    ];
    
    return await renderer.promptChoice('What would you like to do?', options);
}

async function handleInventoryAction(renderer, session, engine) {
    await renderer.displayInventory(session.party.inventory);
    
    if (session.party.inventory.isEmpty()) {
        await renderer.displayEvent('Your inventory is empty.', { type: 'info' });
        return;
    }

    const categories = session.party.inventory.getItemsByCategory();
    const itemOptions = [];
    
    for (const item of categories.food) {
        itemOptions.push({ id: `food:${item.name}`, label: `🍗 ${item.name} x${item.quantity}`, description: 'Feed a character' });
    }
    for (const item of categories.medical) {
        itemOptions.push({ id: `medical:${item.name}`, label: `🩹 ${item.name} x${item.quantity}`, description: 'Heal a character' });
    }
    for (const item of categories.weapons) {
        itemOptions.push({ id: `weapon:${item.name}`, label: `⚔ ${item.name} x${item.quantity}`, description: 'Equip on a character' });
    }
    itemOptions.push({ id: 'cancel', label: '← Back', description: 'Return to main menu' });

    const choice = await renderer.promptChoice('Select item to use:', itemOptions);
    
    if (choice === 'cancel') return;
    
    const [type, itemName] = choice.split(':');
    
    // Select character - filter to those who haven't used this action type
    const eligibleCharacters = session.party.characters.filter(c => {
        if (type === 'food') return !c.actionsUsed.food;
        if (type === 'medical') return !c.actionsUsed.medical;
        return true; // Weapons have no action limit
    });
    
    // Sort by most in need (lowest value first)
    if (type === 'food') {
        eligibleCharacters.sort((a, b) => a.hunger - b.hunger);
    } else if (type === 'medical') {
        eligibleCharacters.sort((a, b) => a.health - b.health);
    }
    
    if (eligibleCharacters.length === 0) {
        await renderer.displayEvent(`No characters can use ${type} this turn.`, { type: 'info' });
        return;
    }
    
    const characterOptions = eligibleCharacters.map(c => ({
        id: c.name,
        label: c.name,
        description: type === 'food' ? `Hunger: ${c.getHungerStatus()}` :
                     type === 'medical' ? `Health: ${c.getHealthStatus()}` :
                     `Current weapon: ${weapons[c.weapon][0]}`
    }));
    characterOptions.push({ id: 'cancel', label: '← Back', description: 'Return to item selection' });
    
    const targetName = await renderer.promptChoice(`Use ${itemName} on:`, characterOptions);
    
    if (targetName === 'cancel') return;
    
    const character = session.party.getCharacterByName(targetName);
    
    if (type === 'food') {
        await engine.useFood(character, itemName);
    } else if (type === 'medical') {
        await engine.useMedical(character, itemName);
    } else if (type === 'weapon') {
        await engine.equipWeapon(character, itemName);
    }
    
    await renderer.displayPartyStatusCompact(session.party.characters);
}

async function handleInteraction(renderer, session, engine) {
    // Get characters that can still interact
    const availableCharacters = session.party.characters.filter(c => !c.actionsUsed.interact);
    
    if (availableCharacters.length < 2) {
        await renderer.displayEvent('No characters available to interact this turn.', { type: 'info' });
        return;
    }

    // Select initiating character
    const initiatorOptions = availableCharacters.map(c => ({
        id: c.name,
        label: c.name,
        description: `Morale: ${c.getMoraleStatus()}`
    }));
    initiatorOptions.push({ id: 'cancel', label: '← Back', description: 'Return to main menu' });

    const initiatorName = await renderer.promptChoice('Who should talk?', initiatorOptions);
    if (initiatorName === 'cancel') return;
    
    const initiator = session.party.getCharacterByName(initiatorName);
    
    // Get valid targets
    const targets = engine.getInteractionTargets(initiator);
    if (targets.length === 0) {
        await renderer.displayEvent('No one is available to talk to.', { type: 'info' });
        return;
    }

    const targetOptions = targets.map(c => ({
        id: c.name,
        label: c.name,
        description: `Morale: ${c.getMoraleStatus()}`
    }));
    targetOptions.push({ id: 'cancel', label: '← Back', description: 'Return to main menu' });

    const targetName = await renderer.promptChoice(`Who should ${initiator.name} talk to?`, targetOptions);
    if (targetName === 'cancel') return;
    
    const target = session.party.getCharacterByName(targetName);
    
    await engine.interact(initiator, target);
    await renderer.displayPartyStatusCompact(session.party.characters);
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
    console.error('An error occurred:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('An error occurred:', error.message);
    process.exit(1);
});

main().catch(console.error);
