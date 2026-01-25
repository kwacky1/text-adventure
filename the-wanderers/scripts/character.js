import { weapons } from './party.js';
import { context } from './game-state.js';

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
  constructor(name, age, posTrait, negTrait, skin, hair, shirt, birthMonth = null, birthDay = null, birthYear = null) {
    this.id = 0;
    this.name = name;
    this.age = age; // Age category index (0=teen, 1=adult, 2=elder)
    this.morale = 6;
    this.hunger = 9;
    this.health = 9;
    this.sick = false;
    this.infected = false;
    this.posTrait = posTrait;
    this.negTrait = negTrait;
    this.relationships = new Map();
    this.weapon = 0;
    this.weaponDurability = 100;
    this.skin = skin;
    this.hair = hair;
    this.shirt = shirt;
    this.actionsUsed = { food: false, medical: false, interact: false };
    
    // Birthday system - month (0-11), day (1-31), year
    if (birthMonth !== null && birthDay !== null && birthYear !== null) {
      this.birthMonth = birthMonth;
      this.birthDay = birthDay;
      this.birthYear = birthYear;
    } else {
      // Generate random birthday based on age category
      this.generateRandomBirthday();
    }
  }

  generateRandomBirthday() {
    const currentDate = context.currentDate || new Date();
    const currentYear = currentDate.getFullYear();
    
    // Age ranges: teen (0-30), adult (31-60), elder (61+)
    let minAge, maxAge;
    switch (this.age) {
      case 0: // teen
        minAge = 13;
        maxAge = 30;
        break;
      case 1: // adult
        minAge = 31;
        maxAge = 60;
        break;
      case 2: // elder
        minAge = 61;
        maxAge = 80;
        break;
      default:
        minAge = 20;
        maxAge = 40;
    }
    
    const actualAge = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
    this.birthYear = currentYear - actualAge;
    this.birthMonth = Math.floor(Math.random() * 12);
    this.birthDay = Math.floor(Math.random() * 28) + 1; // Use 28 to avoid invalid dates
  }

  getActualAge() {
    const currentDate = context.currentDate || new Date();
    let age = currentDate.getFullYear() - this.birthYear;
    
    // Check if birthday has occurred this year
    const birthDateThisYear = new Date(currentDate.getFullYear(), this.birthMonth, this.birthDay);
    if (currentDate < birthDateThisYear) {
      age--;
    }
    return age;
  }

  getAgeCategory() {
    const actualAge = this.getActualAge();
    if (actualAge <= 30) return 0; // teen
    if (actualAge <= 60) return 1; // adult
    return 2; // elder
  }

  isBirthday() {
    const currentDate = context.currentDate || new Date();
    return currentDate.getMonth() === this.birthMonth && currentDate.getDate() === this.birthDay;
  }

  getBirthdayString() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[this.birthMonth]} ${this.birthDay}`;
  }

  resetActions() {
    this.actionsUsed = { food: false, medical: false, interact: false };
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
    characterDiv.id = this.name.split(' ').join('');
    characterDiv.classList.add('character');

    // Avatar container
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar';
    avatarContainer.style.position = 'relative';

    // PosTrait
    const posTraitPreview = document.createElement('div');
    posTraitPreview.className = 'posTraitSprite';
    const posTraitPreviewimg = posTraitPreview.appendChild(document.createElement('img'));
    posTraitPreviewimg.src = "images/traits/trait_" + this.posTrait + ".png";
    let postTraitSymbol;
    switch (this.posTrait) {
      case "fighter":
        postTraitSymbol = "muscle arm";
        break;
      case "friendly":
        postTraitSymbol = "speech bubble";
        break;
      case "resilient":
        postTraitSymbol = "heart";
        break;
      case "satiated":
        postTraitSymbol = "loaf of bread";
        break;
      case "scavenger":
        postTraitSymbol = "bone";
        break;
    }
    posTraitPreviewimg.alt = "A " + postTraitSymbol + ", representing the" + this.posTrait + "trait";
    avatarContainer.appendChild(posTraitPreview);

    // NegTrait
    const negTraitPreview = document.createElement('div');
    negTraitPreview.className = 'negTraitSprite';
    const negTraitPreviewImg = negTraitPreview.appendChild(document.createElement('img'));
    negTraitPreviewImg.src = "images/traits/trait_" + this.negTrait + ".png";
    let negTraitSymbol;
    switch (this.negTrait) {
      case "clumsy":
        negTraitSymbol = "bandaid";
        break;
      case "depressed":
        negTraitSymbol = "sad face";
        break;
      case "disconnected":
        negTraitSymbol = "blank face";
        break;
      case "hungry":
        negTraitSymbol = "fork and knife";
        break;
      case "hypochondriac":
        negTraitSymbol = "pill";
        break;
      case "vulnerable":
        negTraitSymbol = "broken heart";
        break;
    }
    negTraitPreviewImg.alt = "A " + negTraitSymbol + ", representing the" + this.negTrait + "trait";
    avatarContainer.appendChild(negTraitPreview);

    const avatar = document.createElement('div');
    avatar.className = 'avatarSprite';

    const hairOutline = document.createElement('img');
    hairOutline.src = "images/hair/outline_hair_" + this.hair.split('_')[1] + ".png";
    avatar.appendChild(hairOutline);

    const shirtOutline = document.createElement('img');
    shirtOutline.src = "images/shirts/outline_shirt_" + this.shirt.split('_')[1] + ".png";
    avatar.appendChild(shirtOutline);

    // Skin
    const skinPreview = avatar.appendChild(document.createElement('img'));
    skinPreview.src = this.skin;
    skinPreview.alt = this.name + '\'s skin sprite';
    avatar.appendChild(skinPreview);

    // Hair
    const hairPreview = document.createElement('img');
    hairPreview.src = this.hair;
    hairPreview.alt = this.name + '\'s hair sprite. Their hair is ' + this.hair.split('_')[1].replace('-',' and ') + '.';
    avatar.appendChild(hairPreview);

    // Shirt
    const shirtPreview = document.createElement('img');
    shirtPreview.src = this.shirt;
    shirtPreview.alt = this.name + '\'s shirt sprite. They\'re wearing a ' + this.shirt.split('_')[1] + '.';
    avatar.appendChild(shirtPreview);

    avatarContainer.appendChild(avatar);

    // Weapon
    const weaponPreview = document.createElement('div');
    weaponPreview.className = 'weaponSprite';
    const weaponPreviewImg = weaponPreview.appendChild(document.createElement('img'));
    const weaponType = weapons[this.weapon][0];
    if (weaponType == 'fist') {
      const skinType = this.skin.split('/').pop().split('.').shift();
      weaponPreviewImg.src = "images/weapons/weapon_" + skinType + weaponType + ".png";
    } else {
      weaponPreviewImg.src = "images/weapons/weapon_" + weaponType + ".png";
    }
    weaponPreviewImg.alt = 'An image of ' + this.name + '\'s current weapon, a ' + weaponType;
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
    ageElement.title = `Actual age: ${this.getActualAge()} (born ${this.getBirthdayString()}, ${this.birthYear})`;
    ageElement.style.cursor = 'help';
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
    moraleStat.classList.add('stat', 'morale');
    moraleStat.id = 'moraleStat';
    moraleStat.innerHTML = `Morale: <span class="statValue">${moraleArray[this.morale]}</span>`;
    statsContainer.appendChild(moraleStat);

    const hungerStat = document.createElement('div');
    hungerStat.classList.add('stat', 'hunger');
    hungerStat.id = 'hungerStat';
    hungerStat.innerHTML = `Hunger: <span class="statValue">${hungerArray[Math.round(this.hunger)]}</span>`;
    statsContainer.appendChild(hungerStat);

    const healthStat = document.createElement('div');
    healthStat.classList.add('stat', 'health');
    healthStat.id = 'healthStat';
    healthStat.innerHTML = `Health: <span class="statValue">${healthArray[this.health]}</span>`;
    statsContainer.appendChild(healthStat);

    // Display weapon with durability information
    const weapon = document.createElement('div');
    weapon.classList.add('stat');
    weapon.id = 'weapon';
    
    if (this.weapon === 0) {
      weapon.innerHTML = `Weapon: <span class="statValue">${weapons[this.weapon][0]}</span>`;
    } else {
      weapon.innerHTML = `Weapon: <span class="statValue">${weapons[this.weapon][0]} (${this.weaponDurability}/${weapons[this.weapon][2]})</span>`;
    }
    
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

    // Add weapon select dropdown
    const weaponSelect = document.createElement('select');
    weaponSelect.id = 'weaponSelect';
    weaponSelect.innerHTML = `<option value="weapon">Equip weapon</option>`;
    inventoryList.appendChild(weaponSelect);

    const interactSelect = document.createElement('select');
    interactSelect.id = 'interactionSelect';
    interactSelect.innerHTML = `<option value="interaction">Interact with</option>`;
    inventoryList.appendChild(interactSelect);

    const relationships = document.createElement('div');
    relationships.classList.add('relationships');
    relationships.innerHTML = `<p>Relationships for ${this.name}</p>`;
    characterDiv.appendChild(relationships);
  }

  updateCharacter() {
    this.capAttributes();
    const characterDiv = document.getElementById(this.name.split(' ').join(''));
    if (characterDiv) {
      const ageEl = characterDiv.querySelector('.age');
      ageEl.innerHTML = `Age: <span class="statValue">${ageArray[this.age]}</span>`;
      ageEl.title = `Actual age: ${this.getActualAge()} (born ${this.getBirthdayString()}, ${this.birthYear})`;
      characterDiv.querySelector('.pos-trait').innerHTML = `Positive Trait: <span class="statValue">${this.posTrait}</span>`;
      characterDiv.querySelector('div.posTraitSprite img').src = "images/traits/trait_" + this.posTrait + ".png";
      characterDiv.querySelector('.neg-trait').innerHTML = `Negative Trait: <span class="statValue">${this.negTrait}</span>`;
      characterDiv.querySelector('div.negTraitSprite img').src = "images/traits/trait_" + this.negTrait + ".png";
      characterDiv.querySelector('#moraleStat').innerHTML = `Morale: <span class="statValue">${moraleArray[this.morale]}</span>`;
      characterDiv.querySelector('#hungerStat').innerHTML = `Hunger: <span class="statValue">${hungerArray[Math.round(this.hunger)]}</span>`;
      characterDiv.querySelector('#healthStat').innerHTML = `Health: <span class="statValue">${healthArray[this.health]}</span>`;
      const weaponType = weapons[this.weapon][0];
      // Display weapon durability (except for fists which have "infinite" durability)
      if (this.weapon === 0) {
        characterDiv.querySelector('#weapon').innerHTML = `Weapon: <span class="statValue">${weaponType}</span>`;
      } else {
        characterDiv.querySelector('#weapon').innerHTML = `Weapon: <span class="statValue">${weaponType} (${this.weaponDurability}/${weapons[this.weapon][2]})</span>`;
      }
      if (characterDiv.querySelector('.weaponSprite')) {
        if (weaponType == 'fist') {
          const skinType = this.skin.split('/').pop().split('.').shift();
          characterDiv.querySelector('div.weaponSprite img').src = "images/weapons/weapon_" + weaponType + skinType.replace('skin','') + ".png";
        } else {
          characterDiv.querySelector('div.weaponSprite img').src = "images/weapons/weapon_" + weaponType + ".png";
        }
      }
    }
  }
}