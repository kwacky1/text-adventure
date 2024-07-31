export const hungerArray = [
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

export const ageArray = [
    'teen',
    'adult',
    'elder'
];

export const moraleArray = [
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

export const healthArray = [
  'near death',
  'near death',
  'gravely injured',
  'gravely injured',
  'badly injured',
  'badly injured',
  'slightly injured',
  'slightly injured',
  'fine',
  'fine'
];

export class Character {
  constructor(name, age, posTrait, negTrait, skin, hair, shirt) { 
    this.id = 0;
    this.name = name;
    this.age = age;
    this.morale = 6;
    this.hunger = 9;
    this.health = 9;
    this.posTrait = posTrait;
    this.negTrait = negTrait;
    this.relationships = [];
    this.inventory = [];
    this.weapon = 0;
    this.skin = skin;
    this.hair = hair;
    this.shirt = shirt;
  }

  checkHunger() {
    this.hunger -= 0.5;
    // Check if character died from hunger
    if (this.hunger < 0) {
      return false;
    } else {
      this.updateCharacter();
      return true;
    }
  }

  scavenger() {
    // TODO
  }

  optimistic() {
    // 10% chance of increasing own morale
    if (Math.random() < 0.1) {
      this.morale += 1;
      console.log(`${this.name} still thinks everything will be okay`);
    }
    // Can't go below bad
    if (this.morale < 2) {
      this.morale += 2;
      console.log(`${this.name} clings on to hope`);
    }
  }

  fighter() {
    // TODO
  }

  capAttributes() {
    // Morale can't exceeed excellent
    if (this.morale > moraleArray.length - 1) {
      this.morale = moraleArray.length - 1;
    }
    // Hunger can't exceed full
    if (this.hunger > hungerArray.length - 1) {
      this.hunger = hungerArray.length - 1;
    }
    // Health can't exceed fine
    if (this.health > 9) {
      this.health = 9;
    }
    // Morale can't go below terrible
    if (this.morale < 0) {
      this.morale = 0;
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
        this.health += 1;
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

  createCharacter() {
    const characterDiv = document.createElement('div');
    characterDiv.id = this.name;
    characterDiv.classList.add('character');

    // Avatar preview container
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar';
    avatarContainer.style.position = 'relative';

    // Skin preview
    const skinPreview = document.createElement('img');
    skinPreview.src = this.skin; 
    skinPreview.alt = 'Skin Preview';
    avatarContainer.appendChild(skinPreview);

    // Hair preview
    const hairPreview = document.createElement('img');
    hairPreview.src = this.hair;
    hairPreview.alt = 'Hair Preview';
    avatarContainer.appendChild(hairPreview);

    // shirt preview
    const shirtPreview = document.createElement('img');
    shirtPreview.src = this.shirt;
    shirtPreview.alt = 'shirt Preview';
    avatarContainer.appendChild(shirtPreview);
    
    characterDiv.appendChild(avatarContainer);

    const nameElement = document.createElement('h2');
    nameElement.classList.add('name');
    nameElement.textContent = this.name;
    characterDiv.appendChild(nameElement);

    const statsContainer = document.createElement('div');
    statsContainer.id = 'playerStats';

    const ageElement = document.createElement('div');
    ageElement.classList.add('stat');
    ageElement.classList.add('age');
    ageElement.innerHTML = `Age: <span class="statValue">${ageArray[this.age]}</span>`;
    statsContainer.appendChild(ageElement);

    const posTraitElement = document.createElement('div');
    posTraitElement.classList.add('stat');
    posTraitElement.classList.add('pos-trait');
    posTraitElement.innerHTML = `Positive Trait: <span class="pos-trait">${this.posTrait}</span>`;
    statsContainer.appendChild(posTraitElement);

    const negTraitElement = document.createElement('div');
    negTraitElement.classList.add('stat');
    negTraitElement.classList.add('neg-trait');
    negTraitElement.innerHTML = `Negative Trait: <span class="neg-trait">${this.negTrait}</span>`;
    statsContainer.appendChild(negTraitElement);

    const moraleStat = document.createElement('div');
    moraleStat.classList.add('stat');
    moraleStat.id = 'moraleStat';
    moraleStat.innerHTML = `Morale: <span class="statValue">${moraleArray[this.morale]}</span>`;
    statsContainer.appendChild(moraleStat);

    const hungerStat = document.createElement('div');
    hungerStat.classList.add('stat');
    hungerStat.id = 'hungerStat';
    hungerStat.innerHTML = `Hunger: <span class="statValue">${hungerArray[Math.round(this.hunger)]}</span>`;
    statsContainer.appendChild(hungerStat);

    const healthStat = document.createElement('div');
    healthStat.classList.add('stat');
    healthStat.id = 'healthStat';
    healthStat.innerHTML = `Health: <span class="statValue">${healthArray[this.health]}</span>`;
    statsContainer.appendChild(healthStat);
  
    characterDiv.appendChild(statsContainer);

    const inventoryList = document.createElement('div');
    inventoryList.classList.add('inventory');
    inventoryList.innerHTML = `<p>Inventory for ${this.name}</p>`;
    characterDiv.appendChild(inventoryList);

    const relationships = document.createElement('div');
    relationships.classList.add('relationships');
    relationships.innerHTML = `<p>Relationships for ${this.name}</p>`;
    characterDiv.appendChild(relationships);
    
    document.body.appendChild(characterDiv);
  }

  updateCharacter() {
    this.capAttributes();
    const characterDiv = document.getElementById(this.name);
    characterDiv.querySelector('.age').innerHTML = `Age: <span class="statValue">${ageArray[this.age]}</span>`;
    characterDiv.querySelector('.pos-trait').innerHTML = `Positive Trait: <span class="statValue">${this.posTrait}</span>`;
    characterDiv.querySelector('.neg-trait').innerHTML = `Negative Trait: <span class="statValue">${this.negTrait}</span>`;
    characterDiv.querySelector('#moraleStat').innerHTML = `Morale: <span class="statValue">${moraleArray[this.morale]}</span>`;
    characterDiv.querySelector('#hungerStat').innerHTML = `Hunger: <span class="statValue">${hungerArray[Math.round(this.hunger)]}</span>`;
    characterDiv.querySelector('#healthStat').innerHTML = `Health: <span class="statValue">${healthArray[this.health]}</span>`;
  
    // Update inventory display
    const inventoryList = characterDiv.querySelector('.inventory');
    inventoryList.innerHTML = `<p>Inventory for ${this.name}</p>`;
    const inventoryElement = document.createElement('ul');
    inventoryList.appendChild(inventoryElement);
    this.inventory.forEach(item => {
      const itemElement = document.createElement('li');
      if (Array.isArray(item)) {
        itemElement.textContent = item[0];
      } else {
        itemElement.textContent = item;
      }
        inventoryElement.appendChild(itemElement);
    });
  }
}