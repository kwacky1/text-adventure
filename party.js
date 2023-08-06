const relationships = [
    ['enemies'],
    ['strangers'],
    ['acquaintances'],
    ['friends'],
    ['family']
];

class Party {
    constructor() {
        this.characters = [];
        this.nextId = 1;
        this.inventory = [];
    }

    addCharacter(character) {
        if (this.characters.length < 4) {
            character.id = this.nextId;
            this.nextId += 1;
            this.characters.push(character);
            console.log(`${character.name} has joined the party!`);
            console.log("There are now " + this.characters.length + " characters in the party.");
            if (this.characters.length > 1) {
                // add relationship to existing characters
                for (const existingCharacter of this.characters) {
                    if (existingCharacter !== character) {
                        const relationshipType = relationships[1];
                        character.relationships.push({ type: relationshipType, character: existingCharacter });
                        console.log(`${character.name} and ${existingCharacter.name} are ${relationshipType}`);
                        existingCharacter.relationships.push({ type: relationshipType, character: character });
                        console.log(`${existingCharacter.name} and ${character.name} are ${relationshipType}`);
                    }
                }
            }
        } else {
            console.log(`Sorry, the party is full.`);
        }
    }

    removeCharacter(character) {
        const index = this.characters.indexOf(character);
        if (index !== -1) {
            this.characters.splice(index, 1);
            const characterItem = document.getElementById(character.name);
            console.log(characterItem);
            if (characterItem) {
                console.log('removing character');
                characterItem.remove();
            }
            console.log(`${character.name} has left the party.`);
            // Remove character from relationships of other characters
            for (const remainingCharacter of this.characters) {
            const relationshipIndex = remainingCharacter.relationships.findIndex(relationship => relationship.character === character);
            if (relationshipIndex !== -1) {
            remainingCharacter.relationships.splice(relationshipIndex, 1);
            }
        }
        } else {
            console.log(`${character.name} is not in the party.`);
        }
    }
    
    updateInventory() {
        const partyInventoryDiv = document.getElementById('partyInventory');
      
        // Update inventory display
        partyInventoryDiv.innerHTML = '<p>Party Inventory</p>';
        this.inventory.forEach(item => {
          const itemElement = document.createElement('li');
          itemElement.textContent = item;
          partyInventoryDiv.appendChild(itemElement);
        });
      }
    }

export default Party;