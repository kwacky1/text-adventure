/**
 * Tests for Character class
 * Tests character creation, attribute management, and hunger mechanics
 */

import { Character, hungerArray, moraleArray, healthArray, ageArray } from '../the-wanderers/scripts/character.js';
import Party, { Inventory } from '../the-wanderers/scripts/party.js';
import { context } from '../the-wanderers/scripts/game-state.js';

// Mock DOM-accessing methods
Party.prototype.updateCampsiteImage = jest.fn();
Character.prototype.createCharacter = jest.fn();
Character.prototype.updateCharacter = jest.fn();
Inventory.prototype.updateDisplay = jest.fn();

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

// Set up a consistent date for testing
const mockDate = new Date(2026, 0, 24); // January 24, 2026
context.currentDate = mockDate;

describe('Character Class', () => {
    describe('Constructor', () => {
        it('should create character with correct initial values', () => {
            const char = new Character('TestHero', 1, 'resilient', 'hungry', 'skin.png', 'hair.png', 'shirt.png');

            expect(char.name).toBe('TestHero');
            expect(char.age).toBe(1);
            expect(char.posTrait).toBe('resilient');
            expect(char.negTrait).toBe('hungry');
            expect(char.skin).toBe('skin.png');
            expect(char.hair).toBe('hair.png');
            expect(char.shirt).toBe('shirt.png');
        });

        it('should set default stat values', () => {
            const char = new Character('TestHero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            expect(char.id).toBe(0);
            expect(char.morale).toBe(6);
            expect(char.hunger).toBe(9);
            expect(char.health).toBe(9);
            expect(char.sick).toBe(false);
            expect(char.infected).toBe(false);
            expect(char.weapon).toBe(0);
            expect(char.weaponDurability).toBe(100);
        });

        it('should initialize empty relationships map', () => {
            const char = new Character('TestHero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            expect(char.relationships).toBeInstanceOf(Map);
            expect(char.relationships.size).toBe(0);
        });

        it('should initialize actionsUsed with all false', () => {
            const char = new Character('TestHero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            expect(char.actionsUsed).toEqual({ food: false, medical: false, interact: false });
        });
    });

    describe('resetActions', () => {
        it('should reset all actions to false', () => {
            const char = new Character('TestHero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            char.actionsUsed = { food: true, medical: true, interact: true };

            char.resetActions();

            expect(char.actionsUsed).toEqual({ food: false, medical: false, interact: false });
        });

        it('should reset only used actions', () => {
            const char = new Character('TestHero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            char.actionsUsed = { food: true, medical: false, interact: true };

            char.resetActions();

            expect(char.actionsUsed.food).toBe(false);
            expect(char.actionsUsed.medical).toBe(false);
            expect(char.actionsUsed.interact).toBe(false);
        });
    });

    describe('checkHunger', () => {
        let character;

        beforeEach(() => {
            character = new Character('Hungry', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            // Override the mock to allow testing the actual logic
            character.updateCharacter = jest.fn();
        });

        it('should decrease hunger by 0.5 each call', () => {
            character.hunger = 9;
            character.checkHunger();
            expect(character.hunger).toBe(8.5);

            character.checkHunger();
            expect(character.hunger).toBe(8);
        });

        it('should return true when character survives', () => {
            character.hunger = 5;
            const result = character.checkHunger();
            expect(result).toBe(true);
        });

        it('should return false when hunger drops below 0', () => {
            character.hunger = 0.25;
            const result = character.checkHunger();
            expect(result).toBe(false);
            expect(character.hunger).toBe(-0.25);
        });

        it('should call updateCharacter when surviving', () => {
            character.hunger = 5;
            character.checkHunger();
            expect(character.updateCharacter).toHaveBeenCalled();
        });

        it('should not call updateCharacter when dying', () => {
            character.hunger = 0;
            character.checkHunger();
            expect(character.updateCharacter).not.toHaveBeenCalled();
        });

        it('should take 18 hunger checks to starve from full', () => {
            character.hunger = 9;
            let checks = 0;
            while (character.checkHunger()) {
                checks++;
            }
            expect(checks).toBe(18); // 9 / 0.5 = 18 checks
        });
    });

    describe('capAttributes', () => {
        let character;

        beforeEach(() => {
            character = new Character('TestHero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
        });

        describe('morale capping', () => {
            it('should cap morale at maximum (9)', () => {
                character.morale = 15;
                character.capAttributes();
                expect(character.morale).toBe(moraleArray.length - 1);
            });

            it('should cap morale at minimum (0)', () => {
                character.morale = -5;
                character.capAttributes();
                expect(character.morale).toBe(0);
            });

            it('should not change valid morale values', () => {
                character.morale = 5;
                character.capAttributes();
                expect(character.morale).toBe(5);
            });
        });

        describe('hunger capping', () => {
            it('should cap hunger at maximum (9)', () => {
                character.hunger = 15;
                character.capAttributes();
                expect(character.hunger).toBe(hungerArray.length - 1);
            });

            it('should not change valid hunger values', () => {
                character.hunger = 5;
                character.capAttributes();
                expect(character.hunger).toBe(5);
            });
        });

        describe('health capping', () => {
            it('should cap health at maximum (9)', () => {
                character.health = 15;
                character.capAttributes();
                expect(character.health).toBe(9);
            });

            it('should cap health at minimum (0)', () => {
                character.health = -5;
                character.capAttributes();
                expect(character.health).toBe(0);
            });

            it('should not change valid health values', () => {
                character.health = 5;
                character.capAttributes();
                expect(character.health).toBe(5);
            });
        });

        describe('edge cases', () => {
            it('should handle all attributes at maximum', () => {
                character.morale = 100;
                character.hunger = 100;
                character.health = 100;
                character.capAttributes();

                expect(character.morale).toBe(9);
                expect(character.hunger).toBe(9);
                expect(character.health).toBe(9);
            });

            it('should handle all attributes at minimum', () => {
                character.morale = -100;
                character.hunger = -100;
                character.health = -100;
                character.capAttributes();

                expect(character.morale).toBe(0);
                // Note: hunger has no minimum cap in the code
                expect(character.health).toBe(0);
            });

            it('should handle boundary values exactly', () => {
                character.morale = 9;
                character.hunger = 9;
                character.health = 9;
                character.capAttributes();

                expect(character.morale).toBe(9);
                expect(character.hunger).toBe(9);
                expect(character.health).toBe(9);
            });
        });
    });

    describe('Status Arrays', () => {
        describe('hungerArray', () => {
            it('should have 10 entries', () => {
                expect(hungerArray.length).toBe(10);
            });

            it('should map indices to correct status', () => {
                expect(hungerArray[0]).toBe('near death');
                expect(hungerArray[4]).toBe('hungry');
                expect(hungerArray[9]).toBe('full');
            });
        });

        describe('moraleArray', () => {
            it('should have 10 entries', () => {
                expect(moraleArray.length).toBe(10);
            });

            it('should map indices to correct status', () => {
                expect(moraleArray[0]).toBe('terrible');
                expect(moraleArray[4]).toBe('ok');
                expect(moraleArray[9]).toBe('excellent');
            });
        });

        describe('healthArray', () => {
            it('should have 10 entries', () => {
                expect(healthArray.length).toBe(10);
            });

            it('should map indices to correct status', () => {
                expect(healthArray[0]).toBe('near death');
                expect(healthArray[4]).toBe('badly injured');
                expect(healthArray[9]).toBe('fine');
            });
        });

        describe('ageArray', () => {
            it('should have 3 entries', () => {
                expect(ageArray.length).toBe(3);
            });

            it('should contain all age groups', () => {
                expect(ageArray).toContain('teen');
                expect(ageArray).toContain('adult');
                expect(ageArray).toContain('elder');
            });
        });
    });

    describe('Relationships', () => {
        let char1, char2;

        beforeEach(() => {
            char1 = new Character('Char1', 1, 'friendly', 'hungry', 'skin', 'hair', 'shirt');
            char2 = new Character('Char2', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
        });

        it('should be able to set relationships', () => {
            char1.relationships.set(char2, 1);
            expect(char1.relationships.has(char2)).toBe(true);
            expect(char1.relationships.get(char2)).toBe(1);
        });

        it('should track multiple relationships', () => {
            const char3 = new Character('Char3', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            char1.relationships.set(char2, 2);
            char1.relationships.set(char3, 0);

            expect(char1.relationships.size).toBe(2);
            expect(char1.relationships.get(char2)).toBe(2);
            expect(char1.relationships.get(char3)).toBe(0);
        });

        it('should be able to delete relationships', () => {
            char1.relationships.set(char2, 1);
            char1.relationships.delete(char2);
            expect(char1.relationships.has(char2)).toBe(false);
        });
    });

    describe('Weapon management', () => {
        let character;

        beforeEach(() => {
            character = new Character('Fighter', 1, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
        });

        it('should start with fists (weapon 0)', () => {
            expect(character.weapon).toBe(0);
        });

        it('should start with 100 durability', () => {
            expect(character.weaponDurability).toBe(100);
        });

        it('should be able to change weapon', () => {
            character.weapon = 2;
            expect(character.weapon).toBe(2);
        });

        it('should be able to change durability', () => {
            character.weaponDurability = 50;
            expect(character.weaponDurability).toBe(50);
        });
    });

    describe('Status effects', () => {
        let character;

        beforeEach(() => {
            character = new Character('Patient', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
        });

        it('should start not sick', () => {
            expect(character.sick).toBe(false);
        });

        it('should start not infected', () => {
            expect(character.infected).toBe(false);
        });

        it('should be able to become sick', () => {
            character.sick = true;
            expect(character.sick).toBe(true);
        });

        it('should be able to become infected', () => {
            character.infected = true;
            expect(character.infected).toBe(true);
        });

        it('should be able to recover from sickness', () => {
            character.sick = true;
            character.sick = false;
            expect(character.sick).toBe(false);
        });
    });

    describe('Trait combinations', () => {
        it.each([
            ['resilient', 'hungry'],
            ['friendly', 'disconnected'],
            ['scavenger', 'clumsy'],
            ['fighter', 'vulnerable'],
            ['satiated', 'depressed'],
        ])('should accept trait combination: %s + %s', (posTrait, negTrait) => {
            const char = new Character('Test', 1, posTrait, negTrait, 'skin', 'hair', 'shirt');
            expect(char.posTrait).toBe(posTrait);
            expect(char.negTrait).toBe(negTrait);
        });
    });

    describe('Age values', () => {
        it.each([
            [0, 'teen'],
            [1, 'adult'],
            [2, 'elder'],
        ])('should display correct age for index %i: %s', (ageIndex, expectedAge) => {
            const char = new Character('Test', ageIndex, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            expect(ageArray[char.age]).toBe(expectedAge);
        });
    });

    describe('Birthday System', () => {
        describe('Constructor with birthday', () => {
            it('should accept explicit birthday values', () => {
                const char = new Character('BdayTest', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 5, 15, 1990);
                expect(char.birthMonth).toBe(5);
                expect(char.birthDay).toBe(15);
                expect(char.birthYear).toBe(1990);
            });

            it('should generate random birthday when not provided', () => {
                const char = new Character('RandomBday', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
                expect(char.birthMonth).toBeGreaterThanOrEqual(0);
                expect(char.birthMonth).toBeLessThan(12);
                expect(char.birthDay).toBeGreaterThanOrEqual(1);
                expect(char.birthDay).toBeLessThanOrEqual(28);
                expect(char.birthYear).toBeDefined();
            });
        });

        describe('getActualAge', () => {
            it('should calculate correct age', () => {
                // Born Jan 1, 1996 - should be 30 on Jan 24, 2026
                const char = new Character('AgeTest', 0, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 0, 1, 1996);
                expect(char.getActualAge()).toBe(30);
            });

            it('should not count birthday if not yet occurred this year', () => {
                // Born Dec 31, 1996 - should still be 29 on Jan 24, 2026
                const char = new Character('AgeTest', 0, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 11, 31, 1996);
                expect(char.getActualAge()).toBe(29);
            });
        });

        describe('getAgeCategory', () => {
            it('should return 0 (teen) for ages 0-30', () => {
                const char = new Character('Teen', 0, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 0, 1, 2000);
                expect(char.getAgeCategory()).toBe(0);
            });

            it('should return 1 (adult) for ages 31-60', () => {
                const char = new Character('Adult', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 0, 1, 1980);
                expect(char.getAgeCategory()).toBe(1);
            });

            it('should return 2 (elder) for ages 61+', () => {
                const char = new Character('Elder', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 0, 1, 1960);
                expect(char.getAgeCategory()).toBe(2);
            });
        });

        describe('isBirthday', () => {
            it('should return true on birthday', () => {
                // mockDate is Jan 24, 2026
                const char = new Character('BdayToday', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 0, 24, 1990);
                expect(char.isBirthday()).toBe(true);
            });

            it('should return false when not birthday', () => {
                const char = new Character('NoBday', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 5, 15, 1990);
                expect(char.isBirthday()).toBe(false);
            });
        });

        describe('getBirthdayString', () => {
            it('should format birthday correctly', () => {
                const char = new Character('BdayFormat', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 5, 15, 1990);
                expect(char.getBirthdayString()).toBe('Jun 15');
            });

            it('should handle January correctly', () => {
                const char = new Character('JanBday', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 0, 1, 1990);
                expect(char.getBirthdayString()).toBe('Jan 1');
            });

            it('should handle December correctly', () => {
                const char = new Character('DecBday', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt', 11, 25, 1990);
                expect(char.getBirthdayString()).toBe('Dec 25');
            });
        });

        describe('Age category generation', () => {
            it('should generate teen age for category 0', () => {
                const char = new Character('Teen', 0, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
                const actualAge = char.getActualAge();
                expect(actualAge).toBeGreaterThanOrEqual(13);
                expect(actualAge).toBeLessThanOrEqual(30);
            });

            it('should generate adult age for category 1', () => {
                const char = new Character('Adult', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
                const actualAge = char.getActualAge();
                expect(actualAge).toBeGreaterThanOrEqual(31);
                expect(actualAge).toBeLessThanOrEqual(60);
            });

            it('should generate elder age for category 2', () => {
                const char = new Character('Elder', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
                const actualAge = char.getActualAge();
                expect(actualAge).toBeGreaterThanOrEqual(61);
                expect(actualAge).toBeLessThanOrEqual(80);
            });
        });
    });
});
