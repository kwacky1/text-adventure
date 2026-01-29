/**
 * Party class - pure data model
 * No UI/DOM dependencies
 */

import { Inventory } from './inventory.js';

export class Party {
    constructor() {
        this.characters = [];
        this.nextId = 1;
        this.inventory = new Inventory();
    }

    /**
     * Add a character to the party
     * @param {Character} character
     * @returns {boolean} true if added successfully
     */
    addCharacter(character) {
        if (this.characters.length >= 4) {
            return false;
        }

        character.id = this.nextId;
        this.nextId += 1;
        this.characters.push(character);

        // Initialize relationships with existing characters
        if (this.characters.length > 1) {
            for (const existingCharacter of this.characters) {
                if (existingCharacter !== character) {
                    let relationshipLevel = 1; // strangers
                    
                    if (existingCharacter.posTrait === 'friendly' && existingCharacter.negTrait !== 'disconnected') {
                        relationshipLevel = 2; // acquaintances
                    }
                    if (existingCharacter.negTrait === 'disconnected' && existingCharacter.posTrait !== 'friendly') {
                        relationshipLevel = 0; // cold
                    }
                    
                    character.relationships.set(existingCharacter, relationshipLevel);
                    existingCharacter.relationships.set(character, relationshipLevel);
                }
            }
        }

        return true;
    }

    /**
     * Remove a character from the party
     * @param {Character} character
     * @returns {boolean} true if removed successfully
     */
    removeCharacter(character) {
        const index = this.characters.indexOf(character);
        if (index === -1) {
            return false;
        }

        this.characters.splice(index, 1);

        // Remove from other characters' relationships
        for (const remainingCharacter of this.characters) {
            remainingCharacter.relationships.delete(character);
        }

        return true;
    }

    /**
     * Get character by name
     * @param {string} name
     * @returns {Character|undefined}
     */
    getCharacterByName(name) {
        return this.characters.find(c => c.name === name);
    }

    /**
     * Get character by ID
     * @param {number} id
     * @returns {Character|undefined}
     */
    getCharacterById(id) {
        return this.characters.find(c => c.id === id);
    }

    /**
     * Get character controlled by a specific player
     * @param {string} playerId
     * @returns {Character|undefined}
     */
    getCharacterByPlayerId(playerId) {
        return this.characters.find(c => c.playerId === playerId);
    }

    /**
     * Check if party is full
     * @returns {boolean}
     */
    isFull() {
        return this.characters.length >= 4;
    }

    /**
     * Check if party is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.characters.length === 0;
    }

    /**
     * Get all living characters
     * @returns {Array<Character>}
     */
    getLivingCharacters() {
        return this.characters.filter(c => c.health > 0);
    }

    /**
     * Get all viable characters (health, hunger, morale all > 0)
     * @returns {Array<Character>}
     */
    getViableCharacters() {
        return this.characters.filter(c => c.isViable());
    }

    /**
     * Reset all characters' per-turn actions
     */
    resetAllActions() {
        for (const character of this.characters) {
            character.resetActions();
        }
    }

    /**
     * Get party size
     * @returns {number}
     */
    get size() {
        return this.characters.length;
    }

    /**
     * Serialize party for storage
     * @returns {Object}
     */
    toJSON() {
        return {
            characters: this.characters.map(c => c.toJSON()),
            nextId: this.nextId,
            inventory: this.inventory.toJSON()
        };
    }

    /**
     * Restore party from serialized data
     * @param {Object} data
     * @param {Function} CharacterClass - Character class reference for reconstruction
     * @returns {Party}
     */
    static fromJSON(data, CharacterClass) {
        const party = new Party();
        party.nextId = data.nextId;
        party.inventory = Inventory.fromJSON(data.inventory);

        // First pass: create all characters
        const characterMap = new Map();
        for (const charData of data.characters) {
            const character = CharacterClass.fromJSON(charData);
            party.characters.push(character);
            characterMap.set(character.id, character);
        }

        // Second pass: restore relationships
        for (const character of party.characters) {
            character.restoreRelationships(characterMap);
        }

        return party;
    }
}

export default Party;
