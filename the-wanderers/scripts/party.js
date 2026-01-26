import { context } from './game-state.js';
import { updateFoodAttributes, updateMedicalAttributes, updateWeaponAttributes } from './src/inventory.js';
import { hungerArray, healthArray } from './character.js';
import { updateStatBars } from './src/ui.js';

// Item category definitions
export const food = [
    ['rations', 0.5, [
        'a packet of chips',
        'some crackers',
        'some jerky',
        'an energy bar',
        'some fruit mix',
        'a box of biscuits',
        'a packet of oatmeal'
    ], [
        'in a child\'s lunch box outside an old school',
        'tucked inside a torn military jacket',
        'stashed on the bottom row of a broken vending machine',
        'hidden under the floorboards of a small barricaded cabin'
    ]],
    ['snack', 1, [
        'an apple',
        'a block of cheese',
        'a packet of instant noodles',
        'a tub of peanut butter',
        'a jar of pickles',
        'a can of fish',
        'a pickled egg'
    ], [
        'in the back of the pantry of a ruined house',
        'under a pile of smashed dishes on the floor of a kitchen',
        'inside a backpack hidden in the bushes',
        'in the clutches of a decayed corpse'
    ]],
    ['dish', 2, [
        'a can of soup',
        'a pack of frozen vegetables',
        'a can of beans',
        'a tin of tomatoes',
        'a frozen pie',
        'a bowl of pasta',
        'a can of stew'
    ], [
        'inside a toppled over microwave',
        'sitting on a rusted stovetop',
        'stuffed beside old batteries in a kitchen drawer'
    ]],
    ['meal', 3, [
        'a frozen roast chicken',
        'a frozen pizza',
        'some pre-packaged curry',
        'some packaged dumplings',
        'a frozen tv dinner',
        'some mystery pasta',
        'a really big block of cheese'
    ], [
        'buried under rubble at the bottom of a grocery store freezer',
        'in a backpack beside a burned out fire pit',
        'somehow stuffed into a small mailbox'
    ]],
    ['dessert', 2, [ // dessert is a treat, so it's also beneficial for morale
        'a tub of ice cream',
        'a small chocolate cake',
        'a glazed donut',
        'a packet of marshmallows',
        'a can of whipped cream',
        'a tin of pudding'
    ], [
        'inside a barely functioning minifridge',
        'nearly crushed under a collapsed bunk bed',
        'stuffed in the kitchen of a doll house'
    ]]
];

export const medical = [
    ['band aid', 1, [
        'in a child\'s backpack',
        'stuck to the inside of a locker',
        'inside a cracked first aid box'
    ]],
    ['bandage', 2, [
        'in the bathroom of an abandoned house',
        'in the backpack of a dead zombie',
        'buried under some rubble'
    ]],
    ['medicine', 3, [
        'left on the floor of an abandoned clinic',
        'in a wrecked ambulance',
        'hidden in a bathroom cabinet'
    ]],
    ['first aid kit', 4, [
        'in a worn first aid kit',
        'under some floorboards',
        'inside a damaged vending machine'
    ]]
];

export const weapons = [
    ['fist', 1, 100], // infinite durability but maybe like a really small chance for each hit that you break it and can't hit til the next day or something
    ['stick', 2, 4], // low durablity, maybe 3-4 hits? that's the average amount it takes to defeat a zombie i think
    ['knife', 3, 12], // high durability but medium damage, like 12-16 hits, 3x stick
    ['pistol', 4, 8] // medium durability but high damage, 2x stick = 6-8 hits
];

// Inventory management class
export class Inventory {
    constructor() {
        this.inventoryMap = new Map();
    }

    addItem(itemType) {
        // Check if the item already exists in the inventory
        if (this.inventoryMap.has(itemType[0])) {
            // If it exists, update the quantity
            let existingItem = this.inventoryMap.get(itemType[0]);
            existingItem.quantity += 1;
            this.inventoryMap.set(itemType[0], existingItem);
        } else {
            // Determine the value to store
            // For weapons: if full definition (3+ elements), use index 2 (durability)
            // If abbreviated (2 elements like [name, durability]), use index 1
            // For food/medical, use index 1 (effectiveness)
            let valueToStore = itemType[1];
            const isWeapon = weapons.some(w => w[0] === itemType[0]);
            if (isWeapon && itemType.length >= 3) {
                valueToStore = itemType[2]; // Use max durability from weapon definition
            }
            
            // If it does not exist, add it to the map
            this.inventoryMap.set(itemType[0], {
                name: itemType[0],
                value: valueToStore,
                quantity: 1
            });
        }
    }

    removeItem(itemName) {
        if (this.inventoryMap.has(itemName)) {
            const item = this.inventoryMap.get(itemName);
            if (item.quantity > 1) {
                item.quantity -= 1;
                this.inventoryMap.set(itemName, item);
            } else {
                this.inventoryMap.delete(itemName);
            }
            return true;
        }
        return false;
    }

    getItem(itemName) {
        return this.inventoryMap.get(itemName);
    }

    hasItem(itemName) {
        return this.inventoryMap.has(itemName);
    }

    getAllItems() {
        return Array.from(this.inventoryMap.values());
    }

    updateDisplay() {
        const partyInventoryDiv = document.getElementById('partyInventory');


        // Clear previous content
        partyInventoryDiv.innerHTML = '<h3>Party Inventory</h3>';
        
        // Create categories
        const categories = {
            food: { title: '🍗 Food', items: [], icon: '🍽️', type: 'food' },
            medical: { title: '🩹 Medical', items: [], icon: '💊', type: 'medical' },
            weapons: { title: '⚔️ Weapons', items: [], icon: '🗡️', type: 'weapon' }
        };
        
        // Categorize items
        this.inventoryMap.forEach((item, key) => {
            // Check if it's a food item
            if (food.some(foodItem => foodItem[0] === key)) {
                categories.food.items.push(item);
            } 
            // Check if it's a medical item
            else if (medical.some(medicalItem => medicalItem[0] === key)) {
                categories.medical.items.push(item);
            }
            // Check if it's a weapon
            else if (weapons.some(weaponItem => weaponItem[0] === key)) {
                categories.weapons.items.push(item);
            }
        });
        
        // Sort items by effectiveness (highest value first)
        categories.food.items.sort((a, b) => b.value - a.value);
        categories.medical.items.sort((a, b) => b.value - a.value);
        // Sort weapons by damage from weapons array (not stored value which may be durability)
        categories.weapons.items.sort((a, b) => {
            const aWeapon = weapons.find(w => w[0] === a.name);
            const bWeapon = weapons.find(w => w[0] === b.name);
            return (bWeapon ? bWeapon[1] : 0) - (aWeapon ? aWeapon[1] : 0);
        });
        
        // Create category container
        const inventoryContainer = document.createElement('div');
        inventoryContainer.className = 'inventory-container';
        
        // Add each category that has items
        Object.values(categories).forEach(category => {
            if (category.items.length > 0) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'inventory-category';
                
                const categoryTitle = document.createElement('h4');
                categoryTitle.textContent = category.title;
                categoryDiv.appendChild(categoryTitle);
                
                const itemList = document.createElement('ul');
                itemList.className = 'inventory-items';
                
                category.items.forEach(item => {
                    const itemElement = document.createElement('li');
                    itemElement.className = 'inventory-item';
                    
                    let valueDisplay;
                    if (category === categories.weapons) {
                        // For weapons, display damage based on the matching weapon from the weapons array
                        const weaponInfo = weapons.find(w => w[0] === item.name);
                        const damage = weaponInfo ? weaponInfo[1] : '?';
                        const durability = weaponInfo ? weaponInfo[2] : '?';
                        valueDisplay = `DMG: ${damage} | DUR: ${durability}`;
                    } else {
                        // For other items, use the plus signs
                        valueDisplay = '+'.repeat(Math.min(5, Math.round(item.value)));
                    }
                    
                    itemElement.innerHTML = `
                        <span class="item-icon">${category.icon}</span>
                        <span class="item-name">${item.name}</span>
                        <span class="item-quantity">x${item.quantity}</span>
                        <span class="item-value">${valueDisplay}</span>
                    `;
                    
                    // Add mini avatars for quick equip/use
                    const miniAvatars = this.createMiniAvatars(item, category.type);
                    if (miniAvatars) {
                        itemElement.appendChild(miniAvatars);
                    }
                    
                    itemList.appendChild(itemElement);
                });
                
                categoryDiv.appendChild(itemList);
                inventoryContainer.appendChild(categoryDiv);
            }
        });
        
        // If inventory is empty
        if (this.inventoryMap.size === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'Your inventory is empty.';
            emptyMsg.className = 'empty-inventory';
            inventoryContainer.appendChild(emptyMsg);
        }
        
        partyInventoryDiv.appendChild(inventoryContainer);
    }

    /**
     * Create mini avatar buttons for quick equip/use
     * @param {Object} item - The inventory item
     * @param {string} type - 'food', 'medical', or 'weapon'
     * @returns {HTMLElement|null} Container with mini avatars or null if none eligible
     */
    createMiniAvatars(item, type) {
        if (!context.gameParty || !context.gameParty.characters || context.gameParty.characters.length === 0) {
            return null;
        }
        
        let eligibleCharacters = [];
        
        if (type === 'food') {
            // Get characters who aren't full (hunger < max) and haven't used food action, sorted by lowest hunger first
            const maxHunger = hungerArray.length - 1;
            eligibleCharacters = context.gameParty.characters
                .filter(c => c.hunger < maxHunger && (!c.actionsUsed || !c.actionsUsed.food))
                .sort((a, b) => a.hunger - b.hunger); // Most hungry first
        } else if (type === 'medical') {
            // Get characters who aren't at full health and haven't used medical action, sorted by lowest health first
            const maxHealth = healthArray.length - 1;
            eligibleCharacters = context.gameParty.characters
                .filter(c => c.health < maxHealth && (!c.actionsUsed || !c.actionsUsed.medical))
                .sort((a, b) => a.health - b.health); // Most injured first
        } else if (type === 'weapon') {
            // Get characters whose current weapon is weaker than this one
            const weaponInfo = weapons.find(w => w[0] === item.name);
            if (weaponInfo) {
                const itemDamage = weaponInfo[1];
                eligibleCharacters = context.gameParty.characters
                    .filter(c => weapons[c.weapon][1] < itemDamage)
                    .sort((a, b) => weapons[a.weapon][1] - weapons[b.weapon][1]); // Weakest weapon first
            }
        }
        
        if (eligibleCharacters.length === 0) {
            return null;
        }
        
        const container = document.createElement('div');
        container.className = 'mini-avatars';
        
        for (const character of eligibleCharacters) {
            const avatarBtn = document.createElement('button');
            avatarBtn.className = 'mini-avatar-btn';
            avatarBtn.title = `Give ${item.name} to ${character.name}`;
            
            // Create mini avatar container for layered images
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'mini-avatar-layers';
            
            // Skin layer
            const skinImg = document.createElement('img');
            skinImg.src = character.skin;
            skinImg.alt = '';
            skinImg.className = 'mini-avatar-layer';
            avatarContainer.appendChild(skinImg);
            
            // Hair layer
            const hairImg = document.createElement('img');
            hairImg.src = character.hair;
            hairImg.alt = '';
            hairImg.className = 'mini-avatar-layer';
            avatarContainer.appendChild(hairImg);
            
            // Shirt layer
            const shirtImg = document.createElement('img');
            shirtImg.src = character.shirt;
            shirtImg.alt = character.name;
            shirtImg.className = 'mini-avatar-layer';
            avatarContainer.appendChild(shirtImg);
            
            avatarBtn.appendChild(avatarContainer);
            
            // Add click handler
            avatarBtn.addEventListener('click', () => {
                this.quickUseItem(item, character, type);
            });
            
            container.appendChild(avatarBtn);
        }
        
        return container;
    }

    /**
     * Quick use/equip an item on a character
     * @param {Object} item - The inventory item
     * @param {Object} character - The character to give the item to
     * @param {string} type - 'food', 'medical', or 'weapon'
     */
    quickUseItem(item, character, type) {
        // Find the full item data
        let fullItem;
        if (type === 'food') {
            fullItem = food.find(f => f[0] === item.name);
        } else if (type === 'medical') {
            fullItem = medical.find(m => m[0] === item.name);
        } else if (type === 'weapon') {
            fullItem = weapons.find(w => w[0] === item.name);
        }
        
        if (!fullItem) return;
        
        // Check if action has already been used (for food/medical)
        if ((type === 'food' || type === 'medical') && character.actionsUsed?.[type]) {
            return;
        }
        
        // Remove from inventory
        this.removeItem(item.name);
        
        // Apply the item effect and mark action as used
        if (type === 'food') {
            character.actionsUsed.food = true; // Set before update so dropdown gets disabled
            updateFoodAttributes(character, fullItem);
        } else if (type === 'medical') {
            character.actionsUsed.medical = true; // Set before update so dropdown gets disabled
            updateMedicalAttributes(character, fullItem);
        } else if (type === 'weapon') {
            // Get durability from the item before it was removed
            const itemDurability = item.value;
            updateWeaponAttributes(character, fullItem, itemDurability);
        }
        
        character.capAttributes();
        character.updateCharacter();
        updateStatBars(character);
        
        // Refresh inventory display
        this.updateDisplay();
    }
}

class Party {
    constructor() {
        this.characters = [];
        this.nextId = 1;
        this.inventory = new Inventory();
    }

    addCharacter(character) {
        if (this.characters.length < 4) {
            character.id = this.nextId;
            this.nextId += 1;
            this.characters.push(character);
            if (this.characters.length > 1) {
                // add relationship to existing characters
                for (const existingCharacter of this.characters) {
                    if (existingCharacter !== character) {
                        let relationshipType = 1;
                        if (existingCharacter.posTrait === 'friendly' && existingCharacter.negTrait !== 'disconnected') {
                            relationshipType = 2;
                        }
                        if (existingCharacter.negTrait == 'disconnected' && existingCharacter.posTrait !== 'friendly') {
                            relationshipType = 0;
                        }
                        character.relationships.set(existingCharacter, relationshipType);
                        existingCharacter.relationships.set(character, relationshipType);
                    }
                }
            }
        }
        this.updateCampsiteImage();
    }

    removeCharacter(character) {
        const index = this.characters.indexOf(character);
        if (index !== -1) {
            this.characters.splice(index, 1);
            const characterItem = document.getElementById(character.getCharacterId());
            if (characterItem) {
                characterItem.remove();
            }
            // Remove character from relationships of other characters
            for (const remainingCharacter of this.characters) {
                remainingCharacter.relationships.delete(character);
            }
        }
        this.updateCampsiteImage();
    }

    updateCampsiteImage() {
        // Don't update if no characters left (game over)
        if (this.characters.length === 0) {
            return;
        }
        const campsiteImg = document.getElementById('eventImage');
        campsiteImg.src = `images/campsite/campsite${this.characters.length}.png`;
        switch (this.characters.length) {
            case 1:
                campsiteImg.alt = 'A campsite for one person with a tent and an unlit campfire next to a dead tree. The sky is green and cloudy, and the grass is brown.';
                break;
            case 2:
                campsiteImg.alt = 'A campsite for two people with a tent and an unlit campfire next to a dead tree. There is now a sleeping bag on the ground next to some clothes on a washing line. The sky is green and cloudy, and the grass is brown.';
                break;
            case 3:
                campsiteImg.alt = 'A campsite for three people with a tent and an unlit campfire next to a dead tree. There is a sleeping bag on the ground next to some clothes on a washing line. There is now a hammock attached to the tree with a lantern hanging above it. The sky is green and cloudy, and the grass is brown.';
                break;
            case 4:
                campsiteImg.alt = 'A campsite for four people with a tent and an unlit campfire next to a dead tree. There is a sleeping bag on the ground next to some clothes on a washing line. There is a hammock attached to the tree with a lantern hanging above it. There is now a second sleeping bag with a lantern next to it. The sky is green and cloudy, and the grass is brown.';
                break;
        }
    }
}

export default Party;