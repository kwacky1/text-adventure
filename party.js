const relationships = [
    'cold',
    'strangers',
    'acquaintances',
    'friends',
    'family'
];

class Party {
    constructor() {
        this.characters = [];
        this.nextId = 1;
        this.inventoryMap = new Map();
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
                        let relationshipType = relationships[1];
                        if (existingCharacter.posTrait === 'friendly' && existingCharacter.negTrait !== 'disconnected') {
                            relationshipType = relationships[2];
                        }
                        if (existingCharacter.negTrait == 'disconnected' && existingCharacter.posTrait !== 'friendly') {
                            relationshipType = relationships[0];
                        }
                        character.relationships.push({ type: relationshipType, character: existingCharacter });
                        existingCharacter.relationships.push({ type: relationshipType, character: character });
                    }
                }
            }
        }
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
                const relationshipIndex = remainingCharacter.relationships.findIndex(relationship => relationship.character === character);
                if (relationshipIndex !== -1) {
                remainingCharacter.relationships.splice(relationshipIndex, 1);
                }
            }
        }
    }
    
    updateInventory() {
        const partyInventoryDiv = document.getElementById('partyInventory');
      
        // Update inventory display
        partyInventoryDiv.innerHTML = '<p>Party Inventory</p>';
        this.inventoryMap.forEach((value, key) => {
            const itemElement = document.createElement('li');
            itemElement.textContent = `${key}`;
            partyInventoryDiv.appendChild(itemElement);
        });
    }
}

export default Party;