// Item category definitions
export const food = [
    ['rations', 0.5],
    ['snack', 1],
    ['dish', 2],
    ['meal', 3],
    ['dessert', 2] // dessert is a treat, so it's also beneficial for morale
];

export const medical = [
    ['band aid', 1],
    ['bandage', 2],
    ['medicine', 3],
    ['first aid kit', 4]
];

export const weapons = [
    ['fist', 1],
    ['stick', 2],
    ['knife', 3],
    ['pistol', 4]
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
            // If it does not exist, add it to the map
            this.inventoryMap.set(itemType[0], {
                name: itemType[0],
                value: itemType[1],
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
            food: { title: '🍗 Food', items: [], icon: '🍽️' },
            medical: { title: '🩹 Medical', items: [], icon: '💊' },
            weapons: { title: '⚔️ Weapons', items: [], icon: '🗡️' }
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
            // Otherwise assume it's a weapon (for future expansion)
            else {
                categories.weapons.items.push(item);
            }
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
                    
                    // Add item value indicator (+ signs based on value)
                    const valueIndicator = '+'.repeat(Math.min(5, Math.round(item.value)));
                    
                    itemElement.innerHTML = `
                        <span class="item-icon">${category.icon}</span>
                        <span class="item-name">${item.name}</span>
                        <span class="item-quantity">x${item.quantity}</span>
                        <span class="item-value">${valueIndicator}</span>
                    `;
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
            const characterItem = document.getElementById(character.name);
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