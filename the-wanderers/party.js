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

    updateInventory() {
        const partyInventoryDiv = document.getElementById('partyInventory');

        // Update inventory display
        partyInventoryDiv.innerHTML = '<p>Party Inventory</p>';
        this.inventoryMap.forEach((value, key) => {
            const itemElement = document.createElement('li');
            itemElement.textContent = `${key} (${value.quantity})`;
            partyInventoryDiv.appendChild(itemElement);
        });
    }

    updateCampsiteImage() {
        const campsiteImg = document.getElementById('eventImage');
        campsiteImg.src = `img/campsite${this.characters.length}.png`; //NEEDSALTTEXT: can you add a script that changes the alt text for each different campsite image, i'll write the descriptions after you push it
    }
}

export default Party;