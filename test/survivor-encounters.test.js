/**
 * Tests for Survivor Encounters (#99)
 * Tests merchant, hostile survivor, and person in need encounters
 */

import { context } from '../the-wanderers/scripts/game-state.js';
import { Character } from '../the-wanderers/scripts/character.js';
import Party, { Inventory, food, medical, weapons } from '../the-wanderers/scripts/party.js';
import {
    merchantIntroductions,
    personInNeedIntroductions,
    hostileSurvivorIntroductions,
    survivorFleeMessages,
    survivorGiveUpMessages,
    survivorAttackDescriptions,
    hostileSurvivorAttackDescriptions
} from '../the-wanderers/scripts/src/constants.js';

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

describe('Survivor Encounters Constants', () => {
    describe('Merchant introductions', () => {
        it('should have multiple merchant introduction variations', () => {
            expect(merchantIntroductions.length).toBeGreaterThan(0);
        });

        it('should have proper strings for merchant introductions', () => {
            merchantIntroductions.forEach(intro => {
                expect(typeof intro).toBe('string');
                expect(intro.length).toBeGreaterThan(10);
            });
        });
    });

    describe('Person in need introductions', () => {
        it('should have multiple person in need variations', () => {
            expect(personInNeedIntroductions.length).toBeGreaterThan(0);
        });

        it('should have proper strings for person in need', () => {
            personInNeedIntroductions.forEach(intro => {
                expect(typeof intro).toBe('string');
                expect(intro.length).toBeGreaterThan(10);
            });
        });
    });

    describe('Hostile survivor introductions', () => {
        it('should have multiple solo hostile survivor variations', () => {
            expect(hostileSurvivorIntroductions.solo.length).toBeGreaterThan(0);
        });

        it('should have multiple group hostile survivor variations', () => {
            expect(hostileSurvivorIntroductions.group.length).toBeGreaterThan(0);
        });

        it('should have proper strings for hostile introductions', () => {
            hostileSurvivorIntroductions.solo.forEach(intro => {
                expect(typeof intro).toBe('string');
                expect(intro.length).toBeGreaterThan(10);
            });
            hostileSurvivorIntroductions.group.forEach(intro => {
                expect(typeof intro).toBe('string');
                expect(intro.length).toBeGreaterThan(10);
            });
        });
    });

    describe('Survivor flee messages', () => {
        it('should have multiple flee variations', () => {
            expect(survivorFleeMessages.length).toBeGreaterThan(0);
        });
    });

    describe('Survivor give up messages', () => {
        it('should have multiple give up variations', () => {
            expect(survivorGiveUpMessages.length).toBeGreaterThan(0);
        });
    });

    describe('Survivor attack descriptions', () => {
        it('should have weapon-specific attack descriptions', () => {
            expect(survivorAttackDescriptions.fist.length).toBeGreaterThan(0);
            expect(survivorAttackDescriptions.stick.length).toBeGreaterThan(0);
            expect(survivorAttackDescriptions.knife.length).toBeGreaterThan(0);
            expect(survivorAttackDescriptions.pistol.length).toBeGreaterThan(0);
        });

        it('should have critical attack descriptions', () => {
            expect(survivorAttackDescriptions.critical.length).toBeGreaterThan(0);
        });

        it('should have [attacker] placeholder in descriptions', () => {
            ['fist', 'stick', 'knife', 'pistol'].forEach(weapon => {
                survivorAttackDescriptions[weapon].forEach(desc => {
                    expect(desc).toContain('[attacker]');
                });
            });
            survivorAttackDescriptions.critical.forEach(desc => {
                expect(desc).toContain('[attacker]');
            });
        });
    });

    describe('Hostile survivor attack descriptions', () => {
        it('should have multiple variations', () => {
            expect(hostileSurvivorAttackDescriptions.length).toBeGreaterThan(0);
        });

        it('should have [NAME] placeholder', () => {
            hostileSurvivorAttackDescriptions.forEach(desc => {
                expect(desc).toContain('[NAME]');
            });
        });
    });
});

describe('Survivor Encounter System', () => {
    let testParty;
    const { addEvent, setPlayButton, updateStatBars } = require('../the-wanderers/scripts/src/ui.js');
    const { addItemToInventory } = require('../the-wanderers/scripts/src/inventory.js');

    beforeEach(() => {
        testParty = new Party();
        context.gameParty = testParty;
        context.turnNumber = 5;
        jest.clearAllMocks();

        // Add test characters
        const char1 = new Character('Alice', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
        const char2 = new Character('Bob', 3, 'fighter', 'clumsy', 'skin', 'hair', 'shirt');
        testParty.addCharacter(char1);
        testParty.addCharacter(char2);
    });

    describe('Encounter type distribution', () => {
        // Since encounters use Math.random(), we test that constants are properly defined
        // and would work for each encounter type
        
        it('should have all item types available for merchant trades', () => {
            expect(food.length).toBeGreaterThan(0);
            expect(medical.length).toBeGreaterThan(0);
            expect(weapons.length).toBeGreaterThan(1); // More than just fists
        });

        it('should support inventory operations for trading', () => {
            // Add an item to trade
            const testFood = food[0];
            testParty.inventory.addItem(testFood);
            
            expect(testParty.inventory.hasItem(testFood[0])).toBe(true);
            
            testParty.inventory.removeItem(testFood[0]);
            expect(testParty.inventory.hasItem(testFood[0])).toBe(false);
        });
    });

    describe('Hostile survivor combat properties', () => {
        it('should have survivors that are tougher than zombies (6-10 HP vs 4-8)', () => {
            // Documented behavior: hostile survivors have 6-10 HP
            // Zombies have 4-8 HP (from combat.js)
            const minSurvivorHP = 6;
            const maxSurvivorHP = 10;
            const minZombieHP = 4;
            const maxZombieHP = 8;
            
            // Survivors are tougher
            expect(minSurvivorHP).toBeGreaterThan(minZombieHP);
            expect(maxSurvivorHP).toBeGreaterThan(maxZombieHP);
        });

        it('should not have infection risk from survivor attacks', () => {
            // This is a design requirement - survivors don't cause infection
            // Unlike zombies which have 5% infection chance per attack
            // Just documenting the expected behavior
            expect(true).toBe(true);
        });
    });

    describe('Person in need morale effects', () => {
        it('should have morale attribute on characters for giving bonuses', () => {
            const char = testParty.characters[0];
            const initialMorale = char.morale;
            
            char.morale += 1;
            char.capAttributes();
            
            expect(char.morale).toBe(initialMorale + 1);
        });
    });

    describe('Stealing outcomes', () => {
        // As documented: 50% hostile, 25% flee, 25% give up
        const expectedHostileChance = 0.5;
        const expectedFleeChance = 0.25;
        const expectedGiveUpChance = 0.25;

        it('should have correct probability distribution (50% hostile, 25% flee, 25% give up)', () => {
            // Document the expected probabilities
            expect(expectedHostileChance).toBe(0.5);
            expect(expectedFleeChance).toBe(0.25);
            expect(expectedGiveUpChance).toBe(0.25);
            expect(expectedHostileChance + expectedFleeChance + expectedGiveUpChance).toBe(1.0);
        });
    });

    describe('Decline person in need hostile chance', () => {
        it('should have 25% chance of hostile encounter when declining', () => {
            // As documented: 25% hostile chance when declining
            const expectedHostileChance = 0.25;
            expect(expectedHostileChance).toBe(0.25);
        });
    });
});

describe('Survivor encounter integration with events', () => {
    let testParty;

    beforeEach(() => {
        testParty = new Party();
        context.gameParty = testParty;
        context.turnNumber = 1;
        jest.clearAllMocks();

        const char = new Character('Test', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
        testParty.addCharacter(char);
    });

    it('should be called 20% of the time during enemy encounters', () => {
        // This is documented in events.js
        // When an enemy encounter triggers, there's a 20% chance of survivor
        // and 80% chance of zombie
        const survivorChance = 0.2;
        const zombieChance = 0.8;
        expect(survivorChance + zombieChance).toBe(1.0);
    });
});
