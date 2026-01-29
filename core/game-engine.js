/**
 * GameEngine - Core game logic
 * Platform-agnostic game mechanics, delegates all UI to renderer
 */

import { 
    food, medical, weapons, posTraits, negTraits,
    attackDescriptions, singleZombieVariations, multiZombieVariations,
    newCharacterFlavour, defaultNames,
    merchantIntroductions, personInNeedIntroductions, hostileSurvivorIntroductions,
    survivorFleeMessages, survivorGiveUpMessages, hostileSurvivorAttackDescriptions
} from './constants.js';
import { Character } from './character.js';

export class GameEngine {
    /**
     * @param {GameSession} session - The game session to operate on
     * @param {Renderer} renderer - The renderer for UI output
     */
    constructor(session, renderer) {
        this.session = session;
        this.renderer = renderer;
    }

    /**
     * Initialize a new game with first character
     * @param {Object} characterData - Initial character creation data
     */
    async initializeGame(characterData) {
        const character = this.createCharacterFromData(characterData);
        this.session.party.addCharacter(character);
        this.session.stats.recordNewPartyMember(character.name, this.session.turnNumber);
        this.session.status = 'playing';
        
        await this.renderer.displayEvent(`${character.name} sets up camp.`);
        await this.renderer.displayPartyStatus(this.session.party.characters);
    }

    /**
     * Create a character from form/input data
     * @param {Object} data
     * @returns {Character}
     */
    createCharacterFromData(data) {
        const age = data.age ?? Math.floor(Math.random() * 3);
        let birthYear = data.birthYear;
        
        // If birthday month/day provided but not year, calculate year based on age category
        if (data.birthMonth != null && data.birthDay != null && birthYear == null) {
            const currentYear = this.session.currentDate.getFullYear();
            switch (age) {
                case 0: // teen (13-30)
                    birthYear = currentYear - (Math.floor(Math.random() * 18) + 13);
                    break;
                case 1: // adult (31-60)
                    birthYear = currentYear - (Math.floor(Math.random() * 30) + 31);
                    break;
                case 2: // elder (61+)
                    birthYear = currentYear - (Math.floor(Math.random() * 20) + 61);
                    break;
                default:
                    birthYear = currentYear - 25;
            }
        }
        
        const character = new Character(
            data.name || this.session.getNextName(),
            age,
            data.posTrait ?? posTraits[Math.floor(Math.random() * posTraits.length)][0],
            data.negTrait ?? negTraits[Math.floor(Math.random() * negTraits.length)][0],
            data.skin,
            data.hair,
            data.shirt,
            data.birthMonth,
            data.birthDay,
            birthYear
        );
        
        if (data.birthMonth == null) {
            character.generateRandomBirthday(this.session.currentDate);
        }
        
        if (data.playerId) {
            character.playerId = data.playerId;
        }
        
        return character;
    }

    /**
     * Play a single turn
     */
    async playTurn() {
        // Show turn info first
        await this.renderer.updateTurnDisplay(
            this.session.turnNumber,
            this.session.timeOfDay,
            this.session.getFormattedDate()
        );

        // Check seasonal events at start of day
        if (this.session.timeOfDay === 'day') {
            await this.checkSeasonalEvents();
        }

        // Reset actions for all characters
        this.session.party.resetAllActions();

        // Process each character
        await this.updateParty();

        if (this.session.isGameOver()) {
            await this.handleGameOver();
            return;
        }

        // Random event
        const eventOccurred = await this.processRandomEvent();

        // Advance time for next turn
        this.session.advanceTime();

        // Clear ready states for next turn (multiplayer)
        if (this.session.isMultiplayer) {
            this.session.clearReadyStates();
        }
    }

    /**
     * Process all party members for the turn
     */
    async updateParty() {
        const charactersToProcess = [...this.session.party.characters];

        for (const character of charactersToProcess) {
            if (!this.session.party.characters.includes(character)) continue;

            // Check hunger
            if (character.checkHunger()) {
                await this.checkPosTraitEvents(character);
                await this.checkNegTraitEvents(character);
                await this.checkAgeEffects(character);
                
                if (this.session.timeOfDay === 'day') {
                    await this.checkBirthday(character);
                }

                character.capAttributes();
                await this.renderer.updateStats(character);

                // Sickness/infection effects
                await this.processSicknessEffects(character);
                
                // Low morale departure
                await this.processLowMorale(character);
            } else {
                // Handle hunger death
                await this.handleHungerDeath(character);
            }
        }
    }

    /**
     * Process sickness and infection for a character
     */
    async processSicknessEffects(character) {
        if (!character.sick && !character.infected) return;
        
        if (Math.random() < 0.1) {
            character.morale -= 1;
            await this.renderer.displayEvent(`${character.name} is not feeling very well.`);
            await this.renderer.updateStats(character);
        }

        if (Math.random() < 0.1) {
            character.health -= 1;
            await this.renderer.displayEvent(`${character.name} is feeling worse.`);
            
            if (character.health <= 0) {
                await this.renderer.displayEvent(`${character.name} succumbed to their illness.`);
                await this.handleCharacterDeath(character);
            } else {
                await this.renderer.updateStats(character);
            }
        }

        // Infection-specific effects
        if (character.infected) {
            if (Math.random() < 0.1) {
                await this.renderer.displayEvent(`${character.name} is feeling angry.`);
            }
            if (Math.random() < 0.1) {
                character.posTrait = posTraits[Math.floor(Math.random() * posTraits.length)][0];
                character.negTrait = negTraits[Math.floor(Math.random() * negTraits.length)][0];
                await this.renderer.displayEvent(`${character.name} is feeling strange.`);
                await this.renderer.updateStats(character);
            }
        }
    }

    /**
     * Process low morale character leaving
     */
    async processLowMorale(character) {
        if (character.morale > 0 || this.session.party.size <= 1) return;

        // Calculate steal chance based on relationships
        let totalRelationship = 0;
        const otherCharacters = this.session.party.characters.filter(c => c !== character);
        for (const other of otherCharacters) {
            totalRelationship += character.relationships.get(other) || 0;
        }
        const avgRelationship = totalRelationship / otherCharacters.length;
        const stealChance = 0.1 + (0.4 * (1 - (avgRelationship / 4)));

        if (Math.random() < stealChance) {
            const allItems = [];
            for (const f of food) {
                if (this.session.party.inventory.hasItem(f[0])) {
                    allItems.push(f[0]);
                }
            }
            for (const m of medical) {
                if (this.session.party.inventory.hasItem(m[0])) {
                    allItems.push(m[0]);
                }
            }

            if (allItems.length > 0) {
                const itemsToSteal = Math.min(1 + Math.floor(Math.random() * 2), allItems.length);
                for (let i = 0; i < itemsToSteal; i++) {
                    const stolenItem = allItems[Math.floor(Math.random() * allItems.length)];
                    this.session.party.inventory.removeItem(stolenItem);
                    await this.renderer.displayEvent(
                        `${character.name} took some ${stolenItem} with them.`,
                        { type: 'warning' }
                    );
                    const idx = allItems.indexOf(stolenItem);
                    if (idx > -1) allItems.splice(idx, 1);
                }
            }
        }

        await this.renderer.displayEvent(`${character.name} has lost all hope. They have left the party.`);
        await this.handleCharacterDeath(character);
    }

    /**
     * Handle hunger death (with satiated trait check)
     */
    async handleHungerDeath(character) {
        if (character.posTrait === 'satiated') {
            character.hunger = 0;
            await this.renderer.displayEvent(`${character.name} is starving but manages to hold on.`);
            
            if (Math.random() < 0.5) {
                character.morale -= 1;
                await this.renderer.displayEvent(`${character.name} is losing hope from the constant hunger.`);
            }
            if (Math.random() < 0.3) {
                character.health -= 1;
                await this.renderer.displayEvent(`${character.name}'s body is weakening from starvation.`);
            }
            
            character.capAttributes();
            await this.renderer.updateStats(character);

            if (character.health <= 0) {
                await this.renderer.displayEvent(`${character.name}'s body gave out from the strain of starvation.`);
                await this.handleCharacterDeath(character);
            }
        } else {
            await this.renderer.displayEvent(`${character.name} died of hunger.`);
            await this.handleCharacterDeath(character);
        }
    }

    /**
     * Handle death effects and removal
     */
    async handleCharacterDeath(character) {
        // Relationship morale effects
        const dyingWeapon = weapons[character.weapon];
        let worstWeaponCharacter = null;
        let worstWeaponDamage = Infinity;

        for (const remainingCharacter of this.session.party.characters) {
            if (remainingCharacter === character) continue;

            const relationship = remainingCharacter.relationships.get(character) || 1;
            const moraleChange = [1, 0, -1, -2, -3][relationship];
            remainingCharacter.morale += moraleChange;
            remainingCharacter.capAttributes();
            await this.renderer.updateStats(remainingCharacter);

            // Track character with worst weapon
            if (remainingCharacter.isViable()) {
                const currentDamage = weapons[remainingCharacter.weapon][1];
                if (currentDamage < dyingWeapon[1] && currentDamage < worstWeaponDamage) {
                    worstWeaponCharacter = remainingCharacter;
                    worstWeaponDamage = currentDamage;
                }
            }
        }

        // Weapon inheritance
        if (worstWeaponCharacter) {
            const oldWeapon = weapons[worstWeaponCharacter.weapon];
            if (oldWeapon[0] !== 'fist') {
                this.session.party.inventory.addItem([oldWeapon[0], worstWeaponCharacter.weaponDurability]);
                await this.renderer.displayEvent(`The party collects ${worstWeaponCharacter.name}'s ${oldWeapon[0]}.`);
            }
            worstWeaponCharacter.weapon = character.weapon;
            worstWeaponCharacter.weaponDurability = character.weaponDurability;
            await this.renderer.displayEvent(
                `${worstWeaponCharacter.name} takes ${character.name}'s ${dyingWeapon[0]}.`
            );
        } else if (dyingWeapon[0] !== 'fist') {
            const livingCharacters = this.session.party.characters.filter(c => c !== character && c.isViable());
            if (livingCharacters.length > 0) {
                this.session.party.inventory.addItem([dyingWeapon[0], character.weaponDurability]);
                await this.renderer.displayEvent(`The party collects ${character.name}'s ${dyingWeapon[0]}.`);
            }
        }

        this.session.handleCharacterDeparture(character);
    }

    /**
     * Check positive trait events
     */
    async checkPosTraitEvents(character) {
        if (character.posTrait === 'resilient' && Math.random() < 0.1) {
            character.health += 1;
            await this.renderer.displayEvent(`${character.name} is feeling a bit better.`);
        }

        if (character.posTrait === 'scavenger' && Math.random() < 0.1) {
            const foodType = food[Math.floor(Math.random() * food.length)];
            const variation = foodType[2][Math.floor(Math.random() * foodType[2].length)];
            await this.renderer.displayEvent(`${character.name} was able to scavenge ${variation} (${foodType[0]}).`);
            this.session.party.inventory.addItem(foodType);
        }

        if (character.posTrait === 'optimistic') {
            if (Math.random() < 0.1) {
                character.morale += 1;
                await this.renderer.displayEvent(`${character.name} looks happy today.`);
            }
            if (character.morale < 2) {
                character.morale += 2;
                await this.renderer.displayEvent(`${character.name} clings on to hope.`);
            }
        }
    }

    /**
     * Check negative trait events
     */
    async checkNegTraitEvents(character) {
        if (character.negTrait === 'hungry' && this.session.turnNumber % 2 === 0) {
            character.hunger -= 0.5;
        }

        if (character.negTrait === 'hypochondriac' && Math.random() < 0.1) {
            const medicalItems = [];
            for (const medItem of medical) {
                if (this.session.party.inventory.hasItem(medItem[0])) {
                    medicalItems.push(medItem[0]);
                }
            }
            if (medicalItems.length > 0) {
                const item = medicalItems[Math.floor(Math.random() * medicalItems.length)];
                this.session.party.inventory.removeItem(item);
                await this.renderer.displayEvent(`${character.name} used the ${item} but it had no effect.`);
            }
        }

        if (character.negTrait === 'depressed') {
            if (Math.random() < 0.1) {
                character.morale -= 1;
                await this.renderer.displayEvent(`${character.name} has been crying.`);
            }
            if (character.morale > 7) {
                character.morale -= 2;
            }
        }

        if (character.negTrait === 'clumsy' && Math.random() < 0.1) {
            character.health -= 1;
            await this.renderer.displayEvent(`${character.name} tripped and hurt themself.`);
            if (character.health <= 0) {
                await this.handleCharacterDeath(character);
            } else {
                await this.renderer.updateStats(character);
            }
        }
    }

    /**
     * Check age effects
     */
    async checkAgeEffects(character) {
        const oldCategory = character.age;
        const newCategory = character.getAgeCategory(this.session.currentDate);

        if (newCategory !== oldCategory) {
            character.age = newCategory;
            if (newCategory > oldCategory) {
                await this.renderer.displayEvent(
                    `${character.name} has grown older and is now ${character.getAgeStatus()}.`
                );
            }
        }

        // Teen bonus
        if (character.age === 0 && Math.random() < 0.15) {
            character.morale += 1;
            await this.renderer.displayEvent(`${character.name}'s youthful energy keeps their spirits up.`);
        }

        // Elder penalty
        if (character.age === 2 && Math.random() < 0.1) {
            character.health -= 1;
            await this.renderer.displayEvent(`${character.name} is feeling their age today.`);
            if (character.health <= 0) {
                await this.renderer.displayEvent(`${character.name}'s body couldn't take the strain.`);
                await this.handleCharacterDeath(character);
            }
        }
    }

    /**
     * Check if it's character's birthday
     */
    async checkBirthday(character) {
        if (!character.isBirthday(this.session.currentDate)) return;

        const age = character.getActualAge(this.session.currentDate);
        await this.renderer.displayEvent(
            `🎂 Happy Birthday, ${character.name}! They are now ${age} years old!`,
            { type: 'success' }
        );

        // Birthday character gets +1 morale
        character.morale += 1;

        const isSolo = this.session.party.size === 1;
        
        // Party celebration
        if (isSolo) {
            await this.renderer.displayEvent(`${character.name} takes a moment to celebrate.`);
        } else {
            // Everyone else gets +1 morale
            for (const other of this.session.party.characters) {
                if (other === character) continue;
                other.morale += 1;
                other.capAttributes();
                await this.renderer.updateStats(other);
            }
            await this.renderer.displayEvent(`The party celebrates ${character.name}'s birthday!`);
        }

        character.capAttributes();
        await this.renderer.updateStats(character);

        // Birthday gifts
        await this.giveBirthdayGifts(character, isSolo);
    }

    /**
     * Give birthday gifts - dessert + random weapon or medical
     */
    async giveBirthdayGifts(character, isSolo) {
        // Always give dessert
        const dessert = food.find(f => f[0] === 'dessert');
        if (dessert) {
            const variation = dessert[2][Math.floor(Math.random() * dessert[2].length)];
            if (isSolo) {
                await this.renderer.displayEvent(`${character.name} found ${variation} as a birthday treat!`);
            } else {
                await this.renderer.displayEvent(`${character.name} received ${variation} as a birthday treat!`);
            }
            this.session.party.inventory.addItem(dessert);
        }

        // 50/50 chance of weapon or medical
        if (Math.random() < 0.5) {
            // Medical item
            const medicalType = medical[Math.floor(Math.random() * medical.length)];
            if (isSolo) {
                await this.renderer.displayEvent(`${character.name} also found a ${medicalType[0]}!`);
            } else {
                await this.renderer.displayEvent(`${character.name} also received a ${medicalType[0]} as a gift!`);
            }
            this.session.party.inventory.addItem(medicalType);
        } else {
            // Weapon (randomized durability)
            const weaponType = weapons[Math.floor(Math.random() * (weapons.length - 1)) + 1];
            const maxDurability = weaponType[2];
            const durability = Math.floor(maxDurability * (0.5 + Math.random() * 0.5));
            if (isSolo) {
                await this.renderer.displayEvent(`${character.name} also found a ${weaponType[0]}!`);
            } else {
                await this.renderer.displayEvent(`${character.name} also received a ${weaponType[0]} as a gift!`);
            }
            this.session.party.inventory.addItem([weaponType[0], durability]);
        }
    }

    /**
     * Check for seasonal events
     */
    async checkSeasonalEvents() {
        const month = this.session.currentDate.getMonth();
        const day = this.session.currentDate.getDate();

        // Halloween (Oct 31)
        if (month === 9 && day === 31) {
            const eventKey = `halloween_${this.session.currentDate.getFullYear()}`;
            if (!this.session.triggeredSeasonalEvents.has(eventKey)) {
                this.session.triggeredSeasonalEvents.add(eventKey);
                await this.renderer.displayEvent(`🎃 Happy Halloween! The zombies look extra spooky today...`, { type: 'info' });
            }
        }

        // Christmas (Dec 25)
        if (month === 11 && day === 25) {
            const eventKey = `christmas_${this.session.currentDate.getFullYear()}`;
            if (!this.session.triggeredSeasonalEvents.has(eventKey)) {
                this.session.triggeredSeasonalEvents.add(eventKey);
                await this.renderer.displayEvent(`🎄 Merry Christmas! The party finds some holiday cheer.`, { type: 'success' });
                for (const character of this.session.party.characters) {
                    character.morale += 2;
                    character.capAttributes();
                }
            }
        }

        // New Year (Jan 1)
        if (month === 0 && day === 1) {
            const eventKey = `newyear_${this.session.currentDate.getFullYear()}`;
            if (!this.session.triggeredSeasonalEvents.has(eventKey)) {
                this.session.triggeredSeasonalEvents.add(eventKey);
                await this.renderer.displayEvent(`🎆 Happy New Year! A fresh start...`, { type: 'success' });
            }
        }
    }

    /**
     * Process random event for the turn
     * @returns {boolean} Whether a special interactive event occurred
     */
    async processRandomEvent() {
        const chance = Math.random();
        const who = this.session.party.size === 1 
            ? this.session.party.characters[0].name 
            : 'The party';

        // Calculate probabilities based on party size and time
        let friendChance = this.session.party.isFull() ? 0 : 0.2 - (this.session.party.size * 0.05);
        let enemyChance = 0.15;
        let itemChance = 0.4;
        let doubleItemChance = 0.05 + (this.session.party.size * 0.05);

        // Night adjustments
        if (this.session.timeOfDay === 'night') {
            friendChance = 0;
            enemyChance = 0.25;
            itemChance = 0.25;
            doubleItemChance = 0;
        }

        const thresholds = {
            friend: friendChance,
            enemy: friendChance + enemyChance,
            item: friendChance + enemyChance + itemChance,
            doubleItem: friendChance + enemyChance + itemChance + doubleItemChance,
            illness: friendChance + enemyChance + itemChance + doubleItemChance + 0.05,
            miniEvent: friendChance + enemyChance + itemChance + doubleItemChance + 0.1
        };

        if (chance <= thresholds.friend && !this.session.party.isFull()) {
            // Skip NPC joining in multiplayer (Discord) - only player-controlled characters
            if (!this.session.isMultiplayer) {
                await this.foundFriend();
                return true;
            }
            // In multiplayer, fall through to find an item instead
            await this.findRandomItem(who);
            return true;
        } else if (chance <= thresholds.enemy) {
            // 20% chance survivor encounter, 80% zombie
            if (Math.random() < 0.2) {
                await this.foundSurvivor();
            } else {
                await this.startCombat();
            }
            return true;
        } else if (chance <= thresholds.doubleItem) {
            const itemCount = chance > thresholds.item ? 2 : 1;
            for (let i = 0; i < itemCount; i++) {
                await this.findRandomItem(who);
            }
        } else if (chance <= thresholds.illness) {
            await this.processIllnessEvent();
        } else if (chance <= thresholds.miniEvent) {
            await this.processMiniEvent();
        } else {
            await this.processIdleEvent();
        }

        return false;
    }

    /**
     * Find a random item (food, medical, or weapon)
     */
    async findRandomItem(who) {
        const roll = Math.random();
        if (roll < 0.33) {
            const foodType = food[Math.floor(Math.random() * food.length)];
            const variation = foodType[2][Math.floor(Math.random() * foodType[2].length)];
            const location = foodType[3][Math.floor(Math.random() * foodType[3].length)];
            await this.renderer.displayEvent(`${who} found ${variation} (${foodType[0]}) ${location}.`);
            this.session.party.inventory.addItem(foodType);
        } else if (roll < 0.66) {
            const medicalType = medical[Math.floor(Math.random() * medical.length)];
            const location = medicalType[2][Math.floor(Math.random() * medicalType[2].length)];
            await this.renderer.displayEvent(`${who} found medical supplies (${medicalType[0]}) ${location}.`);
            this.session.party.inventory.addItem(medicalType);
        } else {
            const weaponType = weapons[Math.floor(Math.random() * (weapons.length - 1)) + 1];
            // Randomize durability to 50-100% of max
            const maxDurability = weaponType[2];
            const durability = Math.floor(maxDurability * (0.5 + Math.random() * 0.5));
            await this.renderer.displayEvent(`${who} found a ${weaponType[0]}.`);
            this.session.party.inventory.addItem([weaponType[0], durability]);
        }
    }

    /**
     * Found a new friend encounter
     */
    async foundFriend() {
        const name = this.session.getNextName();
        const flavour = newCharacterFlavour[Math.floor(Math.random() * newCharacterFlavour.length)];
        
        await this.renderer.displayEvent(`A survivor named ${name} approaches your camp. ${flavour}`);
        
        const accept = await this.renderer.promptConfirm(`Do you want ${name} to join your party?`);
        
        if (accept) {
            // Generate random character data for NPCs (not player-created)
            const characterData = {
                name: name,
                age: Math.floor(Math.random() * 3),
                posTrait: posTraits[Math.floor(Math.random() * posTraits.length)][0],
                negTrait: negTraits[Math.floor(Math.random() * negTraits.length)][0]
            };
            
            const character = this.createCharacterFromData(characterData);
            this.session.party.addCharacter(character);
            this.session.stats.recordNewPartyMember(character.name, this.session.turnNumber);
            
            // 60% chance to bring an item
            let itemMessage = '';
            if (Math.random() < 0.6) {
                const itemType = Math.random();
                if (itemType <= 0.4) {
                    // Food
                    const foodType = food[Math.floor(Math.random() * food.length)];
                    const variation = foodType[2][Math.floor(Math.random() * foodType[2].length)];
                    this.session.party.inventory.addItem(foodType);
                    itemMessage = ` They brought ${variation} (${foodType[0]}) with them.`;
                } else if (itemType <= 0.7) {
                    // Medical
                    const medicalType = medical[Math.floor(Math.random() * medical.length)];
                    this.session.party.inventory.addItem(medicalType);
                    itemMessage = ` They brought medical supplies (${medicalType[0]}) with them.`;
                } else {
                    // Weapon - equip directly
                    const weaponType = weapons[Math.floor(Math.random() * (weapons.length - 1)) + 1];
                    character.weapon = weapons.indexOf(weaponType);
                    character.weaponDurability = weaponType[2];
                    itemMessage = ` They brought a ${weaponType[0]} with them.`;
                }
            }
            
            await this.renderer.displayEvent(`${name} has joined the party!${itemMessage}`, { type: 'success' });
            
            // Boost morale for existing party members
            for (const other of this.session.party.characters) {
                if (other !== character) {
                    other.morale += 1;
                    other.capAttributes();
                }
            }
            
            await this.renderer.displayPartyStatus(this.session.party.characters);
        } else {
            await this.renderer.displayEvent(`${name} nods sadly and walks away.`);
        }
    }

    /**
     * Random survivor encounter (merchant, person in need, hostile)
     */
    async foundSurvivor() {
        const roll = Math.random();
        
        if (roll < 0.4) {
            await this.merchantEncounter();
        } else if (roll < 0.7) {
            await this.personInNeedEncounter();
        } else {
            await this.hostileSurvivorEncounter();
        }
    }

    /**
     * Merchant encounter - offers trade
     */
    async merchantEncounter() {
        this.session.pendingEncounter = 'merchant';
        
        const intro = merchantIntroductions[Math.floor(Math.random() * merchantIntroductions.length)];
        await this.renderer.displayEvent(intro + '.');
        
        // Get a random item from party inventory
        const partyItems = this.session.party.inventory.getAllItems();
        
        if (partyItems.length === 0) {
            await this.renderer.displayEvent('They look at your empty packs and walk away disappointed.');
            this.session.pendingEncounter = null;
            return;
        }
        
        const partyItem = partyItems[Math.floor(Math.random() * partyItems.length)];
        
        // Get a random item the merchant offers
        let merchantItem = this.getRandomMerchantItem();
        let attempts = 0;
        while (merchantItem[0] === partyItem.name && attempts < 10) {
            merchantItem = this.getRandomMerchantItem();
            attempts++;
        }
        
        if (merchantItem[0] === partyItem.name) {
            await this.renderer.displayEvent('They look at your inventory, shrug, and walk away.');
            this.session.pendingEncounter = null;
            return;
        }
        
        await this.renderer.displayEvent(`They offer to trade you a ${merchantItem[0]} for your ${partyItem.name}.`);
        
        // Prompt player choice
        const choice = await this.renderer.promptChoice('What do you do?', [
            { id: 'accept', label: 'Accept Trade', description: `Get ${merchantItem[0]}, lose ${partyItem.name}` },
            { id: 'decline', label: 'Decline', description: 'Send them away peacefully' },
            { id: 'steal', label: 'Attempt to Steal', description: 'Risky - they may fight back' }
        ]);
        
        if (choice === 'accept') {
            this.session.party.inventory.removeItem(partyItem.name);
            this.session.party.inventory.addItem(this.prepareItemForInventory(merchantItem));
            await this.renderer.displayEvent(`You trade your ${partyItem.name} for the ${merchantItem[0]}.`);
            this.session.stats.recordMerchantTradeAccepted();
        } else if (choice === 'decline') {
            await this.renderer.displayEvent('You politely decline. The survivor nods and walks away.');
            this.session.stats.recordMerchantTradeDeclined();
        } else if (choice === 'steal') {
            await this.attemptSteal(merchantItem);
        }
        
        this.session.pendingEncounter = null;
    }

    /**
     * Attempt to steal from merchant
     */
    async attemptSteal(merchantItem) {
        this.session.stats.recordMerchantStealAttempt();
        
        const roll = Math.random();
        if (roll < 0.25) {
            // Survivor flees
            const msg = survivorFleeMessages[Math.floor(Math.random() * survivorFleeMessages.length)];
            await this.renderer.displayEvent(msg);
        } else if (roll < 0.5) {
            // Survivor gives up the item
            const msg = survivorGiveUpMessages[Math.floor(Math.random() * survivorGiveUpMessages.length)];
            await this.renderer.displayEvent(msg);
            this.session.party.inventory.addItem(this.prepareItemForInventory(merchantItem));
        } else {
            // Survivor becomes hostile (50%)
            await this.renderer.displayEvent('The survivor draws a weapon and attacks!', { type: 'danger' });
            this.session.pendingEncounter = null; // Combat will handle blocking
            await this.startHostileSurvivorCombat(1);
        }
    }

    /**
     * Person in need encounter
     */
    async personInNeedEncounter() {
        this.session.pendingEncounter = 'personInNeed';
        
        const intro = personInNeedIntroductions[Math.floor(Math.random() * personInNeedIntroductions.length)];
        await this.renderer.displayEvent(intro + '.');
        
        // Randomly ask for food or medical
        const wantsFood = Math.random() < 0.5;
        const itemPool = wantsFood ? food : medical;
        const itemType = wantsFood ? 'food' : 'medical supplies';
        
        // Check if party has the item type
        const hasItem = itemPool.some(item => this.session.party.inventory.hasItem(item[0]));
        
        await this.renderer.displayEvent(wantsFood ? 'They beg for something to eat.' : 'They plead for medical supplies.');
        
        const options = [
            { id: 'give', label: hasItem ? `Give ${wantsFood ? 'food' : 'medical'}` : `No ${wantsFood ? 'food' : 'medical'} to give`, disabled: !hasItem, description: 'Help them' },
            { id: 'decline', label: 'Turn them away', description: 'May anger them' }
        ];
        
        const choice = await this.renderer.promptChoice('What do you do?', options);
        
        if (choice === 'give' && hasItem) {
            const itemToGive = itemPool.find(item => this.session.party.inventory.hasItem(item[0]));
            if (itemToGive) {
                this.session.party.inventory.removeItem(itemToGive[0]);
                await this.renderer.displayEvent(`You give them the ${itemToGive[0]}. They thank you profusely.`);
                this.session.stats.recordPersonInNeedHelped();
                
                // Boost party morale
                for (const character of this.session.party.characters) {
                    character.morale += 1;
                    character.capAttributes();
                }
                const who = this.session.party.size === 1 
                    ? `${this.session.party.characters[0].name} feels` 
                    : 'The party feels';
                await this.renderer.displayEvent(`${who} good about helping someone in need.`, { type: 'success' });
            }
        } else {
            this.session.stats.recordPersonInNeedDeclined();
            
            // 25% chance they become hostile
            if (Math.random() < 0.25) {
                await this.renderer.displayEvent('Desperation turns to rage. They attack!', { type: 'danger' });
                this.session.pendingEncounter = null; // Combat will handle blocking
                await this.startHostileSurvivorCombat(1);
                return;
            } else {
                await this.renderer.displayEvent('They look disappointed and shuffle away.');
            }
        }
        
        this.session.pendingEncounter = null;
    }

    /**
     * Hostile survivor encounter
     */
    async hostileSurvivorEncounter() {
        const partySize = this.session.party.size;
        const numberOfEnemies = Math.min(3, Math.floor(Math.random() * partySize) + 1);
        
        this.session.stats.recordHostileEncounter();
        
        const isSolo = partySize === 1;
        const introductions = isSolo ? hostileSurvivorIntroductions.solo : hostileSurvivorIntroductions.group;
        const intro = introductions[Math.floor(Math.random() * introductions.length)];
        await this.renderer.displayEvent(intro, { type: 'danger' });
        
        if (numberOfEnemies > 1) {
            await this.renderer.displayEvent(`${numberOfEnemies} hostile survivors surround you!`, { type: 'danger' });
        }
        
        await this.startHostileSurvivorCombat(numberOfEnemies);
    }

    /**
     * Start combat with hostile survivors
     */
    async startHostileSurvivorCombat(numberOfEnemies) {
        // Create survivors with 6-10 HP (tougher than zombies)
        const enemies = [];
        for (let i = 0; i < numberOfEnemies; i++) {
            const hp = 6 + Math.floor(Math.random() * 5);
            enemies.push({
                id: `enemy_${i}`,
                type: 'survivor',
                hp: hp,
                maxHp: hp,
                morale: Math.floor(Math.random() * 10),
                attack: 1 + Math.floor(Math.random() * 2) // 1-2 damage
            });
        }

        const players = this.session.party.characters.map(c => ({
            id: c.id,
            type: 'player',
            name: c.name,
            hp: c.health,
            morale: c.morale,
            attack: weapons[c.weapon][1],
            character: c
        }));

        // Sort by morale
        const combatants = [...players, ...enemies].sort((a, b) => b.morale - a.morale);

        this.session.inCombat = true;
        this.session.status = 'combat';
        this.session.combatState = { combatants, enemies, players, turnIndex: 0, isSurvivorCombat: true };

        await this.renderer.displayCombat(this.session.combatState);
        await this.runSurvivorCombat();
    }

    /**
     * Run survivor combat loop (no infection risk)
     */
    async runSurvivorCombat() {
        const state = this.session.combatState;
        
        while (state.enemies.some(e => e.hp > 0) && state.players.some(p => p.character.health > 0)) {
            const current = state.combatants[state.turnIndex % state.combatants.length];
            
            if (current.hp <= 0 || (current.character && current.character.health <= 0)) {
                state.turnIndex++;
                continue;
            }

            if (current.type === 'player') {
                await this.handlePlayerSurvivorCombatTurn(current);
            } else {
                await this.handleEnemySurvivorCombatTurn(current);
            }

            state.turnIndex++;
            await this.renderer.displayCombat(state);
        }

        // Combat ended
        if (state.enemies.every(e => e.hp <= 0)) {
            await this.renderer.displayEvent('All hostile survivors have been defeated!', { type: 'success' });
            
            // Chance to loot items
            if (Math.random() < 0.5) {
                const lootRoll = Math.random();
                if (lootRoll < 0.33) {
                    const foodItem = food[Math.floor(Math.random() * food.length)];
                    await this.renderer.displayEvent(`You find some food (${foodItem[0]}) on one of the survivors.`);
                    this.session.party.inventory.addItem(foodItem);
                } else if (lootRoll < 0.67) {
                    const medItem = medical[Math.floor(Math.random() * medical.length)];
                    await this.renderer.displayEvent(`You find some medical supplies (${medItem[0]}) on one of the survivors.`);
                    this.session.party.inventory.addItem(medItem);
                } else {
                    const weaponIndex = Math.floor(Math.random() * (weapons.length - 1)) + 1;
                    const weaponItem = weapons[weaponIndex];
                    // Randomize durability to 50-100% of max
                    const maxDurability = weaponItem[2];
                    const durability = Math.floor(maxDurability * (0.5 + Math.random() * 0.5));
                    await this.renderer.displayEvent(`You find a ${weaponItem[0]} on one of the survivors.`);
                    this.session.party.inventory.addItem([weaponItem[0], durability]);
                }
            }
            
            // Morale boost
            for (const character of this.session.party.characters) {
                if (character.health > 0) {
                    character.morale += 1;
                    character.capAttributes();
                }
            }
        }

        this.session.inCombat = false;
        this.session.status = 'playing';
        this.session.combatState = null;
    }

    /**
     * Handle player's turn in survivor combat
     */
    async handlePlayerSurvivorCombatTurn(player) {
        const character = player.character;
        const state = this.session.combatState;
        const validTargets = state.enemies.filter(e => e.hp > 0);

        if (validTargets.length === 0) return;

        const playerId = character.playerId || 'local';
        await this.renderer.notifyPlayerTurn(playerId, character.name, state);

        // Check if items can be used
        const canUseFood = !character.actionsUsed.food && food.some(f => this.session.party.inventory.hasItem(f[0]));
        const canUseMedical = !character.actionsUsed.medical && medical.some(m => this.session.party.inventory.hasItem(m[0]));
        const canEquipWeapon = weapons.slice(1).some(w => this.session.party.inventory.hasItem(w[0]));

        // Prompt for action choice
        const action = await this.renderer.promptCombatAction(playerId, character.name, {
            canAttack: true,
            canUseFood,
            canUseMedical,
            canEquipWeapon
        });

        if (action === 'food') {
            await this.handleCombatItemUse(character, 'food');
            return;
        } else if (action === 'medical') {
            await this.handleCombatItemUse(character, 'medical');
            return;
        } else if (action === 'weapon') {
            await this.handleCombatWeaponEquip(character);
            // Weapon swap doesn't use turn - continue to attack
        }

        const targetId = await this.renderer.promptAttackTarget(
            playerId,
            character.name,
            validTargets.map((e, i) => ({ id: e.id, label: `Survivor ${i + 1} (${e.hp} HP)`, hp: e.hp }))
        );

        const target = validTargets.find(e => e.id === targetId);
        if (!target) return;

        let damage = weapons[character.weapon][1];
        if (character.posTrait === 'fighter') damage += 1;

        const roll = Math.random();
        
        if (roll < 0.1) {
            await this.renderer.displayEvent(`${character.name} misses the survivor!`);
        } else if (character.negTrait === 'clumsy' && roll < 0.2) {
            character.health -= 1;
            await this.renderer.displayEvent(`${character.name} swings wildly and hurts themself!`);
            await this.renderer.updateStats(character);
            if (character.health <= 0) {
                await this.handleCharacterDeath(character);
            }
        } else {
            if (roll > 0.9) {
                damage *= 2;
                await this.renderer.displayEvent(`${character.name} lands a critical hit!`, { type: 'success' });
            } else {
                await this.renderer.displayEvent(`${character.name} attacks the survivor for ${damage} damage.`);
            }
            target.hp -= damage;
            
            this.session.stats.recordWeaponUse(weapons[character.weapon][0]);
            
            // Weapon durability
            if (character.weapon > 0) {
                let durabilityLoss = 1;
                if (character.posTrait === 'fighter' && Math.random() < 0.5) durabilityLoss = 0;
                if (character.negTrait === 'clumsy') durabilityLoss = 2;
                character.weaponDurability -= durabilityLoss;
                if (character.weaponDurability <= 0) {
                    await this.renderer.displayEvent(`${character.name}'s ${weapons[character.weapon][0]} breaks!`);
                    character.weapon = 0;
                    character.weaponDurability = weapons[0][2];
                }
                await this.renderer.updateStats(character);
            }

            if (target.hp <= 0) {
                await this.renderer.displayEvent('The hostile survivor is defeated!', { type: 'success' });
                this.session.stats.recordHostileSurvivorKill();
            }
        }
    }

    /**
     * Handle enemy survivor's combat turn (no infection risk)
     */
    async handleEnemySurvivorCombatTurn(enemy) {
        const state = this.session.combatState;
        const validTargets = state.players.filter(p => p.character.health > 0);

        if (validTargets.length === 0) return;

        const targetPlayer = validTargets[Math.floor(Math.random() * validTargets.length)];
        const target = targetPlayer.character;
        const roll = Math.random();

        if (roll < 0.2) {
            await this.renderer.displayEvent(`The survivor misses ${target.name}!`);
        } else {
            const attackDesc = hostileSurvivorAttackDescriptions[
                Math.floor(Math.random() * hostileSurvivorAttackDescriptions.length)
            ].replace('[NAME]', target.name);
            await this.renderer.displayEvent(`The survivor ${attackDesc}`, { type: 'warning' });
            
            target.health -= enemy.attack;
            if (target.negTrait === 'vulnerable') target.health -= 1;
            
            // No infection from survivor attacks
            
            await this.renderer.updateStats(target);
            
            if (target.health <= 0) {
                await this.handleCharacterDeath(target);
            }
        }
    }

    /**
     * Get a random item for merchant to offer
     */
    getRandomMerchantItem() {
        const roll = Math.random();
        if (roll < 0.4) {
            return food[Math.floor(Math.random() * food.length)];
        } else if (roll < 0.7) {
            return medical[Math.floor(Math.random() * medical.length)];
        } else {
            const weaponIndex = Math.floor(Math.random() * (weapons.length - 1)) + 1;
            return weapons[weaponIndex];
        }
    }

    /**
     * Prepare item for inventory - randomizes weapon durability if applicable
     * @param {Array} item - Item definition
     * @returns {Array} Item ready for inventory
     */
    prepareItemForInventory(item) {
        const isWeapon = weapons.some(w => w[0] === item[0]);
        if (isWeapon && item.length >= 3) {
            // Randomize durability to 50-100% of max
            const maxDurability = item[2];
            const durability = Math.floor(maxDurability * (0.5 + Math.random() * 0.5));
            return [item[0], durability];
        }
        return item;
    }

    /**
     * Start combat encounter
     * @param {boolean} isSurvivor - Fighting survivors instead of zombies
     */
    async startCombat(isSurvivor = false) {
        const partySize = this.session.party.size;
        const numberOfEnemies = Math.floor(Math.random() * partySize) + 1;

        if (numberOfEnemies === 1) {
            const variation = singleZombieVariations[Math.floor(Math.random() * singleZombieVariations.length)];
            await this.renderer.displayEvent(`A zombie ${variation}!`, { type: 'danger' });
        } else {
            const variation = multiZombieVariations[Math.floor(Math.random() * multiZombieVariations.length)];
            await this.renderer.displayEvent(`${numberOfEnemies} zombies ${variation}!`, { type: 'danger' });
        }

        // Create combatants
        const enemies = [];
        for (let i = 0; i < numberOfEnemies; i++) {
            enemies.push({
                id: `enemy_${i}`,
                type: 'zombie',
                hp: 4 + Math.floor(Math.random() * 4),
                maxHp: 8,
                morale: Math.floor(Math.random() * 10),
                attack: 1
            });
        }

        const players = this.session.party.characters.map(c => ({
            id: c.id,
            type: 'player',
            name: c.name,
            hp: c.health,
            morale: c.morale,
            attack: weapons[c.weapon][1],
            character: c
        }));

        // Sort by morale
        const combatants = [...players, ...enemies].sort((a, b) => b.morale - a.morale);

        this.session.inCombat = true;
        this.session.status = 'combat';
        this.session.combatState = { combatants, enemies, players, turnIndex: 0 };

        await this.renderer.displayCombat(this.session.combatState);
        await this.runCombat();
    }

    /**
     * Run combat loop
     */
    async runCombat() {
        const state = this.session.combatState;
        
        while (state.enemies.some(e => e.hp > 0) && state.players.some(p => p.character.health > 0)) {
            const current = state.combatants[state.turnIndex % state.combatants.length];
            
            if (current.hp <= 0 || (current.character && current.character.health <= 0)) {
                state.turnIndex++;
                continue;
            }

            if (current.type === 'player') {
                await this.handlePlayerCombatTurn(current);
            } else {
                await this.handleEnemyCombatTurn(current);
            }

            state.turnIndex++;
            await this.renderer.displayCombat(state);
        }

        // Combat ended
        if (state.enemies.every(e => e.hp <= 0)) {
            await this.renderer.displayEvent('All enemies have been defeated!', { type: 'success' });
            for (const character of this.session.party.characters) {
                if (character.health > 0) {
                    character.morale += 1;
                    character.capAttributes();
                }
            }
        }

        this.session.inCombat = false;
        this.session.status = 'playing';
        this.session.combatState = null;
    }

    /**
     * Handle player's combat turn
     */
    async handlePlayerCombatTurn(player) {
        const character = player.character;
        const state = this.session.combatState;
        const validTargets = state.enemies.filter(e => e.hp > 0);

        if (validTargets.length === 0) return;

        const playerId = character.playerId || 'local';
        await this.renderer.notifyPlayerTurn(playerId, character.name, state);

        // Check if items can be used
        const canUseFood = !character.actionsUsed.food && food.some(f => this.session.party.inventory.hasItem(f[0]));
        const canUseMedical = !character.actionsUsed.medical && medical.some(m => this.session.party.inventory.hasItem(m[0]));
        const canEquipWeapon = weapons.slice(1).some(w => this.session.party.inventory.hasItem(w[0]));

        // Prompt for action choice
        const action = await this.renderer.promptCombatAction(playerId, character.name, {
            canAttack: true,
            canUseFood,
            canUseMedical,
            canEquipWeapon
        });

        if (action === 'food') {
            await this.handleCombatItemUse(character, 'food');
            return; // Turn used for item, no attack
        } else if (action === 'medical') {
            await this.handleCombatItemUse(character, 'medical');
            return; // Turn used for item, no attack
        } else if (action === 'weapon') {
            await this.handleCombatWeaponEquip(character);
            // Weapon swap doesn't use turn - continue to attack
        }

        // Attack action
        const targetId = await this.renderer.promptAttackTarget(
            playerId,
            character.name,
            validTargets.map(e => ({ id: e.id, label: `Zombie (${e.hp} HP)`, hp: e.hp }))
        );

        const target = validTargets.find(e => e.id === targetId);
        if (!target) return;

        await this.performAttack(character, target, 'zombie');
    }

    /**
     * Handle item use during combat
     */
    async handleCombatItemUse(character, type) {
        const itemPool = type === 'food' ? food : medical;
        const availableItems = itemPool.filter(item => this.session.party.inventory.hasItem(item[0]));
        
        if (availableItems.length === 0) return;

        const itemOptions = availableItems.map(item => ({
            id: item[0],
            label: `${item[0]} (+${item[1]})`,
            description: type === 'food' ? 'Restore hunger' : 'Restore health'
        }));
        itemOptions.push({ id: 'cancel', label: '← Cancel', description: 'Go back' });

        const itemChoice = await this.renderer.promptChoice(`Use which ${type}?`, itemOptions);
        
        if (itemChoice === 'cancel') {
            // Recursively call combat turn to pick again
            const player = this.session.combatState.players.find(p => p.character === character);
            await this.handlePlayerCombatTurn(player);
            return;
        }

        if (type === 'food') {
            await this.useFood(character, itemChoice);
        } else {
            await this.useMedical(character, itemChoice);
        }
    }

    /**
     * Handle weapon equip during combat (free action)
     */
    async handleCombatWeaponEquip(character) {
        const availableWeapons = weapons.slice(1).filter(w => this.session.party.inventory.hasItem(w[0]));
        
        if (availableWeapons.length === 0) return;

        const weaponOptions = availableWeapons.map(w => {
            const inventoryItem = this.session.party.inventory.getItem(w[0]);
            const durability = inventoryItem ? inventoryItem.value : w[2];
            return {
                id: w[0],
                label: `${w[0]} (DMG: ${w[1]}, DUR: ${durability})`,
                description: `Damage: ${w[1]}`
            };
        });
        weaponOptions.push({ id: 'cancel', label: '← Keep current', description: `Keep ${weapons[character.weapon][0]}` });

        const weaponChoice = await this.renderer.promptChoice('Equip which weapon?', weaponOptions);
        
        if (weaponChoice === 'cancel') return;

        await this.equipWeapon(character, weaponChoice);
    }

    /**
     * Perform an attack on a target
     */
    async performAttack(character, target, targetType) {
        let damage = weapons[character.weapon][1];
        if (character.posTrait === 'fighter') damage += 1;

        const roll = Math.random();
        
        if (roll < 0.1) {
            await this.renderer.displayEvent(`${character.name} misses the ${targetType}!`);
        } else if (character.negTrait === 'clumsy' && roll < 0.2) {
            character.health -= 1;
            await this.renderer.displayEvent(`${character.name} swings wildly and hurts themself!`);
            await this.renderer.updateStats(character);
            if (character.health <= 0) {
                await this.handleCharacterDeath(character);
            }
        } else {
            if (roll > 0.9) {
                damage *= 2;
                await this.renderer.displayEvent(
                    attackDescriptions.critical[Math.floor(Math.random() * attackDescriptions.critical.length)]
                        .replace('[attacker]', character.name)
                );
            } else {
                const weaponName = weapons[character.weapon][0];
                const descriptions = attackDescriptions[weaponName] || attackDescriptions.fist;
                await this.renderer.displayEvent(
                    descriptions[Math.floor(Math.random() * descriptions.length)]
                        .replace('[attacker]', character.name)
                );
            }

            this.session.stats.recordWeaponUse(weapons[character.weapon][0]);
            target.hp -= damage;

            // Weapon durability
            if (character.weapon > 0) {
                let durabilityLoss = 1;
                if (character.posTrait === 'fighter' && Math.random() < 0.5) {
                    durabilityLoss = 0;
                } else if (character.negTrait === 'clumsy') {
                    durabilityLoss = 2;
                }
                
                character.weaponDurability -= durabilityLoss;
                if (character.weaponDurability <= 0) {
                    await this.renderer.displayEvent(`${character.name}'s ${weapons[character.weapon][0]} breaks!`);
                    character.weapon = 0;
                    character.weaponDurability = 100;
                }
                await this.renderer.updateStats(character);
            }

            if (target.hp <= 0) {
                await this.renderer.displayEvent(`The ${targetType} is defeated!`, { type: 'success' });
                this.session.stats.recordZombieKill(weapons[character.weapon][0]);
            }
        }
    }

    /**
     * Handle enemy's combat turn
     */
    async handleEnemyCombatTurn(enemy) {
        const validTargets = this.session.party.getLivingCharacters();
        if (validTargets.length === 0) return;

        const target = validTargets[Math.floor(Math.random() * validTargets.length)];
        const roll = Math.random();

        if (roll < 0.2) {
            await this.renderer.displayEvent(`The zombie misses ${target.name}!`);
        } else {
            await this.renderer.displayEvent(`The zombie attacks ${target.name}!`, { type: 'danger' });
            target.health -= enemy.attack;
            
            if (target.negTrait === 'vulnerable') {
                target.health -= 1;
            }
            if (Math.random() < 0.05) {
                target.infected = true;
                await this.renderer.displayEvent(`${target.name} has been infected!`, { type: 'danger' });
            }

            if (target.health <= 0) {
                target.health = 0;
                await this.renderer.displayEvent(`${target.name} has been killed!`, { type: 'danger' });
                await this.handleCharacterDeath(target);
            }
            await this.renderer.updateStats(target);
        }
    }

    /**
     * Process illness event
     */
    async processIllnessEvent() {
        const healthyCharacters = this.session.party.characters.filter(c => !c.sick);
        if (healthyCharacters.length === 0) return;

        const sickCharacter = healthyCharacters[Math.floor(Math.random() * healthyCharacters.length)];
        sickCharacter.health -= 1;
        sickCharacter.sick = true;
        
        await this.renderer.displayEvent(`${sickCharacter.name} is feeling queasy.`);
        
        if (sickCharacter.health <= 0) {
            await this.renderer.displayEvent(`${sickCharacter.name} succumbed to the sudden illness.`);
            await this.handleCharacterDeath(sickCharacter);
        } else {
            await this.renderer.updateStats(sickCharacter);
        }
    }

    /**
     * Process mini event based on party size
     */
    async processMiniEvent() {
        const partySize = this.session.party.size;

        if (partySize >= 3) {
            if (Math.random() < 0.5) {
                const name = this.session.party.characters[Math.floor(Math.random() * partySize)].name;
                await this.renderer.displayEvent(
                    `${name} found a pack of cards while looking through the ruins. The party plays a few rounds.`
                );
                for (const character of this.session.party.characters) {
                    character.morale += 1;
                    character.capAttributes();
                    await this.renderer.updateStats(character);
                }
            } else {
                await this.renderer.displayEvent(
                    'Rain begins to pelt down as the party tries to sleep. Their sleeping bags all end up getting soaked.'
                );
                for (const character of this.session.party.characters) {
                    character.morale -= 1;
                    character.capAttributes();
                    await this.renderer.updateStats(character);
                }
            }
        } else if (partySize === 2) {
            await this.processTwoPersonMiniEvent();
        } else {
            await this.processSoloMiniEvent();
        }
    }

    /**
     * Process two-person interaction event
     */
    async processTwoPersonMiniEvent() {
        const [char1, char2] = this.session.party.characters;
        
        let positiveModifier = 0;
        for (const char of [char1, char2]) {
            if (char.posTrait === 'friendly') positiveModifier += 0.2;
            if (char.posTrait === 'optimistic') positiveModifier += 0.2;
            if (char.negTrait === 'disconnected') positiveModifier -= 0.2;
            if (char.negTrait === 'depressed') positiveModifier -= 0.2;
        }
        const negativeChance = Math.max(0.1, Math.min(0.9, 0.5 - positiveModifier));

        if (Math.random() < negativeChance) {
            // Negative interaction - argument
            let foundFoodItem = null;
            for (const foodItem of food) {
                if (this.session.party.inventory.hasItem(foodItem[0])) {
                    foundFoodItem = foodItem;
                    break;
                }
            }
            
            if (foundFoodItem) {
                const variation = foundFoodItem[2][Math.floor(Math.random() * foundFoodItem[2].length)];
                await this.renderer.displayEvent(
                    `${char1.name} and ${char2.name} are arguing over who gets to eat ${variation}.`
                );
                char1.relationships.set(char2, (char1.relationships.get(char2) || 1) - 1);
                char2.relationships.set(char1, (char2.relationships.get(char1) || 1) - 1);
            }
        } else {
            // Positive interaction
            await this.renderer.displayEvent(
                `It's cold tonight, and ${char1.name} and ${char2.name} sit together by the fire.`
            );
            char1.relationships.set(char2, (char1.relationships.get(char2) || 1) + 1);
            char2.relationships.set(char1, (char2.relationships.get(char1) || 1) + 1);
        }
    }

    /**
     * Process solo mini event
     */
    async processSoloMiniEvent() {
        const character = this.session.party.characters[0];
        
        if (Math.random() < 0.5) {
            character.health -= 1;
            await this.renderer.displayEvent(`${character.name} tripped over a loose brick and hurt their leg.`);
            if (character.health <= 0) {
                await this.renderer.displayEvent(`${character.name} couldn't recover from the fall.`);
                await this.handleCharacterDeath(character);
            } else {
                await this.renderer.updateStats(character);
            }
        } else {
            character.morale += 1;
            character.capAttributes();
            await this.renderer.updateStats(character);
            await this.renderer.displayEvent(
                `${character.name} finds an old piano and plays around a bit. They're not very good at it, but it was fun.`
            );
        }
    }

    /**
     * Process idle/nothing event
     */
    async processIdleEvent() {
        const who = this.session.party.size === 1 
            ? this.session.party.characters[0].name 
            : 'The party';
        
        const events = this.session.party.size === 1
            ? [
                `${who} watches the clouds go by.`,
                `${who} stays in bed all day.`
            ]
            : [
                'A zombie approaches the party but immediately collapses.',
                'The party rests and recovers.'
            ];
        
        await this.renderer.displayEvent(events[Math.floor(Math.random() * events.length)]);
    }

    /**
     * Use food item on character
     */
    async useFood(character, itemName) {
        if (character.actionsUsed.food) return false;
        
        const foodItem = food.find(f => f[0] === itemName);
        if (!foodItem || !this.session.party.inventory.hasItem(itemName)) return false;

        this.session.party.inventory.removeItem(itemName);
        character.actionsUsed.food = true;
        
        let effectiveness = foodItem[1];
        if (character.posTrait === 'satiated') effectiveness += 0.5;
        if (character.negTrait === 'hungry' && (itemName === 'rations' || itemName === 'snack')) {
            await this.renderer.displayEvent(`${character.name}'s hunger trait negates the ${itemName}.`);
            this.session.stats.recordFoodEaten();
            return true;
        }
        
        character.hunger += effectiveness;
        if (itemName === 'dessert') character.morale += 1;
        character.capAttributes();
        
        await this.renderer.displayEvent(`${character.name} eats the ${itemName}.`);
        await this.renderer.updateStats(character);
        this.session.stats.recordFoodEaten();
        
        return true;
    }

    /**
     * Use medical item on character
     */
    async useMedical(character, itemName) {
        if (character.actionsUsed.medical) return false;
        
        const medicalItem = medical.find(m => m[0] === itemName);
        if (!medicalItem || !this.session.party.inventory.hasItem(itemName)) return false;

        this.session.party.inventory.removeItem(itemName);
        character.actionsUsed.medical = true;
        
        character.health += medicalItem[1];
        if (character.sick && Math.random() < 0.5) {
            character.sick = false;
            await this.renderer.displayEvent(`${character.name} has recovered from their illness!`);
        }
        if (character.infected) {
            const cureChance = character.posTrait === 'resilient' ? 0.3 : 0.1;
            if (Math.random() < cureChance) {
                character.infected = false;
                await this.renderer.displayEvent(`${character.name} has fought off the infection!`, { type: 'success' });
            }
        }
        character.capAttributes();
        
        await this.renderer.displayEvent(`${character.name} uses the ${itemName}.`);
        await this.renderer.updateStats(character);
        this.session.stats.recordMedicalUsed();
        
        return true;
    }

    /**
     * Equip weapon to character
     */
    async equipWeapon(character, itemName) {
        const weaponDef = weapons.find(w => w[0] === itemName);
        if (!weaponDef || !this.session.party.inventory.hasItem(itemName)) return false;

        // Return current weapon to inventory (if not fists)
        const currentWeapon = weapons[character.weapon];
        if (currentWeapon[0] !== 'fist') {
            this.session.party.inventory.addItem([currentWeapon[0], character.weaponDurability]);
        }

        // Get item from inventory to check durability
        const inventoryItem = this.session.party.inventory.getItem(itemName);
        const durability = inventoryItem ? inventoryItem.value : weaponDef[2];
        
        this.session.party.inventory.removeItem(itemName);
        character.weapon = weapons.indexOf(weaponDef);
        character.weaponDurability = durability;
        
        await this.renderer.displayEvent(`${character.name} equips the ${itemName}.`);
        await this.renderer.updateStats(character);
        
        return true;
    }

    /**
     * Have one character interact/talk with another
     * @param {Object} character - The character initiating the interaction
     * @param {Object} target - The character being talked to
     * @returns {Promise<Object>} - Result of the interaction
     */
    async interact(character, target) {
        // Check if initiating character has already interacted this turn
        if (character.actionsUsed.interact) {
            return { success: false, reason: 'already_interacted' };
        }

        // Mark initiator as having used their action
        // Target is also marked to prevent them from initiating later this turn
        character.actionsUsed.interact = true;
        target.actionsUsed.interact = true;

        // Calculate interaction probability modifier based on traits
        let positiveModifier = 0;
        for (const char of [character, target]) {
            if (char.posTrait === 'friendly') positiveModifier += 0.1;
            if (char.posTrait === 'optimistic') positiveModifier += 0.1;
            if (char.negTrait === 'disconnected') positiveModifier -= 0.1;
            if (char.negTrait === 'depressed') positiveModifier -= 0.1;
        }

        const chance = Math.random();
        const neutralThreshold = Math.max(0.2, Math.min(0.7, 0.5 - positiveModifier));
        const positiveThreshold = Math.max(0.5, Math.min(0.9, 0.75 + positiveModifier));

        let result;
        if (chance <= neutralThreshold) {
            // Neutral - no interest
            await this.renderer.displayEvent(`${target.name} is not interested in talking right now.`);
            result = { success: true, outcome: 'neutral' };
        } else if (chance <= positiveThreshold) {
            // Positive - relationship improves
            await this.renderer.displayEvent(`${target.name} is happy to chat with ${character.name}.`, { type: 'success' });
            const currentLevel = character.relationships.get(target) || 1;
            if (currentLevel < 4) {
                character.relationships.set(target, currentLevel + 1);
                target.relationships.set(character, (target.relationships.get(character) || 1) + 1);
                await this.renderer.displayEvent(`${character.name} and ${target.name} have grown closer.`, { type: 'info' });
            }
            result = { success: true, outcome: 'positive' };
        } else {
            // Negative - target is feeling down
            await this.renderer.displayEvent(`${target.name} is feeling down and doesn't want to talk.`);
            result = { success: true, outcome: 'negative' };
        }

        return result;
    }

    /**
     * Get available interaction targets for a character
     * @param {Object} character - The character who wants to interact
     * @returns {Array} - List of characters that can be talked to
     */
    getInteractionTargets(character) {
        if (character.actionsUsed.interact) {
            return [];
        }
        // Anyone can be a target - the restriction is only on initiating
        return this.session.party.characters.filter(c => c !== character);
    }

    /**
     * Handle game over
     */
    async handleGameOver() {
        const stats = this.session.endGame();
        await this.renderer.handleGameOver(stats);
    }
}

export default GameEngine;
