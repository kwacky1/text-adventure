/**
 * Game Statistics Tracking Module
 * Tracks various statistics throughout the game for display at game over
 */

// Game statistics object
const gameStats = {
    // Combat stats
    zombiesKilled: 0,
    hostileSurvivorsKilled: 0,
    
    // Party stats
    totalPartyMembers: 0,  // Total unique members who joined
    
    // Longest survivor tracking
    partyMemberJoinTurns: new Map(), // Map of character name -> turn joined
    longestSurvivor: { name: null, turns: 0 },
    
    // Item usage stats
    foodEaten: 0,
    medicalUsed: 0,
    
    // Weapon stats - track kills and usage per weapon type
    weaponStats: {
        fist: { kills: 0, uses: 0 },
        stick: { kills: 0, uses: 0 },
        knife: { kills: 0, uses: 0 },
        pistol: { kills: 0, uses: 0 }
    },
    
    // Survivor encounter stats
    survivorEncounters: {
        merchantTradesAccepted: 0,
        merchantTradesDeclined: 0,
        merchantStealAttempts: 0,
        personInNeedHelped: 0,
        personInNeedDeclined: 0,
        hostileEncounters: 0
    }
};

/**
 * Record a zombie kill with the weapon used
 * @param {string} weaponName - Name of the weapon used
 */
export function recordZombieKill(weaponName) {
    gameStats.zombiesKilled++;
    if (gameStats.weaponStats[weaponName]) {
        gameStats.weaponStats[weaponName].kills++;
    }
}

/**
 * Record a weapon attack (for tracking usage)
 * @param {string} weaponName - Name of the weapon used
 */
export function recordWeaponUse(weaponName) {
    if (gameStats.weaponStats[weaponName]) {
        gameStats.weaponStats[weaponName].uses++;
    }
}

/**
 * Record a hostile survivor kill
 */
export function recordHostileSurvivorKill() {
    gameStats.hostileSurvivorsKilled++;
}

/**
 * Record a new party member joining
 * @param {string} characterName - Name of the character joining
 * @param {number} currentTurn - The turn number when they joined
 */
export function recordNewPartyMember(characterName, currentTurn) {
    gameStats.totalPartyMembers++;
    gameStats.partyMemberJoinTurns.set(characterName, currentTurn);
}

/**
 * Record food being eaten
 */
export function recordFoodEaten() {
    gameStats.foodEaten++;
}

/**
 * Record a party member leaving or dying
 * @param {string} characterName - Name of the character leaving
 * @param {number} currentTurn - The turn number when they left
 */
export function recordPartyMemberLeft(characterName, currentTurn) {
    const joinTurn = gameStats.partyMemberJoinTurns.get(characterName);
    if (joinTurn !== undefined) {
        // +1 because if you join on turn 1 and leave on turn 10, you survived 10 turns
        const turnsAlive = currentTurn - joinTurn + 1;
        if (turnsAlive > gameStats.longestSurvivor.turns) {
            gameStats.longestSurvivor = { name: characterName, turns: turnsAlive };
        }
        gameStats.partyMemberJoinTurns.delete(characterName);
    }
}

/**
 * Finalize longest survivor stats at game end (for survivors still alive)
 * @param {Array} remainingCharacters - Array of character names still alive
 * @param {number} finalTurn - The final turn number
 */
export function finalizeLongestSurvivor(remainingCharacters, finalTurn) {
    for (const name of remainingCharacters) {
        const joinTurn = gameStats.partyMemberJoinTurns.get(name);
        if (joinTurn !== undefined) {
            // +1 because if you join on turn 1 and game ends on turn 25, you survived 25 turns
            const turnsAlive = finalTurn - joinTurn + 1;
            if (turnsAlive > gameStats.longestSurvivor.turns) {
                gameStats.longestSurvivor = { name: name, turns: turnsAlive };
            }
        }
    }
}

/**
 * Record medical item being used
 */
export function recordMedicalUsed() {
    gameStats.medicalUsed++;
}

/**
 * Record merchant trade accepted
 */
export function recordMerchantTradeAccepted() {
    gameStats.survivorEncounters.merchantTradesAccepted++;
}

/**
 * Record merchant trade declined
 */
export function recordMerchantTradeDeclined() {
    gameStats.survivorEncounters.merchantTradesDeclined++;
}

/**
 * Record merchant steal attempt
 */
export function recordMerchantStealAttempt() {
    gameStats.survivorEncounters.merchantStealAttempts++;
}

/**
 * Record helping a person in need
 */
export function recordPersonInNeedHelped() {
    gameStats.survivorEncounters.personInNeedHelped++;
}

/**
 * Record declining a person in need
 */
export function recordPersonInNeedDeclined() {
    gameStats.survivorEncounters.personInNeedDeclined++;
}

/**
 * Record a hostile survivor encounter
 */
export function recordHostileEncounter() {
    gameStats.survivorEncounters.hostileEncounters++;
}

/**
 * Get the favourite weapon based on kills, then uses as tiebreaker
 * Excludes fist as it's the default fallback
 * @returns {string} Name of the favourite weapon, or 'None' if only fists used
 */
export function getFavouriteWeapon() {
    let maxKills = 0;
    let maxUses = 0;
    let favourite = null;
    
    // Only consider real weapons (not fist)
    const realWeapons = ['stick', 'knife', 'pistol'];
    
    for (const weapon of realWeapons) {
        const stats = gameStats.weaponStats[weapon];
        if (stats.kills > maxKills || (stats.kills === maxKills && stats.uses > maxUses)) {
            maxKills = stats.kills;
            maxUses = stats.uses;
            favourite = weapon;
        }
    }
    
    // If no kills with real weapons, pick by usage
    if (favourite === null) {
        maxUses = 0;
        for (const weapon of realWeapons) {
            const stats = gameStats.weaponStats[weapon];
            if (stats.uses > maxUses) {
                maxUses = stats.uses;
                favourite = weapon;
            }
        }
    }
    
    return favourite || 'None';
}

/**
 * Get all game statistics for display
 * @returns {Object} Copy of game statistics
 */
export function getGameStats() {
    return {
        zombiesKilled: gameStats.zombiesKilled,
        hostileSurvivorsKilled: gameStats.hostileSurvivorsKilled,
        totalPartyMembers: gameStats.totalPartyMembers,
        longestSurvivor: { ...gameStats.longestSurvivor },
        foodEaten: gameStats.foodEaten,
        medicalUsed: gameStats.medicalUsed,
        weaponStats: { ...gameStats.weaponStats },
        survivorEncounters: { ...gameStats.survivorEncounters },
        favouriteWeapon: getFavouriteWeapon()
    };
}

/**
 * Reset all statistics (for new game)
 */
export function resetGameStats() {
    gameStats.zombiesKilled = 0;
    gameStats.hostileSurvivorsKilled = 0;
    gameStats.totalPartyMembers = 0;
    gameStats.partyMemberJoinTurns = new Map();
    gameStats.longestSurvivor = { name: null, turns: 0 };
    gameStats.foodEaten = 0;
    gameStats.medicalUsed = 0;
    
    for (const weapon of Object.keys(gameStats.weaponStats)) {
        gameStats.weaponStats[weapon] = { kills: 0, uses: 0 };
    }
    
    gameStats.survivorEncounters = {
        merchantTradesAccepted: 0,
        merchantTradesDeclined: 0,
        merchantStealAttempts: 0,
        personInNeedHelped: 0,
        personInNeedDeclined: 0,
        hostileEncounters: 0
    };
}

export { gameStats };
