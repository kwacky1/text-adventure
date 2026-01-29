/**
 * Example integration test for complete game flow
 * Tests critical user journeys end-to-end
 */

import { playTurn } from '../the-wanderers/scripts/game.js';
import { context } from '../the-wanderers/scripts/game-state.js';
import { Character } from '../the-wanderers/scripts/character.js';
import Party, { Inventory } from '../the-wanderers/scripts/party.js';

// Mock all DOM-accessing methods to prevent errors
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

// Mock all event functions to control flow
jest.mock('../the-wanderers/scripts/src/events.js', () => ({
    getEvent: jest.fn().mockReturnValue(false), // Returns false = no special event
    handleDeathEffects: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/character-creation.js', () => ({
    createCharacterForm: jest.fn(),
    foundFriend: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/ui.js', () => ({
    addEvent: jest.fn(),
    updateStatBars: jest.fn(),
    updateRelationships: jest.fn(),
    updateButtons: jest.fn(),
    updateFoodButtons: jest.fn(),
    updateMedicalButtons: jest.fn(),
    updateInteractionButtons: jest.fn(),
    checkPartyAlerts: jest.fn(),
    setPlayButton: jest.fn(),
    handleGameOver: jest.fn(),
}));

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('Integration Tests - Game Flow', () => {
    let testParty;
    let mockDOM;

    beforeEach(() => {
        // Setup comprehensive DOM mock
        mockDOM = {
            currentEvent: { textContent: 'Previous event' },
            events: { 
                children: [null, {}], // Index 1 exists for insertBefore
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

        // Setup game state
        testParty = new Party();
        context.gameParty = testParty;
        context.turnNumber = 1;
        context.dayNumber = 1;
        context.timeOfDay = 'day';
        jest.clearAllMocks();
    });

    describe('Normal turn progression', () => {
        it('should progress through multiple turns successfully', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 }); // Ensure they can eat

            // Play 3 turns
            for (let i = 0; i < 3; i++) {
                playTurn();
            }

            expect(context.turnNumber).toBe(4); // Started at 1, played 3 turns
            expect(character.health).toBeGreaterThan(0); // Still alive
        });

        it('should update day counter each turn', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            playTurn();

            expect(mockDOM.day.textContent).toMatch(/^Day \(/); // Shows "Day (date)" format
        });

        it('should move previous events to history', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            playTurn();

            expect(mockDOM.events.insertBefore).toHaveBeenCalled();
        });
    });

    describe('Character death scenarios', () => {
        it('should handle death by starvation', () => {
            const character = new Character('Starving', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            character.hunger = 0; // Will fail hunger check
            testParty.addCharacter(character);

            const initialPartySize = testParty.characters.length;
            playTurn();

            expect(testParty.characters.length).toBe(initialPartySize - 1);
        });

        it('should end game when all characters die', () => {
            const character = new Character('LastHope', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            character.hunger = 0; // Will die
            testParty.addCharacter(character);

            playTurn();

            expect(testParty.characters.length).toBe(0);
            expect(mockDOM.buttons.remove).toHaveBeenCalled(); // Game over
        });
    });

    describe('Character abandonment', () => {
        it('should remove character when morale reaches 0', () => {
            const character1 = new Character('Depressed', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const character2 = new Character('Happy', 2, 'optimistic', 'hungry', 'skin', 'hair', 'shirt');
            
            character1.morale = 0;
            testParty.addCharacter(character1);
            testParty.addCharacter(character2);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            const initialSize = testParty.characters.length;
            playTurn();

            expect(testParty.characters.length).toBe(initialSize - 1);
            expect(testParty.characters.includes(character1)).toBe(false);
        });
    });

    describe('Play button management', () => {
        const { setPlayButton } = require('../the-wanderers/scripts/src/ui.js');
        const { getEvent } = require('../the-wanderers/scripts/src/events.js');

        it('should hide button at start of turn', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            playTurn();

            expect(setPlayButton).toHaveBeenCalledWith('hide');
        });

        it('should show button after normal event', () => {
            getEvent.mockReturnValue(false); // Normal event
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            playTurn();

            expect(setPlayButton).toHaveBeenCalledWith('show');
        });

        it('should not show button after special event (combat/friend)', () => {
            getEvent.mockReturnValue(true); // Special event
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            playTurn();

            // setPlayButton should be called with 'hide' but not 'show'
            const showCalls = setPlayButton.mock.calls.filter(call => call[0] === 'show');
            expect(showCalls.length).toBe(0);
        });

        it('should update button text with next turn number', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            playTurn();

            expect(mockDOM.playButton.textContent).toContain('Turn 2');
        });
    });

    describe('Inventory management', () => {
        it('should decrease hunger each turn when not eating', () => {
            const character = new Character('Hungry', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            
            const initialHunger = character.hunger;
            playTurn();

            // Hunger decreases each turn (characters get hungrier)
            expect(character.hunger).toBeLessThan(initialHunger);
        });

        it('should update inventory display after turn', () => {
            const character = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 5 });

            const updateDisplaySpy = jest.spyOn(testParty.inventory, 'updateDisplay');
            playTurn();

            expect(updateDisplaySpy).toHaveBeenCalled();
        });
    });

    describe('Multi-character interactions', () => {
        it('should handle relationships between characters', () => {
            const char1 = new Character('Char1', 2, 'friendly', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Char2', 2, 'friendly', 'hungry', 'skin', 'hair', 'shirt');
            
            testParty.addCharacter(char1);
            testParty.addCharacter(char2);
            testParty.inventory.inventoryMap.set('canned goods', { name: 'canned goods', value: 2, quantity: 10 });

            expect(char1.relationships.has(char2)).toBe(true);
            expect(char2.relationships.has(char1)).toBe(true);
        });
    });
});
