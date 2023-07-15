

var turnNumber = 0;

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

 const weapon = [
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
import Character from './character.js';

let gameParty = null;

export function playTurn() {
    var who = "The party";
    console.log(`Turn ${turnNumber}`);
    for (const character of gameParty.characters) {
        if (character.checkHunger()) {
            checkPosTraitEvents(character);
            checkNegTraitEvents(character);
            // Make sure attributes are within bounds
            character.capAttributes();
    
        } else {
            addEvent(`${character.name} died of hunger`);
            gameParty.removeCharacter(character);
            updateRelationships(gameParty);
        }
    };
    if (gameParty.characters.length === 0) {
        const playTurnButton = document.getElementById('playTurnButton');
        // output character is dead to the events div
        addEvent('Everyone is dead');
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
                event = 'found food';
                const foodType = food[Math.floor(Math.random() * food.length)];
                addEvent(`${who} ${event} (${foodType[0]})`);
            } 
            if (chance > 0.4 && chance <= 0.6) {
            // 20% chance to find medical supplies
                event = 'found medical supplies';
                const medicalType = medical[Math.floor(Math.random() * medical.length)];
                addEvent(`${who} ${event} (${medicalType[0]})`);
            } 
            if (chance > 0.6 && chance <= 0.7) {
            // 10% chance to find a weapon
                event = 'found a weapon';
                const weaponType = weapon[Math.floor(Math.random() * weapon.length)];
                addEvent(`${who} ${event} (${weaponType[0]})`);
            } 
            // 20% chance to find an enemy
            if (chance > 0.7 && chance <= 0.9) {
                event = 'found an enemy';
                const enemyType = enemy[Math.floor(Math.random() * enemy.length)];
                addEvent(`${who} ${event} (${enemyType[0]})`);
            } 
            // 10% chance to find a friend
            if (chance > 0.9 & chance <= 1) {
                event = 'found a friend';
                addEvent(`${who} ${event}`);
            }
        } else {
            // output the event to the events div
            addEvent(`${who} ${event}`);
        }

        // Add found items to the party inventory
        if (event === 'found food' || event === 'found medical') {
            const item = event.split(' ')[1];
            gameParty.inventory.push(item);
        }
        if (gameParty.inventory.includes('food')) {
            const eventsDiv = document.getElementById('events');
            eventsDiv.querySelectorAll('button').forEach(button => button.remove());
            for (const character of gameParty.characters) {
                const button = document.createElement('button');
                button.innerText = `Feed ${character.name}`;
                button.addEventListener('click', () => {
                const itemIndex = gameParty.inventory.indexOf('food');
                if (itemIndex !== -1) {
                    gameParty.inventory.splice(itemIndex, 1);
                    character.hunger += 1;
                    addEvent(`${character.name} ate some food`);
                    eventsDiv.querySelectorAll('button').forEach(button => button.remove());
                    character.updateCharacter();
                }
                });
                eventsDiv.appendChild(button);
            }
        }
        if (event === 'found a weapon') {
            const item = event.split(' ')[2];
            const eventsDiv = document.getElementById('events');
            for (const availableCharacter of gameParty.characters) {
                const button = document.createElement('button');
                button.innerText = `Give ${item} to ${availableCharacter.name}`;
                button.addEventListener('click', () => 
                {
                    availableCharacter.inventory.push(item);
                    addEvent(`${availableCharacter.name} picked up the ${item}`);
                    eventsDiv.querySelectorAll('button').forEach(button => button.remove());
                    availableCharacter.updateCharacter();
                });
                eventsDiv.appendChild(button);
            }
        }
        if (event == 'found an enemy') {
            // select a random enemy from the enemy array
            const enemyType = enemy[Math.floor(Math.random() * enemy.length)];
            addEvent(`A ${enemyType[0]} has appeared!`);
        }
        if (event == 'found a friend') {
            // add a character to the party if there is space
            if (gameParty.characters.length < 4) {
                addPlayer(gameParty);
            }
        }
    }
    gameParty.updateInventory();
    turnNumber += 1;

    function checkNegTraitEvents(character) {
        if (character.negTrait === 'vulnerable') {
            // TODO
        }
        if (character.negTrait === 'hungry') {
            // every other turn, hunger goes up
            if (turnNumber % 2 === 0) {
                character.hunger -= 1;
                console.log(`${character.name} is ${character.hunger}`);
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
    const eventsDiv = document.getElementById('events');
    const eventItem = document.createElement('li');
    eventItem.textContent = eventText;
    eventsDiv.appendChild(eventItem);
}

async function addPlayer(party) {
    try {
        const response = await fetch('https://randomuser.me/api/?nat=au,br,ca,ch,de,dk,es,fi,fr,gb,ie,in,mx,nl,no,nz,rs,tr,ua,us');
        const data = await response.json();
        const firstName = getName(data);
        const hunger = 7;
        const posTrait = posTraits[Math.floor(Math.random() * posTraits.length)];
        const negTrait = negTraits[Math.floor(Math.random() * negTraits.length)];
        const character = new Character(party.nextId, firstName, hunger, posTrait, negTrait );
        party.addCharacter(character);
        if (party.characters.length > 1) {
            addEvent(`${character.name} has joined the party!`);
        } else {
            addEvent(`${character.name} has started the adventure!`);
        }
        character.createCharacter();
        character.updateCharacter();
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

function getName(data) {
    return data.results[0].name.first;
}

async function startGame() {
    if (!gameParty) {
        gameParty = new Party();
        console.log(gameParty);
        await addPlayer(gameParty);
    }
    return gameParty;
}

startGame().then((gameParty) => {
    console.log(gameParty);
    const playTurnButton = document.getElementById('playTurnButton');
    playTurnButton.addEventListener('click', () => {
        playTurn();
    });
});