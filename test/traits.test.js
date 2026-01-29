/**
 * Unit tests for trait event handlers
 * These test pure logic with controlled randomness
 */

import { checkPosTraitEvents, checkNegTraitEvents } from '../the-wanderers/scripts/src/traits.js';
import { context } from '../the-wanderers/scripts/game-state.js';
import { Character, ageArray } from '../the-wanderers/scripts/character.js';
import Party, { Inventory } from '../the-wanderers/scripts/party.js';

// Mock all DOM-accessing methods to prevent errors
Party.prototype.updateCampsiteImage = jest.fn();
Party.prototype.removeCharacter = function(character) {
    // Keep array logic, skip DOM access
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

// Mock DOM and UI functions
jest.mock('../the-wanderers/scripts/src/ui.js', () => ({
    addEvent: jest.fn(),
    updateStatBars: jest.fn(),
    updateRelationships: jest.fn(),
    updateMedicalButtons: jest.fn(),
    updateFoodButtons: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/events.js', () => ({
    handleDeathEffects: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/character-creation.js', () => ({
    createCharacterForm: jest.fn(),
    foundFriend: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/inventory.js', () => ({
    addItemToInventory: jest.fn(),
}));

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('Positive Trait Events', () => {
    let testParty;
    let character;
    let mockRandom;

    beforeEach(() => {
        // Setup mock party and character
        testParty = new Party();
        context.gameParty = testParty;
        context.turnNumber = 1;
        
        character = new Character('TestChar', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
        testParty.addCharacter(character);

        // Mock Math.random
        mockRandom = jest.spyOn(global.Math, 'random');
    });

    afterEach(() => {
        mockRandom.mockRestore();
        jest.clearAllMocks();
    });

    describe('resilient trait', () => {
        beforeEach(() => {
            character.posTrait = 'resilient';
            character.health = 5;
        });

        it('should heal character when lucky (roll < 0.1)', () => {
            mockRandom.mockReturnValue(0.05); // Lucky roll
            
            checkPosTraitEvents(character);
            
            expect(character.health).toBe(6);
        });

        it('should not heal character when unlucky (roll >= 0.1)', () => {
            mockRandom.mockReturnValue(0.15); // Unlucky roll
            
            checkPosTraitEvents(character);
            
            expect(character.health).toBe(5);
        });
    });

    describe('scavenger trait', () => {
        it('should find food when lucky', () => {
            const { addItemToInventory } = require('../the-wanderers/scripts/src/inventory.js');
            character.posTrait = 'scavenger';
            mockRandom.mockReturnValue(0.05); // Lucky roll
            
            checkPosTraitEvents(character);
            
            expect(addItemToInventory).toHaveBeenCalled();
        });

        it('should not find food when unlucky', () => {
            const { addItemToInventory } = require('../the-wanderers/scripts/src/inventory.js');
            character.posTrait = 'scavenger';
            mockRandom.mockReturnValue(0.15); // Unlucky roll
            
            checkPosTraitEvents(character);
            
            expect(addItemToInventory).not.toHaveBeenCalled();
        });
    });

    describe('optimistic trait', () => {
        beforeEach(() => {
            character.posTrait = 'optimistic';
        });

        it('should increase morale when lucky', () => {
            character.morale = 5;
            mockRandom.mockReturnValue(0.05); // Lucky roll
            
            checkPosTraitEvents(character);
            
            expect(character.morale).toBe(6);
        });

        it('should boost morale when very low (< 2)', () => {
            character.morale = 1;
            mockRandom.mockReturnValue(0.95); // Unlucky roll for random event
            
            checkPosTraitEvents(character);
            
            expect(character.morale).toBe(3); // +2 boost
        });

        it('should not affect morale when unlucky and not low', () => {
            character.morale = 5;
            mockRandom.mockReturnValue(0.95); // Unlucky roll
            
            checkPosTraitEvents(character);
            
            expect(character.morale).toBe(5);
        });
    });
});

describe('Negative Trait Events', () => {
    let testParty;
    let character;
    let mockRandom;

    beforeEach(() => {
        testParty = new Party();
        context.gameParty = testParty;
        context.turnNumber = 1;
        
        character = new Character('TestChar', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
        testParty.addCharacter(character);

        mockRandom = jest.spyOn(global.Math, 'random');
    });

    afterEach(() => {
        mockRandom.mockRestore();
        jest.clearAllMocks();
    });

    describe('hungry trait', () => {
        beforeEach(() => {
            character.negTrait = 'hungry';
            character.hunger = 5;
        });

        it('should increase hunger on even turns', () => {
            context.turnNumber = 2; // Even turn
            
            checkNegTraitEvents(character);
            
            expect(character.hunger).toBe(4.5);
        });

        it('should not increase hunger on odd turns', () => {
            context.turnNumber = 1; // Odd turn
            
            checkNegTraitEvents(character);
            
            expect(character.hunger).toBe(5);
        });
    });

    describe('depressed trait', () => {
        beforeEach(() => {
            character.negTrait = 'depressed';
        });

        it('should decrease morale randomly', () => {
            character.morale = 5;
            mockRandom.mockReturnValue(0.05); // Triggers event
            
            checkNegTraitEvents(character);
            
            expect(character.morale).toBe(4);
        });

        it('should cap morale at 7 (good)', () => {
            character.morale = 9;
            mockRandom.mockReturnValue(0.95); // Doesn't trigger random event
            
            checkNegTraitEvents(character);
            
            expect(character.morale).toBe(7); // Capped down by 2
        });
    });

    describe('clumsy trait', () => {
        beforeEach(() => {
            character.negTrait = 'clumsy';
            character.health = 5;
        });

        it('should damage character when unlucky', () => {
            mockRandom.mockReturnValue(0.05); // Triggers event
            
            checkNegTraitEvents(character);
            
            expect(character.health).toBe(4);
        });

        it('should not damage character when lucky', () => {
            mockRandom.mockReturnValue(0.15); // Doesn't trigger
            
            checkNegTraitEvents(character);
            
            expect(character.health).toBe(5);
        });

        it('should trigger death effects when health reaches 0', () => {
            const { handleDeathEffects } = require('../the-wanderers/scripts/src/events.js');
            character.health = 1;
            mockRandom.mockReturnValue(0.05); // Triggers damage
            
            checkNegTraitEvents(character);
            
            expect(character.health).toBe(0);
            expect(handleDeathEffects).toHaveBeenCalledWith(character);
        });
    });

    describe('hypochondriac trait', () => {
        beforeEach(() => {
            character.negTrait = 'hypochondriac';
            // Setup inventory with medical items
            testParty.inventory.inventoryMap.set('bandage', { name: 'bandage', value: 2, quantity: 2 });
        });

        it('should waste medical item when unlucky', () => {
            const { updateMedicalButtons } = require('../the-wanderers/scripts/src/ui.js');
            mockRandom.mockReturnValue(0.05); // Triggers event
            
            checkNegTraitEvents(character);
            
            expect(testParty.inventory.inventoryMap.get('bandage').quantity).toBe(1);
            expect(updateMedicalButtons).toHaveBeenCalled();
        });

        it('should not waste item when lucky', () => {
            mockRandom.mockReturnValue(0.15); // Doesn't trigger
            
            checkNegTraitEvents(character);
            
            expect(testParty.inventory.inventoryMap.get('bandage').quantity).toBe(2);
        });
    });
});
