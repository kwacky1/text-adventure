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

export const weaponArray = [
  ['fist', 1],
  ['stick', 2],
  ['knife', 3],
  ['pistol', 4]   
];

export class Character {
  constructor(name, age, posTrait, negTrait, skin, hair, shirt) { 
    this.id = 0;
    this.name = name;
    this.age = age;
    this.morale = 6;
    this.hunger = 9;
    this.health = 9;
    this.sick = false;
    this.infected = false;
    this.posTrait = posTrait;
    this.negTrait = negTrait;
    this.relationships = new Map();
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
    if (this.health < 0) {
      this.health = 0;
    }
    // Friendly relationships can't be cold
    if (this.relationships.length > 0) {
      for (const relationship of this.relationships) {
        if (this.posTrait === 'friendly' && relationship.type === 'cold') {
          relationship.type = 'strangers';
        }
      }
    }
    // Disconnected relationships can't be family
    if (this.relationships.length > 0) {
      for (const relationship of this.relationships) {
        if (this.negTrait === 'disconnected' && relationship.type === 'family') {
          relationship.type = 'friends';
        }
      }
    }
    // Morale can't go below terrible
    if (this.morale < 0) {
      this.morale = 0;
    }
  }

  createCharacter() {
    const charactersDiv = document.getElementById("characters");
    const characterDiv = charactersDiv.appendChild(document.createElement('div'));
    characterDiv.id = this.name;
    characterDiv.classList.add('character');

    // Avatar container
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar';
    avatarContainer.style.position = 'relative';

    // PosTrait 
    const posTraitPreview = document.createElement('img');
    posTraitPreview.className = 'posTraitSprite';
    posTraitPreview.src = "img/" + this.posTrait + ".png"; 
    posTraitPreview.alt = this.posTrait;
    avatarContainer.appendChild(posTraitPreview);

    // NegTrait
    const negTraitPreview = document.createElement('img');
    negTraitPreview.className = 'negTraitSprite';
    negTraitPreview.src = "img/" + this.negTrait + ".png"; 
    negTraitPreview.alt = this.negTrait;
    avatarContainer.appendChild(negTraitPreview);

    // Skin 
    const skinPreview = document.createElement('img');
    skinPreview.src = this.skin; 
    skinPreview.alt = 'skin';
    avatarContainer.appendChild(skinPreview);

    // Hair 
    const hairPreview = document.createElement('img');
    hairPreview.src = this.hair;
    hairPreview.alt = 'hair';
    avatarContainer.appendChild(hairPreview);

    // Shirt
    const shirtPreview = document.createElement('img');
    shirtPreview.src = this.shirt;
    shirtPreview.alt = 'shirt';
    avatarContainer.appendChild(shirtPreview);
    
    // Weapon
    const weaponPreview = document.createElement('img');
    weaponPreview.className = 'weaponSprite';
    const weaponType = weaponArray[this.weapon][0];
    if (weaponType == 'fist') {
      const skinType = this.skin.split('/').pop().split('.').shift();
      weaponPreview.src = "img/" + skinType + weaponType + ".png"; 
    } else {
      weaponPreview.src = "img/" + weaponType + ".png";
    }
    weaponPreview.alt = weaponType;
    avatarContainer.appendChild(weaponPreview);

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
  
    const weapon = document.createElement('div');
    weapon.classList.add('stat');
    weapon.id = 'weapon';
    weapon.innerHTML = `Weapon: <span class="statValue">${weaponArray[this.weapon][0]}</span>`;
    statsContainer.appendChild(weapon);

    characterDiv.appendChild(statsContainer);

    const inventoryList = document.createElement('div');
    inventoryList.id = 'options';
    inventoryList.innerHTML = `<p>Options for ${this.name}</p>`;
    characterDiv.appendChild(inventoryList);

    const foodSelect = document.createElement('select');
    foodSelect.id = 'foodSelect';
    foodSelect.innerHTML = `<option value="food">Feed ${this.name}</option>`;
    inventoryList.appendChild(foodSelect);

    const medicalSelect = document.createElement('select');
    medicalSelect.id = 'medicalSelect';
    medicalSelect.innerHTML = `<option value="medical">Heal ${this.name}</option>`;
    inventoryList.appendChild(medicalSelect);

    const relationships = document.createElement('div');
    relationships.classList.add('relationships');
    relationships.innerHTML = `<p>Relationships for ${this.name}</p>`;
    characterDiv.appendChild(relationships);
      }

  updateCharacter() {
    this.capAttributes();
    const characterDiv = document.getElementById(this.name);
    if (characterDiv) {
      characterDiv.querySelector('.age').innerHTML = `Age: <span class="statValue">${ageArray[this.age]}</span>`;
      characterDiv.querySelector('.pos-trait').innerHTML = `Positive Trait: <span class="statValue">${this.posTrait}</span>`;
      characterDiv.querySelector('.neg-trait').innerHTML = `Negative Trait: <span class="statValue">${this.negTrait}</span>`;
      characterDiv.querySelector('#moraleStat').innerHTML = `Morale: <span class="statValue">${moraleArray[this.morale]}</span>`;
      characterDiv.querySelector('#hungerStat').innerHTML = `Hunger: <span class="statValue">${hungerArray[Math.round(this.hunger)]}</span>`;
      characterDiv.querySelector('#healthStat').innerHTML = `Health: <span class="statValue">${healthArray[this.health]}</span>`;
      characterDiv.querySelector('#weapon').innerHTML = `Weapon: <span class="statValue">${weaponArray[this.weapon][0]}</span>`;
    }
  }
}