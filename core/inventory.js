/**
 * Inventory class - pure data model
 * No UI/DOM dependencies
 */

import { food, medical, weapons } from './constants.js';

export class Inventory {
    constructor() {
        this.items = new Map();
    }

    /**
     * Add an item to inventory
     * @param {Array} itemType - Item definition [name, value, ...] or [name, durability] for used weapons
     */
    addItem(itemType) {
        const itemName = itemType[0];
        
        if (this.items.has(itemName)) {
            const existingItem = this.items.get(itemName);
            existingItem.quantity += 1;
            this.items.set(itemName, existingItem);
        } else {
            // Determine value to store
            let valueToStore = itemType[1];
            const isWeapon = weapons.some(w => w[0] === itemName);
            if (isWeapon && itemType.length >= 3) {
                valueToStore = itemType[2]; // Max durability
            }
            
            this.items.set(itemName, {
                name: itemName,
                value: valueToStore,
                quantity: 1
            });
        }
    }

    /**
     * Remove one of an item from inventory
     * @param {string} itemName
     * @returns {boolean} true if removed successfully
     */
    removeItem(itemName) {
        if (this.items.has(itemName)) {
            const item = this.items.get(itemName);
            if (item.quantity > 1) {
                item.quantity -= 1;
                this.items.set(itemName, item);
            } else {
                this.items.delete(itemName);
            }
            return true;
        }
        return false;
    }

    /**
     * Get item by name
     * @param {string} itemName
     * @returns {Object|undefined}
     */
    getItem(itemName) {
        return this.items.get(itemName);
    }

    /**
     * Check if inventory has item
     * @param {string} itemName
     * @returns {boolean}
     */
    hasItem(itemName) {
        return this.items.has(itemName);
    }

    /**
     * Get all items as array
     * @returns {Array}
     */
    getAllItems() {
        return Array.from(this.items.values());
    }

    /**
     * Get items organized by category
     * @returns {Object}
     */
    getItemsByCategory() {
        const categories = {
            food: [],
            medical: [],
            weapons: []
        };

        for (const [key, item] of this.items) {
            if (food.some(f => f[0] === key)) {
                categories.food.push(item);
            } else if (medical.some(m => m[0] === key)) {
                categories.medical.push(item);
            } else if (weapons.some(w => w[0] === key)) {
                categories.weapons.push(item);
            }
        }

        // Sort by value/effectiveness
        categories.food.sort((a, b) => b.value - a.value);
        categories.medical.sort((a, b) => b.value - a.value);
        categories.weapons.sort((a, b) => {
            const aWeapon = weapons.find(w => w[0] === a.name);
            const bWeapon = weapons.find(w => w[0] === b.name);
            return (bWeapon ? bWeapon[1] : 0) - (aWeapon ? aWeapon[1] : 0);
        });

        return categories;
    }

    /**
     * Check if inventory is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.items.size === 0;
    }

    /**
     * Get total item count
     * @returns {number}
     */
    getTotalCount() {
        let total = 0;
        for (const item of this.items.values()) {
            total += item.quantity;
        }
        return total;
    }

    /**
     * Clear all items
     */
    clear() {
        this.items.clear();
    }

    /**
     * Serialize inventory for storage
     * @returns {Array}
     */
    toJSON() {
        return Array.from(this.items.entries());
    }

    /**
     * Restore inventory from serialized data
     * @param {Array} data
     * @returns {Inventory}
     */
    static fromJSON(data) {
        const inventory = new Inventory();
        for (const [name, item] of data) {
            inventory.items.set(name, item);
        }
        return inventory;
    }
}

export default Inventory;
