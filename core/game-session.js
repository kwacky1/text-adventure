/**
 * GameSession - manages game state for single or multiplayer sessions
 * Platform-agnostic game coordination
 */

import { Party } from './party.js';
import { Character } from './character.js';
import { GameStats } from './game-stats.js';
import { defaultNames } from './constants.js';

/**
 * @typedef {Object} PlayerInfo
 * @property {string} id - Unique player identifier
 * @property {string} displayName - Display name
 * @property {boolean} isHost - Whether this player is the host
 * @property {boolean} isReady - Ready status for turn advancement
 */

export class GameSession {
    /**
     * Create a new game session
     * @param {Object} options
     * @param {string} options.sessionId - Unique session identifier
     * @param {Date} [options.startDate] - Custom start date
     * @param {boolean} [options.isMultiplayer] - Enable multiplayer mode
     */
    constructor(options = {}) {
        this.sessionId = options.sessionId || this.generateSessionId();
        this.party = new Party();
        this.stats = new GameStats();
        
        // Turn management
        this.turnNumber = 1;
        this.timeOfDay = 'day'; // 'day' or 'night'
        this.currentDate = options.startDate || new Date();
        
        // Name pool for character generation
        this.remainingNames = [...defaultNames];
        this.shuffleNames();
        this.useApiNames = options.useApiNames !== false; // Default true
        this.apiNamesFetched = false;
        
        // Multiplayer state
        this.isMultiplayer = options.isMultiplayer || false;
        this.players = new Map(); // playerId -> PlayerInfo
        this.hostId = null;
        this.readyPlayers = new Set();
        
        // Combat state (when in combat)
        this.inCombat = false;
        this.combatState = null;
        
        // Pending encounter (merchant, survivor, etc.)
        this.pendingEncounter = null;
        
        // Event queue for renderer
        this.eventQueue = [];
        
        // Session status
        this.status = 'setup'; // 'setup', 'playing', 'combat', 'paused', 'ended'
        this.createdAt = new Date();
        this.lastActivity = new Date();
        
        // Seasonal event tracking
        this.triggeredSeasonalEvents = new Set();
    }

    /**
     * Generate unique session ID
     * @returns {string}
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Shuffle the names array
     */
    shuffleNames() {
        for (let i = this.remainingNames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.remainingNames[i], this.remainingNames[j]] = [this.remainingNames[j], this.remainingNames[i]];
        }
    }

    /**
     * Fetch names from randomuser.me API
     * @param {number} amount - Number of names to fetch
     * @returns {Promise<boolean>} - Whether fetch was successful
     */
    async fetchApiNames(amount = 20) {
        if (!this.useApiNames) return false;
        
        try {
            const nationalities = 'au,br,ca,ch,de,dk,es,fi,fr,gb,ie,in,mx,nl,no,nz,rs,tr,ua,us';
            const response = await fetch(
                `https://randomuser.me/api/?results=${amount}&nat=${nationalities}`
            );
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            
            const data = await response.json();
            const names = data.results.map(result => result.name.first);
            
            // Add unique names to the pool
            for (const name of names) {
                if (!this.remainingNames.includes(name)) {
                    this.remainingNames.push(name);
                }
            }
            
            this.shuffleNames();
            this.apiNamesFetched = true;
            return true;
        } catch (error) {
            // Silently fall back to default names
            console.warn('Failed to fetch names from API, using defaults:', error.message);
            return false;
        }
    }

    /**
     * Initialize names - call at game start for API names
     * @returns {Promise<void>}
     */
    async initializeNames() {
        if (this.useApiNames && !this.apiNamesFetched) {
            await this.fetchApiNames(20);
        }
    }

    /**
     * Get next available name
     * @returns {string|null}
     */
    getNextName() {
        if (this.remainingNames.length === 0) {
            this.remainingNames = [...defaultNames];
            this.shuffleNames();
        }
        return this.remainingNames.pop();
    }

    /**
     * Get next available name (async version - fetches from API if needed)
     * @returns {Promise<string>}
     */
    async getNextNameAsync() {
        if (this.remainingNames.length < 5 && this.useApiNames) {
            await this.fetchApiNames(10);
        }
        return this.getNextName();
    }

    /**
     * Add a player to the session (multiplayer)
     * @param {string} playerId
     * @param {string} displayName
     * @returns {PlayerInfo}
     */
    addPlayer(playerId, displayName) {
        const isHost = this.players.size === 0;
        const playerInfo = {
            id: playerId,
            displayName,
            isHost,
            isReady: false
        };
        
        this.players.set(playerId, playerInfo);
        
        if (isHost) {
            this.hostId = playerId;
        }
        
        this.lastActivity = new Date();
        return playerInfo;
    }

    /**
     * Remove a player from the session
     * @param {string} playerId
     * @returns {boolean}
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        this.players.delete(playerId);
        this.readyPlayers.delete(playerId);

        // Handle character departure (morale loss style)
        const character = this.party.getCharacterByPlayerId(playerId);
        if (character) {
            this.queueEvent(`${character.name} wandered off alone...`);
            this.handleCharacterDeparture(character);
        }

        // Transfer host if needed
        if (player.isHost && this.players.size > 0) {
            const newHost = this.players.values().next().value;
            newHost.isHost = true;
            this.hostId = newHost.id;
            this.queueEvent(`${newHost.displayName} is now the host.`);
        }

        this.lastActivity = new Date();
        return true;
    }

    /**
     * Mark player as ready
     * @param {string} playerId
     * @returns {boolean} true if all players are now ready
     */
    setPlayerReady(playerId, ready = true) {
        if (!this.players.has(playerId)) return false;

        if (ready) {
            this.readyPlayers.add(playerId);
        } else {
            this.readyPlayers.delete(playerId);
        }

        this.lastActivity = new Date();
        return this.areAllPlayersReady();
    }

    /**
     * Check if all players are ready
     * @returns {boolean}
     */
    areAllPlayersReady() {
        return this.readyPlayers.size >= this.players.size && this.players.size > 0;
    }

    /**
     * Host override - force advance turn
     * @param {string} playerId
     * @returns {boolean}
     */
    hostOverride(playerId) {
        if (playerId !== this.hostId) return false;
        this.readyPlayers.clear();
        for (const id of this.players.keys()) {
            this.readyPlayers.add(id);
        }
        return true;
    }

    /**
     * Clear ready states for next turn
     */
    clearReadyStates() {
        this.readyPlayers.clear();
        for (const player of this.players.values()) {
            player.isReady = false;
        }
    }

    /**
     * Queue an event for the renderer
     * @param {string} text
     * @param {Object} [style]
     */
    queueEvent(text, style = { type: 'normal' }) {
        this.eventQueue.push({ text, style });
    }

    /**
     * Get and clear event queue
     * @returns {Array}
     */
    flushEvents() {
        const events = [...this.eventQueue];
        this.eventQueue = [];
        return events;
    }

    /**
     * Get formatted current date
     * @returns {string}
     */
    getFormattedDate() {
        const options = { month: 'short', day: 'numeric' };
        return this.currentDate.toLocaleDateString('en-US', options);
    }

    /**
     * Advance to next day
     */
    advanceDay() {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + 1);
        this.currentDate = newDate;
    }

    /**
     * Toggle time of day and advance calendar if needed
     */
    advanceTime() {
        if (this.timeOfDay === 'day') {
            this.timeOfDay = 'night';
        } else {
            this.timeOfDay = 'day';
            this.advanceDay();
        }
        this.turnNumber += 1;
    }

    /**
     * Handle character leaving/dying
     * @param {Character} character
     */
    handleCharacterDeparture(character) {
        this.stats.recordPartyMemberLeft(character.name, this.turnNumber);
        this.party.removeCharacter(character);
        
        if (this.party.isEmpty()) {
            this.status = 'ended';
        }
    }

    /**
     * Check if game is over
     * @returns {boolean}
     */
    isGameOver() {
        return this.party.isEmpty() || this.status === 'ended';
    }

    /**
     * End the game and finalize stats
     * @returns {Object} Final game statistics
     */
    endGame() {
        this.status = 'ended';
        
        // Finalize longest survivor for any remaining characters
        const remainingNames = this.party.characters.map(c => c.name);
        this.stats.finalizeLongestSurvivor(remainingNames, this.turnNumber);
        
        return this.stats.getStats();
    }

    /**
     * Serialize session for storage
     * @returns {Object}
     */
    toJSON() {
        return {
            sessionId: this.sessionId,
            party: this.party.toJSON(),
            stats: this.stats.getStats(),
            turnNumber: this.turnNumber,
            timeOfDay: this.timeOfDay,
            currentDate: this.currentDate.toISOString(),
            remainingNames: this.remainingNames,
            isMultiplayer: this.isMultiplayer,
            players: Array.from(this.players.entries()),
            hostId: this.hostId,
            status: this.status,
            createdAt: this.createdAt.toISOString(),
            lastActivity: this.lastActivity.toISOString(),
            triggeredSeasonalEvents: Array.from(this.triggeredSeasonalEvents)
        };
    }

    /**
     * Restore session from storage
     * @param {Object} data
     * @returns {GameSession}
     */
    static fromJSON(data) {
        const session = new GameSession({
            sessionId: data.sessionId,
            startDate: new Date(data.currentDate),
            isMultiplayer: data.isMultiplayer
        });
        
        session.party = Party.fromJSON(data.party, Character);
        session.turnNumber = data.turnNumber;
        session.timeOfDay = data.timeOfDay;
        session.remainingNames = data.remainingNames;
        session.hostId = data.hostId;
        session.status = data.status;
        session.createdAt = new Date(data.createdAt);
        session.lastActivity = new Date(data.lastActivity);
        session.triggeredSeasonalEvents = new Set(data.triggeredSeasonalEvents);
        
        // Restore players
        for (const [id, info] of data.players) {
            session.players.set(id, info);
        }
        
        return session;
    }
}

export default GameSession;
