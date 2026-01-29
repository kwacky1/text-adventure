/**
 * Tests for game statistics tracking module
 */

import {
    gameStats,
    recordZombieKill,
    recordWeaponUse,
    recordHostileSurvivorKill,
    recordNewPartyMember,
    recordPartyMemberLeft,
    finalizeLongestSurvivor,
    recordFoodEaten,
    recordMedicalUsed,
    recordMerchantTradeAccepted,
    recordMerchantTradeDeclined,
    recordMerchantStealAttempt,
    recordPersonInNeedHelped,
    recordPersonInNeedDeclined,
    recordHostileEncounter,
    getFavouriteWeapon,
    getGameStats,
    resetGameStats
} from '../the-wanderers/scripts/src/game-stats.js';

describe('Game Statistics Module', () => {
    beforeEach(() => {
        // Reset stats before each test
        resetGameStats();
    });

    describe('Zombie kills and weapon tracking', () => {
        it('should track zombie kills', () => {
            recordZombieKill('knife');
            recordZombieKill('pistol');
            recordZombieKill('knife');

            expect(gameStats.zombiesKilled).toBe(3);
        });

        it('should track kills per weapon type', () => {
            recordZombieKill('knife');
            recordZombieKill('knife');
            recordZombieKill('pistol');

            expect(gameStats.weaponStats.knife.kills).toBe(2);
            expect(gameStats.weaponStats.pistol.kills).toBe(1);
            expect(gameStats.weaponStats.fist.kills).toBe(0);
        });

        it('should track weapon usage separately from kills', () => {
            recordWeaponUse('fist');
            recordWeaponUse('fist');
            recordWeaponUse('knife');

            expect(gameStats.weaponStats.fist.uses).toBe(2);
            expect(gameStats.weaponStats.knife.uses).toBe(1);
        });

        it('should handle invalid weapon names gracefully', () => {
            recordZombieKill('invalidWeapon');
            recordWeaponUse('anotherInvalidWeapon');

            // Should not crash, zombies killed should still increment
            expect(gameStats.zombiesKilled).toBe(1);
        });
    });

    describe('Hostile survivor tracking', () => {
        it('should track hostile survivor kills', () => {
            recordHostileSurvivorKill();
            recordHostileSurvivorKill();

            expect(gameStats.hostileSurvivorsKilled).toBe(2);
        });
    });

    describe('Party member tracking', () => {
        it('should track total party members', () => {
            recordNewPartyMember('Alice', 1);
            recordNewPartyMember('Bob', 5);
            recordNewPartyMember('Charlie', 10);

            expect(gameStats.totalPartyMembers).toBe(3);
        });

        it('should track when party members join', () => {
            recordNewPartyMember('Alice', 1);
            recordNewPartyMember('Bob', 5);

            expect(gameStats.partyMemberJoinTurns.get('Alice')).toBe(1);
            expect(gameStats.partyMemberJoinTurns.get('Bob')).toBe(5);
        });

        it('should track longest survivor when member leaves', () => {
            recordNewPartyMember('Alice', 1);
            recordNewPartyMember('Bob', 3);
            
            // Alice survives 10 turns (turn 1 through turn 10)
            recordPartyMemberLeft('Alice', 10);
            
            expect(gameStats.longestSurvivor.name).toBe('Alice');
            expect(gameStats.longestSurvivor.turns).toBe(10);
        });

        it('should update longest survivor if new member survives longer', () => {
            recordNewPartyMember('Alice', 1);
            recordNewPartyMember('Bob', 2);
            
            // Alice survives 6 turns (turn 1 through turn 6)
            recordPartyMemberLeft('Alice', 6);
            // Bob survives 11 turns (turn 2 through turn 12)
            recordPartyMemberLeft('Bob', 12);
            
            expect(gameStats.longestSurvivor.name).toBe('Bob');
            expect(gameStats.longestSurvivor.turns).toBe(11);
        });

        it('should finalize longest survivor for remaining characters', () => {
            recordNewPartyMember('Alice', 1);
            recordNewPartyMember('Bob', 5);
            
            // Game ends at turn 20, both still alive
            finalizeLongestSurvivor(['Alice', 'Bob'], 20);
            
            // Alice joined turn 1, survived 20 turns (turn 1 through turn 20)
            expect(gameStats.longestSurvivor.name).toBe('Alice');
            expect(gameStats.longestSurvivor.turns).toBe(20);
        });
    });

    describe('Item usage tracking', () => {
        it('should track food eaten', () => {
            recordFoodEaten();
            recordFoodEaten();
            recordFoodEaten();

            expect(gameStats.foodEaten).toBe(3);
        });

        it('should track medical items used', () => {
            recordMedicalUsed();
            recordMedicalUsed();

            expect(gameStats.medicalUsed).toBe(2);
        });
    });

    describe('Survivor encounter tracking', () => {
        it('should track merchant trades accepted', () => {
            recordMerchantTradeAccepted();
            recordMerchantTradeAccepted();

            expect(gameStats.survivorEncounters.merchantTradesAccepted).toBe(2);
        });

        it('should track merchant trades declined', () => {
            recordMerchantTradeDeclined();

            expect(gameStats.survivorEncounters.merchantTradesDeclined).toBe(1);
        });

        it('should track steal attempts', () => {
            recordMerchantStealAttempt();
            recordMerchantStealAttempt();
            recordMerchantStealAttempt();

            expect(gameStats.survivorEncounters.merchantStealAttempts).toBe(3);
        });

        it('should track people helped', () => {
            recordPersonInNeedHelped();

            expect(gameStats.survivorEncounters.personInNeedHelped).toBe(1);
        });

        it('should track people turned away', () => {
            recordPersonInNeedDeclined();
            recordPersonInNeedDeclined();

            expect(gameStats.survivorEncounters.personInNeedDeclined).toBe(2);
        });

        it('should track hostile encounters', () => {
            recordHostileEncounter();
            recordHostileEncounter();

            expect(gameStats.survivorEncounters.hostileEncounters).toBe(2);
        });
    });

    describe('Favourite weapon calculation', () => {
        it('should return weapon with most kills', () => {
            recordZombieKill('knife');
            recordZombieKill('knife');
            recordZombieKill('pistol');

            expect(getFavouriteWeapon()).toBe('knife');
        });

        it('should use usage as tiebreaker when kills are equal', () => {
            recordZombieKill('knife');
            recordZombieKill('pistol');
            recordWeaponUse('knife');
            recordWeaponUse('knife');
            recordWeaponUse('pistol');

            // Both have 1 kill, but knife has more uses
            expect(getFavouriteWeapon()).toBe('knife');
        });

        it('should return weapon with most uses when no kills', () => {
            recordWeaponUse('stick');
            recordWeaponUse('stick');
            recordWeaponUse('knife');

            expect(getFavouriteWeapon()).toBe('stick');
        });

        it('should return None when no real weapon usage at all', () => {
            // Only fist usage should result in None
            recordWeaponUse('fist');
            recordWeaponUse('fist');
            
            expect(getFavouriteWeapon()).toBe('None');
        });

        it('should exclude fist from favourite weapon', () => {
            // Even with lots of fist kills, should prefer real weapons
            recordZombieKill('fist');
            recordZombieKill('fist');
            recordZombieKill('fist');
            recordZombieKill('stick');

            expect(getFavouriteWeapon()).toBe('stick');
        });
    });

    describe('getGameStats', () => {
        it('should return all stats with favourite weapon', () => {
            recordZombieKill('pistol');
            recordZombieKill('pistol');
            recordFoodEaten();
            recordNewPartyMember('Hero', 1);

            const stats = getGameStats();

            expect(stats.zombiesKilled).toBe(2);
            expect(stats.foodEaten).toBe(1);
            expect(stats.totalPartyMembers).toBe(1);
            expect(stats.favouriteWeapon).toBe('pistol');
        });

        it('should include longest survivor stats', () => {
            recordNewPartyMember('Hero', 1);
            recordPartyMemberLeft('Hero', 15);

            const stats = getGameStats();

            expect(stats.longestSurvivor.name).toBe('Hero');
            expect(stats.longestSurvivor.turns).toBe(15);
        });

        it('should include all survivor encounter stats', () => {
            recordMerchantTradeAccepted();
            recordHostileEncounter();
            recordPersonInNeedHelped();

            const stats = getGameStats();

            expect(stats.survivorEncounters.merchantTradesAccepted).toBe(1);
            expect(stats.survivorEncounters.hostileEncounters).toBe(1);
            expect(stats.survivorEncounters.personInNeedHelped).toBe(1);
        });
    });

    describe('resetGameStats', () => {
        it('should reset all stats to initial values', () => {
            // Add some stats
            recordZombieKill('knife');
            recordFoodEaten();
            recordMedicalUsed();
            recordNewPartyMember('Hero', 1);
            recordPartyMemberLeft('Hero', 10);
            recordMerchantTradeAccepted();

            // Reset
            resetGameStats();

            expect(gameStats.zombiesKilled).toBe(0);
            expect(gameStats.foodEaten).toBe(0);
            expect(gameStats.medicalUsed).toBe(0);
            expect(gameStats.totalPartyMembers).toBe(0);
            expect(gameStats.longestSurvivor.name).toBe(null);
            expect(gameStats.longestSurvivor.turns).toBe(0);
            expect(gameStats.partyMemberJoinTurns.size).toBe(0);
            expect(gameStats.weaponStats.knife.kills).toBe(0);
            expect(gameStats.survivorEncounters.merchantTradesAccepted).toBe(0);
        });

        it('should reset all weapon stats', () => {
            recordZombieKill('fist');
            recordZombieKill('stick');
            recordZombieKill('knife');
            recordZombieKill('pistol');
            recordWeaponUse('knife');

            resetGameStats();

            expect(gameStats.weaponStats.fist.kills).toBe(0);
            expect(gameStats.weaponStats.fist.uses).toBe(0);
            expect(gameStats.weaponStats.stick.kills).toBe(0);
            expect(gameStats.weaponStats.knife.kills).toBe(0);
            expect(gameStats.weaponStats.knife.uses).toBe(0);
            expect(gameStats.weaponStats.pistol.kills).toBe(0);
        });

        it('should reset all survivor encounter stats', () => {
            recordMerchantTradeAccepted();
            recordMerchantTradeDeclined();
            recordMerchantStealAttempt();
            recordPersonInNeedHelped();
            recordPersonInNeedDeclined();
            recordHostileEncounter();

            resetGameStats();

            expect(gameStats.survivorEncounters.merchantTradesAccepted).toBe(0);
            expect(gameStats.survivorEncounters.merchantTradesDeclined).toBe(0);
            expect(gameStats.survivorEncounters.merchantStealAttempts).toBe(0);
            expect(gameStats.survivorEncounters.personInNeedHelped).toBe(0);
            expect(gameStats.survivorEncounters.personInNeedDeclined).toBe(0);
            expect(gameStats.survivorEncounters.hostileEncounters).toBe(0);
        });
    });
});
