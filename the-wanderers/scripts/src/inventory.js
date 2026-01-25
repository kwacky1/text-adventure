import { addEvent, updateButtons, updateFoodButtons, updateMedicalButtons } from './ui.js';
import { weapons } from '../party.js';
import { context } from '../game-state.js';

export function addItemToInventory(itemType) {
    // Use the new Inventory class's addItem method instead of directly manipulating inventoryMap
    context.gameParty.inventory.addItem(itemType);
}

export function updateWeaponAttributes(character, weaponItem, durability = null) {
    const weaponInfo = weapons.find(w => w[0] === weaponItem[0]);
    if (weaponInfo) {
        // If character already has a weapon that's not fists, add it to inventory
        if (character.weapon !== 0) {
            const oldWeapon = weapons[character.weapon];
            addItemToInventory([oldWeapon[0], character.weaponDurability]);
        }
        
        // Use provided durability, or fall back to max durability from weapon definition
        character.weapon = weapons.indexOf(weaponInfo);
        character.weaponDurability = durability !== null ? durability : weaponInfo[2];
        character.updateCharacter();
        addEvent(`${character.name} equipped the ${weaponInfo[0]}.`);
        
        // Refresh all weapon dropdowns to reflect updated inventory
        updateWeaponButtons();
    }
}

export function updateFoodAttributes(character, foodItem) {
    character.hunger += foodItem[1];
    if (character.posTrait === 'satiated') {
        character.hunger += 0.5;
    }
    if (foodItem[0] === 'dessert') {
        character.morale += 1;
    } else if (character.negTrait === 'hungry' && (foodItem[0] === 'rations' || foodItem[0] === 'snack')) {
        character.hunger -= foodItem[1];
    }
    updateFoodButtons();
}

export function updateMedicalAttributes(character, medicalItem) {
    character.health += medicalItem[1];
    addEvent(`${character.name} used the ${medicalItem[0]}.`);

    handleInfectionCure(character, medicalItem);
    handleSicknessCure(character, medicalItem);
    
    updateMedicalButtons();
}

function handleInfectionCure(character, medicalItem) {
    const baseChance = medicalItem[0] === 'medicine' ? 0.1 : 0.2;
    const cureChance = character.posTrait === 'resilient' ? baseChance * 1.5 : 
                       character.negTrait === 'vulnerable' ? baseChance * 0.5 : 
                       baseChance;
    
    if (character.infected && Math.random() < cureChance) {
        character.infected = false;
        addEvent(`${character.name} has been cured of their infection!`, 'green');
    }
}

function handleSicknessCure(character, medicalItem) {
    const baseChance = medicalItem[0] === 'medicine' ? 0.2 : 0.3;
    const cureChance = character.posTrait === 'resilient' ? baseChance * 1.5 : 
                       character.negTrait === 'vulnerable' ? baseChance * 0.5 : 
                       baseChance;
    
    if (character.sick && Math.random() < cureChance) {
        character.sick = false;
        addEvent(`${character.name} is feeling better!`, 'green');
    }
}

export function offerWeapon(oldWeapon, newWeapon, id, character, button, weaponDiv, from = 'found') {
    const oldDamage = oldWeapon[1];
    const newDamage = newWeapon[1];
    button.innerText = `Replace ${character.name}'s ${oldWeapon[0]} (${oldDamage} attack) with ${from} ${newWeapon[0]} (${newDamage} attack)`;
    button.classList.add('weapon');
    button.addEventListener('click', () => {
        if (oldWeapon[0] !== 'fist') {
            addItemToInventory([oldWeapon[0], character.weaponDurability]);
        }
        character.weapon = weapons.indexOf(newWeapon);
        character.weaponDurability = 100;
        character.updateCharacter();
        addEvent(`${character.name} replaced their ${oldWeapon[0]} with the ${newWeapon[0]}.`);
        button.remove();
        if (weaponDiv) weaponDiv.remove();
        context.gameParty.inventory.updateDisplay();
    });
}

export function addWeaponChoiceButton(weaponDiv, character, weaponType, id, from = 'found') {
    const button = document.createElement('button');
    if (character.weapon !== null) {
        offerWeapon(weapons[character.weapon], weaponType, id, character, button, weaponDiv, from);
    } else {
        button.innerText = `Give ${weaponType[0]} to ${character.name}`;
        button.classList.add('weapon');
        button.addEventListener('click', () => {
            character.weapon = weapons.indexOf(weaponType);
            character.weaponDurability = 100;
            character.updateCharacter();
            addEvent(`${character.name} took the ${weaponType[0]}.`);
            button.remove();
            if (weaponDiv) weaponDiv.remove();
            context.gameParty.inventory.updateDisplay();
        });
    }
    weaponDiv.appendChild(button);
}

export function updateWeaponButtons() {
    // This works similar to the food and medical buttons
    // First collect all available weapons in inventory
    const weaponItems = weapons.slice(1).filter(weaponItem => 
        context.gameParty.inventory.hasItem(weaponItem[0])
    );
    
    updateButtons('weapon', weaponItems, 'Equip ', updateWeaponAttributes);
}
