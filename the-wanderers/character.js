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
    posTraitPreviewimg.src = "img/trait_" + this.posTrait + ".png";
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
    negTraitPreviewImg.src = "img/trait_" + this.negTrait + ".png";
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

    // Skin
    const skinPreview = avatar.appendChild(document.createElement('img'));
    skinPreview.src = this.skin;
    skinPreview.alt = this.name + '\'s skin sprite';
    avatar.appendChild(skinPreview);

    // Hair
    const hairPreview = document.createElement('img');
    hairPreview.src = this.hair;
    hairPreview.alt = this.name + '\'s hair sprite. Their hair is ';
    switch (this.hair) {
      case "img/hair1.png":
        hairPreview.alt += "short and straight.";
        break;
      case "img/hair2.png":
        hairPreview.alt += "short and fluffy.";
        break;
      case "img/hair3.png":
        hairPreview.alt += "long and straight.";
        break;
      case "img/hair4.png":
        hairPreview.alt += "long and curly.";
        break;
    }
    avatar.appendChild(hairPreview);

    // Shirt
    const shirtPreview = document.createElement('img');
    shirtPreview.src = this.shirt;
    shirtPreview.alt = this.name + '\'s shirt sprite. They\'re wearing a ';
    switch (this.shirt) {
      case "img/shirt1.png":
        shirtPreview.alt += "hoodie.";
        break;
      case "img/shirt2.png":
        shirtPreview.alt += "vest.";
        break;
      case "img/shirt3.png":
        shirtPreview.alt += "jacket.";
        break;
      case "img/shirt4.png":
        shirtPreview.alt += "scarf.";
        break;
    }
    avatar.appendChild(shirtPreview);

    avatarContainer.appendChild(avatar);

    // Weapon
    const weaponPreview = document.createElement('div');
    weaponPreview.className = 'weaponSprite';
    const weaponPreviewImg = weaponPreview.appendChild(document.createElement('img'));
    const weaponType = weaponArray[this.weapon][0];
    if (weaponType == 'fist') {
      const skinType = this.skin.split('/').pop().split('.').shift();
      weaponPreviewImg.src = "img/" + skinType + weaponType + ".png";
    } else {
      weaponPreviewImg.src = "img/" + weaponType + ".png";
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
    const characterDiv = document.getElementById(this.name.split(' ').join(''));
    if (characterDiv) {
      characterDiv.querySelector('.age').innerHTML = `Age: <span class="statValue">${ageArray[this.age]}</span>`;
      characterDiv.querySelector('.pos-trait').innerHTML = `Positive Trait: <span class="statValue">${this.posTrait}</span>`;
      characterDiv.querySelector('div.posTraitSprite img').src = "img/trait_" + this.posTrait + ".png";
      characterDiv.querySelector('.neg-trait').innerHTML = `Negative Trait: <span class="statValue">${this.negTrait}</span>`;
      characterDiv.querySelector('div.negTraitSprite img').src = "img/trait_" + this.negTrait + ".png";
      characterDiv.querySelector('#moraleStat').innerHTML = `Morale: <span class="statValue">${moraleArray[this.morale]}</span>`;
      characterDiv.querySelector('#hungerStat').innerHTML = `Hunger: <span class="statValue">${hungerArray[Math.round(this.hunger)]}</span>`;
      characterDiv.querySelector('#healthStat').innerHTML = `Health: <span class="statValue">${healthArray[this.health]}</span>`;
      const weaponType = weaponArray[this.weapon][0];
      characterDiv.querySelector('#weapon').innerHTML = `Weapon: <span class="statValue">${weaponType}</span>`;
      if (characterDiv.querySelector('.weaponSprite')) {
        if (weaponType == 'fist') {
          const skinType = this.skin.split('/').pop().split('.').shift();
          characterDiv.querySelector('div.weaponSprite img').src = "img/weapon_" + weaponType + skinType.replace('skin','') + ".png";
        } else {
          characterDiv.querySelector('div.weaponSprite img').src = "img/" + weaponType + ".png";
        }
      }
    }
  }
}