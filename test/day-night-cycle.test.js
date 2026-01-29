/**
 * Tests for Day/Night Cycle System (#67)
 * Tests timeOfDay state, day counter, event probabilities, and action limits
 */

import { playTurn } from '../the-wanderers/scripts/game.js';
import { context } from '../the-wanderers/scripts/game-state.js';
import { Character } from '../the-wanderers/scripts/character.js';
import Party, { Inventory } from '../the-wanderers/scripts/party.js';
import { getEvent } from '../the-wanderers/scripts/src/events.js';

// Mock all DOM-accessing methods
Party.prototype.updateCampsiteImage = jest.fn();
Party.prototype.removeCharacter = function(character) {
    const index = this.characters.indexOf(character);
    if (index !== -1) {
        this.characters.splice(index, 1);
        for (const remainingCharacter of this.characters) {
            remainingCharacter.relationships.delete(character);
        }
    }
};
Character.prototype.createCharacter = jest.fn();
Character.prototype.updateCharacter = jest.fn();
Inventory.prototype.updateDisplay = jest.fn();

// Mock UI functions
jest.mock('../the-wanderers/scripts/src/ui.js', () => ({
    addEvent: jest.fn(),
    updateStatBars: jest.fn(),
    updateRelationships: jest.fn(),
    updateFoodButtons: jest.fn(),
    updateMedicalButtons: jest.fn(),
    updateInteractionButtons: jest.fn(),
    checkPartyAlerts: jest.fn(),
    setPlayButton: jest.fn(),
}));

// Mock combat and character-creation to control event flow
jest.mock('../the-wanderers/scripts/src/combat.js', () => ({
    foundEnemy: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/character-creation.js', () => ({
    createCharacterForm: jest.fn(),
    foundFriend: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/survivor-encounters.js', () => ({
    foundSurvivor: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/inventory.js', () => ({
    addItemToInventory: jest.fn(),
    updateWeaponButtons: jest.fn(),
}));

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('Day/Night Cycle System', () => {
    let testParty;
    let mockDOM;

    beforeEach(() => {
        // Setup DOM mock
        mockDOM = {
            currentEvent: { textContent: 'Previous event' },
            events: { 
                children: [null, {}],
                insertBefore: jest.fn() 
            },
            day: { textContent: '' },
            playButton: { 
                textContent: 'Play Turn 1',
                style: { display: 'block' }
            },
            buttons: { remove: jest.fn() },
            partyInventory: { remove: jest.fn() },
            eventImage: { remove: jest.fn() },
        };

        global.document = {
            getElementById: jest.fn((id) => {
                const map = {
                    'currentEvent': mockDOM.currentEvent,
                    'events': mockDOM.events,
                    'day': mockDOM.day,
                    'playButton': mockDOM.playButton,
                    'buttons': mockDOM.buttons,
                    'partyInventory': mockDOM.partyInventory,
                    'eventImage': mockDOM.eventImage,
                };
                return map[id] || null;
            }),
            createElement: jest.fn(() => ({
                textContent: '',
                id: '',
                classList: { add: jest.fn() },
            })),
        };

        // Reset game state
        testParty = new Party();
        context.gameParty = testParty;
        context.turnNumber = 1;
        context.dayNumber = 1;
        context.timeOfDay = 'day';
        // Reset to mid-month to avoid end-of-month rollover issues
        context.currentDate = new Date(2025, 5, 15); // June 15, 2025
        jest.clearAllMocks();
    });

    describe('timeOfDay toggling', () => {
        it('should start as day', () => {
            expect(context.timeOfDay).toBe('day');
        });

        it('should toggle from day to night after first turn', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            playTurn();

            expect(context.timeOfDay).toBe('night');
        });

        it('should toggle from night to day after second turn', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            playTurn(); // day -> night
            playTurn(); // night -> day

            expect(context.timeOfDay).toBe('day');
        });

        it('should alternate correctly over multiple turns', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 10 });

            expect(context.timeOfDay).toBe('day');
            playTurn();
            expect(context.timeOfDay).toBe('night');
            playTurn();
            expect(context.timeOfDay).toBe('day');
            playTurn();
            expect(context.timeOfDay).toBe('night');
            playTurn();
            expect(context.timeOfDay).toBe('day');
        });
    });

    describe('Date advancement', () => {
        it('should advance date after night turn (night -> day)', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            const initialDate = context.currentDate.getDate();
            playTurn(); // day -> night (same date)
            playTurn(); // night -> day (next date)

            expect(context.currentDate.getDate()).toBe(initialDate + 1);
        });

        it('should display correct day/time in UI', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 10 });

            // Turn 1: displays "Day (date)" at start, then toggles to night
            playTurn();
            expect(mockDOM.day.textContent).toMatch(/^Day \(/); // Shows "Day (date)"

            // Turn 2: displays "Night (date)" at start, then toggles to day
            playTurn();
            expect(mockDOM.day.textContent).toMatch(/^Night \(/);

            // Turn 3: displays "Day (date)" at start (next day)
            playTurn();
            expect(mockDOM.day.textContent).toMatch(/^Day \(/);
        });
    });

    describe('Night event probability adjustments', () => {
        const { foundFriend } = require('../the-wanderers/scripts/src/character-creation.js');
        const { foundEnemy } = require('../the-wanderers/scripts/src/combat.js');

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should block friend events at night (chance = 0.1)', () => {
            context.timeOfDay = 'night';
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);

            // Chance 0.1 would normally trigger friend event during day
            getEvent(0.1);

            expect(foundFriend).not.toHaveBeenCalled();
        });

        it('should allow friend events during day (chance = 0.1)', () => {
            context.timeOfDay = 'day';
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);

            // Chance 0.1 should trigger friend event during day
            getEvent(0.1);

            expect(foundFriend).toHaveBeenCalled();
        });

        it('should have higher enemy encounter chance at night', () => {
            context.timeOfDay = 'night';
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            const { foundSurvivor } = require('../the-wanderers/scripts/src/survivor-encounters.js');
            foundSurvivor.mockClear();

            // At night, enemyChance starts at 0 (no friends) and goes to 0.25
            // So chance 0.15 should trigger enemy/survivor during night
            getEvent(0.15);

            // 20% survivor, 80% zombie - either is valid
            const enemyCalled = foundEnemy.mock.calls.length > 0;
            const survivorCalled = foundSurvivor.mock.calls.length > 0;
            expect(enemyCalled || survivorCalled).toBe(true);
        });

        it('should not trigger zombie at same chance during day', () => {
            context.timeOfDay = 'day';
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);

            // At day with 1 character, friendChance is 0.2, enemyChance is 0.3
            // So chance 0.15 should trigger friend, not zombie
            getEvent(0.15);

            expect(foundEnemy).not.toHaveBeenCalled();
            expect(foundFriend).toHaveBeenCalled();
        });
    });

    describe('Character action limits', () => {
        it('should initialize actionsUsed with all false', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            expect(character.actionsUsed).toEqual({
                food: false,
                medical: false,
                interact: false
            });
        });

        it('should track food action used', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            character.actionsUsed.food = true;

            expect(character.actionsUsed.food).toBe(true);
            expect(character.actionsUsed.medical).toBe(false);
            expect(character.actionsUsed.interact).toBe(false);
        });

        it('should track medical action used', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            character.actionsUsed.medical = true;

            expect(character.actionsUsed.food).toBe(false);
            expect(character.actionsUsed.medical).toBe(true);
            expect(character.actionsUsed.interact).toBe(false);
        });

        it('should track interact action used', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            character.actionsUsed.interact = true;

            expect(character.actionsUsed.food).toBe(false);
            expect(character.actionsUsed.medical).toBe(false);
            expect(character.actionsUsed.interact).toBe(true);
        });

        it('should allow all actions to be used in same turn', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            character.actionsUsed.food = true;
            character.actionsUsed.medical = true;
            character.actionsUsed.interact = true;

            expect(character.actionsUsed).toEqual({
                food: true,
                medical: true,
                interact: true
            });
        });
    });

    describe('Action reset between turns', () => {
        it('should reset all actions via resetActions()', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            character.actionsUsed.food = true;
            character.actionsUsed.medical = true;
            character.actionsUsed.interact = true;

            character.resetActions();

            expect(character.actionsUsed).toEqual({
                food: false,
                medical: false,
                interact: false
            });
        });

        it('should reset character actions at start of turn', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            // Use all actions
            character.actionsUsed.food = true;
            character.actionsUsed.medical = true;
            character.actionsUsed.interact = true;

            // Play a turn
            playTurn();

            // Actions should be reset
            expect(character.actionsUsed).toEqual({
                food: false,
                medical: false,
                interact: false
            });
        });

        it('should reset all party members actions at start of turn', () => {
            const char1 = new Character('Hero1', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Hero2', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char1);
            testParty.addCharacter(char2);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 10 });

            // Use all actions for both characters
            char1.actionsUsed.food = true;
            char1.actionsUsed.medical = true;
            char2.actionsUsed.interact = true;

            // Play a turn
            playTurn();

            // Both characters' actions should be reset
            expect(char1.actionsUsed).toEqual({
                food: false,
                medical: false,
                interact: false
            });
            expect(char2.actionsUsed).toEqual({
                food: false,
                medical: false,
                interact: false
            });
        });
    });

    describe('Combined day/night and action system', () => {
        it('should reset actions at each time period change', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 10 });

            // Day 1 - Day
            character.actionsUsed.food = true;
            playTurn(); // becomes night
            expect(character.actionsUsed.food).toBe(false);

            // Day 1 - Night
            character.actionsUsed.medical = true;
            playTurn(); // becomes day
            expect(character.actionsUsed.medical).toBe(false);
        });

        it('should maintain turn count correctly', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 20 });

            playTurn();
            playTurn();
            playTurn();
            playTurn();

            expect(context.turnNumber).toBe(5); // Started at 1, played 4 turns
        });
    });
});
