/**
 * Renderer Interface
 * Defines the contract that all platform renderers must implement.
 * Web, CLI, and Discord renderers will each provide their own implementation.
 */

/**
 * @typedef {Object} EventStyle
 * @property {'normal'|'warning'|'danger'|'success'|'info'} type - Event severity/type
 * @property {string} [color] - Optional color hint for the event
 */

/**
 * @typedef {Object} ChoiceOption
 * @property {string} id - Unique identifier for this choice
 * @property {string} label - Display text for the choice
 * @property {string} [description] - Optional longer description
 * @property {boolean} [disabled] - Whether choice is currently unavailable
 */

/**
 * @typedef {Object} CombatState
 * @property {Array} combatants - All combatants in initiative order
 * @property {Object} currentTurn - The combatant whose turn it is
 * @property {Array} enemies - Remaining enemies
 * @property {Array} players - Player characters
 */

/**
 * @typedef {Object} CharacterStats
 * @property {string} name
 * @property {number} health
 * @property {number} hunger
 * @property {number} morale
 * @property {string} weapon
 * @property {number} weaponDurability
 * @property {boolean} sick
 * @property {boolean} infected
 */

/**
 * Abstract Renderer class - all renderers must implement these methods
 */
export class Renderer {
    /**
     * Display a game event message
     * @param {string} text - The event text to display
     * @param {EventStyle} [style] - Optional styling information
     * @returns {Promise<void>}
     */
    async displayEvent(text, style = { type: 'normal' }) {
        throw new Error('displayEvent must be implemented by renderer');
    }

    /**
     * Display multiple events at once (e.g., turn summary)
     * @param {Array<{text: string, style?: EventStyle}>} events
     * @returns {Promise<void>}
     */
    async displayEvents(events) {
        for (const event of events) {
            await this.displayEvent(event.text, event.style);
        }
    }

    /**
     * Prompt user to select from a list of choices
     * @param {string} prompt - The question or prompt text
     * @param {Array<ChoiceOption>} options - Available choices
     * @param {Object} [config] - Additional configuration
     * @param {string} [config.playerId] - For multiplayer: which player should respond
     * @param {number} [config.timeout] - Timeout in ms (0 for no timeout)
     * @returns {Promise<string>} - The id of the selected option
     */
    async promptChoice(prompt, options, config = {}) {
        throw new Error('promptChoice must be implemented by renderer');
    }

    /**
     * Prompt user to confirm an action (yes/no)
     * @param {string} prompt - The question to confirm
     * @param {Object} [config] - Additional configuration
     * @returns {Promise<boolean>}
     */
    async promptConfirm(prompt, config = {}) {
        const result = await this.promptChoice(prompt, [
            { id: 'yes', label: 'Yes' },
            { id: 'no', label: 'No' }
        ], config);
        return result === 'yes';
    }

    /**
     * Prompt user for free-form text input
     * @param {string} prompt - The input prompt
     * @param {Object} [config] - Additional configuration
     * @param {string} [config.default] - Default value
     * @param {Function} [config.validate] - Validation function
     * @returns {Promise<string>}
     */
    async promptInput(prompt, config = {}) {
        throw new Error('promptInput must be implemented by renderer');
    }

    /**
     * Update character stats display
     * @param {CharacterStats} character - Character data to display
     * @returns {Promise<void>}
     */
    async updateStats(character) {
        throw new Error('updateStats must be implemented by renderer');
    }

    /**
     * Display full party status
     * @param {Array<CharacterStats>} characters
     * @returns {Promise<void>}
     */
    async displayPartyStatus(characters) {
        throw new Error('displayPartyStatus must be implemented by renderer');
    }

    /**
     * Display compact party status (single line summary)
     * @param {Array<CharacterStats>} characters
     * @returns {Promise<void>}
     */
    async displayPartyStatusCompact(characters) {
        // Default: fall back to full display
        return this.displayPartyStatus(characters);
    }

    /**
     * Display inventory contents
     * @param {Object} inventory - Inventory data
     * @returns {Promise<void>}
     */
    async displayInventory(inventory) {
        throw new Error('displayInventory must be implemented by renderer');
    }

    /**
     * Display compact inventory (single line summary)
     * @param {Object} inventory - Inventory data
     * @returns {Promise<void>}
     */
    async displayInventoryCompact(inventory) {
        // Default: fall back to full display
        return this.displayInventory(inventory);
    }

    /**
     * Notify that it's a specific player's turn in combat
     * @param {string} playerId - Player identifier
     * @param {string} characterName - Character name
     * @param {CombatState} combatState - Current combat state
     * @returns {Promise<void>}
     */
    async notifyPlayerTurn(playerId, characterName, combatState) {
        throw new Error('notifyPlayerTurn must be implemented by renderer');
    }

    /**
     * Prompt player to select combat action (attack, use food, use medical, equip weapon)
     * @param {string} playerId - Player who should choose
     * @param {string} characterName - Character taking action
     * @param {Object} options - Available actions { canAttack, canUseFood, canUseMedical, canEquipWeapon }
     * @returns {Promise<string>} - Selected action: 'attack', 'food', 'medical', or 'weapon'
     */
    async promptCombatAction(playerId, characterName, options) {
        // Default: just attack if no items available and no weapons to equip
        if (!options.canUseFood && !options.canUseMedical && !options.canEquipWeapon) {
            return 'attack';
        }
        
        const choices = [{ id: 'attack', label: 'Attack' }];
        if (options.canEquipWeapon) {
            choices.push({ id: 'weapon', label: 'Equip Weapon', description: 'Swap weapon (free action)' });
        }
        if (options.canUseFood) {
            choices.push({ id: 'food', label: 'Use Food', description: 'Restore hunger' });
        }
        if (options.canUseMedical) {
            choices.push({ id: 'medical', label: 'Use Medical', description: 'Restore health' });
        }
        
        return await this.promptChoice(`${characterName}'s action:`, choices);
    }

    /**
     * Prompt player to select attack target
     * @param {string} playerId - Player who should choose
     * @param {string} characterName - Character making the attack
     * @param {Array<{id: string, label: string, hp: number}>} enemies - Valid targets
     * @returns {Promise<string>} - Selected enemy id
     */
    async promptAttackTarget(playerId, characterName, enemies) {
        throw new Error('promptAttackTarget must be implemented by renderer');
    }

    /**
     * Display combat state (enemy HP, turn order, etc.)
     * @param {CombatState} combatState
     * @returns {Promise<void>}
     */
    async displayCombat(combatState) {
        throw new Error('displayCombat must be implemented by renderer');
    }

    /**
     * Display game over screen with statistics
     * @param {Object} stats - Game statistics
     * @returns {Promise<void>}
     */
    async handleGameOver(stats) {
        throw new Error('handleGameOver must be implemented by renderer');
    }

    /**
     * Update turn/day display
     * @param {number} turnNumber
     * @param {string} timeOfDay - 'day' or 'night'
     * @param {string} formattedDate
     * @returns {Promise<void>}
     */
    async updateTurnDisplay(turnNumber, timeOfDay, formattedDate) {
        throw new Error('updateTurnDisplay must be implemented by renderer');
    }

    /**
     * Display character creation form and get character details
     * @param {Array<string>} availableNames - Names to choose from
     * @param {string} [playerId] - For multiplayer: which player is creating
     * @returns {Promise<Object>} - Character creation data
     */
    async promptCharacterCreation(availableNames, playerId = null) {
        throw new Error('promptCharacterCreation must be implemented by renderer');
    }

    /**
     * Notify all players of ready state
     * @param {Map<string, boolean>} readyState - playerId -> ready status
     * @param {number} readyCount - Number of ready players
     * @param {number} totalPlayers - Total players
     * @returns {Promise<void>}
     */
    async notifyReadyState(readyState, readyCount, totalPlayers) {
        // Optional - multiplayer only
    }

    /**
     * Clear display/reset for new turn
     * @returns {Promise<void>}
     */
    async clearTurn() {
        // Optional - platform specific
    }

    /**
     * Initialize the renderer (set up connections, UI, etc.)
     * @returns {Promise<void>}
     */
    async initialize() {
        // Optional initialization
    }

    /**
     * Clean up resources
     * @returns {Promise<void>}
     */
    async dispose() {
        // Optional cleanup
    }
}

export default Renderer;
