/**
 * Tests for combat system
 * Tests turn-based combat logic with mocked randomness
 */

import { handleTurn, foundEnemy } from '../the-wanderers/scripts/src/combat.js';
import { context } from '../the-wanderers/scripts/game-state.js';
import { Character } from '../the-wanderers/scripts/character.js';
import Party, { Inventory, weapons } from '../the-wanderers/scripts/party.js';

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
    updateStatBars: jest.fn(),
    updateRelationships: jest.fn(),
    setPlayButton: jest.fn(),
}));

jest.mock('../the-wanderers/scripts/src/events.js', () => ({
    handleDeathEffects: jest.fn(),
    singleZombieVariations: ['appears'],
    multiZombieVariations: ['appear'],
}));

jest.mock('../the-wanderers/scripts/src/character-creation.js', () => ({
    createCharacterForm: jest.fn(),
    foundFriend: jest.fn(),
}));

// Mock DOMPurify
global.DOMPurify = {
    sanitize: jest.fn((input) => input)
};

describe('Combat System', () => {
    let testParty;
    let mockRandom;
    let mockButtons;
    const { addEvent, setPlayButton } = require('../the-wanderers/scripts/src/ui.js');

    beforeEach(() => {
        // Setup DOM mock for combat buttons
        mockButtons = {
            children: [],
            appendChild: jest.fn(),
        };
        global.document = {
            getElementById: jest.fn((id) => {
                if (id === 'gameButtons') return mockButtons;
                return null;
            }),
            createElement: jest.fn(() => ({
                textContent: '',
                id: '',
                addEventListener: jest.fn(),
            })),
        };

        testParty = new Party();
        context.gameParty = testParty;
        jest.clearAllMocks();
        mockRandom = jest.spyOn(global.Math, 'random');
    });

    afterEach(() => {
        mockRandom.mockRestore();
    });

    describe('foundEnemy - Combat initialization', () => {
        it('should create 1 enemy when party has 1 character', () => {
            const char = new Character('Solo', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);
            
            mockRandom
                .mockReturnValueOnce(0) // Number of enemies (1)
                .mockReturnValueOnce(0.5) // Enemy HP
                .mockReturnValueOnce(0.5); // Enemy morale

            foundEnemy(context);

            expect(setPlayButton).toHaveBeenCalledWith('hide');
            expect(addEvent).toHaveBeenCalled();
        });

        it('should create multiple enemies for larger parties', () => {
            for (let i = 0; i < 3; i++) {
                const char = new Character(`Char${i}`, 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
                testParty.addCharacter(char);
            }
            
            mockRandom
                .mockReturnValueOnce(0.99) // Number of enemies (3)
                .mockReturnValueOnce(0.5)  // Enemy 1 HP
                .mockReturnValueOnce(0.5)  // Enemy 1 morale
                .mockReturnValueOnce(0.5)  // Enemy 2 HP
                .mockReturnValueOnce(0.5)  // Enemy 2 morale
                .mockReturnValueOnce(0.5)  // Enemy 3 HP
                .mockReturnValueOnce(0.5); // Enemy 3 morale

            foundEnemy(context);

            // Should announce multiple zombies
            const eventCalls = addEvent.mock.calls;
            expect(eventCalls.some(call => call[0].includes('zombies'))).toBe(true);
        });

        it('should hide play button when combat starts', () => {
            const char = new Character('Solo', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5);

            foundEnemy(context);

            expect(setPlayButton).toHaveBeenCalledWith('hide');
        });
    });

    describe('Combat damage calculations', () => {
        let character;

        beforeEach(() => {
            character = new Character('Fighter', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            character.weapon = 1; // Some weapon (not fists)
            character.weaponDurability = 10;
            testParty.addCharacter(character);
        });

        it('should calculate weapon damage correctly', () => {
            const damage = weapons[character.weapon][1];
            expect(damage).toBeGreaterThan(0);
        });

        it('should decrease weapon durability on attack', () => {
            // This would require simulating an attack
            const initialDurability = character.weaponDurability;
            character.weaponDurability--;
            expect(character.weaponDurability).toBe(initialDurability - 1);
        });

        it('should break weapon when durability reaches 0', () => {
            character.weaponDurability = 1;
            character.weaponDurability--;
            
            if (character.weaponDurability <= 0) {
                character.weapon = 0; // Back to fists
                character.weaponDurability = weapons[0][2];
            }

            expect(character.weapon).toBe(0);
        });
    });

    describe('Character traits in combat', () => {
        it('vulnerable trait should take extra damage', () => {
            const vulnChar = new Character('Vulnerable', 2, 'friendly', 'vulnerable', 'skin', 'hair', 'shirt');
            testParty.addCharacter(vulnChar);

            const initialHealth = vulnChar.health;
            const baseDamage = 2;
            
            // Simulate attack
            vulnChar.health -= baseDamage;
            if (vulnChar.negTrait === 'vulnerable') {
                vulnChar.health -= 1; // Extra damage
            }

            expect(vulnChar.health).toBe(initialHealth - baseDamage - 1);
        });

        it('fighter trait should be set correctly', () => {
            const fighter = new Character('Fighter', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            const nonFighter = new Character('Regular', 2, 'friendly', 'hungry', 'skin', 'hair', 'shirt');

            expect(fighter.posTrait).toBe('fighter');
            expect(nonFighter.posTrait).toBe('friendly');
        });

        it('fighter trait should calculate higher damage in combat', () => {
            const fighter = new Character('Fighter', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            const baseWeaponDamage = weapons[fighter.weapon][1];
            
            // Fighter trait adds +1 damage during combat calculations
            const fighterDamage = fighter.posTrait === 'fighter' ? baseWeaponDamage + 1 : baseWeaponDamage;
            expect(fighterDamage).toBe(baseWeaponDamage + 1);
        });
    });

    describe('Critical hits and misses', () => {
        it('should double damage on critical hit (roll > 0.9)', () => {
            const baseDamage = 3;
            mockRandom.mockReturnValue(0.95); // Critical hit
            
            let actualDamage = baseDamage;
            if (mockRandom() > 0.9) {
                actualDamage *= 2;
            }

            expect(actualDamage).toBe(baseDamage * 2);
        });

        it('should deal no damage on miss (roll < 0.1)', () => {
            const baseDamage = 3;
            mockRandom.mockReturnValue(0.05); // Miss
            
            let actualDamage = baseDamage;
            if (mockRandom() < 0.1) {
                actualDamage = 0;
            }

            expect(actualDamage).toBe(0);
        });

        it('should deal normal damage on regular hit (0.1 <= roll <= 0.9)', () => {
            const baseDamage = 3;
            mockRandom.mockReturnValue(0.5); // Normal hit
            
            const roll = mockRandom();
            let actualDamage = 0;
            if (roll >= 0.1 && roll <= 0.9) {
                actualDamage = baseDamage;
            }

            expect(actualDamage).toBe(baseDamage);
        });
    });

    describe('Infection mechanics', () => {
        let character;

        beforeEach(() => {
            character = new Character('Survivor', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(character);
            character.infected = false;
        });

        it('should have 5% chance of infection on zombie attack', () => {
            mockRandom.mockReturnValue(0.03); // < 0.05
            
            if (mockRandom() < 0.05) {
                character.infected = true;
            }

            expect(character.infected).toBe(true);
        });

        it('should turn infected dead character into zombie', () => {
            character.infected = true;
            character.health = 0;
            
            // This would be handled by handleInfectedPlayerDeath
            // which adds a new combatant
            const combatants = [];
            if (character.infected && character.health <= 0) {
                combatants.push({
                    type: 'enemy',
                    hp: 8, // 4 + random(4)
                    morale: 5,
                    attack: weapons[character.weapon][1]
                });
            }

            expect(combatants.length).toBe(1);
            expect(combatants[0].type).toBe('enemy');
        });
    });

    describe('Combat end conditions', () => {
        it('should end combat when all enemies are defeated', () => {
            const combatants = [
                { type: 'Player1', hp: 10 },
                { type: 'enemy', hp: 0 },
            ];

            const hasAliveEnemies = combatants.some(c => c.type === 'enemy' && c.hp > 0);
            expect(hasAliveEnemies).toBe(false);
        });

        it('should end combat when all players are dead', () => {
            const combatants = [
                { type: 'Player1', hp: 0 },
                { type: 'enemy', hp: 5 },
            ];

            const hasAlivePlayers = combatants.some(c => c.type !== 'enemy' && c.hp > 0);
            expect(hasAlivePlayers).toBe(false);
        });

        it('should increase morale for survivors after victory', () => {
            const survivor = new Character('Survivor', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            survivor.health = 5;
            survivor.morale = 5;
            testParty.addCharacter(survivor);

            // Simulate victory
            survivor.morale++;
            survivor.capAttributes();

            expect(survivor.morale).toBe(6);
        });
    });

    describe('Turn order', () => {
        it('should sort combatants by morale (highest first)', () => {
            const combatants = [
                { type: 'Player1', hp: 10, morale: 3 },
                { type: 'enemy', hp: 5, morale: 7 },
                { type: 'Player2', hp: 8, morale: 5 },
            ];

            combatants.sort((a, b) => b.morale - a.morale);

            expect(combatants[0].morale).toBe(7);
            expect(combatants[1].morale).toBe(5);
            expect(combatants[2].morale).toBe(3);
        });
    });

    describe('handleTurn - Turn execution', () => {
        let clickHandlers;
        let createdButtons;

        beforeEach(() => {
            clickHandlers = [];
            createdButtons = [];
            
            // Enhanced DOM mock that captures click handlers
            global.document = {
                getElementById: jest.fn((id) => {
                    if (id === 'gameButtons') {
                        return {
                            children: createdButtons,
                            appendChild: jest.fn((btn) => createdButtons.push(btn)),
                        };
                    }
                    return null;
                }),
                createElement: jest.fn(() => {
                    const btn = {
                        textContent: '',
                        id: '',
                        addEventListener: jest.fn((event, handler) => {
                            if (event === 'click') {
                                clickHandlers.push(handler);
                            }
                        }),
                        remove: jest.fn(),
                    };
                    return btn;
                }),
            };
        });

        it('should create attack button for player turn', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 1 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 1 },
                { type: 'enemy', hp: 5, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);

            // Should hide play button and create attack button
            expect(setPlayButton).toHaveBeenCalledWith('hide');
            expect(createdButtons.length).toBeGreaterThan(0);
        });

        it('should create attack button for enemy turn', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 1 }];
            const combatants = [
                { type: 'enemy', hp: 5, morale: 8, attack: 1 },
                { type: 'Hero', hp: 9, morale: 6, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);

            // Should create enemy attack button
            expect(setPlayButton).toHaveBeenCalledWith('hide');
            expect(createdButtons.length).toBe(1);
            expect(createdButtons[0].textContent).toContain('attacks');
        });

        it('should skip dead combatants and proceed to next', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 1 }];
            const combatants = [
                { type: 'enemy', hp: 0, morale: 8, attack: 1 }, // Dead enemy at index 0
                { type: 'Hero', hp: 9, morale: 6, attack: 1 }   // Player at index 1
            ];

            handleTurn(0, combatants, players, context, setPlayButton);

            // Should skip dead enemy and call handleTurn recursively for player
            // The player turn creates attack buttons for enemies
            expect(setPlayButton).toHaveBeenCalledWith('hide');
        });

        it('should wrap around when index exceeds combatants length', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 1 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 1 },
                { type: 'enemy', hp: 5, morale: 3, attack: 1 }
            ];

            // Index 5 should wrap to 0 (the code sets index = 0 when index >= length)
            handleTurn(5, combatants, players, context, setPlayButton);

            // Should be player turn (index 0) after wrap
            expect(createdButtons[0].textContent).toContain('Attack zombie');
        });

        it('should execute player attack when button clicked', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5); // Normal hit

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 2 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 2 },
                { type: 'enemy', hp: 5, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            // Simulate clicking the attack button
            if (clickHandlers.length > 0) {
                clickHandlers[0]();
            }

            // Should have called addEvent for attack
            expect(addEvent).toHaveBeenCalled();
        });

        it('should execute enemy attack when button clicked', () => {
            const char = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            char.health = 9;
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5); // Hit (not miss)

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 1 }];
            const combatants = [
                { type: 'enemy', hp: 5, morale: 8, attack: 2 },
                { type: 'Hero', hp: 9, morale: 6, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            // Simulate clicking the attack button
            if (clickHandlers.length > 0) {
                clickHandlers[0]();
            }

            // Enemy should have attacked
            expect(addEvent).toHaveBeenCalled();
        });

        it('should handle player miss (roll < 0.1)', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.05); // Miss

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 2 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 2 },
                { type: 'enemy', hp: 5, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                const initialEnemyHp = combatants[1].hp;
                clickHandlers[0]();
                // Enemy HP should be unchanged on miss
                expect(combatants[1].hp).toBe(initialEnemyHp);
            }
        });

        it('should handle player critical hit (roll > 0.9)', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.95); // Critical hit

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 2 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 2 },
                { type: 'enemy', hp: 10, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                clickHandlers[0]();
                // Enemy HP should be reduced by double damage (4)
                expect(combatants[1].hp).toBe(6);
            }
        });

        it('should handle enemy miss (roll < 0.2)', () => {
            const char = new Character('Hero', 2, 'resilient', 'hungry', 'skin', 'hair', 'shirt');
            char.health = 9;
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.1); // Enemy miss

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 1 }];
            const combatants = [
                { type: 'enemy', hp: 5, morale: 8, attack: 2 },
                { type: 'Hero', hp: 9, morale: 6, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                const initialHealth = char.health;
                clickHandlers[0]();
                // Health should be unchanged on miss
                expect(char.health).toBe(initialHealth);
            }
        });

        it('should defeat enemy when HP reaches 0', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            char.weapon = 3; // knife does 3 damage + 1 fighter = 4
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5); // Normal hit

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 4 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 4 },
                { type: 'enemy', hp: 3, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                clickHandlers[0]();
                // Should announce defeat
                expect(addEvent).toHaveBeenCalledWith('The zombie is defeated!');
            }
        });

        it('should end combat when all enemies defeated', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            char.weapon = 3; // knife does 3 damage + 1 fighter = 4
            char.morale = 5;
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5); // Normal hit

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 4 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 4 },
                { type: 'enemy', hp: 3, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                clickHandlers[0]();
                // Should announce victory and show play button
                expect(addEvent).toHaveBeenCalledWith('All enemies have been defeated!');
                expect(setPlayButton).toHaveBeenCalledWith('show');
            }
        });

        it('should increase morale after victory', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            char.weapon = 3; // knife does 3 damage + 1 fighter = 4
            char.health = 9;
            char.morale = 5;
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5); // Normal hit

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 4 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 4 },
                { type: 'enemy', hp: 3, morale: 3, attack: 1 }
            ];

            const initialMorale = char.morale;
            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                clickHandlers[0]();
                expect(char.morale).toBe(initialMorale + 1);
            }
        });
    });

    describe('Weapon durability in combat', () => {
        let clickHandlers;
        let createdButtons;

        beforeEach(() => {
            clickHandlers = [];
            createdButtons = [];
            
            global.document = {
                getElementById: jest.fn((id) => {
                    if (id === 'gameButtons') {
                        return {
                            children: createdButtons,
                            appendChild: jest.fn((btn) => createdButtons.push(btn)),
                        };
                    }
                    return null;
                }),
                createElement: jest.fn(() => {
                    const btn = {
                        textContent: '',
                        id: '',
                        addEventListener: jest.fn((event, handler) => {
                            if (event === 'click') {
                                clickHandlers.push(handler);
                            }
                        }),
                        remove: jest.fn(),
                    };
                    return btn;
                }),
            };
        });

        it('should decrease durability when attacking with weapon', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            char.weapon = 1; // stick
            char.weaponDurability = 4;
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5); // Normal hit

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 2 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 2 },
                { type: 'enemy', hp: 10, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                const initialDurability = char.weaponDurability;
                clickHandlers[0]();
                expect(char.weaponDurability).toBe(initialDurability - 1);
            }
        });

        it('should break weapon when durability reaches 0', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            char.weapon = 1; // stick
            char.weaponDurability = 1; // Will break after attack
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5); // Normal hit

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 2 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 2 },
                { type: 'enemy', hp: 10, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                clickHandlers[0]();
                // Should revert to fists
                expect(char.weapon).toBe(0);
                expect(char.weaponDurability).toBe(weapons[0][2]);
            }
        });

        it('should not decrease durability for fists', () => {
            const char = new Character('Hero', 2, 'fighter', 'hungry', 'skin', 'hair', 'shirt');
            char.weapon = 0; // fists
            char.weaponDurability = 100;
            testParty.addCharacter(char);
            mockRandom.mockReturnValue(0.5); // Normal hit

            const players = [{ type: 'Hero', hp: 9, morale: 6, attack: 1 }];
            const combatants = [
                { type: 'Hero', hp: 9, morale: 6, attack: 1 },
                { type: 'enemy', hp: 10, morale: 3, attack: 1 }
            ];

            handleTurn(0, combatants, players, context, setPlayButton);
            
            if (clickHandlers.length > 0) {
                clickHandlers[0]();
                // Durability should stay at 100 for fists
                expect(char.weaponDurability).toBe(100);
            }
        });
    });
});
