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
                        const relationshipType = relationships[Math.floor(Math.random() * relationships.length)];
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
            const characterItem = document.getElementById(`character-${character.id}`);
            console.log(characterItem);
            if (characterItem) {
                console.log('removing character');
                characterItem.remove();
            }
            console.log(`${character.name} has left the party.`);
        } else {
            console.log(`${character.name} is not in the party.`);
        }
    }
}

export default Party;