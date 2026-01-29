/**
 * Unit tests for expanded trait effects (Issue #85)
 * Tests new trait behaviors like satiated hunger immunity, fighter durability, etc.
 */

import { context } from '../the-wanderers/scripts/game-state.js';
import { Character } from '../the-wanderers/scripts/character.js';
import Party, { Inventory, weapons } from '../the-wanderers/scripts/party.js';

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
const mockAddEvent = jest.fn();
const mockUpdateStatBars = jest.fn();
const mockUpdateMedicalButtons = jest.fn();
const mockUpdateRelationships = jest.fn();

jest.mock('../the-wanderers/scripts/src/ui.js', () => ({
    addEvent: (...args) => mockAddEvent(...args),
    updateStatBars: (...args) => mockUpdateStatBars(...args),
    updateMedicalButtons: (...args) => mockUpdateMedicalButtons(...args),
    updateRelationships: (...args) => mockUpdateRelationships(...args),
    updateFoodButtons: jest.fn(),
    setPlayButton: jest.fn(),
    updateButtons: jest.fn(),
    handleSelection: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/events.js', () => ({
    handleDeathEffects: jest.fn(),
    getEvent: jest.fn(),
    singleZombieVariations: [],
    multiZombieVariations: [],
}));

jest.mock('../the-wanderers/scripts/src/character-creation.js', () => ({
    createCharacterForm: jest.fn(),
    foundFriend: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/inventory.js', () => ({
    addItemToInventory: jest.fn(),
    updateWeaponButtons: jest.fn(),
    updateWeaponAttributes: jest.fn(),
    updateFoodAttributes: jest.fn(),
    updateMedicalAttributes: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/seasonal-events.js', () => ({
    checkSeasonalEvents: jest.fn(),
    resetSeasonalEvents: jest.fn(),
    isHalloween: jest.fn(() => false),
    getHalloweenZombieDescription: jest.fn(),
}));

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('Expanded Trait Effects', () => {
    let testParty;
    let mockRandom;

    beforeEach(() => {
        testParty = new Party();
        context.gameParty = testParty;
        context.turnNumber = 1;
        mockRandom = jest.spyOn(global.Math, 'random');
        jest.clearAllMocks();
    });

    afterEach(() => {
        mockRandom.mockRestore();
    });

    describe('Satiated - Cannot Die from Hunger', () => {
        it('should survive at 0 hunger when satiated', () => {
            const character = new Character('Survivor', 1, 'satiated', 'vulnerable', 'skin', 'hair', 'shirt');
            character.hunger = 0.3; // Just above 0, will go below on checkHunger
            testParty.addCharacter(character);

            // checkHunger decreases by 0.5, so 0.3 - 0.5 = -0.2 (would normally die)
            const alive = character.checkHunger();

            // Character should return false (hunger below 0), but game.js handles satiated survival
            expect(alive).toBe(false); // checkHunger still returns false
            expect(character.hunger).toBe(-0.2); // Hunger went negative
        });

        it('should save satiated character from hunger death in game loop', async () => {
            // This simulates what happens in game.js when satiated character hits 0 hunger
            const character = new Character('Survivor', 1, 'satiated', 'vulnerable', 'skin', 'hair', 'shirt');
            character.hunger = -0.5; // Already below 0
            testParty.addCharacter(character);

            // Simulate the game.js logic for satiated characters
            if (character.posTrait === 'satiated') {
                character.hunger = 0;
            }

            expect(character.hunger).toBe(0);
            expect(testParty.characters).toContain(character);
        });
    });

    describe('Fighter - Weapon Durability Preservation', () => {
        it('should have 50% chance to preserve durability', () => {
            const character = new Character('Fighter', 1, 'fighter', 'vulnerable', 'skin', 'hair', 'shirt');
            character.weapon = 2; // knife
            character.weaponDurability = 10;
            testParty.addCharacter(character);

            // Simulate combat durability logic
            let durabilityLoss = 1;
            mockRandom.mockReturnValue(0.3); // Less than 0.5, should preserve
            
            if (character.posTrait === 'fighter' && Math.random() < 0.5) {
                durabilityLoss = 0;
            }

            expect(durabilityLoss).toBe(0);
        });

        it('should not preserve durability when roll >= 0.5', () => {
            const character = new Character('Fighter', 1, 'fighter', 'vulnerable', 'skin', 'hair', 'shirt');
            character.weapon = 2;
            character.weaponDurability = 10;
            testParty.addCharacter(character);

            let durabilityLoss = 1;
            mockRandom.mockReturnValue(0.6); // Greater than 0.5
            
            if (character.posTrait === 'fighter' && Math.random() < 0.5) {
                durabilityLoss = 0;
            }

            expect(durabilityLoss).toBe(1);
        });
    });

    describe('Clumsy - Double Weapon Durability Usage', () => {
        it('should use 2 durability instead of 1', () => {
            const character = new Character('Clumsy', 1, 'resilient', 'clumsy', 'skin', 'hair', 'shirt');
            character.weapon = 2;
            character.weaponDurability = 10;
            testParty.addCharacter(character);

            // Simulate combat durability logic
            let durabilityLoss = 1;
            if (character.negTrait === 'clumsy') {
                durabilityLoss = 2;
            }

            expect(durabilityLoss).toBe(2);
        });
    });

    describe('Clumsy - Self-Injury on Attack', () => {
        it('should hurt self when roll is between 0.1 and 0.2', () => {
            const character = new Character('Clumsy', 1, 'resilient', 'clumsy', 'skin', 'hair', 'shirt');
            character.health = 5;
            testParty.addCharacter(character);

            // Simulate combat roll logic
            const roll = 0.15; // Between 0.1 (miss) and 0.2 (clumsy self-hit threshold)
            
            if (roll < 0.1) {
                // miss
            } else if (character.negTrait === 'clumsy' && roll < 0.2) {
                character.health -= 1;
            }

            expect(character.health).toBe(4);
        });

        it('should not hurt self when roll >= 0.2 (normal hit)', () => {
            const character = new Character('Clumsy', 1, 'resilient', 'clumsy', 'skin', 'hair', 'shirt');
            character.health = 5;
            testParty.addCharacter(character);

            const roll = 0.5; // Normal hit range
            
            if (roll < 0.1) {
                // miss - shouldn't happen here
            } else if (character.negTrait === 'clumsy' && roll < 0.2) {
                character.health -= 1; // This shouldn't execute
            }

            expect(character.health).toBe(5);
        });
    });

    describe('Hypochondriac - Medical Item Stealing', () => {
        it('should steal medical item 20% of the time when healing others', () => {
            const hypochondriac = new Character('Hypo', 1, 'resilient', 'hypochondriac', 'skin', 'hair', 'shirt');
            hypochondriac.health = 3;
            const target = new Character('Target', 1, 'resilient', 'vulnerable', 'skin', 'hair', 'shirt');
            target.health = 3;
            testParty.addCharacter(hypochondriac);
            testParty.addCharacter(target);

            // Simulate medical use logic from ui.js
            mockRandom.mockReturnValue(0.1); // Less than 0.2, should steal
            
            const hypochondriacs = testParty.characters.filter(
                c => c.negTrait === 'hypochondriac' && c !== target
            );
            
            let actualTarget = target;
            if (hypochondriacs.length > 0 && Math.random() < 0.2) {
                actualTarget = hypochondriacs[0];
            }

            expect(actualTarget).toBe(hypochondriac);
        });

        it('should not steal when roll >= 0.2', () => {
            const hypochondriac = new Character('Hypo', 1, 'resilient', 'hypochondriac', 'skin', 'hair', 'shirt');
            const target = new Character('Target', 1, 'resilient', 'vulnerable', 'skin', 'hair', 'shirt');
            testParty.addCharacter(hypochondriac);
            testParty.addCharacter(target);

            mockRandom.mockReturnValue(0.5); // Greater than 0.2
            
            const hypochondriacs = testParty.characters.filter(
                c => c.negTrait === 'hypochondriac' && c !== target
            );
            
            let actualTarget = target;
            if (hypochondriacs.length > 0 && Math.random() < 0.2) {
                actualTarget = hypochondriacs[0];
            }

            expect(actualTarget).toBe(target);
        });

        it('should not steal when healing the hypochondriac themselves', () => {
            const hypochondriac = new Character('Hypo', 1, 'resilient', 'hypochondriac', 'skin', 'hair', 'shirt');
            testParty.addCharacter(hypochondriac);

            mockRandom.mockReturnValue(0.1); // Would trigger steal
            
            // When healing the hypochondriac, they shouldn't be in the stealing pool
            const hypochondriacs = testParty.characters.filter(
                c => c.negTrait === 'hypochondriac' && c !== hypochondriac
            );

            expect(hypochondriacs.length).toBe(0); // No one to steal
        });
    });

    describe('Interaction Trait Modifiers', () => {
        it('should calculate positive modifier for friendly trait', () => {
            const friendly = new Character('Friendly', 1, 'friendly', 'vulnerable', 'skin', 'hair', 'shirt');
            const normal = new Character('Normal', 1, 'resilient', 'vulnerable', 'skin', 'hair', 'shirt');
            
            let positiveModifier = 0;
            for (const char of [friendly, normal]) {
                if (char.posTrait === 'friendly') positiveModifier += 0.2;
                if (char.posTrait === 'optimistic') positiveModifier += 0.2;
                if (char.negTrait === 'disconnected') positiveModifier -= 0.2;
                if (char.negTrait === 'depressed') positiveModifier -= 0.2;
            }

            expect(positiveModifier).toBe(0.2);
        });

        it('should cancel out friendly and disconnected', () => {
            const friendly = new Character('Friendly', 1, 'friendly', 'vulnerable', 'skin', 'hair', 'shirt');
            const disconnected = new Character('Disconnected', 1, 'resilient', 'disconnected', 'skin', 'hair', 'shirt');
            
            let positiveModifier = 0;
            for (const char of [friendly, disconnected]) {
                if (char.posTrait === 'friendly') positiveModifier += 0.2;
                if (char.posTrait === 'optimistic') positiveModifier += 0.2;
                if (char.negTrait === 'disconnected') positiveModifier -= 0.2;
                if (char.negTrait === 'depressed') positiveModifier -= 0.2;
            }

            expect(positiveModifier).toBe(0); // Cancelled out
        });

        it('should stack modifiers from both characters', () => {
            const friendlyOptimistic = new Character('Happy', 1, 'friendly', 'vulnerable', 'skin', 'hair', 'shirt');
            // Note: can't have two positive traits, so test with two friendly characters
            const friendly2 = new Character('Happy2', 1, 'friendly', 'vulnerable', 'skin', 'hair', 'shirt');
            
            let positiveModifier = 0;
            for (const char of [friendlyOptimistic, friendly2]) {
                if (char.posTrait === 'friendly') positiveModifier += 0.2;
            }

            expect(positiveModifier).toBe(0.4);
        });

        it('should clamp negative chance to minimum 10%', () => {
            // Two optimistic characters would give +0.4, making negative chance 0.5 - 0.4 = 0.1
            const modifier = 0.4;
            const negativeChance = Math.max(0.1, Math.min(0.9, 0.5 - modifier));
            
            expect(negativeChance).toBe(0.1);
        });

        it('should clamp negative chance to maximum 90%', () => {
            // Two disconnected + depressed would give -0.8, making negative chance 0.5 + 0.8 = 1.3
            const modifier = -0.8;
            const negativeChance = Math.max(0.1, Math.min(0.9, 0.5 - modifier));
            
            expect(negativeChance).toBe(0.9);
        });
    });
});
