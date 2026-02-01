/**
 * Web Renderer - Browser-based game interface
 * Implements render interface for web DOM manipulation
 */

import { Renderer } from './core/renderer.interface.js';
import { 
    hungerArray, healthArray, moraleArray, ageArray, 
    weapons, posTraits, negTraits, relationships, relationshipEmojis 
} from './core/constants.js';

export class WebRenderer extends Renderer {
    constructor() {
        super();
        this.initialized = false;
        this.pendingPromise = null;
        this.pendingResolve = null;
        this.hasPlayedTurn = false; // Track if any turn has been played
    }

    async initialize() {
        this.initialized = true;
        // Clear any existing content
        const currentEventDiv = document.getElementById('currentEvent');
        if (currentEventDiv) currentEventDiv.innerHTML = '';
        
        console.log('WebRenderer initialized');
    }

    /**
     * Sanitize text using DOMPurify if available
     */
    sanitize(html) {
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html);
        }
        // Fallback: escape HTML entities
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    async displayEvent(text, style = { type: 'normal' }) {
        const currentEventDiv = document.getElementById('currentEvent');
        if (!currentEventDiv) return;

        // Map style types to CSS classes
        const styleClass = {
            'normal': 'default',
            'danger': 'danger',
            'warning': 'orange',
            'success': 'success',
            'info': 'info'
        }[style.type] || 'default';

        const sanitizedText = this.sanitize(`<span class="${styleClass}">${text}</span>`);
        
        if (currentEventDiv.innerHTML !== '') {
            currentEventDiv.innerHTML += ' ' + sanitizedText;
        } else {
            currentEventDiv.innerHTML = sanitizedText;
        }
    }

    async displayEvents(events) {
        for (const event of events) {
            await this.displayEvent(event.text, event.style);
        }
    }

    /**
     * Create inline buttons for choice prompts
     */
    async promptChoice(prompt, options, config = {}) {
        return new Promise((resolve) => {
            const gameButtons = document.getElementById('gameButtons');
            if (!gameButtons) {
                console.error('gameButtons div not found');
                resolve(options[0]?.id || 'default');
                return;
            }

            // Clear existing buttons
            gameButtons.innerHTML = '';

            // Add prompt text
            const promptDiv = document.createElement('div');
            promptDiv.className = 'prompt-text';
            promptDiv.textContent = prompt;
            gameButtons.appendChild(promptDiv);

            // Create buttons for each option
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'choice-buttons';

            for (const opt of options) {
                const button = document.createElement('button');
                button.className = 'choice-btn';
                button.textContent = opt.label;
                if (opt.description) {
                    button.title = opt.description;
                }
                if (opt.disabled) {
                    button.disabled = true;
                    button.className += ' disabled';
                }

                button.addEventListener('click', () => {
                    // Clear the buttons after selection
                    gameButtons.innerHTML = '';
                    resolve(opt.id);
                });

                buttonsDiv.appendChild(button);
            }

            gameButtons.appendChild(buttonsDiv);
        });
    }

    async promptConfirm(prompt, config = {}) {
        const result = await this.promptChoice(prompt, [
            { id: 'yes', label: 'Yes' },
            { id: 'no', label: 'No' }
        ], config);
        return result === 'yes';
    }

    async promptInput(prompt, config = {}) {
        return new Promise((resolve) => {
            const gameButtons = document.getElementById('gameButtons');
            if (!gameButtons) {
                resolve(config.default || '');
                return;
            }

            gameButtons.innerHTML = '';

            const promptDiv = document.createElement('div');
            promptDiv.className = 'prompt-text';
            promptDiv.textContent = prompt;
            gameButtons.appendChild(promptDiv);

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'prompt-input';
            if (config.default) input.value = config.default;
            gameButtons.appendChild(input);

            const submitBtn = document.createElement('button');
            submitBtn.className = 'choice-btn';
            submitBtn.textContent = 'Submit';
            submitBtn.addEventListener('click', () => {
                gameButtons.innerHTML = '';
                resolve(input.value || config.default || '');
            });
            gameButtons.appendChild(submitBtn);

            input.focus();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    gameButtons.innerHTML = '';
                    resolve(input.value || config.default || '');
                }
            });
        });
    }

    async updateStats(character) {
        const characterDiv = document.getElementById(this.getCharacterId(character.name));
        if (!characterDiv) return;

        // Update stat values
        const healthStat = characterDiv.querySelector('#healthStat');
        const hungerStat = characterDiv.querySelector('#hungerStat');
        const moraleStat = characterDiv.querySelector('#moraleStat');
        const weaponStat = characterDiv.querySelector('#weapon');

        if (healthStat) {
            healthStat.innerHTML = `Health: <span class="statValue">${healthArray[character.health]}</span>`;
        }
        if (hungerStat) {
            hungerStat.innerHTML = `Hunger: <span class="statValue">${hungerArray[Math.round(character.hunger)]}</span>`;
        }
        if (moraleStat) {
            moraleStat.innerHTML = `Morale: <span class="statValue">${moraleArray[character.morale]}</span>`;
        }
        if (weaponStat) {
            if (character.weapon === 0) {
                weaponStat.innerHTML = `Weapon: <span class="statValue">${weapons[character.weapon][0]}</span>`;
            } else {
                weaponStat.innerHTML = `Weapon: <span class="statValue">${weapons[character.weapon][0]} (${character.weaponDurability}/${weapons[character.weapon][2]})</span>`;
            }
        }

        // Update stat bars
        this.updateStatBars(character);

        // Update weapon sprite
        this.updateWeaponSprite(character);
    }

    /**
     * Silent refresh of party UI after character death
     * Updates DOM without verbose output
     */
    async refreshPartyUI(characters, inventory) {
        await this.displayPartyStatus(characters);
        await this.displayInventory(inventory, { characters });
    }

    updateStatBars(character) {
        const characterDiv = document.getElementById(this.getCharacterId(character.name));
        if (!characterDiv) return;

        const healthBar = characterDiv.querySelector('.health');
        const hungerBar = characterDiv.querySelector('.hunger');
        const moraleBar = characterDiv.querySelector('.morale');
        const weaponBar = characterDiv.querySelector('.weapon');

        if (healthBar) this.updateBar(healthBar, (character.health / (healthArray.length - 1)) * 100);
        if (hungerBar) this.updateBar(hungerBar, (character.hunger / (hungerArray.length - 1)) * 100);
        if (moraleBar) this.updateBar(moraleBar, (character.morale / (moraleArray.length - 1)) * 100);

        if (weaponBar && character.weapon !== 0) {
            const maxDurability = weapons[character.weapon][2];
            this.updateBar(weaponBar, (character.weaponDurability / maxDurability) * 100);
        } else if (weaponBar) {
            this.updateBar(weaponBar, 0);
        }
    }

    updateBar(bar, value) {
        bar.style.setProperty('--width', `${value}%`);
        bar.style.setProperty('--background-color', this.getBarColor(value));
    }

    getBarColor(percentage) {
        if (percentage < 30) return "rgba(128, 0, 0, 0.5)";
        if (percentage < 60) return "rgba(128, 128, 0, 0.5)";
        return "rgba(0, 128, 0, 0.5)";
    }

    updateWeaponSprite(character) {
        const characterDiv = document.getElementById(this.getCharacterId(character.name));
        if (!characterDiv) return;

        const weaponImg = characterDiv.querySelector('.weaponSprite img');
        if (!weaponImg) return;

        const weaponType = weapons[character.weapon][0];
        if (weaponType === 'fist') {
            // Extract skin tone from path: images/skin/skin_light.png -> light
            const skinFile = character.skin?.split('/').pop() || 'skin_light.png';
            const skinTone = skinFile.replace('skin_', '').replace('.png', '');
            weaponImg.src = `images/weapons/weapon_fist_${skinTone}.png`;
        } else {
            weaponImg.src = `images/weapons/weapon_${weaponType}.png`;
        }
    }

    /**
     * Get a normalized ID for use in HTML/CSS
     */
    getCharacterId(name) {
        return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Extract style from path for outline images
     * e.g., "images/hair/hair_short-fluffy_blonde.png" -> "hair_short-fluffy"
     * e.g., "images/shirts/shirt_vest_blue.png" -> "shirt_vest"
     */
    extractStyleFromPath(path, type) {
        if (!path) return type === 'hair' ? 'hair_short-straight' : 'shirt_vest';
        
        // Get filename without extension
        const filename = path.split('/').pop().split('.')[0];
        // Split by underscore and take first two parts (type_style)
        const parts = filename.split('_');
        if (parts.length >= 2) {
            return `${parts[0]}_${parts[1]}`;
        }
        return type === 'hair' ? 'hair_short-straight' : 'shirt_vest';
    }

    async displayPartyStatus(characters) {
        // Update campsite image based on party size
        this.updateCampsiteImage(characters.length);

        // Remove elements for characters no longer in the party
        const charactersDiv = document.getElementById('characters');
        if (charactersDiv) {
            const currentCharacterNames = new Set(characters.map(c => this.getCharacterId(c.name)));
            const existingElements = charactersDiv.querySelectorAll('.character');
            for (const element of existingElements) {
                if (!currentCharacterNames.has(element.id)) {
                    element.remove();
                }
            }
        }

        // Update each character's display
        for (const character of characters) {
            // Create character element if it doesn't exist
            const characterDiv = document.getElementById(this.getCharacterId(character.name));
            if (!characterDiv) {
                this.createCharacterElement(character);
            }
            
            await this.updateStats(character);
            this.updateRelationships(character, characters);
        }
    }

    updateCampsiteImage(partySize) {
        const eventImage = document.getElementById('eventImage');
        if (eventImage) {
            const size = Math.min(4, Math.max(1, partySize));
            eventImage.src = `images/campsite/campsite${size}.png`;
        }
    }

    updateRelationships(character, allCharacters) {
        const characterDiv = document.getElementById(this.getCharacterId(character.name));
        if (!characterDiv) return;

        const relationshipsDiv = characterDiv.querySelector('.relationships');
        if (!relationshipsDiv) return;

        relationshipsDiv.innerHTML = '';

        // Create container for interaction avatars
        const interactionContainer = document.createElement('div');
        interactionContainer.className = 'interaction-avatars';

        // Check if this character can still interact
        const canInteract = !character.actionsUsed || !character.actionsUsed.interact;

        for (const [otherChar, level] of character.relationships) {
            // Only show characters still in the party
            if (!allCharacters.includes(otherChar)) continue;

            const avatarWrapper = document.createElement('div');
            avatarWrapper.className = 'interaction-avatar-wrapper';

            // Create clickable button with mini avatar
            const avatarBtn = document.createElement('button');
            avatarBtn.className = 'interaction-avatar-btn';
            avatarBtn.title = canInteract 
                ? `Talk to ${otherChar.name} (${relationships[level] || 'neutral'})`
                : 'Already interacted this turn';
            avatarBtn.disabled = !canInteract;
            avatarBtn.dataset.fromCharacter = character.name;
            avatarBtn.dataset.toCharacter = otherChar.name;

            // Create mini avatar layers container
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'mini-avatar-layers';

            // Skin layer
            const skinImg = document.createElement('img');
            skinImg.src = otherChar.skin || 'images/skin/skin_light.png';
            skinImg.className = 'mini-avatar-layer';
            avatarContainer.appendChild(skinImg);

            // Hair layer
            const hairImg = document.createElement('img');
            hairImg.src = otherChar.hair || 'images/hair/hair_short-straight_brown.png';
            hairImg.className = 'mini-avatar-layer';
            avatarContainer.appendChild(hairImg);

            // Shirt layer
            const shirtImg = document.createElement('img');
            shirtImg.src = otherChar.shirt || 'images/shirts/shirt_vest_blue.png';
            shirtImg.className = 'mini-avatar-layer';
            avatarContainer.appendChild(shirtImg);

            avatarBtn.appendChild(avatarContainer);
            avatarWrapper.appendChild(avatarBtn);

            // Add relationship emoji
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'relationship-emoji';
            emojiSpan.textContent = relationshipEmojis[level] || '👤';
            emojiSpan.title = relationships[level] || 'neutral';
            avatarWrapper.appendChild(emojiSpan);

            interactionContainer.appendChild(avatarWrapper);
        }

        relationshipsDiv.appendChild(interactionContainer);
    }

    async displayInventory(inventory, party = null) {
        const partyInventoryDiv = document.getElementById('partyInventory');
        if (!partyInventoryDiv) return;

        const categories = inventory.getItemsByCategory();
        const characters = party ? party.characters : [];

        // Clear and rebuild inventory
        partyInventoryDiv.innerHTML = '<h3>🎒 Party Inventory</h3>';

        if (inventory.isEmpty()) {
            const emptyP = document.createElement('p');
            emptyP.className = 'empty';
            emptyP.textContent = 'Inventory is empty';
            partyInventoryDiv.appendChild(emptyP);
        } else {
            if (categories.food.length > 0) {
                const foodDiv = document.createElement('div');
                foodDiv.className = 'inv-category';
                foodDiv.innerHTML = '<h4>🍖 Food</h4>';
                for (const item of categories.food) {
                    const itemDiv = this.createInventoryItem(item, 'food', characters);
                    foodDiv.appendChild(itemDiv);
                }
                partyInventoryDiv.appendChild(foodDiv);
            }

            if (categories.medical.length > 0) {
                const medDiv = document.createElement('div');
                medDiv.className = 'inv-category';
                medDiv.innerHTML = '<h4>💊 Medical</h4>';
                for (const item of categories.medical) {
                    const itemDiv = this.createInventoryItem(item, 'medical', characters);
                    medDiv.appendChild(itemDiv);
                }
                partyInventoryDiv.appendChild(medDiv);
            }

            if (categories.weapons.length > 0) {
                const weaponDiv = document.createElement('div');
                weaponDiv.className = 'inv-category';
                weaponDiv.innerHTML = '<h4>⚔️ Weapons</h4>';
                for (const item of categories.weapons) {
                    const itemDiv = this.createInventoryItem(item, 'weapon', characters);
                    weaponDiv.appendChild(itemDiv);
                }
                partyInventoryDiv.appendChild(weaponDiv);
            }
        }

        // Update character action dropdowns
        this.updateActionDropdowns(inventory);
    }

    /**
     * Create an inventory item element with mini avatars for quick equip
     */
    createInventoryItem(item, type, characters) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inv-item';

        // Item info
        const infoSpan = document.createElement('span');
        infoSpan.className = 'item-info';
        if (type === 'weapon') {
            const weaponDef = weapons.find(w => w[0] === item.name);
            const dmg = weaponDef ? weaponDef[1] : '?';
            infoSpan.textContent = `${item.name} x${item.quantity} (DMG: ${dmg})`;
        } else {
            infoSpan.textContent = `${item.name} x${item.quantity} (+${item.value})`;
        }
        itemDiv.appendChild(infoSpan);

        // Mini avatars for quick equip
        const eligibleChars = this.getEligibleCharacters(item, type, characters);
        if (eligibleChars.length > 0) {
            const avatarsDiv = document.createElement('div');
            avatarsDiv.className = 'mini-avatars';

            for (const character of eligibleChars) {
                const btn = document.createElement('button');
                btn.className = 'mini-avatar-btn';
                btn.title = `Give ${item.name} to ${character.name}`;
                btn.dataset.itemName = item.name;
                btn.dataset.itemType = type;
                btn.dataset.characterName = character.name;

                // Create layered avatar
                const layers = document.createElement('div');
                layers.className = 'mini-avatar-layers';

                const skinImg = document.createElement('img');
                skinImg.src = character.skin || 'images/skin/skin_light.png';
                skinImg.className = 'mini-avatar-layer';
                layers.appendChild(skinImg);

                const hairImg = document.createElement('img');
                hairImg.src = character.hair || 'images/hair/hair_short-straight_brown.png';
                hairImg.className = 'mini-avatar-layer';
                layers.appendChild(hairImg);

                const shirtImg = document.createElement('img');
                shirtImg.src = character.shirt || 'images/shirts/shirt_vest_blue.png';
                shirtImg.className = 'mini-avatar-layer';
                layers.appendChild(shirtImg);

                btn.appendChild(layers);
                avatarsDiv.appendChild(btn);
            }

            itemDiv.appendChild(avatarsDiv);
        }

        return itemDiv;
    }

    /**
     * Get characters eligible to receive an item
     */
    getEligibleCharacters(item, type, characters) {
        if (!characters || characters.length === 0) return [];

        const maxHunger = hungerArray.length - 1;
        const maxHealth = healthArray.length - 1;

        if (type === 'food') {
            // Characters not full and haven't used food action, sorted by hunger
            return characters
                .filter(c => c.hunger < maxHunger && (!c.actionsUsed || !c.actionsUsed.food))
                .sort((a, b) => a.hunger - b.hunger);
        }

        if (type === 'medical') {
            // Characters not at full health and haven't used medical action
            return characters
                .filter(c => c.health < maxHealth && (!c.actionsUsed || !c.actionsUsed.medical))
                .sort((a, b) => a.health - b.health);
        }

        if (type === 'weapon') {
            // Characters with weaker weapon
            const weaponDef = weapons.find(w => w[0] === item.name);
            if (!weaponDef) return [];
            const itemDamage = weaponDef[1];
            return characters
                .filter(c => {
                    const charWeapon = weapons.find(w => w[0] === weapons[c.weapon]?.[0]);
                    const charDamage = charWeapon ? charWeapon[1] : 0;
                    return charDamage < itemDamage;
                })
                .sort((a, b) => {
                    const aWeapon = weapons.find(w => w[0] === weapons[a.weapon]?.[0]);
                    const bWeapon = weapons.find(w => w[0] === weapons[b.weapon]?.[0]);
                    return (aWeapon ? aWeapon[1] : 0) - (bWeapon ? bWeapon[1] : 0);
                });
        }

        return [];
    }

    updateActionDropdowns(inventory) {
        const categories = inventory.getItemsByCategory();
        const charactersDiv = document.getElementById('characters');
        if (!charactersDiv) return;

        const characterDivs = charactersDiv.querySelectorAll('.character');
        for (const charDiv of characterDivs) {
            // Update food select
            const foodSelect = charDiv.querySelector('#foodSelect');
            if (foodSelect) {
                this.updateSelectOptions(foodSelect, categories.food, 'food');
            }

            // Update medical select
            const medicalSelect = charDiv.querySelector('#medicalSelect');
            if (medicalSelect) {
                this.updateSelectOptions(medicalSelect, categories.medical, 'medical');
            }

            // Update weapon select
            const weaponSelect = charDiv.querySelector('#weaponSelect');
            if (weaponSelect) {
                this.updateSelectOptions(weaponSelect, categories.weapons, 'weapon');
            }
        }
    }

    updateSelectOptions(select, items, type) {
        // Keep first option (default)
        while (select.options.length > 1) {
            select.remove(1);
        }

        for (const item of items) {
            const option = document.createElement('option');
            option.value = item.name;
            if (type === 'weapon') {
                const weaponDef = weapons.find(w => w[0] === item.name);
                option.textContent = `${item.name} (DMG: ${weaponDef ? weaponDef[1] : '?'})`;
            } else {
                option.textContent = `${item.name} (+${item.value})`;
            }
            select.appendChild(option);
        }
    }

    async notifyPlayerTurn(playerId, characterName, combatState) {
        await this.displayEvent(`${characterName}'s turn!`, { type: 'info' });
    }

    async promptCombatAction(playerId, characterName, options) {
        const currentWeaponName = options.currentWeapon ? options.currentWeapon[0] : 'fist';
        const choices = [{ id: 'attack', label: `Attack (${currentWeaponName})` }];
        
        if (options.canEquipWeapon && options.bestWeaponUpgrade) {
            const currentName = options.currentWeapon ? options.currentWeapon[0] : 'fist';
            const upgradeName = options.bestWeaponUpgrade[0];
            choices.push({ id: 'weapon', label: `Equip ${upgradeName} (swap ${currentName})` });
        }
        if (options.canUseFood) {
            choices.push({ id: 'food', label: `Use Food (${options.hungerState || 'hungry'})` });
        }
        if (options.canUseMedical) {
            choices.push({ id: 'medical', label: `Use Medical (${options.healthState || 'injured'})` });
        }

        return await this.promptChoice(`${characterName}'s action:`, choices);
    }

    async promptAttackTarget(playerId, characterName, enemies) {
        return await this.promptChoice(`Choose target for ${characterName}:`, enemies);
    }

    async displayCombat(combatState) {
        const gameButtons = document.getElementById('gameButtons');
        if (!gameButtons) return;

        let html = '<div class="combat-display">';
        html += '<h3>⚔️ COMBAT</h3>';

        // Enemies
        html += '<div class="combat-enemies"><strong>Enemies:</strong>';
        for (const enemy of combatState.enemies) {
            if (enemy.hp > 0) {
                const type = combatState.isSurvivorCombat ? 'Survivor' : 'Zombie';
                const hpPercent = (enemy.hp / (enemy.maxHp || 8)) * 100;
                html += `<div class="combat-entity enemy">`;
                html += `<span class="name">${type}</span>`;
                html += `<div class="hp-bar"><div class="hp-fill" style="width: ${hpPercent}%"></div></div>`;
                html += `<span class="hp-text">${enemy.hp} HP</span>`;
                html += `</div>`;
            }
        }
        html += '</div>';

        // Party
        html += '<div class="combat-party"><strong>Party:</strong>';
        for (const player of combatState.players) {
            if (player.character.health > 0) {
                const hpPercent = (player.character.health / 9) * 100;
                html += `<div class="combat-entity player">`;
                html += `<span class="name">${player.name}</span>`;
                html += `<div class="hp-bar"><div class="hp-fill" style="width: ${hpPercent}%"></div></div>`;
                html += `<span class="hp-text">${player.character.health} HP</span>`;
                html += `</div>`;
            }
        }
        html += '</div>';

        html += '</div>';

        // Insert before any buttons
        const existingCombat = gameButtons.querySelector('.combat-display');
        if (existingCombat) {
            existingCombat.outerHTML = html;
        } else {
            gameButtons.insertAdjacentHTML('afterbegin', html);
        }
    }

    async clearCombat() {
        const gameButtons = document.getElementById('gameButtons');
        if (!gameButtons) return;

        const combatDisplay = gameButtons.querySelector('.combat-display');
        if (combatDisplay) {
            combatDisplay.remove();
        }
    }

    async handleGameOver(stats) {
        const gameButtons = document.getElementById('gameButtons');
        if (!gameButtons) return;

        let html = '<div class="game-over">';
        html += '<h2>💀 GAME OVER</h2>';
        html += '<p>Your party has fallen. Here are your final stats:</p>';
        html += '<div class="stats-grid">';
        html += `<div class="stat-item"><span class="label">🧟 Zombies Killed:</span> <span class="value">${stats.zombiesKilled}</span></div>`;
        html += `<div class="stat-item"><span class="label">👥 Party Members:</span> <span class="value">${stats.totalPartyMembers}</span></div>`;
        html += `<div class="stat-item"><span class="label">⚔️ Favourite Weapon:</span> <span class="value">${stats.favouriteWeapon || 'None'}</span></div>`;
        html += `<div class="stat-item"><span class="label">🍖 Food Eaten:</span> <span class="value">${stats.foodEaten}</span></div>`;
        html += `<div class="stat-item"><span class="label">💊 Medical Used:</span> <span class="value">${stats.medicalUsed}</span></div>`;

        if (stats.longestSurvivor?.name) {
            html += `<div class="stat-item highlight"><span class="label">🏆 Longest Survivor:</span> <span class="value">${stats.longestSurvivor.name} (${stats.longestSurvivor.turns} turns)</span></div>`;
        }

        html += '</div>';
        html += '<button class="choice-btn restart-btn" onclick="location.reload()">Play Again</button>';
        html += '</div>';

        gameButtons.innerHTML = html;

        // Hide play button
        const playButton = document.getElementById('playButton');
        if (playButton) playButton.style.display = 'none';
    }

    async updateTurnDisplay(turnNumber, timeOfDay, formattedDate) {
        const dayCounter = document.getElementById('day');
        if (dayCounter) {
            const timeLabel = timeOfDay === 'day' ? 'Day' : 'Night';
            dayCounter.textContent = `${timeLabel} (${formattedDate})`;
        }

        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.textContent = `Play Turn ${turnNumber}`;
        }

        // Only archive current events after a turn has been played
        // (not at game initialization when intro text is in currentEvent)
        if (this.hasPlayedTurn) {
            this.archiveCurrentEvents(turnNumber);
        }
    }

    /**
     * Mark that a turn has been played - enables event archiving
     */
    markTurnPlayed() {
        this.hasPlayedTurn = true;
    }

    archiveCurrentEvents(turnNumber) {
        const currentEventDiv = document.getElementById('currentEvent');
        const eventsDiv = document.getElementById('events');
        
        if (currentEventDiv && eventsDiv && currentEventDiv.textContent.trim()) {
            const eventItem = document.createElement('div');
            eventItem.id = `turn${turnNumber - 1}`;
            eventItem.className = (turnNumber - 1) % 2 === 0 ? 'even' : 'odd';
            eventItem.innerHTML = currentEventDiv.innerHTML;
            
            // Insert after the first child (title) or at beginning
            if (eventsDiv.children.length > 1) {
                eventsDiv.insertBefore(eventItem, eventsDiv.children[1]);
            } else {
                eventsDiv.appendChild(eventItem);
            }
            
            currentEventDiv.innerHTML = '';
        }
    }

    /**
     * Create character DOM element with avatar
     */
    createCharacterElement(character) {
        const charactersDiv = document.getElementById('characters');
        if (!charactersDiv) return;

        const characterDiv = document.createElement('div');
        characterDiv.id = this.getCharacterId(character.name);
        characterDiv.className = 'character';

        // Avatar container
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'avatar';
        avatarContainer.style.position = 'relative';

        // Trait sprites
        avatarContainer.appendChild(this.createTraitSprite(character.posTrait, 'pos'));
        avatarContainer.appendChild(this.createTraitSprite(character.negTrait, 'neg'));

        // Main avatar sprite layers
        const avatar = document.createElement('div');
        avatar.className = 'avatarSprite';

        // Extract style from paths for outlines
        // hair path: images/hair/hair_short-fluffy_blonde.png -> outline_hair_short-fluffy.png
        // shirt path: images/shirts/shirt_vest_blue.png -> outline_shirt_vest.png
        const hairStyle = this.extractStyleFromPath(character.hair, 'hair');
        const shirtStyle = this.extractStyleFromPath(character.shirt, 'shirt');

        // Hair outline
        const hairOutline = document.createElement('img');
        hairOutline.src = `images/hair/outline_${hairStyle}.png`;
        avatar.appendChild(hairOutline);

        // Shirt outline
        const shirtOutline = document.createElement('img');
        shirtOutline.src = `images/shirts/outline_${shirtStyle}.png`;
        avatar.appendChild(shirtOutline);

        // Skin
        const skinImg = document.createElement('img');
        skinImg.src = character.skin || 'images/skin/skin_light.png';
        skinImg.alt = `${character.name}'s skin`;
        avatar.appendChild(skinImg);

        // Hair
        const hairImg = document.createElement('img');
        hairImg.src = character.hair || 'images/hair/hair_short-straight_brown.png';
        hairImg.alt = `${character.name}'s hair`;
        avatar.appendChild(hairImg);

        // Shirt
        const shirtImg = document.createElement('img');
        shirtImg.src = character.shirt || 'images/shirts/shirt_vest_blue.png';
        shirtImg.alt = `${character.name}'s shirt`;
        avatar.appendChild(shirtImg);

        avatarContainer.appendChild(avatar);

        // Weapon sprite
        avatarContainer.appendChild(this.createWeaponSprite(character));

        characterDiv.appendChild(avatarContainer);

        // Name row with relationships
        const nameRow = document.createElement('div');
        nameRow.className = 'name-row';

        const nameElement = document.createElement('h2');
        nameElement.className = 'name';
        nameElement.textContent = character.name;
        nameRow.appendChild(nameElement);

        const relationshipsDiv = document.createElement('div');
        relationshipsDiv.className = 'relationships';
        nameRow.appendChild(relationshipsDiv);

        characterDiv.appendChild(nameRow);

        // Stats container
        characterDiv.appendChild(this.createStatsContainer(character));

        // Options container (dropdowns)
        characterDiv.appendChild(this.createOptionsContainer(character));

        charactersDiv.appendChild(characterDiv);
    }

    createTraitSprite(trait, type) {
        const container = document.createElement('div');
        container.className = type === 'pos' ? 'posTraitSprite' : 'negTraitSprite';
        const img = document.createElement('img');
        img.src = `images/traits/trait_${trait}.png`;
        img.alt = `${trait} trait`;
        container.appendChild(img);
        return container;
    }

    createWeaponSprite(character) {
        const container = document.createElement('div');
        container.className = 'weaponSprite';
        const img = document.createElement('img');
        
        const weaponType = weapons[character.weapon || 0][0];
        if (weaponType === 'fist') {
            // Extract skin tone from path: images/skin/skin_light.png -> light
            const skinFile = character.skin?.split('/').pop() || 'skin_light.png';
            const skinTone = skinFile.replace('skin_', '').replace('.png', '');
            img.src = `images/weapons/weapon_fist_${skinTone}.png`;
        } else {
            img.src = `images/weapons/weapon_${weaponType}.png`;
        }
        img.alt = `${character.name}'s weapon`;
        container.appendChild(img);
        return container;
    }

    createStatsContainer(character) {
        const container = document.createElement('div');
        container.id = 'playerStats';

        // Weapon
        const weapon = document.createElement('div');
        weapon.className = 'stat weapon';
        weapon.id = 'weapon';
        if (character.weapon === 0) {
            weapon.innerHTML = `Weapon: <span class="statValue">${weapons[0][0]}</span>`;
        } else {
            weapon.innerHTML = `Weapon: <span class="statValue">${weapons[character.weapon][0]} (${character.weaponDurability}/${weapons[character.weapon][2]})</span>`;
        }
        container.appendChild(weapon);

        // Hunger
        const hunger = document.createElement('div');
        hunger.className = 'stat hunger';
        hunger.id = 'hungerStat';
        hunger.innerHTML = `Hunger: <span class="statValue">${hungerArray[Math.round(character.hunger)]}</span>`;
        container.appendChild(hunger);

        // Health
        const health = document.createElement('div');
        health.className = 'stat health';
        health.id = 'healthStat';
        health.innerHTML = `Health: <span class="statValue">${healthArray[character.health]}</span>`;
        container.appendChild(health);

        // Morale
        const morale = document.createElement('div');
        morale.className = 'stat morale';
        morale.id = 'moraleStat';
        morale.innerHTML = `Morale: <span class="statValue">${moraleArray[character.morale]}</span>`;
        container.appendChild(morale);

        // Age
        const age = document.createElement('div');
        age.className = 'stat age';
        age.innerHTML = `Age: <span class="statValue">${ageArray[character.age]}</span>`;
        age.title = `Born ${this.getBirthdayString(character)}`;
        age.style.cursor = 'help';
        container.appendChild(age);

        // Traits
        const posTrait = document.createElement('div');
        posTrait.className = 'stat pos-trait';
        posTrait.innerHTML = `Positive: <span class="statValue">${character.posTrait}</span>`;
        container.appendChild(posTrait);

        const negTrait = document.createElement('div');
        negTrait.className = 'stat neg-trait';
        negTrait.innerHTML = `Negative: <span class="statValue">${character.negTrait}</span>`;
        container.appendChild(negTrait);

        return container;
    }

    getBirthdayString(character) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[character.birthMonth]} ${character.birthDay}, ${character.birthYear}`;
    }

    createOptionsContainer(character) {
        const container = document.createElement('div');
        container.id = 'options';
        container.innerHTML = `<p>Options for ${character.name}</p>`;

        // Food select
        const foodSelect = document.createElement('select');
        foodSelect.id = 'foodSelect';
        foodSelect.innerHTML = `<option value="">Feed ${character.name}</option>`;
        container.appendChild(foodSelect);

        // Medical select
        const medicalSelect = document.createElement('select');
        medicalSelect.id = 'medicalSelect';
        medicalSelect.innerHTML = `<option value="">Heal ${character.name}</option>`;
        container.appendChild(medicalSelect);

        // Weapon select
        const weaponSelect = document.createElement('select');
        weaponSelect.id = 'weaponSelect';
        weaponSelect.innerHTML = `<option value="">Equip weapon</option>`;
        container.appendChild(weaponSelect);

        // Interaction select
        const interactSelect = document.createElement('select');
        interactSelect.id = 'interactionSelect';
        interactSelect.innerHTML = `<option value="">Interact with</option>`;
        container.appendChild(interactSelect);

        return container;
    }

    /**
     * Remove a character's DOM element
     */
    removeCharacterElement(characterName) {
        const charId = this.getCharacterId(characterName);
        const element = document.getElementById(charId);
        if (element) {
            element.remove();
        }
    }

    async promptCharacterCreation(availableNames, playerId = null) {
        // This will be handled by the character creation form
        // For now, return random values - the full form will be implemented separately
        const name = availableNames[0] || 'Survivor';
        
        return {
            name: name,
            age: Math.floor(Math.random() * 3),
            posTrait: posTraits[Math.floor(Math.random() * posTraits.length)][0],
            negTrait: negTraits[Math.floor(Math.random() * negTraits.length)][0],
            skin: 'images/skin/skin1.png',
            hair: 'images/hair/hair_1_black.png',
            shirt: 'images/shirts/shirt_1_red.png',
            birthMonth: Math.floor(Math.random() * 12),
            birthDay: Math.floor(Math.random() * 28) + 1,
            playerId
        };
    }

    /**
     * Show the play button
     */
    showPlayButton() {
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.style.display = 'initial';
        }
    }

    /**
     * Hide the play button
     */
    hidePlayButton() {
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.style.display = 'none';
        }
    }

    async clearTurn() {
        // Clear current event display (archiving happens in updateTurnDisplay)
    }

    async dispose() {
        console.log('WebRenderer disposed');
    }
}

export default WebRenderer;
