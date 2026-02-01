/**
 * The Wanderers - Web Entry Point
 * Uses core engine with web-specific renderer
 */

import { GameSession, GameEngine, posTraits, negTraits, defaultNames } from './core/index.js';
import { WebRenderer } from './web-renderer.js';

// Global game state
let session = null;
let engine = null;
let renderer = null;

/**
 * Generate a randomized start date
 * Random date within the last 2 years
 */
function getRandomStartDate() {
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    const timeDiff = now.getTime() - twoYearsAgo.getTime();
    const randomTime = Math.random() * timeDiff;
    
    return new Date(twoYearsAgo.getTime() + randomTime);
}

/**
 * Initialize the game
 */
async function initGame() {
    console.log('Initializing The Wanderers...');
    
    // Create renderer
    renderer = new WebRenderer();
    await renderer.initialize();
    
    // Create session with random start date
    const startDate = getRandomStartDate();
    session = new GameSession({
        startDate: startDate,
        isMultiplayer: false
    });
    
    // Create engine
    engine = new GameEngine(session, renderer);
    
    // Show character creation
    await showCharacterCreation();
}

/**
 * Show character creation form
 */
async function showCharacterCreation() {
    const gameButtons = document.getElementById('gameButtons');
    if (!gameButtons) return;
    
    const availableNames = [...defaultNames].sort(() => Math.random() - 0.5);
    const randomName = availableNames[0];
    const randomMonth = Math.floor(Math.random() * 12);
    const randomDay = Math.floor(Math.random() * 28) + 1;
    const randomAge = Math.floor(Math.random() * 3);
    
    // Random trait indices
    const randomPosTrait = Math.floor(Math.random() * posTraits.length);
    const randomNegTrait = Math.floor(Math.random() * negTraits.length);
    
    // Random appearance
    const skinOptions = ['skin_light.png', 'skin_light-mid.png', 'skin_mid.png', 'skin_dark-mid.png', 'skin_dark.png'];
    const hairStyleOptions = ['hair_short-straight', 'hair_short-fluffy', 'hair_long-straight', 'hair_long-curly'];
    const hairColorOptions = ['black.png', 'brown.png', 'blonde.png', 'ginger.png', 'red.png'];
    const shirtStyleOptions = ['shirt_vest', 'shirt_hoodie', 'shirt_jacket', 'shirt_scarf'];
    const shirtColorOptions = ['red.png', 'blue.png', 'green.png', 'yellow.png'];
    
    const randomSkin = Math.floor(Math.random() * skinOptions.length);
    const randomHairStyle = Math.floor(Math.random() * hairStyleOptions.length);
    const randomHairColor = Math.floor(Math.random() * hairColorOptions.length);
    const randomShirtStyle = Math.floor(Math.random() * shirtStyleOptions.length);
    const randomShirtColor = Math.floor(Math.random() * shirtColorOptions.length);
    
    gameButtons.innerHTML = `
        <p>Create a character to start the game.</p>
        <form id="characterForm">
            <label>Name: 
                <input type="text" id="charName" value="${randomName}" />
            </label>
            
            <label>Birth Month: 
                <select id="charBirthMonth">
                    ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                        .map((m, i) => `<option value="${i}" ${i === randomMonth ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
            </label>
            
            <label>Birth Day: 
                <select id="charBirthDay">
                    ${Array.from({length: 28}, (_, i) => `<option value="${i+1}" ${i+1 === randomDay ? 'selected' : ''}>${i+1}</option>`).join('')}
                </select>
            </label>
            
            <label>Age: 
                <select id="charAge">
                    <option value="0" ${randomAge === 0 ? 'selected' : ''}>teen</option>
                    <option value="1" ${randomAge === 1 ? 'selected' : ''}>adult</option>
                    <option value="2" ${randomAge === 2 ? 'selected' : ''}>elder</option>
                </select>
            </label>
            
            <label>Positive Trait: 
                <select id="charPosTrait">
                    ${posTraits.map((t, i) => `<option value="${t[0]}" ${i === randomPosTrait ? 'selected' : ''}>${t[0]}</option>`).join('')}
                </select>
            </label>
            <div id="posTraitDesc" class="trait-description"></div>
            
            <label>Negative Trait: 
                <select id="charNegTrait">
                    ${negTraits.map((t, i) => `<option value="${t[0]}" ${i === randomNegTrait ? 'selected' : ''}>${t[0]}</option>`).join('')}
                </select>
            </label>
            <div id="negTraitDesc" class="trait-description"></div>
            
            <p>Create your avatar:</p>
            
            <div class="avatar" id="avatarPreview">
                <div class="avatar-preview"></div>
            </div>
            
            <label>Skin: 
                <select id="charSkin">
                    ${skinOptions.map((s, i) => `<option value="${s}" ${i === randomSkin ? 'selected' : ''}>${formatOptionLabel(s)}</option>`).join('')}
                </select>
            </label>
            
            <label>Hair Style: 
                <select id="charHairStyle">
                    ${hairStyleOptions.map((h, i) => `<option value="${h}" ${i === randomHairStyle ? 'selected' : ''}>${formatOptionLabel(h)}</option>`).join('')}
                </select>
            </label>
            
            <label>Hair Colour: 
                <select id="charHairColor">
                    ${hairColorOptions.map((c, i) => `<option value="${c}" ${i === randomHairColor ? 'selected' : ''}>${formatOptionLabel(c)}</option>`).join('')}
                </select>
            </label>
            
            <label>Shirt Style: 
                <select id="charShirtStyle">
                    ${shirtStyleOptions.map((s, i) => `<option value="${s}" ${i === randomShirtStyle ? 'selected' : ''}>${formatOptionLabel(s)}</option>`).join('')}
                </select>
            </label>
            
            <label>Shirt Colour: 
                <select id="charShirtColor">
                    ${shirtColorOptions.map((c, i) => `<option value="${c}" ${i === randomShirtColor ? 'selected' : ''}>${formatOptionLabel(c)}</option>`).join('')}
                </select>
            </label>
            
            <button type="submit">Start Game</button>
        </form>
    `;
    
    // Setup trait descriptions
    updateTraitDescription('posTraitDesc', posTraits, document.getElementById('charPosTrait').selectedIndex);
    updateTraitDescription('negTraitDesc', negTraits, document.getElementById('charNegTrait').selectedIndex);
    
    document.getElementById('charPosTrait').addEventListener('change', (e) => {
        updateTraitDescription('posTraitDesc', posTraits, e.target.selectedIndex);
    });
    document.getElementById('charNegTrait').addEventListener('change', (e) => {
        updateTraitDescription('negTraitDesc', negTraits, e.target.selectedIndex);
    });
    
    // Setup avatar preview
    setupAvatarPreview();
    updateAvatarPreview();
    
    // Form submit handler
    document.getElementById('characterForm').addEventListener('submit', (e) => {
        e.preventDefault();
        createCharacter();
    });
}

/**
 * Format option label: remove .png, replace underscores with spaces
 */
function formatOptionLabel(value) {
    return value.split('.')[0].replace(/_/g, ' ');
}

/**
 * Update trait description with bullet points
 */
function updateTraitDescription(containerId, traits, index) {
    const container = document.getElementById(containerId);
    if (!container || !traits[index]) return;
    
    const trait = traits[index];
    container.innerHTML = `<ul><li>${trait[1]}</li><li>${trait[2]}</li></ul>`;
}

/**
 * Setup avatar preview updates
 */
function setupAvatarPreview() {
    const selects = ['charSkin', 'charHairStyle', 'charHairColor', 'charShirtStyle', 'charShirtColor'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateAvatarPreview);
    });
}

/**
 * Update avatar preview images
 */
function updateAvatarPreview() {
    const previewDiv = document.querySelector('#avatarPreview .avatar-preview');
    if (!previewDiv) return;
    
    const skinSelect = document.getElementById('charSkin');
    const hairStyleSelect = document.getElementById('charHairStyle');
    const hairColorSelect = document.getElementById('charHairColor');
    const shirtStyleSelect = document.getElementById('charShirtStyle');
    const shirtColorSelect = document.getElementById('charShirtColor');
    
    if (!skinSelect || !hairStyleSelect || !hairColorSelect || !shirtStyleSelect || !shirtColorSelect) return;
    
    previewDiv.innerHTML = '';
    
    const images = [
        `images/hair/outline_${hairStyleSelect.value}.png`,
        `images/shirts/outline_${shirtStyleSelect.value}.png`,
        `images/skin/${skinSelect.value}`,
        `images/hair/${hairStyleSelect.value}_${hairColorSelect.value}`,
        `images/shirts/${shirtStyleSelect.value}_${shirtColorSelect.value}`
    ];
    
    images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'position: absolute; width: 88px; height: 88px; left: 50%; transform: translateX(-50%); image-rendering: pixelated;';
        previewDiv.appendChild(img);
    });
}

/**
 * Create character and start game
 */
async function createCharacter() {
    const nameInput = document.getElementById('charName');
    const ageSelect = document.getElementById('charAge');
    const posTraitSelect = document.getElementById('charPosTrait');
    const negTraitSelect = document.getElementById('charNegTrait');
    const skinSelect = document.getElementById('charSkin');
    const hairStyleSelect = document.getElementById('charHairStyle');
    const hairColorSelect = document.getElementById('charHairColor');
    const shirtStyleSelect = document.getElementById('charShirtStyle');
    const shirtColorSelect = document.getElementById('charShirtColor');
    const birthMonthSelect = document.getElementById('charBirthMonth');
    const birthDaySelect = document.getElementById('charBirthDay');
    
    const characterData = {
        name: nameInput.value.trim() || defaultNames[Math.floor(Math.random() * defaultNames.length)],
        age: parseInt(ageSelect.value),
        posTrait: posTraitSelect.value,
        negTrait: negTraitSelect.value,
        skin: `images/skin/${skinSelect.value}`,
        hair: `images/hair/${hairStyleSelect.value}_${hairColorSelect.value}`,
        shirt: `images/shirts/${shirtStyleSelect.value}_${shirtColorSelect.value}`,
        birthMonth: parseInt(birthMonthSelect.value),
        birthDay: parseInt(birthDaySelect.value)
    };
    
    // Clear creation form
    document.getElementById('gameButtons').innerHTML = '';
    
    // Show game content
    document.getElementById('content').style.display = 'flex';
    
    // Initialize game with character
    await engine.initializeGame(characterData);
    
    // Update inventory display
    await renderer.displayInventory(session.party.inventory, session.party);
    
    // Show play button
    renderer.showPlayButton();
    
    // Update turn display
    await renderer.updateTurnDisplay(
        session.turnNumber,
        session.timeOfDay,
        session.getFormattedDate()
    );
    
    // Setup action handlers
    setupActionHandlers();
}

/**
 * Setup action handlers for dropdowns
 */
function setupActionHandlers() {
    const charactersDiv = document.getElementById('characters');
    if (!charactersDiv) return;
    
    // Handle food select changes
    charactersDiv.addEventListener('change', async (e) => {
        const target = e.target;
        const characterDiv = target.closest('.character');
        if (!characterDiv) return;
        
        const characterId = characterDiv.id;
        const character = session.party.characters.find(c => 
            renderer.getCharacterId(c.name) === characterId
        );
        if (!character) return;
        
        if (target.id === 'foodSelect' && target.value) {
            await engine.useFood(character, target.value);
            await renderer.displayInventory(session.party.inventory, session.party);
            target.value = '';
        }
        
        if (target.id === 'medicalSelect' && target.value) {
            await engine.useMedical(character, target.value);
            await renderer.displayInventory(session.party.inventory, session.party);
            target.value = '';
        }
        
        if (target.id === 'weaponSelect' && target.value) {
            await engine.equipWeapon(character, target.value);
            await renderer.displayInventory(session.party.inventory, session.party);
            target.value = '';
        }
        
        if (target.id === 'interactionSelect' && target.value) {
            const targetChar = session.party.characters.find(c => c.name === target.value);
            if (targetChar) {
                await engine.interact(character, targetChar);
            }
            target.value = '';
        }
    });

    // Handle quick interaction button clicks (mini avatars next to character names)
    charactersDiv.addEventListener('click', async (e) => {
        const btn = e.target.closest('.interaction-avatar-btn');
        if (!btn || btn.disabled) return;

        const fromName = btn.dataset.fromCharacter;
        const toName = btn.dataset.toCharacter;

        const fromCharacter = session.party.characters.find(c => c.name === fromName);
        const toCharacter = session.party.characters.find(c => c.name === toName);

        if (fromCharacter && toCharacter) {
            await engine.interact(fromCharacter, toCharacter);
            // Refresh party display to update interaction states
            await renderer.displayPartyStatus(session.party.characters);
        }
    });

    // Handle quick equip button clicks in inventory
    const inventoryDiv = document.getElementById('partyInventory');
    if (inventoryDiv) {
        inventoryDiv.addEventListener('click', async (e) => {
            const btn = e.target.closest('.mini-avatar-btn');
            if (!btn) return;

            const itemName = btn.dataset.itemName;
            const itemType = btn.dataset.itemType;
            const characterName = btn.dataset.characterName;

            const character = session.party.characters.find(c => c.name === characterName);
            if (!character) return;

            if (itemType === 'food') {
                await engine.useFood(character, itemName);
            } else if (itemType === 'medical') {
                await engine.useMedical(character, itemName);
            } else if (itemType === 'weapon') {
                await engine.equipWeapon(character, itemName);
            }

            await renderer.displayInventory(session.party.inventory, session.party);
        });
    }
}

/**
 * Play a turn
 */
async function playTurn() {
    // Don't allow play during pending encounters or combat
    if (session.pendingEncounter || session.inCombat) {
        console.log('Cannot play turn: encounter or combat in progress');
        return;
    }
    
    renderer.hidePlayButton();
    
    // Mark that a turn has been played so events will be archived after this
    renderer.markTurnPlayed();
    
    await engine.playTurn();
    
    // Update inventory
    await renderer.displayInventory(session.party.inventory, session.party);
    
    // Update interaction dropdowns for all characters
    updateInteractionDropdowns();
    
    // Show play button if game continues
    if (!session.isGameOver()) {
        renderer.showPlayButton();
    }
}

/**
 * Update interaction dropdown options for all characters
 */
function updateInteractionDropdowns() {
    for (const character of session.party.characters) {
        const charDiv = document.getElementById(renderer.getCharacterId(character.name));
        if (!charDiv) continue;
        
        const interactSelect = charDiv.querySelector('#interactionSelect');
        if (!interactSelect) continue;
        
        // Clear and rebuild
        interactSelect.innerHTML = `<option value="">Interact with</option>`;
        
        const targets = engine.getInteractionTargets(character);
        for (const target of targets) {
            const option = document.createElement('option');
            option.value = target.name;
            option.textContent = target.name;
            interactSelect.appendChild(option);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // Setup play button
    const playButton = document.getElementById('playButton');
    if (playButton) {
        playButton.addEventListener('click', playTurn);
    }
});

// Export for debugging
window.game = {
    get session() { return session; },
    get engine() { return engine; },
    get renderer() { return renderer; }
};
