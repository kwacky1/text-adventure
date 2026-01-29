/**
 * Tests for Seasonal Events system
 * Tests Halloween, Christmas, New Year events and the seasonal framework
 */

import { context } from '../the-wanderers/scripts/game-state.js';
import { Character } from '../the-wanderers/scripts/character.js';
import Party, { Inventory } from '../the-wanderers/scripts/party.js';
import { 
    checkSeasonalEvents, 
    isHalloween, 
    getHalloweenZombieDescription,
    SEASONAL_EVENTS,
    resetSeasonalEvents
} from '../the-wanderers/scripts/src/seasonal-events.js';

// Mock DOM-accessing methods
Party.prototype.updateCampsiteImage = jest.fn();
Character.prototype.createCharacter = jest.fn();
Character.prototype.updateCharacter = jest.fn();
Inventory.prototype.updateDisplay = jest.fn();

// Mock UI functions
jest.mock('../the-wanderers/scripts/src/ui.js', () => ({
    addEvent: jest.fn(),
    updateStatBars: jest.fn(),
    updateFoodButtons: jest.fn(),
    updateButtons: jest.fn(),
}));

// Mock inventory functions
jest.mock('../the-wanderers/scripts/src/inventory.js', () => ({
    addItemToInventory: jest.fn(),
}));

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('Seasonal Events System', () => {
    let testParty;
    let testCharacter;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        resetSeasonalEvents();
        
        // Create test party
        testParty = new Party();
        testCharacter = new Character('TestHero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 0, 1, 1990);
        testParty.addCharacter(testCharacter);
        context.gameParty = testParty;
    });

    describe('SEASONAL_EVENTS configuration', () => {
        it('should have Halloween configured for October 31', () => {
            expect(SEASONAL_EVENTS.halloween).toBeDefined();
            expect(SEASONAL_EVENTS.halloween.month).toBe(9); // October (0-indexed)
            expect(SEASONAL_EVENTS.halloween.day).toBe(31);
        });

        it('should have Christmas configured for December 25', () => {
            expect(SEASONAL_EVENTS.christmas).toBeDefined();
            expect(SEASONAL_EVENTS.christmas.month).toBe(11); // December
            expect(SEASONAL_EVENTS.christmas.day).toBe(25);
        });

        it('should have New Year configured for January 1', () => {
            expect(SEASONAL_EVENTS.newYear).toBeDefined();
            expect(SEASONAL_EVENTS.newYear.month).toBe(0); // January
            expect(SEASONAL_EVENTS.newYear.day).toBe(1);
        });
    });

    describe('isHalloween', () => {
        it('should return true on October 31', () => {
            context.currentDate = new Date(2026, 9, 31); // October 31, 2026
            expect(isHalloween()).toBe(true);
        });

        it('should return false on other dates', () => {
            context.currentDate = new Date(2026, 9, 30); // October 30
            expect(isHalloween()).toBe(false);

            context.currentDate = new Date(2026, 0, 24); // January 24
            expect(isHalloween()).toBe(false);
        });
    });

    describe('getHalloweenZombieDescription', () => {
        it('should return a string description', () => {
            const description = getHalloweenZombieDescription();
            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);
        });

        it('should contain costume-related content', () => {
            // Get multiple descriptions to ensure we're testing the array
            const descriptions = [];
            for (let i = 0; i < 20; i++) {
                descriptions.push(getHalloweenZombieDescription());
            }
            
            // At least one should mention costumes or Halloween themes
            const hasHalloweenTheme = descriptions.some(desc => 
                desc.toLowerCase().includes('costume') ||
                desc.toLowerCase().includes('vampire') ||
                desc.toLowerCase().includes('witch') ||
                desc.toLowerCase().includes('pumpkin') ||
                desc.toLowerCase().includes('skeleton') ||
                desc.toLowerCase().includes('mummy')
            );
            expect(hasHalloweenTheme).toBe(true);
        });
    });

    describe('checkSeasonalEvents', () => {
        const { addEvent } = require('../the-wanderers/scripts/src/ui.js');

        it('should trigger Halloween event on October 31', () => {
            context.currentDate = new Date(2026, 9, 31);
            
            checkSeasonalEvents();
            
            expect(addEvent).toHaveBeenCalledWith(expect.stringContaining('Halloween'));
        });

        it('should trigger Christmas event on December 25', () => {
            context.currentDate = new Date(2026, 11, 25);
            
            checkSeasonalEvents();
            
            expect(addEvent).toHaveBeenCalledWith(expect.stringContaining('Christmas'));
        });

        it('should trigger New Year event on January 1', () => {
            context.currentDate = new Date(2027, 0, 1);
            
            checkSeasonalEvents();
            
            expect(addEvent).toHaveBeenCalledWith(expect.stringContaining('New Year'));
        });

        it('should not trigger events on regular days', () => {
            context.currentDate = new Date(2026, 5, 15); // June 15
            
            checkSeasonalEvents();
            
            expect(addEvent).not.toHaveBeenCalled();
        });

        it('should not trigger the same event twice in one year', () => {
            context.currentDate = new Date(2026, 9, 31);
            
            checkSeasonalEvents();
            const firstCallCount = addEvent.mock.calls.length;
            
            // Call again on same date
            checkSeasonalEvents();
            
            // Should not have added more calls
            expect(addEvent.mock.calls.length).toBe(firstCallCount);
        });

        it('should reset events for a new year', () => {
            context.currentDate = new Date(2026, 9, 31);
            checkSeasonalEvents();
            const firstYearCallCount = addEvent.mock.calls.length;
            
            // Move to next year's Halloween
            context.currentDate = new Date(2027, 9, 31);
            checkSeasonalEvents();
            
            // Should have triggered again
            expect(addEvent.mock.calls.length).toBeGreaterThan(firstYearCallCount);
        });
    });

    describe('Halloween event effects', () => {
        const { addEvent } = require('../the-wanderers/scripts/src/ui.js');
        const { addItemToInventory } = require('../the-wanderers/scripts/src/inventory.js');

        beforeEach(() => {
            context.currentDate = new Date(2026, 9, 31);
        });

        it('should give candy to party members', () => {
            checkSeasonalEvents();
            
            // Should have called addItemToInventory (for candy/dessert)
            expect(addItemToInventory).toHaveBeenCalled();
        });

        it('should boost morale for party members', () => {
            const initialMorale = testCharacter.morale;
            
            checkSeasonalEvents();
            
            expect(testCharacter.morale).toBeGreaterThan(initialMorale);
        });

        it('should announce spooky atmosphere', () => {
            checkSeasonalEvents();
            
            expect(addEvent).toHaveBeenCalledWith(expect.stringContaining('spooky'));
        });
    });

    describe('Christmas event effects', () => {
        beforeEach(() => {
            context.currentDate = new Date(2026, 11, 25);
        });

        it('should boost morale for party members', () => {
            const initialMorale = testCharacter.morale;
            
            checkSeasonalEvents();
            
            expect(testCharacter.morale).toBeGreaterThan(initialMorale);
        });
    });

    describe('New Year event effects', () => {
        beforeEach(() => {
            context.currentDate = new Date(2027, 0, 1);
        });

        it('should boost morale for party members', () => {
            const initialMorale = testCharacter.morale;
            
            checkSeasonalEvents();
            
            expect(testCharacter.morale).toBeGreaterThan(initialMorale);
        });
    });
});
