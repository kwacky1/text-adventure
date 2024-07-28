

var turnNumber = 1;

const posTraits = [
    'resilient',
    'satiated',
    'friendly',
    'scavenger',
    'optimistic',
    'fighter'
];

const negTraits = [
    'vulnerable',
    'hungry',
    'disconnected',
    'hypochondriac',
    'depressed',
    'clumsy'
];

const food = [
    ['rations', 0.5],
    ['snack', 1],
    ['dish', 2],
    ['meal', 3],
    ['dessert', 2] // dessert is a treat, so it's worth more also beneficial for morale TODO
 ];

 const medical = [
    ['band aid', 1],
    ['bandage', 2],
    ['medicine', 3],
    ['first aid kit', 4]
 ];

 const weaponArray = [
    ['fist', 1],
    ['stick', 2],
    ['knife', 3],
    ['pistol', 4]   
 ];

const enemy = [
    ['zombie', 4 + Math.floor(Math.random() * 4)]
];

const events = [
    'found food', // x2
    'found medical supplies', // x1
    'found a weapon', // x0.5
    'found an enemy', // x1
    'found a friend' // x0.5 
]

import Party from './party.js';
import { Character, ageArray, hungerArray, moraleArray, injuries } from './character.js';

let gameParty = null;

export function playTurn() {
    // Move current events to turnX div
    const currentEventsDiv = document.getElementById('currentEvent')
    const currentEvents = currentEventsDiv.textContent;
    const eventsDiv = document.getElementById('events');
    const eventItem = document.createElement('div');
    eventItem.id = `turn${turnNumber}`;
    if (turnNumber % 2 === 0) {
        eventItem.classList.add('even');
    } else { 
        eventItem.classList.add('odd');
    }
    eventItem.textContent = currentEvents;
    eventsDiv.insertBefore(eventItem, eventsDiv.children[1]);
    currentEventsDiv.textContent = '';
    // Begin new turn
    var who = "The party";
    var foodType = "";
    console.log(`Turn ${turnNumber}`);
    updateParty();
    if (gameParty.characters.length === 0) {
        const playTurnButton = document.getElementById('playTurnButton');
        const partyInventoryDiv = document.getElementById('partyInventory');
        partyInventoryDiv.remove();
        // output character is dead to the events div
        addEvent('The adventure has come to an end. You survived for ' + turnNumber + ' turns.');
        playTurnButton.remove()
    } else {
        if (gameParty.characters.length > 1) {
            who = "The party"
        } else {
            who = gameParty.characters[0].name;
        }
        var event = `looks around`;
        // 90% chance of an event happening
        if (Math.random() < 0.9) {
            const chance = Math.random();
            // 40% chance to find food
            if (chance <= 0.4) {
                foundFood();
            } 
            // 20% chance to find medical supplies
            if (chance > 0.4 && chance <= 0.6) {
                foundMedical();
            } 
            // 10% chance to find a weapon
            if (chance > 0.6 && chance <= 0.7) {
                foundWeapon();
            } 
            // 20% chance to find an enemy
            if (chance > 0.7 && chance <= 0.9) {
                foundEnemy();
            } 
            // 10% chance to find a friend
            if ((chance > 0.9 && chance <= 1) && gameParty.characters.length < 4) {
                foundFriend();
            }
        } else {
            // output the event to the events div
            addEvent(`${who} ${event}.`);
        }

        // Add found items to the party inventory
        if (event === 'found food' || event === 'found medical') {
            const item = foodType[0];
            gameParty.inventory.push(item);
        }
        if (gameParty.inventory.some(item => food.some(foodItem => foodItem.includes(item)))) {
            const foodDiv = document.getElementById('foodButtons');
            foodDiv.querySelectorAll('button').forEach(button => button.remove());
            if (food.length > 0) {
                const foodDiv = document.getElementById('foodButtons');
                foodDiv.querySelectorAll('button').forEach(button => button.remove());
                for (const foodItem of food) {
                  if (gameParty.inventory.some(item => foodItem.includes(item))) {
                    for (const character of gameParty.characters) {
                      const button = document.createElement('button');
                      button.innerText = `Feed ${character.name} (${hungerArray[Math.round(character.hunger)]}) ${foodItem[0]}`;
                      button.addEventListener('click', () => {
                        const itemIndex = gameParty.inventory.findIndex(item => foodItem.includes(item));
                        if (itemIndex !== -1) {
                          const item = gameParty.inventory[itemIndex];
                          gameParty.inventory.splice(itemIndex, 1);
                          character.hunger += foodItem[1];
                          // if the food is dessert add 2 morale
                            if (foodItem[0] === 'dessert') {
                                character.morale += 2;
                                character.capAttributes();
                                addEvent(`${character.name} enjoyed the ${item}.`);
                            } else {
                                addEvent(`${character.name} ate the ${item}.`);
                            }
                          foodDiv.querySelectorAll('button').forEach(button => button.remove());
                          character.updateCharacter();
                        }
                      });
                      foodDiv.appendChild(button);
                    }
                  }
                }
              }
        }
        if (event === 'found a weapon') {
        }
        if (event == 'found an enemy') {
            // select a random enemy from the enemy array
            const enemyType = enemy[Math.floor(Math.random() * enemy.length)];
            addEvent(`A ${enemyType[0]} has appeared!`);
        }
        gameParty.updateInventory();
        turnNumber += 1;
        const playTurnButton = document.getElementById('playTurnButton');
        if (playTurnButton) {
            playTurnButton.innerText = `Play Turn ${turnNumber}`;
        }
    }

    function updateParty() {
        for (const character of gameParty.characters) {
            if (character.checkHunger()) {
                checkPosTraitEvents(character);
                checkNegTraitEvents(character);
                // Make sure attributes are within bounds
                character.capAttributes();

            } else {
                addEvent(`${character.name} died of hunger.`);
                checkDeathEffects(character);
                gameParty.removeCharacter(character);
                updateRelationships(gameParty);
            }
            updateStatBars(character);
        };
    }

    function foundFriend() {
        event = 'You are approached by an adventurer who wants to join your party.';
        const friendDiv = document.createElement('div');
        friendDiv.textContent = event;
        const acceptButton = document.createElement('button');
        acceptButton.textContent = 'Accept';
        acceptButton.addEventListener('click', () => {
            if (gameParty.characters.length < 4) {
                addPlayer(gameParty);
            }
            friendDiv.remove();
            acceptButton.remove();
            declineButton.remove();
        });
        const declineButton = document.createElement('button');
        declineButton.textContent = 'Decline';
        declineButton.addEventListener('click', () => {
            addEvent(`The adventurer walks away.`);
            friendDiv.remove();
            acceptButton.remove();
            declineButton.remove();
        });
        document.getElementById('gameButtons').appendChild(friendDiv);
        document.getElementById('gameButtons').appendChild(acceptButton);
        document.getElementById('gameButtons').appendChild(declineButton);
    }

    function foundEnemy() {
        event = 'found an enemy';
        const playTurnButton = document.getElementById('playTurnButton');
        playTurnButton.style.display = 'none';
        const enemyType = enemy[Math.floor(Math.random() * enemy.length)];
        const attackButton = document.createElement('button');
        attackButton.textContent = 'Attack';
        let totalDamage = 0;
        attackButton.addEventListener('click', () => {
            gameParty.characters.forEach((character) => {
                const weaponIndex = character.weapon;
                if (weaponIndex !== null) {
                    const weaponDamage = weaponArray[weaponIndex][1];
                    totalDamage += weaponDamage;
                    addEvent(`${character.name} hit the enemy for ${weaponDamage} damage.`);
                } else {
                    addEvent(`${character.name} has no weapon.`);
                }
            });
            if (totalDamage >= enemyType[1]) {
                addEvent(`The enemy has been defeated!`);
                attackButton.remove();
                defendButton.remove();
                playTurnButton.style.display = 'inline-block';
            } else {
                addEvent('The enemy has taken ' + totalDamage + ' damage.');
                addEvent(`The enemy has not been defeated.`);
            }
        });
        const defendButton = document.createElement('button');
        defendButton.textContent = 'Defend';
        defendButton.addEventListener('click', () => {
            addEvent(`You run away from the enemy.`);
            attackButton.remove();
            defendButton.remove();
            playTurnButton.style.display = 'inline-block';
        });
        document.getElementById('gameButtons').appendChild(attackButton);
        document.getElementById('gameButtons').appendChild(defendButton);
    }

    function foundWeapon() {
        const weaponType = weaponArray[Math.floor(Math.random() * (weaponArray.length - 1)) + 1];
        const weapon = weaponType[0];
        const damage = weaponType[1];
        event = `found a ${weapon}`;
        addEvent(`${who} ${event}.`);
        const weaponDiv = document.getElementById('weaponButtons');
        for (const character of gameParty.characters) {
            const button = document.createElement('button');
            // if character has a weapon, replace it
            if (character.weapon !== null) {
                const oldWeapon = weaponArray[character.weapon];
                const oldWeaponType = oldWeapon[0];
                const oldDamage = oldWeapon[1];
                if (oldDamage < damage) {
                    button.innerText = `Replace ${oldWeaponType} (${oldDamage} damage) with ${weapon} (${damage} damage) for ${character.name}`;
                    button.addEventListener('click', () =>
                    {
                        character.inventory.push(weaponType);
                        character.inventory.splice(character.inventory.indexOf(oldWeapon), 1);
                        character.weapon = weaponArray.indexOf(weaponType);
                        addEvent(`${character.name} replaced the ${oldWeaponType} with the ${weapon}.`);
                        weaponDiv.querySelectorAll('button').forEach(button => button.remove());
                        character.updateCharacter();
                    });
                    weaponDiv.appendChild(button);
                } 
            } else {
                button.innerText = `Give ${weapon} (${damage} damage) to ${character.name}`;
                button.addEventListener('click', () => 
                {
                    character.inventory.push(weaponType);
                    character.weapon = weaponArray.indexOf(weaponType);
                    addEvent(`${character.name} picked up the ${weapon}.`);
                    weaponDiv.querySelectorAll('button').forEach(button => button.remove());
                    character.updateCharacter();
                });
                weaponDiv.appendChild(button);
            }
        }
}

    function foundMedical() {
        event = 'found medical supplies';
        const medicalType = medical[Math.floor(Math.random() * medical.length)];
        addEvent(`${who} ${event} (${medicalType[0]}).`);
    }

    function foundFood() {
        event = 'found food';
        foodType = food[Math.floor(Math.random() * food.length)];
        addEvent(`${who} ${event} (${foodType[0]}).`);
    }

    function checkNegTraitEvents(character) {
        if (character.negTrait === 'vulnerable') {
            // TODO
        }
        if (character.negTrait === 'hungry') {
            // every other turn, hunger goes up
            if (turnNumber % 2 === 0) {
                character.hunger -= 1;
            }
        }
        if (character.negTrait === 'disconnected') {
            // TODO
        }
        if (character.negTrait === 'hypochondriac') {
            // TODO
        }
        if (character.negTrait === 'depressed') {
            // 10% chance of decreasing morale
            if (Math.random() < 0.1) {
                gameParty.characters[Math.floor(Math.random() * gameParty.characters.length)].morale -= 1;
            }
            // Can't go above good
            if (character.morale > 7) {
                character.morale -= 2;
            }
        }
        if (character.negTrait === 'clumsy') {
            // 10% chance of increasing injury
            if (Math.random() < 0.1) {
                character.injuryLevel += 1;
            }
        }
    }

    function checkPosTraitEvents(character) {
        if (character.posTrait === 'resilient') {
            // 10% chance of healing
            if (Math.random() < 0.1) {
                character.injuryLevel -= 1;
            }
        }
        if (character.posTrait === 'satiated') {
            // every other turn, hunger goes down
            if (turnNumber % 2 === 0) {
                character.hunger += 1;
            }
        }
        if (character.posTrait === 'friendly') {
            // TODO
        }
        if (character.posTrait === 'scavenger') {
            // TODO
        }
        if (character.posTrait === 'optimistic') {
            // 10% chance of increasing morale
            if (Math.random() < 0.1) {
                gameParty.characters[Math.floor(Math.random() * gameParty.characters.length)].morale += 1;
            }
            // Can't go below bad
            if (character.morale < 2) {
                character.morale += 2;
            }
        }
        if (character.posTrait === 'fighter') {
            // TODO
        }
    }
}

function addEvent(eventText) {
    let currentEvents = '';
    const currentEventDiv = document.getElementById('currentEvent');
    if (currentEventDiv.textContent !== '') {
        currentEvents = currentEventDiv.textContent;
    }
    currentEvents += ' ' + eventText;
    currentEventDiv.textContent = currentEvents.trim();
}

async function addPlayer(party) {
    try {
        if (party.characters.length == 0) {
            createCharacterForm();
        } else {
            const response = await fetch('https://randomuser.me/api/?nat=au,br,ca,ch,de,dk,es,fi,fr,gb,ie,in,mx,nl,no,nz,rs,tr,ua,us');
            const data = await response.json();
            const firstName = getName(data);
            const age = Math.floor(Math.random() * ageArray.length);
            const posTrait = posTraits[Math.floor(Math.random() * posTraits.length)];
            const negTrait = negTraits[Math.floor(Math.random() * negTraits.length)];
            const character = new Character(firstName, age, posTrait, negTrait );
            party.addCharacter(character);
            addEvent(`${character.name} has joined the party!`);
            character.createCharacter();
            character.updateCharacter();
        }
        updateRelationships(party);
    } catch (error) {
        console.error(error);
    }
}

function updateStatBars(character) {
    const characterDiv = document.getElementById(character.name);
    const moraleStat = characterDiv.querySelector('#moraleStat');
    const hungerStat = characterDiv.querySelector('#hungerStat');
    const injuryStat = characterDiv.querySelector('#injuryStat');

    const moraleValue = character.morale;
    const hungerValue = character.hunger;
    console.log("hunger value: " + character.hunger);
    const injuryValue = character.injuryLevel;

    const moralePercentage = (moraleValue / (moraleArray.length - 1)) * 100;
    const hungerPercentage = (hungerValue / (hungerArray.length - 1)) * 100;
    const maxInjuryValue = injuries.length - 1;
    const injuryPercentage = ((maxInjuryValue - injuryValue) / maxInjuryValue) * 100;

    moraleStat.style.setProperty('--width', `${moralePercentage}%`);
    hungerStat.style.setProperty('--width', `${hungerPercentage}%`);
    injuryStat.style.setProperty('--width', `${injuryPercentage}%`);

    // Define threshold percentages
    const lowThreshold = 30;
    const mediumThreshold = 60;

    // Function to determine background color based on percentage
    function getBackgroundColor(percentage) {
        if (percentage < lowThreshold) {
            return "rgba(128, 0, 0, 0.5)";
        } else if (percentage < mediumThreshold) {
            return "rgba(128, 128, 0, 0.5)";
        } else {
            return "rgba(0, 128, 0, 0.5)";
        }
    }

    // Set background color using CSS properties
    moraleStat.style.setProperty('--background-color', getBackgroundColor(moralePercentage));
    hungerStat.style.setProperty('--background-color', getBackgroundColor(hungerPercentage));
    injuryStat.style.setProperty('--background-color', getBackgroundColor(injuryPercentage));
}

function updateRelationships(party) {
    for (const character of party.characters) {
        const characterItem = document.getElementById(character.name);
        const relationshipsDiv = characterItem.querySelector('.relationships');
        relationshipsDiv.innerHTML = '<p>Relationships</p>';
        const relationshipsList = document.createElement('ul');
        relationshipsDiv.appendChild(relationshipsList);
        for (const relationship of character.relationships) {
            const relationshipItem = document.createElement('li');
            relationshipItem.textContent = `${relationship.type[0]} with ${relationship.character.name}`;
            relationshipsList.appendChild(relationshipItem);
        }
    }
}

async function createCharacterForm() {
    const formDiv = document.createElement('div');
    const precis = document.createElement('p');

    precis.textContent = 'Create a character to start the game.';
    formDiv.appendChild(precis);

    const form = document.createElement('form');  
    const response = await fetch('https://randomuser.me/api/?nat=au,br,ca,ch,de,dk,es,fi,fr,gb,ie,in,mx,nl,no,nz,rs,tr,ua,us');
    const data = await response.json();
    const firstName = getName(data);

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name: ';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = firstName;
    nameLabel.appendChild(nameInput);
    form.appendChild(nameLabel);
  
    const ageLabel = document.createElement('label');
    ageLabel.textContent = 'Age: ';
    const ageInput = document.createElement('select');
    for (let i = 0; i < ageArray.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = ageArray[i];
        ageInput.appendChild(option);
      }  
    ageInput.selectedIndex = Math.floor(Math.random() * ageArray.length);
    ageLabel.appendChild(ageInput);
    form.appendChild(ageLabel);
  
    const posTraitsLabel = document.createElement('label');
    posTraitsLabel.textContent = 'Positive Trait: ';
    const posTraitsSelect = document.createElement('select');
    for (const trait of posTraits) {
      const option = document.createElement('option');
      option.value = trait;
      option.textContent = trait;
      posTraitsSelect.appendChild(option);
    }
    posTraitsSelect.selectedIndex = Math.floor(Math.random() * posTraits.length);
    posTraitsLabel.appendChild(posTraitsSelect);
    form.appendChild(posTraitsLabel);
  
    const negTraitsLabel = document.createElement('label');
    negTraitsLabel.textContent = 'Negative Trait: ';
    const negTraitsSelect = document.createElement('select');
    for (const trait of negTraits) {
      const option = document.createElement('option');
      option.value = trait;
      option.textContent = trait;
      negTraitsSelect.appendChild(option);
    }
    negTraitsSelect.selectedIndex = Math.floor(Math.random() * negTraits.length);
    negTraitsLabel.appendChild(negTraitsSelect);
    form.appendChild(negTraitsLabel);

    // Avatar creation section
    const avatarSection = document.createElement('div');
    avatarSection.textContent = 'Create your avatar:';

    // Skin selection
    const skinLabel = document.createElement('label');
    skinLabel.textContent = 'Skin: ';
    const skinSelect = document.createElement('select');
    const skinImages = ['skin1.png', 'skin2.png', 'skin3.png', 'skin4.png', 'skin5.png']; // Add your skin image filenames here
    skinImages.forEach((skin, index) => {
        const option = document.createElement('option');
        option.value = skin;
        option.textContent = `Skin ${index + 1}`;
        skinSelect.appendChild(option);
    });
    skinLabel.appendChild(skinSelect);
    avatarSection.appendChild(skinLabel);

    // Hair style selection
    const hairStyleLabel = document.createElement('label');
    hairStyleLabel.textContent = 'Hairstyle: ';
    const hairStyleSelect = document.createElement('select');
    const hairStyleImages = ['short1', 'short2', 'long1', 'long2']; // Add your hairStyle image filenames here
    hairStyleImages.forEach((hairStyle, index) => {
        const option = document.createElement('option');
        option.value = hairStyle;
        option.textContent = hairStyleImages[index].charAt(0).toUpperCase() + hairStyleImages[index].slice(1);
        hairStyleSelect.appendChild(option);
    });
    hairStyleLabel.appendChild(hairStyleSelect);
    avatarSection.appendChild(hairStyleLabel);

    // Hair colour selection
    const hairColourLabel = document.createElement('label');
    hairColourLabel.textContent = 'Hair Colour: ';
    const hairColourSelect = document.createElement('select');
    const hairColourImages = ['blonde.png', 'ginger.png', 'brown.png', 'red.png', 'black.png']; // Add your hairColour image filenames here
    hairColourImages.forEach((hairColour, index) => {
        const option = document.createElement('option');
        option.value = hairColour;
        // grab the name of the file before the .png
        option.textContent = hairColourImages[index].split('.')[0].charAt(0).toUpperCase() + hairColourImages[index].split('.')[0].slice(1);        
        hairColourSelect.appendChild(option);
    });
    hairColourLabel.appendChild(hairColourSelect);
    avatarSection.appendChild(hairColourLabel);

    // shirt style selection
    const shirtStyleLabel = document.createElement('label');
    shirtStyleLabel.textContent = 'Shirt Style: ';
    const shirtStyleSelect = document.createElement('select');
    const shirtStyleImages = ['shirt1', 'shirt2', 'shirt3', 'shirt4']; // Add your shirtStyle image filenames here
    shirtStyleImages.forEach((shirtStyle, index) => {
        const option = document.createElement('option');
        option.value = shirtStyle;
        option.textContent = shirtStyleImages[index].charAt(0).toUpperCase() + shirtStyleImages[index].slice(1);
        shirtStyleSelect.appendChild(option);
    });
    shirtStyleLabel.appendChild(shirtStyleSelect);
    avatarSection.appendChild(shirtStyleLabel);

    // shirt colour selection
    const shirtColourLabel = document.createElement('label');
    shirtColourLabel.textContent = 'Shirt Colour: ';
    const shirtColourSelect = document.createElement('select');
    const shirtColourImages = ['red.png', 'yellow.png', 'green.png', 'blue.png']; // Add your shirtColour image filenames here
    shirtColourImages.forEach((shirtColour, index) => {
        const option = document.createElement('option');
        option.value = shirtColour;
        option.textContent = shirtColourImages[index].split('.')[0].charAt(0).toUpperCase() + shirtColourImages[index].split('.')[0].slice(1);
        shirtColourSelect.appendChild(option);
    });
    shirtColourLabel.appendChild(shirtColourSelect);
    avatarSection.appendChild(shirtColourLabel);

    // Avatar preview container
    const avatarPreviewContainer = document.createElement('div');
    avatarPreviewContainer.style.position = 'relative';
    avatarPreviewContainer.style.width = '88px'; // Set the width of the container (4x upscale)
    avatarPreviewContainer.style.height = '88px'; // Set the height of the container (4x upscale)

    // Skin preview
    const skinPreview = document.createElement('img');
    skinPreview.src = "img/" + skinImages[0]; // Default to the first skin image
    skinPreview.alt = 'Skin Preview';
    skinPreview.style.position = 'absolute';
    skinPreview.style.top = '0';
    skinPreview.style.left = '0';
    skinPreview.width = 88; // 4x upscale
    skinPreview.height = 88; // 4x upscale
    skinPreview.style.imageRendering = 'pixelated';
    avatarPreviewContainer.appendChild(skinPreview);

    // Hair preview
    const hairPreview = document.createElement('img');
    hairPreview.src = "img/" + hairStyleImages[0] + hairColourImages[0]; // Default to the first hair image
    hairPreview.alt = 'Hair Preview';
    hairPreview.style.position = 'absolute';
    hairPreview.style.top = '0';
    hairPreview.style.left = '0';
    hairPreview.width = 88; // 4x upscale
    hairPreview.height = 88; // 4x upscale
    hairPreview.style.imageRendering = 'pixelated';
    avatarPreviewContainer.appendChild(hairPreview);

    // shirt preview
    const shirtPreview = document.createElement('img');
    shirtPreview.src = "img/" + shirtStyleImages[0] + shirtColourImages[0]; // Default to the first shirt image
    shirtPreview.alt = 'shirt Preview';
    shirtPreview.style.position = 'absolute';
    shirtPreview.style.top = '0';
    shirtPreview.style.left = '0';
    shirtPreview.width = 88; // 4x upscale
    shirtPreview.height = 88; // 4x upscale
    shirtPreview.style.imageRendering = 'pixelated';
    avatarPreviewContainer.appendChild(shirtPreview);
    
    avatarSection.appendChild(avatarPreviewContainer);

    // Event listeners to update previews
    skinSelect.addEventListener('change', () => {
        skinPreview.src = "img/" + skinSelect.value;
    });

    hairStyleSelect.addEventListener('change', () => {
        hairPreview.src = "img/" + hairStyleSelect.value + hairColourSelect.value;
    });

    hairColourSelect.addEventListener('change', () => {
        hairPreview.src = "img/" + hairStyleSelect.value + hairColourSelect.value;
    });

    shirtStyleSelect.addEventListener('change', () => {
        shirtPreview.src = "img/" + shirtStyleSelect.value + shirtColourSelect.value;
    });

    shirtColourSelect.addEventListener('change', () => {
        shirtPreview.src = "img/" + shirtStyleSelect.value + shirtColourSelect.value;
    });

    form.appendChild(avatarSection);

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Start Game';
    submitButton.addEventListener('click', () => {
        const name = nameInput.value;
        const age = ageInput.value;
        const posTrait = posTraitsSelect.value;
        const negTrait = negTraitsSelect.value;
        const character = new Character(name, age, posTrait, negTrait);
        formDiv.remove();
        startGame().then((gameParty) => {
            const playTurnButton = document.createElement('button');
            playTurnButton.id = 'playTurnButton';
            playTurnButton.textContent = 'Play Turn 1';
            playTurnButton.addEventListener('click', () => {
                playTurn();
            });
            document.getElementById('gameButtons').appendChild(playTurnButton);
            gameParty.addCharacter(character);
            character.createCharacter();
            character.updateCharacter();

            //unhide the buttons div
            const buttonsDiv = document.getElementById('buttons');
            buttonsDiv.style.display = 'block';

            //unhide the events div
            const eventsDiv = document.getElementById('events');
            eventsDiv.style.display = 'block';

            addEvent(`${character.name} has started the adventure!`);
        });
    });
    form.appendChild(submitButton);

    // Set focus on the name input field
    nameInput.focus();

    // Submit the form when Enter key is pressed in the name input field
    nameInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      form.submit();
    }
    });

    formDiv.appendChild(form);
    document.body.appendChild(formDiv);
  }

function checkDeathEffects(character) {
// when a character dies check the relationships of the other characters and set moreale accordingly
/*
    ['enemies'], + 1
    ['strangers'], no change
    ['acquaintances'], - 1
    ['friends'], - 2
    ['family'] - 3
*/
    for (const remainingCharacter of gameParty.characters) {
        if (remainingCharacter !== character) {
            const relationshipIndex = remainingCharacter.relationships.findIndex(rel => rel.character == character)
            const relationship = character.relationships[relationshipIndex].type[0];
            if (relationship === 'friends') {
                remainingCharacter.morale -= 2;
            }
            if (relationship === 'family') {
                remainingCharacter.morale -= 3;
            }
            if (relationship === 'acquaintances') {
                remainingCharacter.morale -= 1;
            }
            if (relationship === 'enemies') {
                remainingCharacter.morale += 1;
            }
            remainingCharacter.capAttributes();
        }
    }
}

function getName(data) {
    return data.results[0].name.first;
}

async function startGame() {
    if (!gameParty) {
        gameParty = new Party();
        //await addPlayer(gameParty);
    }
    return gameParty;
}

createCharacterForm();

/* startGame().then((gameParty) => {
    const playTurnButton = document.getElementById('playTurnButton');
    playTurnButton.addEventListener('click', () => {
        playTurn();
    });
}); */