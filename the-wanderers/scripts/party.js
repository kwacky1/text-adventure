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
    ]],
    ['snack', 1, [
        'an apple',
        'a block of cheese',
        'a packet of instant noodles',
        'a tub of peanut butter',
        'a jar of pickles',
        'a can of fish',
        'a pickled egg'
    ]],
    ['dish', 2, [
        'a can of soup',
        'a pack of frozen vegetables',
        'a can of beans',
        'a tin of tomatoes',
        'a frozen pie',
        'a bowl of pasta',
        'a can of stew'
    ]],
    ['meal', 3, [
        'a frozen roast chicken',
        'a frozen pizza',
        'some pre-packaged curry',
        'some packaged dumplings',
        'a frozen tv dinner',
        'some mystery pasta',
        'a really big block of cheese'
    ]],
    ['dessert', 2, [ // dessert is a treat, so it's also beneficial for morale
        'a tub of ice cream',
        'a small chocolate cake',
        'a glazed donut',
        'a packet of marshmallows',
        'a can of whipped cream',
        'a tin of pudding'
    ]]
];

export const medical = [
    ['band aid', 1],
    ['bandage', 2],
    ['medicine', 3],
    ['first aid kit', 4]
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
            // Check if it's a weapon
            else if (weapons.some(weaponItem => weaponItem[0] === key)) {
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