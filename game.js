

var turnNumber = 1;

const posTraits = [
    'resiliant',
    'satiated',
    'friendly',
    'healer',
    'scavenger',
    'optimistic',
    'fighter'
];

const negTraits = [
    'vulnerable',
    'hungry',
    'disconnected',
    'hypochondriac',
    'hoarder',
    'depressed',
    'clumsy'
];

const food = [
    ['rations', 0.5],
    ['snack', 1],
    ['entree', 2],
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
import { Character, ageArray, hungerArray } from './character.js';

let gameParty = null;

export function playTurn() {
    var who = "The party";
    var foodType = "";
    console.log(`Turn ${turnNumber}`);
    updateParty();
    if (gameParty.characters.length === 0) {
        const playTurnButton = document.getElementById('playTurnButton');
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
            addEvent(`${who} ${event}`);
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
                                addEvent(`${character.name} enjoyed the ${item}`);
                            } else {
                                addEvent(`${character.name} ate the ${item}`);
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

    }
    gameParty.updateInventory();
    turnNumber += 1;
    const playTurnButton = document.getElementById('playTurnButton');
    if (playTurnButton) {
        playTurnButton.innerText = `Play Turn ${turnNumber}`;
    }

    function updateParty() {
        for (const character of gameParty.characters) {
            if (character.checkHunger()) {
                checkPosTraitEvents(character);
                checkNegTraitEvents(character);
                // Make sure attributes are within bounds
                character.capAttributes();

            } else {
                addEvent(`${character.name} died of hunger`);
                checkDeathEffects(character);
                gameParty.removeCharacter(character);
                updateRelationships(gameParty);
            }
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
        const enemyType = enemy[Math.floor(Math.random() * enemy.length)];
        addEvent(`${who} ${event} (${enemyType[0]})`);
        const attackButton = document.createElement('button');
        attackButton.textContent = 'Attack';
        attackButton.addEventListener('click', () => {
            let totalDamage = 0;
            gameParty.characters.forEach((character) => {
                const weaponIndex = character.weapon;
                if (weaponIndex !== null) {
                    const weaponDamage = weapons[weaponIndex][1];
                    totalDamage += weaponDamage;
                }
            });
            if (totalDamage >= enemyType[1]) {
                addEvent(`The enemy has been defeated!`);
            } else {
                addEvent(`The enemy has not been defeated.`);
            }
            attackButton.remove();
            defendButton.remove();
        });
        const defendButton = document.createElement('button');
        defendButton.textContent = 'Defend';
        defendButton.addEventListener('click', () => {
            addEvent(`The enemy has been defended against.`);
            attackButton.remove();
            defendButton.remove();
        });
        document.getElementById('gameButtons').appendChild(attackButton);
        document.getElementById('gameButtons').appendChild(defendButton);
    }

    function foundWeapon() {
        const weaponType = weaponArray[Math.floor(Math.random() * (weaponArray.length - 1)) + 1];
        const weapon = weaponType[0];
        const damage = weaponType[1];
        event = `found a ${weapon}`;
        addEvent(`${who} ${event}`);
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
                        character.weapon = weaponArray.indexOf(oldWeapon);
                        addEvent(`${character.name} replaced the ${oldWeaponType} with the ${weapon}`);
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
                    addEvent(`${character.name} picked up the ${weapon}`);
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
        addEvent(`${who} ${event} (${medicalType[0]})`);
    }

    function foundFood() {
        event = 'found food';
        foodType = food[Math.floor(Math.random() * food.length)];
        addEvent(`${who} ${event} (${foodType[0]})`);
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
        if (character.negTrait === 'hoarder') {
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
        if (character.posTrait === 'resiliant') {
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
        if (character.posTrait === 'healer') {
            // each turn, heal one other character
            for (const hungryCharacter of gameParty.characters) {
                if ((hungryCharacter.hunger > 2 || hungryCharacter.injuryLevel < 8) && hungryCharacter !== character) {
                    character.hunger -= 1;
                    character.injuryLevel -= 1;
                    if (Math.random() < 0.1) {
                        character.injuryLevel += 1;
                    }
                }
            }
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
    const currentEventDiv = document.getElementById('currentEvent');
    if (currentEventDiv.textContent !== '') {
        const eventLogDiv = document.getElementById('eventLog');
        const eventItem = document.createElement('li');
        eventItem.textContent = currentEventDiv.textContent;
        eventLogDiv.insertBefore(eventItem, eventLogDiv.firstChild);
    }
    currentEventDiv.textContent = eventText;
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

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Create Character';
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