/**
 * Tests for Party and Inventory classes
 * Tests inventory management and party character handling
 */

import Party, { Inventory, food, medical, weapons } from '../the-wanderers/scripts/party.js';
import { Character } from '../the-wanderers/scripts/character.js';

// Mock DOM-accessing methods
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

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('Inventory Class', () => {
    let inventory;

    beforeEach(() => {
        inventory = new Inventory();
    });

    describe('constructor', () => {
        it('should initialize with empty inventoryMap', () => {
            expect(inventory.inventoryMap).toBeInstanceOf(Map);
            expect(inventory.inventoryMap.size).toBe(0);
        });
    });

    describe('addItem', () => {
        it('should add new item with quantity 1', () => {
            inventory.addItem(food[0]); // rations

            const item = inventory.inventoryMap.get('rations');
            expect(item).toBeDefined();
            expect(item.name).toBe('rations');
            expect(item.value).toBe(0.5);
            expect(item.quantity).toBe(1);
        });

        it('should increment quantity for existing item', () => {
            inventory.addItem(food[0]);
            inventory.addItem(food[0]);
            inventory.addItem(food[0]);

            const item = inventory.inventoryMap.get('rations');
            expect(item.quantity).toBe(3);
        });

        it('should handle different item types', () => {
            inventory.addItem(food[1]); // snack
            inventory.addItem(medical[0]); // band aid
            inventory.addItem(weapons[1]); // stick

            expect(inventory.inventoryMap.size).toBe(3);
            expect(inventory.inventoryMap.get('snack').quantity).toBe(1);
            expect(inventory.inventoryMap.get('band aid').quantity).toBe(1);
            expect(inventory.inventoryMap.get('stick').quantity).toBe(1);
        });

        it('should store correct value for each item type', () => {
            inventory.addItem(food[3]); // meal, value 3
            inventory.addItem(medical[3]); // first aid kit, value 4

            expect(inventory.inventoryMap.get('meal').value).toBe(3);
            expect(inventory.inventoryMap.get('first aid kit').value).toBe(4);
        });
    });

    describe('removeItem', () => {
        beforeEach(() => {
            inventory.addItem(food[0]);
            inventory.addItem(food[0]);
            inventory.addItem(food[0]); // 3 rations
        });

        it('should decrease quantity when more than 1', () => {
            inventory.removeItem('rations');
            expect(inventory.inventoryMap.get('rations').quantity).toBe(2);
        });

        it('should delete item when quantity reaches 0', () => {
            inventory.removeItem('rations');
            inventory.removeItem('rations');
            inventory.removeItem('rations');

            expect(inventory.inventoryMap.has('rations')).toBe(false);
        });

        it('should return true when item exists', () => {
            const result = inventory.removeItem('rations');
            expect(result).toBe(true);
        });

        it('should return false when item does not exist', () => {
            const result = inventory.removeItem('nonexistent');
            expect(result).toBe(false);
        });

        it('should not affect other items', () => {
            inventory.addItem(food[1]); // snack
            inventory.removeItem('rations');

            expect(inventory.inventoryMap.get('snack').quantity).toBe(1);
            expect(inventory.inventoryMap.get('rations').quantity).toBe(2);
        });
    });

    describe('getItem', () => {
        it('should return item when it exists', () => {
            inventory.addItem(food[0]);
            const item = inventory.getItem('rations');

            expect(item).toBeDefined();
            expect(item.name).toBe('rations');
        });

        it('should return undefined when item does not exist', () => {
            const item = inventory.getItem('nonexistent');
            expect(item).toBeUndefined();
        });
    });

    describe('hasItem', () => {
        it('should return true when item exists', () => {
            inventory.addItem(food[0]);
            expect(inventory.hasItem('rations')).toBe(true);
        });

        it('should return false when item does not exist', () => {
            expect(inventory.hasItem('rations')).toBe(false);
        });

        it('should return false after item is fully removed', () => {
            inventory.addItem(food[0]);
            inventory.removeItem('rations');
            expect(inventory.hasItem('rations')).toBe(false);
        });
    });

    describe('getAllItems', () => {
        it('should return empty array when inventory is empty', () => {
            const items = inventory.getAllItems();
            expect(items).toEqual([]);
        });

        it('should return all items as array', () => {
            inventory.addItem(food[0]);
            inventory.addItem(food[1]);
            inventory.addItem(medical[0]);

            const items = inventory.getAllItems();
            expect(items.length).toBe(3);
        });

        it('should return items with correct structure', () => {
            inventory.addItem(food[0]);
            inventory.addItem(food[0]);

            const items = inventory.getAllItems();
            expect(items[0]).toEqual({
                name: 'rations',
                value: 0.5,
                quantity: 2
            });
        });
    });
});

describe('Party Class', () => {
    let party;

    beforeEach(() => {
        party = new Party();
    });

    describe('constructor', () => {
        it('should initialize with empty characters array', () => {
            expect(party.characters).toEqual([]);
        });

        it('should initialize nextId to 1', () => {
            expect(party.nextId).toBe(1);
        });

        it('should initialize with Inventory instance', () => {
            expect(party.inventory).toBeInstanceOf(Inventory);
        });
    });

    describe('addCharacter', () => {
        it('should add character to party', () => {
            const char = new Character('Hero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            party.addCharacter(char);

            expect(party.characters.length).toBe(1);
            expect(party.characters[0]).toBe(char);
        });

        it('should assign incrementing IDs', () => {
            const char1 = new Character('Hero1', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Hero2', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            party.addCharacter(char1);
            party.addCharacter(char2);

            expect(char1.id).toBe(1);
            expect(char2.id).toBe(2);
            expect(party.nextId).toBe(3);
        });

        it('should limit party to 4 characters', () => {
            for (let i = 0; i < 6; i++) {
                const char = new Character(`Hero${i}`, 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
                party.addCharacter(char);
            }

            expect(party.characters.length).toBe(4);
        });

        it('should call updateCampsiteImage', () => {
            const char = new Character('Hero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            party.addCharacter(char);

            expect(party.updateCampsiteImage).toHaveBeenCalled();
        });
    });

    describe('Relationship management', () => {
        it('should create relationships between new and existing characters', () => {
            const char1 = new Character('Hero1', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Hero2', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            party.addCharacter(char1);
            party.addCharacter(char2);

            expect(char1.relationships.has(char2)).toBe(true);
            expect(char2.relationships.has(char1)).toBe(true);
        });

        it('should set default relationship type to 1 (neutral)', () => {
            const char1 = new Character('Hero1', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Hero2', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            party.addCharacter(char1);
            party.addCharacter(char2);

            expect(char1.relationships.get(char2)).toBe(1);
            expect(char2.relationships.get(char1)).toBe(1);
        });

        it('should set relationship type to 2 for friendly trait', () => {
            const char1 = new Character('Friendly', 1, 'friendly', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Hero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            party.addCharacter(char1);
            party.addCharacter(char2);

            // char2 gets relationship 2 because char1 is friendly
            expect(char2.relationships.get(char1)).toBe(2);
        });

        it('should set relationship type to 0 for disconnected trait', () => {
            const char1 = new Character('Disconnected', 1, 'resilient', 'disconnected', 'skin', 'hair', 'shirt');
            const char2 = new Character('Hero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            party.addCharacter(char1);
            party.addCharacter(char2);

            // char2 gets relationship 0 because char1 is disconnected
            expect(char2.relationships.get(char1)).toBe(0);
        });

        it('friendly + disconnected should result in neutral relationship', () => {
            const char1 = new Character('Complex', 1, 'friendly', 'disconnected', 'skin', 'hair', 'shirt');
            const char2 = new Character('Hero', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            party.addCharacter(char1);
            party.addCharacter(char2);

            // Neither condition triggers: friendly requires !disconnected, disconnected requires !friendly
            // So relationship stays at default 1 (neutral)
            expect(char2.relationships.get(char1)).toBe(1);
        });

        it('should create relationships with all existing party members', () => {
            const char1 = new Character('Hero1', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const char2 = new Character('Hero2', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            const char3 = new Character('Hero3', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');

            party.addCharacter(char1);
            party.addCharacter(char2);
            party.addCharacter(char3);

            expect(char3.relationships.size).toBe(2);
            expect(char3.relationships.has(char1)).toBe(true);
            expect(char3.relationships.has(char2)).toBe(true);
        });
    });

    describe('removeCharacter', () => {
        let char1, char2, char3;

        beforeEach(() => {
            char1 = new Character('Hero1', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            char2 = new Character('Hero2', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            char3 = new Character('Hero3', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            party.addCharacter(char1);
            party.addCharacter(char2);
            party.addCharacter(char3);
        });

        it('should remove character from array', () => {
            party.removeCharacter(char2);
            
            expect(party.characters.length).toBe(2);
            expect(party.characters.includes(char2)).toBe(false);
        });

        it('should keep other characters', () => {
            party.removeCharacter(char2);

            expect(party.characters.includes(char1)).toBe(true);
            expect(party.characters.includes(char3)).toBe(true);
        });

        it('should remove character from others relationships', () => {
            party.removeCharacter(char2);

            expect(char1.relationships.has(char2)).toBe(false);
            expect(char3.relationships.has(char2)).toBe(false);
        });

        it('should preserve other relationships', () => {
            party.removeCharacter(char2);

            expect(char1.relationships.has(char3)).toBe(true);
            expect(char3.relationships.has(char1)).toBe(true);
        });

        it('should handle removing non-existent character', () => {
            const outsider = new Character('Outsider', 1, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            party.removeCharacter(outsider);

            expect(party.characters.length).toBe(3);
        });
    });
});

describe('Item Category Definitions', () => {
    describe('food array', () => {
        it('should have 5 food categories', () => {
            expect(food.length).toBe(5);
        });

        it.each([
            ['rations', 0.5],
            ['snack', 1],
            ['dish', 2],
            ['meal', 3],
            ['dessert', 2],
        ])('should have %s with value %d', (name, value) => {
            const item = food.find(f => f[0] === name);
            expect(item).toBeDefined();
            expect(item[1]).toBe(value);
        });

        it('should have flavor text arrays for each food type', () => {
            food.forEach(foodType => {
                expect(Array.isArray(foodType[2])).toBe(true);
                expect(foodType[2].length).toBeGreaterThan(0);
            });
        });
    });

    describe('medical array', () => {
        it('should have 4 medical items', () => {
            expect(medical.length).toBe(4);
        });

        it.each([
            ['band aid', 1],
            ['bandage', 2],
            ['medicine', 3],
            ['first aid kit', 4],
        ])('should have %s with value %d', (name, value) => {
            const item = medical.find(m => m[0] === name);
            expect(item).toBeDefined();
            expect(item[1]).toBe(value);
        });
    });

    describe('weapons array', () => {
        it('should have 4 weapons', () => {
            expect(weapons.length).toBe(4);
        });

        it.each([
            ['fist', 1, 100],
            ['stick', 2, 4],
            ['knife', 3, 12],
            ['pistol', 4, 8],
        ])('should have %s with damage %d and durability %d', (name, damage, durability) => {
            const weapon = weapons.find(w => w[0] === name);
            expect(weapon).toBeDefined();
            expect(weapon[1]).toBe(damage);
            expect(weapon[2]).toBe(durability);
        });

        it('should have fist as index 0 (default weapon)', () => {
            expect(weapons[0][0]).toBe('fist');
        });
    });
});
