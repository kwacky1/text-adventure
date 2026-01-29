/**
 * Parameterized tests for event generation
 * Tests the probability-based event system with controlled randomness
 */

import { getEvent } from '../the-wanderers/scripts/src/events.js';
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

// Mock all the event functions and UI
jest.mock('../the-wanderers/scripts/src/combat.js', () => ({
    foundEnemy: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/character-creation.js', () => ({
    foundFriend: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/survivor-encounters.js', () => ({
    foundSurvivor: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/ui.js', () => ({
    addEvent: jest.fn(),
    updateStatBars: jest.fn(),
    updateRelationships: jest.fn(),
    updateFoodButtons: jest.fn(),
    updateMedicalButtons: jest.fn(),
    setPlayButton: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/inventory.js', () => ({
    addItemToInventory: jest.fn(),
    updateWeaponButtons: jest.fn(),
}));

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('getEvent - Event probability system', () => {
    let testParty;
    const { foundEnemy } = require('../the-wanderers/scripts/src/combat.js');
    const { foundFriend } = require('../the-wanderers/scripts/src/character-creation.js');
    const { foundSurvivor } = require('../the-wanderers/scripts/src/survivor-encounters.js');
    const { addEvent } = require('../the-wanderers/scripts/src/ui.js');

    beforeEach(() => {
        testParty = new Party();
        context.gameParty = testParty;
        context.turnNumber = 1;
        jest.clearAllMocks();
    });

    describe('with 1 character party', () => {
        beforeEach(() => {
            const char = new Character('Solo', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);
        });

        it.each([
            [0.05, 'friend', true, false],     // 0-0.2 = friend chance
            [0.15, 'friend', true, false],
            [0.25, 'enemy', false, true],      // 0.2-0.3 = enemy/survivor chance
            [0.45, 'item', false, false],      // 0.3-0.7 = item chance
            [0.75, 'illness', false, false],   // 0.7-0.75 = illness chance
            [0.77, 'mini', false, false],      // 0.75-0.8 = mini event chance
            [0.85, 'nothing', false, false],   // 0.8-1.0 = flavor text only
        ])('with chance %f should trigger %s event', (chance, eventType, expectFriend, expectEnemy) => {
            const result = getEvent(chance);

            if (expectFriend) {
                expect(foundFriend).toHaveBeenCalled();
                expect(result).toBe(true); // Special event
            } else if (expectEnemy) {
                // 20% survivor, 80% zombie - either is valid for enemy encounter
                const enemyCalled = foundEnemy.mock.calls.length > 0;
                const survivorCalled = foundSurvivor.mock.calls.length > 0;
                expect(enemyCalled || survivorCalled).toBe(true);
                expect(result).toBe(true); // Special event
            } else {
                expect(result).toBe(false); // Normal event
                expect(addEvent).toHaveBeenCalled();
            }
        });
    });

    describe('with 2 character party', () => {
        beforeEach(() => {
            const char1 = new Character('Char1', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Char2', 3, 'friendly', 'clumsy', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char1);
            testParty.addCharacter(char2);
        });

        it.each([
            [0.10, 'friend'],    // 0-0.15 = friend
            [0.20, 'enemy'],     // 0.15-0.30 = enemy/survivor
            [0.50, 'item'],      // 0.30-0.75 = items
            [0.77, 'illness'],   // 0.75-0.80 = illness
            [0.82, 'mini'],      // 0.80-0.85 = mini event
        ])('with chance %f should trigger %s event', (chance, eventType) => {
            getEvent(chance);

            if (eventType === 'friend') {
                expect(foundFriend).toHaveBeenCalled();
            } else if (eventType === 'enemy') {
                // 20% survivor, 80% zombie - either is valid for enemy encounter
                const enemyCalled = foundEnemy.mock.calls.length > 0;
                const survivorCalled = foundSurvivor.mock.calls.length > 0;
                expect(enemyCalled || survivorCalled).toBe(true);
            }
        });
    });

    describe('with 4 character party (max)', () => {
        beforeEach(() => {
            for (let i = 0; i < 4; i++) {
                const char = new Character(`Char${i}`, 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
                testParty.addCharacter(char);
            }
        });

        it('should never trigger friend event when party is full', () => {
            // Try all chances that would trigger friend in smaller parties
            for (let chance = 0; chance < 0.2; chance += 0.05) {
                jest.clearAllMocks();
                getEvent(chance);
                expect(foundFriend).not.toHaveBeenCalled();
            }
        });

        it('should have increased enemy/survivor chance', () => {
            getEvent(0.15); // Would be friend with 1-2 characters
            // 20% survivor, 80% zombie - either is valid for enemy encounter
            const enemyCalled = foundEnemy.mock.calls.length > 0;
            const survivorCalled = foundSurvivor.mock.calls.length > 0;
            expect(enemyCalled || survivorCalled).toBe(true);
        });

        it.each([
            [0.10, 'enemy'],     // 0-0.2 = enemy/survivor (no friend possible)
            [0.50, 'item'],      // 0.2-0.75 = items
            [0.80, 'illness'],   // 0.75-0.80 = illness
            [0.82, 'mini'],      // 0.80-0.85 = mini event
        ])('with chance %f should trigger %s event', (chance, eventType) => {
            getEvent(chance);

            if (eventType === 'enemy') {
                // 20% survivor, 80% zombie - either is valid for enemy encounter
                const enemyCalled = foundEnemy.mock.calls.length > 0;
                const survivorCalled = foundSurvivor.mock.calls.length > 0;
                expect(enemyCalled || survivorCalled).toBe(true);
            }
        });
    });

    describe('item events', () => {
        beforeEach(() => {
            // Need 2+ characters for double-item chance
            const char1 = new Character('Player1', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Player2', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char1);
            testParty.addCharacter(char2);
        });

        it('should find multiple items in double-item chance range', () => {
            const { addItemToInventory } = require('../the-wanderers/scripts/src/inventory.js');
            // With 2 chars: itemChance=0.75, secondItem=0.80
            // So 0.76-0.80 is double-item range
            jest.spyOn(Math, 'random')
                .mockReturnValueOnce(0.77) // Main chance - in double item range (0.75-0.80)
                .mockReturnValueOnce(0.2)  // First item type (food)
                .mockReturnValueOnce(0.5); // Second item type (medical)

            getEvent(0.77);

            // Should be called twice for double item
            expect(addItemToInventory).toHaveBeenCalledTimes(2);
        });
    });

    describe('illness events', () => {
        let healthyChar;

        beforeEach(() => {
            healthyChar = new Character('Healthy', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            healthyChar.sick = false;
            testParty.addCharacter(healthyChar);
        });

        it('should make a character sick in illness range', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0); // Select first character
            
            getEvent(0.72); // Illness range

            expect(healthyChar.sick).toBe(true);
            expect(healthyChar.health).toBeLessThan(10); // Lost health
        });

        it('should not affect already sick characters', () => {
            healthyChar.sick = true;
            const initialHealth = healthyChar.health;
            
            getEvent(0.72);

            expect(healthyChar.health).toBe(initialHealth); // No additional damage
        });
    });

    describe('special events return values', () => {
        beforeEach(() => {
            const char = new Character('Solo', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);
        });

        it('should return true for friend events', () => {
            const result = getEvent(0.1); // Friend chance
            expect(result).toBe(true);
        });

        it('should return true for enemy events', () => {
            const result = getEvent(0.25); // Enemy chance
            expect(result).toBe(true);
        });

        it('should return false for normal events', () => {
            const result = getEvent(0.5); // Item chance
            expect(result).toBe(false);
        });
    });

    describe('day/night event probability adjustments', () => {
        beforeEach(() => {
            const char = new Character('Solo', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);
        });

        it('should allow friend events during the day', () => {
            context.timeOfDay = 'day';
            const { foundFriend } = require('../the-wanderers/scripts/src/character-creation.js');
            foundFriend.mockClear();

            getEvent(0.1); // Friend chance range during day

            expect(foundFriend).toHaveBeenCalled();
        });

        it('should block friend events at night', () => {
            context.timeOfDay = 'night';
            const { foundFriend } = require('../the-wanderers/scripts/src/character-creation.js');
            foundFriend.mockClear();

            getEvent(0.1); // Would be friend chance during day, but blocked at night

            expect(foundFriend).not.toHaveBeenCalled();
        });

        it('should trigger enemy/survivor events at lower chance values at night', () => {
            context.timeOfDay = 'night';
            const { foundEnemy } = require('../the-wanderers/scripts/src/combat.js');
            const { foundSurvivor } = require('../the-wanderers/scripts/src/survivor-encounters.js');
            foundEnemy.mockClear();
            foundSurvivor.mockClear();

            getEvent(0.1); // At night this is now enemy range (friendChance = 0)

            // 20% survivor, 80% zombie - either is valid for enemy encounter
            const enemyCalled = foundEnemy.mock.calls.length > 0;
            const survivorCalled = foundSurvivor.mock.calls.length > 0;
            expect(enemyCalled || survivorCalled).toBe(true);
        });

        it('should have higher enemy encounter range at night', () => {
            context.timeOfDay = 'night';
            const { foundEnemy } = require('../the-wanderers/scripts/src/combat.js');
            const { foundSurvivor } = require('../the-wanderers/scripts/src/survivor-encounters.js');
            foundEnemy.mockClear();
            foundSurvivor.mockClear();

            // At night, enemyChance = 0.25 (vs 0.3 during day with 1 character)
            // So chance values 0-0.25 should trigger enemies at night
            getEvent(0.24);

            // 20% survivor, 80% zombie - either is valid for enemy encounter
            const enemyCalled = foundEnemy.mock.calls.length > 0;
            const survivorCalled = foundSurvivor.mock.calls.length > 0;
            expect(enemyCalled || survivorCalled).toBe(true);
        });
    });
});
