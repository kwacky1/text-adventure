

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
    ['dessert', 2] // dessert is a treat, so it's worth more also beneficial for morale
 ];

 const medical = [
    ['band aid', 1],
    ['bandage', 2],
    ['medicine', 3],
    ['first aid kit', 4]
 ];

const enemy = [
    ['zombie']
];

const events = [
    'found food', // x2
    'found medical supplies', // x1
    'found a weapon', // x0.5
    'found an enemy', // x1
    'found a friend' // x0.5 
]

import Party from './party.js';
import { Character, ageArray, hungerArray, moraleArray, healthArray, weaponArray } from './character.js';

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
        var event = `moves on`;
        const chance = Math.random();
        var friendChance = 0.2;
        var enemyChance = 0.1 + friendChance;
        var itemChance = 0.4 + enemyChance;
        var secondItem = 0 + itemChance;
        if (gameParty.characters.length == 2) {
            friendChance = 0.15;
            enemyChance = 0.15 + friendChance;
            itemChance = 0.45 + enemyChance;
            secondItem = 0.05 + itemChance;
        }
        if (gameParty.characters.length == 3) {
            friendChance = 0.1;
            enemyChance = 0.2 + friendChance;
            itemChance = 0.5 + enemyChance;
            secondItem = 0.1 + itemChance;
        }
        if (gameParty.characters.length == 4) {
            friendChance = 0.1;
            enemyChance = 0.2 + friendChance;
            itemChance = 0.55 + enemyChance;
            secondItem = 0.15 + itemChance;
        }
        if ((chance <= friendChance) && gameParty.characters.length < 4) {
            foundFriend();
        } else if (chance > friendChance && chance <= enemyChance) {
            foundEnemy();
        } else if (chance > enemyChance && chance <= secondItem) {
            var items = 1;
            if (chance > itemChance && chance <= secondItem) {
                items = 2;
            }
            for (var i = 0; i < items; i++) {
                var whichItem = Math.random();
                if (whichItem <= 0.33) {
                    foundFood();
                } else if (whichItem <= 0.67) {
                    foundMedical();
                } else {
                    foundWeapon()
                }
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
                          // if the food is dessert add 1 morale
                            if (foodItem[0] === 'dessert') {
                                character.morale += 1;
                                character.capAttributes();
                                addEvent(`${character.name} enjoyed the ${item}.`);
                            } else {
                                addEvent(`${character.name} ate the ${item}.`);
                            }
                            // if the character is satiated, they get an extra 0.5 hunger
                            if (character.posTrait === 'satiated') {
                                character.hunger += 0.5;
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
                updateStatBars(character);
            } else {
                addEvent(`${character.name} died of hunger.`);
                checkDeathEffects(character);
                gameParty.removeCharacter(character);
                updateRelationships(gameParty);
            }
            if (character.morale == 0 && gameParty.characters.length > 1) {
                addEvent(`${character.name} has lost all hope. They have left the party.`);
                checkDeathEffects(character);
                gameParty.removeCharacter(character);
                updateRelationships(gameParty);
            }
        };
    }

    function foundFriend() {
        event = 'is approached by an adventurer who wants to join your party';
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
        var numberOfEnemies = Math.floor(Math.random() * gameParty.characters.length) + 1;
        if (numberOfEnemies == 1) {
            addEvent(`An enemy has appeared!`);
        } else {
            addEvent(`${numberOfEnemies} enemies have appeared!`);
        }
        // create array of enemies with random morale from 0 to 9
        var enemies = [];
        for (var i = 0; i < numberOfEnemies; i++) {
            var enemyType = enemy[Math.floor(Math.random() * enemy.length)];
            var enemyHP = 4 + Math.floor(Math.random() * 4);
            var enemyMorale = Math.floor(Math.random() * 10);
            console.log("Enemy: " + enemyType + " HP:" + enemyHP + " Morale:" + enemyMorale);
            enemies.push({
                type: enemyType[0],
                hp: enemyHP,
                morale: enemyMorale,
                attack: 1 // Set attack to 1 for now
            });
        }
        var players = gameParty.characters.map(character => ({
            type: character.name,
            hp: character.health,
            morale: character.morale,
            attack: weaponArray[character.weapon][1] 
        }));

        // Combine enemies and players into a single array
        var combatants = players.concat(enemies.map(enemy => ({
            type: 'enemy',
            hp: enemy.hp,
            morale: enemy.morale,
            attack: enemy.attack
        })));

        // Sort the combined array by morale
        combatants.sort((a, b) => b.morale - a.morale);

        // print the array for debugging
        console.log(combatants);

            // Function to handle the turn-based logic
        function handleTurn(index) {


            if (index >= combatants.length) {
                // All turns are done, start over
                handleTurn(0);
                return;
            }

        const combatant = combatants[index];
        if (combatant.type === 'enemy') {
            // Enemy's turn to attack
            // Add a button to commence the attack
            const attackButton = document.createElement('button');
            attackButton.textContent = `The ${combatant.type} attacks!`;
            attackButton.addEventListener('click', () => {
                // choose target to attack
                const target = players[Math.floor(Math.random() * players.length)];
                // attack the target
                target.hp -= combatant.attack;
                addEvent(`The ${combatant.type} attacks ${target.type} for ${combatant.attack} damage.`);
                handleTurn(index + 1);
                attackButton.remove();
            });
            const weaponButtons = document.getElementById('weaponButtons');
            weaponButtons.appendChild(attackButton);
        } else {
            // Show attack buttons for each enemy
            combatants.forEach((enemy, enemyIndex) => {
                if (enemy.type === 'enemy') {
                    const weaponButtons = document.getElementById('weaponButtons');
                    const attackButton = document.createElement('button');
                    attackButton.textContent = `${combatant.type} attacks ${enemy.type} (${enemy.hp} HP)`;
                    attackButton.addEventListener('click', () => {
                        enemy.hp -= combatant.attack;
                        addEvent(`${combatant.type} hit ${enemy.type} for ${combatant.attack} damage.`);
                        if (enemy.hp <= 0) {
                            addEvent(`The ${enemy.type} has been defeated!`);
                            // Remove defeated enemy from combatants array
                            combatants.splice(enemyIndex, 1);
                            // Check if all enemies are defeated
                            if (combatants.filter(c => c.type === 'enemy').length === 0) {
                                // Unhide the playTurnButton
                                const playTurnButton = document.getElementById('playTurnButton');
                                playTurnButton.style.display = 'block';
                            }
                        }
                        weaponButtons.querySelectorAll('button').forEach(button => button.remove());
                        handleTurn(index + 1);
                    });
                    weaponButtons.appendChild(attackButton);
                } 
            });
        }}

        // Start the turn-based combat
        handleTurn(0);
    }

    function foundWeapon() {
        const weaponType = weaponArray[Math.floor(Math.random() * (weaponArray.length - 1)) + 1];
        const weapon = weaponType[0];
        const damage = weaponType[1];
        const playTurnButton = document.getElementById('playTurnButton');
        playTurnButton.style.display = 'none';
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
                        addEvent(`${character.name} replaced their ${oldWeaponType} with the ${weapon}.`);
                        weaponDiv.querySelectorAll('button').forEach(button => button.remove());
                        character.updateCharacter();
                        playTurnButton.style.display = 'block';
                    });
                    weaponDiv.appendChild(button);
                } 
            } else {
                button.innerText = `Give ${weapon} (${damage} attack) to ${character.name}`;
                button.addEventListener('click', () => 
                {
                    character.inventory.push(weaponType);
                    character.weapon = weaponArray.indexOf(weaponType);
                    addEvent(`${character.name} picked up the ${weapon}.`);
                    weaponDiv.querySelectorAll('button').forEach(button => button.remove());
                    character.updateCharacter();
                    playTurnButton.style.display = 'block';
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
                character.hunger -= 0.5;
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
                character.morale -= 1;
            }
            // Can't go above good
            if (character.morale > 7) {
                character.morale -= 2;
            }
        }
        if (character.negTrait === 'clumsy') {
            // 10% chance of getting hurt
            if (Math.random() < 0.1) {
                character.healthLevel -= 1;
            }
        }
    }

    function checkPosTraitEvents(character) {
        if (character.posTrait === 'resilient') {
            // 10% chance of healing
            if (Math.random() < 0.1) {
                character.healthLevel += 1;
            }
        }
        if (character.posTrait === 'satiated') {
            // every other turn, hunger goes down
            if (turnNumber % 2 === 0) {
                character.hunger += 0.5;
            }
        }
        if (character.posTrait === 'friendly') {
            // TODO
        }
        if (character.posTrait === 'scavenger') {
            // TODO
        }
        if (character.posTrait === 'optimistic') {
            // 10% chance of increasing own morale
            if (Math.random() < 0.1) {
            character.morale += 1;
            console.log(`${character.name} still thinks everything will be okay`);
            }
            // Can't go below bad
            if (character.morale < 2) {
            character.morale += 2;
            console.log(`${character.name} clings on to hope`);
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
            const skin = "img/skin" + (Math.floor(Math.random() * 4) + 1) +".png";
            let hairColour = ['blonde', 'ginger', 'brown', 'red', 'black'];
            let hairStyle = ['short', 'long'];
            const hair = "img/" + hairStyle[Math.floor(Math.random() * hairStyle.length)] + (Math.floor(Math.random() * 2) + 1) + hairColour[Math.floor(Math.random() * hairColour.length)] + ".png";
            let shirtColour = ['red', 'yellow', 'green', 'blue'];
            let shirtStyle = ['shirt1', 'shirt2', 'shirt3', 'shirt4'];
            const shirt = "img/" + shirtStyle[Math.floor(Math.random() * shirtStyle.length)] + shirtColour[Math.floor(Math.random() * shirtStyle.length)]+ ".png";
            const character = new Character(firstName, age, posTrait, negTrait, skin, hair, shirt);
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
    const healthStat = characterDiv.querySelector('#healthStat');

    const moraleValue = character.morale;
    const hungerValue = character.hunger;
    const healthValue = character.health;

    const moralePercentage = (moraleValue / (moraleArray.length - 1)) * 100;
    const hungerPercentage = (hungerValue / (hungerArray.length - 1)) * 100;
    const healthPercentage = (healthValue / (healthArray.length - 1)) * 100;

    moraleStat.style.setProperty('--width', `${moralePercentage}%`);
    hungerStat.style.setProperty('--width', `${hungerPercentage}%`);
    healthStat.style.setProperty('--width', `${healthPercentage}%`);

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
    healthStat.style.setProperty('--background-color', getBackgroundColor(healthPercentage));
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
            relationshipItem.textContent = `${character.name} and ${relationship.character.name} are ${relationship.type[0]}`;
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
    avatarSection.innerHTML = '<p>Create your avatar:</p>';

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
    skinSelect.selectedIndex = Math.floor(Math.random() * skinImages.length);
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
    hairStyleSelect.selectedIndex = Math.floor(Math.random() * hairStyleImages.length);
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
    hairColourSelect.selectedIndex = Math.floor(Math.random() * hairColourImages.length);
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
    shirtStyleSelect.selectedIndex = Math.floor(Math.random() * shirtStyleImages.length);
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
    shirtColourSelect.selectedIndex = Math.floor(Math.random() * shirtColourImages.length);
    shirtColourLabel.appendChild(shirtColourSelect);
    avatarSection.appendChild(shirtColourLabel);

    // Avatar preview container
    const avatarPreviewContainer = document.createElement('div');
    avatarPreviewContainer.className = 'avatar';
    avatarPreviewContainer.style.position = 'relative';

    // Skin preview
    const skinPreview = document.createElement('img');
    skinPreview.src = "img/" + skinSelect.value;
    skinPreview.alt = 'Skin Preview';
    avatarPreviewContainer.appendChild(skinPreview);

    // Hair preview
    const hairPreview = document.createElement('img');
    hairPreview.src = "img/" + hairStyleSelect.value + hairColourSelect.value;
    hairPreview.alt = 'Hair Preview';
    avatarPreviewContainer.appendChild(hairPreview);

    // shirt preview
    const shirtPreview = document.createElement('img');
    shirtPreview.src = "img/" + shirtStyleSelect.value + shirtColourSelect.value;
    shirtPreview.alt = 'shirt Preview';
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
        const skin = "img/" + skinSelect.value;
        const hair = "img/" + hairStyleSelect.value + hairColourSelect.value;
        const shirt = "img/" + shirtStyleSelect.value + shirtColourSelect.value;
        const character = new Character(name, age, posTrait, negTrait, skin, hair, shirt);
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
// when a character dies check the relationships of the other characters and set morale accordingly
/*
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