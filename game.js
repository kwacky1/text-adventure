

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
    'found food',
    'found medical',
    'found weapon'
]

import Party from './party.js';
import Character from './character.js';

let gameParty = null;

export function playTurn() {
    console.log(`Turn ${turnNumber}`);
    for (const character of gameParty.characters) {
        if (character.checkHunger()) {
            checkPosTraitEvents(character);
            checkNegTraitEvents(character);
            // Make sure attributes are within bounds
            character.capAttributes();
    
            // 90% chance of an event happening
            if (Math.random() < 0.9) {
                // pick a random event
                const event = events[Math.floor(Math.random() * events.length)];
                // output the event to the events div
                addEvent(`${character.name} ${event}`);

                // Add found items to the party inventory
                if (event === 'found food' || event === 'found medical') {
                    const item = event.split(' ')[1];
                    gameParty.inventory.push(item);
                }
                if (event === 'found weapon') {
                    const item = event.split(' ')[1];
                    const characterListDiv = document.getElementById('characterList');
                    for (const availableCharacter of gameParty.characters) {
                      const button = document.createElement('button');
                      button.innerText = `Give ${item} to ${availableCharacter.name}`;
                      button.addEventListener('click', () => {
                        availableCharacter.inventory.push(item);
                        addEvent(`${character.name} gave ${item} to ${availableCharacter.name}`);
                        button.remove();
                      });
                      characterListDiv.parentNode.insertBefore(button, characterListDiv);
                    }
                }
    
            }    
        } else {
            addEvent(`${character.name} died of hunger`);
            gameParty.removeCharacter(character);
        }


        // TODO
        turnNumber += 1;
    };
    if (gameParty.characters.length === 0) {
        const playTurnButton = document.getElementById('playTurnButton');
        // output character is dead to the events div
        addEvent('Everyone is dead');
        playTurnButton.remove()
//        alert('Game Over');

    }

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
        character.update();
        updateRelationships(party);
    } catch (error) {
        console.error(error);
    }
}

function updateRelationships(party) {
    for (const character of party.characters) {
        const characterItem = document.getElementById(`character-${character.id}`);
        const relationshipsList = characterItem.querySelector('.relationships');
        relationshipsList.innerHTML = '';
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
