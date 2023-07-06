const hungerArray = [
    'near death',
    'near death',
    'starving',
    'starving',
    'hungry',
    'hungry',
    'fine',
    'fine',
    'full',
    'full'
];

const ageArray = [
    'teen',
    'adult',
    'elder'
];

const moraleArray = [
    'terrible',
    'terrible',
    'bad',
    'bad',
    'ok',
    'ok',
    'good',
    'good',
    'excellent',
    'excellent'
];

const injuries = [
    'fine',
    'fine',
    'slightly injured',
    'slightly injured',
    'badly injured',
    'badly injured',
    'gravely injured',
    'gravely injured',
    'near death',
    'near death'
];

class Character {
  constructor(id, name, hunger, posTrait, negTrait) { 
    this.id = id;
    this.name = name;
    this.age = Math.floor(Math.random() * ageArray.length);;
    this.morale = Math.floor(Math.random() * moraleArray.length);
    this.hunger = hunger;
    this.injuryLevel = 1;
    this.posTrait = posTrait;
    this.negTrait = negTrait;
    this.relationships = [];
    this.inventory = [];
  }

  checkHunger() {
    this.hunger -= 1;
    console.log(`${this.name} is ${hungerArray[this.hunger]}`);
    // Check if character died from hunger
    if (this.hunger < 0) {
      return false;
    } else {
      this.update();
      return true;
    }
  }

  heal(otherCharacter) {
    if ((otherCharacter.hunger > 2 || otherCharacter.injuryLevel > 2) && otherCharacter !== this) {
      this.hunger -= 1;
      otherCharacter.injuryLevel -= 1;
      if (Math.random() < 0.1) {
        otherCharacter.injuryLevel += 1;
      }
    }
    console.log(`${this.name} healed ${otherCharacter.name}`);
  }

  scavenger() {
    // TODO
  }

  optimistic() {
    // 10% chance of increasing morale
    if (Math.random() < 0.1) {
      const otherCharacter = gameParty.characters[Math.floor(Math.random() * gameParty.characters.length)];
      otherCharacter.morale += 1;
      console.log(`${this.name} increased ${otherCharacter.name}'s morale`);
    }
    // Can't go below bad
    if (this.morale < 2) {
      this.morale += 2;
      console.log(`${this.name} increased their own morale`);
    }
  }

  fighter() {
    // TODO
  }

  capAttributes() {
    // Morale can't exceeed excellent
    if (this.morale > moraleArray.length) {
      this.morale = moraleArray.length - 1;
    }
    // Hunger can't exceed full
    if (this.hunger > hungerArray.length) {
      this.hunger = hungerArray.length - 1;
    }
    // Injury can't exceed fine
    if (this.injuryLevel < 1) {
      this.injuryLevel = 1;
    }
    // Morale can't go below terrible
    if (this.morale < 0) {
      this.morale = 0;
    }
  }

  update() {
    const characterList = document.getElementById('characterList');
    let characterItem = document.getElementById(`character-${this.id}`);
    console.log(characterItem);
    const html = `Name: ${this.name}, Age: ${ageArray[this.age]}, Morale: ${moraleArray[this.morale]}, Hunger: ${hungerArray[this.hunger]}, Injury Level: ${injuries[this.injuryLevel]}, Pos Trait: ${this.posTrait}, Neg Trait: ${this.negTrait}`;
    if (characterItem) {
        characterItem.innerHTML = html;
          // Add item buttons for each item in inventory
        this.inventory.forEach(item => {
        const button = document.createElement('button');
        button.classList.add('item-button');
        button.innerText = `Use ${item}`;
        button.addEventListener('click', () => {
        this.useItem(item);
    });
    characterItem.appendChild(button);
  });

    } else {
        const newCharacterItem = document.createElement('div');
        newCharacterItem.id = `character-${this.id}`;
        newCharacterItem.innerHTML = html;
        const relationshipsList = document.createElement('ul');
        relationshipsList.classList.add('relationships');
        newCharacterItem.appendChild(relationshipsList);
        characterList.appendChild(newCharacterItem);
    }

  }

  useItem(itemName) {
    const index = this.inventory.indexOf(itemName);
    if (index === -1) {
      console.log(`${this.name} does not have ${itemName}`);
      return;
    }
    switch (itemName) {
      case 'food':
        this.hunger += 2;
        console.log(`${this.name} ate ${itemName}`);
        break;
      case 'medical':
        this.injuryLevel -= 1;
        console.log(`${this.name} used ${itemName}`);
        break;
      case 'weapon':
        console.log(`${this.name} used ${itemName}`);
        break;
      default:
        console.log(`Unknown item: ${itemName}`);
        break;
    }
    this.inventory.splice(index, 1);
    this.update();
  }
}

export default Character;