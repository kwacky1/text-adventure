/**
 * Game Statistics Tracking Module
 * Pure logic - no UI dependencies
 */

export class GameStats {
    constructor() {
        this.reset();
    }

    reset() {
        this.zombiesKilled = 0;
        this.hostileSurvivorsKilled = 0;
        this.totalPartyMembers = 0;
        this.partyMemberJoinTurns = new Map();
        this.longestSurvivor = { name: null, turns: 0 };
        this.foodEaten = 0;
        this.medicalUsed = 0;
        this.weaponStats = {
            fist: { kills: 0, uses: 0 },
            stick: { kills: 0, uses: 0 },
            knife: { kills: 0, uses: 0 },
            pistol: { kills: 0, uses: 0 }
        };
        this.survivorEncounters = {
            merchantTradesAccepted: 0,
            merchantTradesDeclined: 0,
            merchantStealAttempts: 0,
            personInNeedHelped: 0,
            personInNeedDeclined: 0,
            hostileEncounters: 0
        };
    }

    recordZombieKill(weaponName) {
        this.zombiesKilled++;
        if (this.weaponStats[weaponName]) {
            this.weaponStats[weaponName].kills++;
        }
    }

    recordWeaponUse(weaponName) {
        if (this.weaponStats[weaponName]) {
            this.weaponStats[weaponName].uses++;
        }
    }

    recordHostileSurvivorKill() {
        this.hostileSurvivorsKilled++;
    }

    recordNewPartyMember(characterName, currentTurn) {
        this.totalPartyMembers++;
        this.partyMemberJoinTurns.set(characterName, currentTurn);
    }

    recordFoodEaten() {
        this.foodEaten++;
    }

    recordMedicalUsed() {
        this.medicalUsed++;
    }

    recordPartyMemberLeft(characterName, currentTurn) {
        const joinTurn = this.partyMemberJoinTurns.get(characterName);
        if (joinTurn !== undefined) {
            const turnsAlive = currentTurn - joinTurn + 1;
            if (turnsAlive > this.longestSurvivor.turns) {
                this.longestSurvivor = { name: characterName, turns: turnsAlive };
            }
            this.partyMemberJoinTurns.delete(characterName);
        }
    }

    finalizeLongestSurvivor(remainingCharacters, finalTurn) {
        for (const name of remainingCharacters) {
            const joinTurn = this.partyMemberJoinTurns.get(name);
            if (joinTurn !== undefined) {
                const turnsAlive = finalTurn - joinTurn + 1;
                if (turnsAlive > this.longestSurvivor.turns) {
                    this.longestSurvivor = { name: name, turns: turnsAlive };
                }
            }
        }
    }

    recordMerchantTradeAccepted() {
        this.survivorEncounters.merchantTradesAccepted++;
    }

    recordMerchantTradeDeclined() {
        this.survivorEncounters.merchantTradesDeclined++;
    }

    recordMerchantStealAttempt() {
        this.survivorEncounters.merchantStealAttempts++;
    }

    recordPersonInNeedHelped() {
        this.survivorEncounters.personInNeedHelped++;
    }

    recordPersonInNeedDeclined() {
        this.survivorEncounters.personInNeedDeclined++;
    }

    recordHostileEncounter() {
        this.survivorEncounters.hostileEncounters++;
    }

    getFavouriteWeapon() {
        let maxKills = 0;
        let maxUses = 0;
        let favourite = null;
        
        const realWeapons = ['stick', 'knife', 'pistol'];
        
        for (const weapon of realWeapons) {
            const stats = this.weaponStats[weapon];
            if (stats.kills > maxKills || (stats.kills === maxKills && stats.uses > maxUses)) {
                maxKills = stats.kills;
                maxUses = stats.uses;
                favourite = weapon;
            }
        }
        
        if (favourite === null) {
            maxUses = 0;
            for (const weapon of realWeapons) {
                const stats = this.weaponStats[weapon];
                if (stats.uses > maxUses) {
                    maxUses = stats.uses;
                    favourite = weapon;
                }
            }
        }
        
        return favourite || 'None';
    }

    getStats() {
        return {
            zombiesKilled: this.zombiesKilled,
            hostileSurvivorsKilled: this.hostileSurvivorsKilled,
            totalPartyMembers: this.totalPartyMembers,
            longestSurvivor: { ...this.longestSurvivor },
            foodEaten: this.foodEaten,
            medicalUsed: this.medicalUsed,
            weaponStats: { ...this.weaponStats },
            survivorEncounters: { ...this.survivorEncounters },
            favouriteWeapon: this.getFavouriteWeapon()
        };
    }
}

export default GameStats;
