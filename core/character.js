/**
 * Character class - pure data model
 * No UI/DOM dependencies - all rendering delegated to Renderer
 */

import { moraleArray, hungerArray, healthArray, ageArray } from './constants.js';

export class Character {
    constructor(name, age, posTrait, negTrait, skin = null, hair = null, shirt = null, birthMonth = null, birthDay = null, birthYear = null) {
        this.id = 0;
        this.name = name;
        this.age = age; // Age category index (0=teen, 1=adult, 2=elder)
        this.morale = 6;
        this.hunger = 9;
        this.health = 9;
        this.sick = false;
        this.infected = false;
        this.posTrait = posTrait;
        this.negTrait = negTrait;
        this.relationships = new Map();
        this.weapon = 0;
        this.weaponDurability = 100;
        this.skin = skin;
        this.hair = hair;
        this.shirt = shirt;
        this.actionsUsed = { food: false, medical: false, interact: false };
        
        // For multiplayer: which player controls this character (null = NPC/AI)
        this.playerId = null;
        
        // Birthday system
        this.birthMonth = birthMonth;
        this.birthDay = birthDay;
        this.birthYear = birthYear;
    }

    /**
     * Generate random birthday based on age category
     * @param {Date} currentDate - The current game date
     */
    generateRandomBirthday(currentDate = new Date()) {
        const currentYear = currentDate.getFullYear();
        
        let minAge, maxAge;
        switch (this.age) {
            case 0: // teen
                minAge = 13;
                maxAge = 30;
                break;
            case 1: // adult
                minAge = 31;
                maxAge = 60;
                break;
            case 2: // elder
                minAge = 61;
                maxAge = 80;
                break;
            default:
                minAge = 20;
                maxAge = 40;
        }
        
        const actualAge = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
        this.birthMonth = Math.floor(Math.random() * 12);
        this.birthDay = Math.floor(Math.random() * 28) + 1;
        
        const birthDateThisYear = new Date(currentYear, this.birthMonth, this.birthDay);
        if (currentDate < birthDateThisYear) {
            this.birthYear = currentYear - actualAge - 1;
        } else {
            this.birthYear = currentYear - actualAge;
        }
    }

    /**
     * Get actual age in years
     * @param {Date} currentDate
     * @returns {number}
     */
    getActualAge(currentDate = new Date()) {
        let age = currentDate.getFullYear() - this.birthYear;
        const birthDateThisYear = new Date(currentDate.getFullYear(), this.birthMonth, this.birthDay);
        if (currentDate < birthDateThisYear) {
            age--;
        }
        return age;
    }

    /**
     * Get age category based on actual age
     * @param {Date} currentDate
     * @returns {number} 0=teen, 1=adult, 2=elder
     */
    getAgeCategory(currentDate = new Date()) {
        const actualAge = this.getActualAge(currentDate);
        if (actualAge <= 30) return 0;
        if (actualAge <= 60) return 1;
        return 2;
    }

    /**
     * Check if today is character's birthday
     * @param {Date} currentDate
     * @returns {boolean}
     */
    isBirthday(currentDate = new Date()) {
        return currentDate.getMonth() === this.birthMonth && currentDate.getDate() === this.birthDay;
    }

    /**
     * Get formatted birthday string
     * @returns {string}
     */
    getBirthdayString() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[this.birthMonth]} ${this.birthDay}`;
    }

    /**
     * Reset per-turn actions
     */
    resetActions() {
        this.actionsUsed = { food: false, medical: false, interact: false };
    }

    /**
     * Get normalized ID (for compatibility)
     * @returns {string}
     */
    getCharacterId() {
        return this.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Process hunger for this turn
     * @returns {boolean} true if character survives, false if died from hunger
     */
    checkHunger() {
        this.hunger -= 0.5;
        return this.hunger >= 0;
    }

    /**
     * Cap all attributes within valid bounds
     */
    capAttributes() {
        if (this.morale > moraleArray.length - 1) {
            this.morale = moraleArray.length - 1;
        }
        if (this.hunger > hungerArray.length - 1) {
            this.hunger = hungerArray.length - 1;
        }
        if (this.health > 9) {
            this.health = 9;
        }
        if (this.health < 0) {
            this.health = 0;
        }
        if (this.morale < 0) {
            this.morale = 0;
        }
        
        // Trait-based relationship caps
        if (this.relationships.size > 0) {
            for (const [other, level] of this.relationships) {
                if (this.posTrait === 'friendly' && level === 0) {
                    this.relationships.set(other, 1);
                }
                if (this.negTrait === 'disconnected' && level === 4) {
                    this.relationships.set(other, 3);
                }
            }
        }
    }

    /**
     * Get hunger status text
     * @returns {string}
     */
    getHungerStatus() {
        return hungerArray[Math.round(this.hunger)];
    }

    /**
     * Get health status text
     * @returns {string}
     */
    getHealthStatus() {
        return healthArray[this.health];
    }

    /**
     * Get morale status text
     * @returns {string}
     */
    getMoraleStatus() {
        return moraleArray[this.morale];
    }

    /**
     * Get age category text
     * @returns {string}
     */
    getAgeStatus() {
        return ageArray[this.age];
    }

    /**
     * Check if character is still viable
     * @returns {boolean}
     */
    isViable() {
        return this.health > 0 && this.hunger > 0 && this.morale > 0;
    }

    /**
     * Serialize character for storage/transfer
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            age: this.age,
            morale: this.morale,
            hunger: this.hunger,
            health: this.health,
            sick: this.sick,
            infected: this.infected,
            posTrait: this.posTrait,
            negTrait: this.negTrait,
            relationships: Array.from(this.relationships.entries()).map(([char, level]) => ({
                characterId: char.id,
                level
            })),
            weapon: this.weapon,
            weaponDurability: this.weaponDurability,
            skin: this.skin,
            hair: this.hair,
            shirt: this.shirt,
            actionsUsed: this.actionsUsed,
            playerId: this.playerId,
            birthMonth: this.birthMonth,
            birthDay: this.birthDay,
            birthYear: this.birthYear
        };
    }

    /**
     * Create character from serialized data
     * @param {Object} data
     * @param {Map<number, Character>} characterMap - For restoring relationships
     * @returns {Character}
     */
    static fromJSON(data, characterMap = new Map()) {
        const char = new Character(
            data.name,
            data.age,
            data.posTrait,
            data.negTrait,
            data.skin,
            data.hair,
            data.shirt,
            data.birthMonth,
            data.birthDay,
            data.birthYear
        );
        char.id = data.id;
        char.morale = data.morale;
        char.hunger = data.hunger;
        char.health = data.health;
        char.sick = data.sick;
        char.infected = data.infected;
        char.weapon = data.weapon;
        char.weaponDurability = data.weaponDurability;
        char.actionsUsed = data.actionsUsed;
        char.playerId = data.playerId;
        
        // Relationships restored after all characters loaded
        char._pendingRelationships = data.relationships;
        
        return char;
    }

    /**
     * Restore relationships after all characters are loaded
     * @param {Map<number, Character>} characterMap
     */
    restoreRelationships(characterMap) {
        if (this._pendingRelationships) {
            for (const rel of this._pendingRelationships) {
                const other = characterMap.get(rel.characterId);
                if (other) {
                    this.relationships.set(other, rel.level);
                }
            }
            delete this._pendingRelationships;
        }
    }
}

export default Character;
