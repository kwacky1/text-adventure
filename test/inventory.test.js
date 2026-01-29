/**
 * Tests for inventory system
 * Tests item management, food/medical/weapon usage
 */

import { 
    addItemToInventory, 
    updateFoodAttributes, 
    updateMedicalAttributes,
    updateWeaponAttributes 
} from '../the-wanderers/scripts/src/inventory.js';
import { context } from '../the-wanderers/scripts/game-state.js';
import { Character } from '../the-wanderers/scripts/character.js';
import Party, { Inventory, food, medical, weapons } from '../the-wanderers/scripts/party.js';

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

// Mock UI functions
jest.mock('../the-wanderers/scripts/src/ui.js', () => ({
    addEvent: jest.fn(),
    updateButtons: jest.fn(),
    updateFoodButtons: jest.fn(),
    updateMedicalButtons: jest.fn(),
    updateStatBars: jest.fn(),
    setPlayButton: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/character-creation.js', () => ({
    createCharacterForm: jest.fn(),
    foundFriend: jest.fn(),
}));

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('Inventory System', () => {
    let testParty;
    let character;
    let mockRandom;
    const { addEvent, updateFoodButtons, updateMedicalButtons } = require('../the-wanderers/scripts/src/ui.js');

    beforeEach(() => {
        testParty = new Party();
        context.gameParty = testParty;
        character = new Character('TestChar', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
        testParty.addCharacter(character);
        jest.clearAllMocks();
        mockRandom = jest.spyOn(global.Math, 'random');
    });

    afterEach(() => {
        mockRandom.mockRestore();
    });

    describe('addItemToInventory', () => {
        it('should add a new item to inventory', () => {
            const foodItem = food[0]; // rations
            addItemToInventory(foodItem);

            expect(testParty.inventory.hasItem(foodItem[0])).toBe(true);
        });

        it('should increase quantity when adding existing item', () => {
            const foodItem = food[0]; // rations
            addItemToInventory(foodItem);
            addItemToInventory(foodItem);

            const item = testParty.inventory.getItem(foodItem[0]);
            expect(item.quantity).toBe(2);
        });

        it('should add medical items correctly', () => {
            const medicalItem = medical[1]; // bandage
            addItemToInventory(medicalItem);

            expect(testParty.inventory.hasItem(medicalItem[0])).toBe(true);
        });

        it('should add weapon items correctly', () => {
            const weaponItem = weapons[1]; // stick
            addItemToInventory(weaponItem);

            expect(testParty.inventory.hasItem(weaponItem[0])).toBe(true);
        });
    });

    describe('updateFoodAttributes', () => {
        it('should increase hunger when eating', () => {
            const initialHunger = character.hunger;
            const foodItem = food[2]; // dish, value 2

            updateFoodAttributes(character, foodItem);

            expect(character.hunger).toBe(initialHunger + foodItem[1]);
        });

        it('should give bonus hunger to satiated trait', () => {
            character.posTrait = 'satiated';
            const initialHunger = character.hunger;
            const foodItem = food[2]; // dish, value 2

            updateFoodAttributes(character, foodItem);

            expect(character.hunger).toBe(initialHunger + foodItem[1] + 0.5);
        });

        it('should increase morale when eating dessert', () => {
            const initialMorale = character.morale;
            const dessertItem = food[4]; // dessert

            updateFoodAttributes(character, dessertItem);

            expect(character.morale).toBe(initialMorale + 1);
        });

        it('should give no benefit to hungry trait for rations', () => {
            character.negTrait = 'hungry';
            const initialHunger = character.hunger;
            const rationItem = food[0]; // rations

            updateFoodAttributes(character, rationItem);

            // Hungry trait negates the benefit of rations
            expect(character.hunger).toBe(initialHunger);
        });

        it('should call updateFoodButtons after eating', () => {
            const foodItem = food[2];
            updateFoodAttributes(character, foodItem);

            expect(updateFoodButtons).toHaveBeenCalled();
        });
    });

    describe('updateMedicalAttributes', () => {
        it('should increase health when using medical item', () => {
            character.health = 5;
            const initialHealth = character.health;
            const medicalItem = medical[1]; // bandage, value 2

            updateMedicalAttributes(character, medicalItem);

            expect(character.health).toBe(initialHealth + medicalItem[1]);
        });

        it('should add event when using medical item', () => {
            const medicalItem = medical[1]; // bandage

            updateMedicalAttributes(character, medicalItem);

            expect(addEvent).toHaveBeenCalledWith(expect.stringContaining('used the bandage'));
        });

        it('should call updateMedicalButtons after healing', () => {
            const medicalItem = medical[1];
            updateMedicalAttributes(character, medicalItem);

            expect(updateMedicalButtons).toHaveBeenCalled();
        });

        describe('infection cure', () => {
            beforeEach(() => {
                character.infected = true;
            });

            it('should cure infection when lucky with medicine', () => {
                mockRandom.mockReturnValue(0.05); // < 0.1 base chance for medicine
                const medicine = medical[2]; // medicine

                updateMedicalAttributes(character, medicine);

                expect(character.infected).toBe(false);
                expect(addEvent).toHaveBeenCalledWith(
                    expect.stringContaining('cured of their infection'),
                    'green'
                );
            });

            it('should cure infection when lucky with other medical items', () => {
                mockRandom.mockReturnValue(0.15); // < 0.2 base chance for non-medicine
                const bandage = medical[1]; // bandage

                updateMedicalAttributes(character, bandage);

                expect(character.infected).toBe(false);
            });

            it('should not cure infection when unlucky', () => {
                mockRandom.mockReturnValue(0.9); // > any cure chance
                const medicine = medical[2];

                updateMedicalAttributes(character, medicine);

                expect(character.infected).toBe(true);
            });

            it('should have higher cure chance with resilient trait', () => {
                character.posTrait = 'resilient';
                // Resilient gets 1.5x base chance (0.1 * 1.5 = 0.15 for medicine)
                mockRandom.mockReturnValue(0.12); // > 0.1 but < 0.15

                const medicine = medical[2];
                updateMedicalAttributes(character, medicine);

                expect(character.infected).toBe(false);
            });

            it('should have lower cure chance with vulnerable trait', () => {
                character.posTrait = 'friendly'; // Override resilient - cure logic checks posTrait first
                character.negTrait = 'vulnerable';
                // Vulnerable gets 0.5x base chance (0.1 * 0.5 = 0.05 for medicine)
                // mockRandom is called for both infection and sickness checks
                mockRandom
                    .mockReturnValueOnce(0.08) // > 0.05 - infection NOT cured
                    .mockReturnValueOnce(0.99); // sickness check

                const medicine = medical[2];
                updateMedicalAttributes(character, medicine);

                expect(character.infected).toBe(true);
            });
        });

        describe('sickness cure', () => {
            beforeEach(() => {
                character.sick = true;
            });

            it('should cure sickness when lucky with medicine', () => {
                mockRandom.mockReturnValue(0.15); // < 0.2 base chance for medicine
                const medicine = medical[2];

                updateMedicalAttributes(character, medicine);

                expect(character.sick).toBe(false);
                expect(addEvent).toHaveBeenCalledWith(
                    expect.stringContaining('feeling better'),
                    'green'
                );
            });

            it('should cure sickness when lucky with other medical items', () => {
                mockRandom.mockReturnValue(0.25); // < 0.3 base chance for non-medicine
                const bandage = medical[1];

                updateMedicalAttributes(character, bandage);

                expect(character.sick).toBe(false);
            });

            it('should not cure sickness when unlucky', () => {
                mockRandom.mockReturnValue(0.9);
                const medicine = medical[2];

                updateMedicalAttributes(character, medicine);

                expect(character.sick).toBe(true);
            });
        });
    });

    describe('updateWeaponAttributes', () => {
        it('should equip weapon to character', () => {
            const knife = weapons[2]; // knife = ['knife', 3, 12]
            character.weapon = 0; // fists

            // Durability is passed as third parameter (as UI does after reading from inventory)
            updateWeaponAttributes(character, knife, 12);

            expect(character.weapon).toBe(2); // knife index
            expect(character.weaponDurability).toBe(12);
        });

        it('should add event when equipping weapon', () => {
            const knife = weapons[2];
            character.weapon = 0;

            updateWeaponAttributes(character, knife);

            expect(addEvent).toHaveBeenCalledWith(expect.stringContaining('equipped the knife'));
        });

        it('should call updateCharacter when equipping', () => {
            const knife = weapons[2];
            character.weapon = 0;

            updateWeaponAttributes(character, knife);

            expect(character.updateCharacter).toHaveBeenCalled();
        });

        it('should add old weapon to inventory when replacing', () => {
            character.weapon = 1; // stick
            character.weaponDurability = 3;
            const knife = weapons[2];

            updateWeaponAttributes(character, knife);

            // Old weapon (stick) should be in inventory
            expect(testParty.inventory.hasItem('stick')).toBe(true);
        });

        it('should not add fists to inventory when equipping first weapon', () => {
            character.weapon = 0; // fists
            const knife = weapons[2];

            updateWeaponAttributes(character, knife);

            // Fists should NOT be in inventory
            expect(testParty.inventory.hasItem('fist')).toBe(false);
        });

        it('should use provided durability parameter', () => {
            character.weapon = 0;
            const knife = weapons[2]; // ['knife', 3, 12]

            // UI passes durability from inventory as third parameter
            updateWeaponAttributes(character, knife, 8);

            expect(character.weaponDurability).toBe(8);
        });

        it('should ignore invalid weapon', () => {
            character.weapon = 0;
            const invalidWeapon = ['nonexistent', 1];

            updateWeaponAttributes(character, invalidWeapon);

            expect(character.weapon).toBe(0); // unchanged
        });
    });

    describe('Inventory class integration', () => {
        it('should track multiple item types', () => {
            addItemToInventory(food[0]); // rations
            addItemToInventory(food[2]); // dish
            addItemToInventory(medical[1]); // bandage
            addItemToInventory(weapons[1]); // stick

            expect(testParty.inventory.inventoryMap.size).toBe(4);
        });

        it('should remove items correctly', () => {
            addItemToInventory(food[0]);
            addItemToInventory(food[0]); // quantity 2

            testParty.inventory.removeItem(food[0][0]);

            const item = testParty.inventory.getItem(food[0][0]);
            expect(item.quantity).toBe(1);
        });

        it('should delete item when quantity reaches 0', () => {
            addItemToInventory(food[0]); // quantity 1

            testParty.inventory.removeItem(food[0][0]);

            expect(testParty.inventory.hasItem(food[0][0])).toBe(false);
        });

        it('should return all items', () => {
            addItemToInventory(food[0]);
            addItemToInventory(medical[1]);

            const allItems = testParty.inventory.getAllItems();

            expect(allItems.length).toBe(2);
        });
    });
});
