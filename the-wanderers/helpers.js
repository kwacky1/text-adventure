import { Character, ageArray, hungerArray, moraleArray, healthArray, weaponArray } from './character.js';
import { playTurn } from './game.js';

const context = {
    gameParty: null
};

function setGameParty(gameParty) {
    context.gameParty = gameParty;
}

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

 const posTraits = [
    ['resilient', 'Every turn has a 10% chance to heal', 'Has a higher chance of being cured of illness and infection'],
    ['satiated', 'Every other turn, hunger does not go down', 'Food items are more effective by 0.5 points'],
    ['friendly', 'Starts with higher relationships with other party members', 'Can never become cold with other party members'],
    ['scavenger', 'Every turn has a 10% chance to gain a random food item', 'Gets a food item from every zombie killed'],
    ['optimistic', 'Every turn has a 10% chance to raise morale', 'Morale can’t fall below bad'],
    ['fighter', 'Does an extra 1 damage for each attack', 'Has a 50% chance to damage two zombies at once']
];

const negTraits = [
    ['vulnerable', 'Takes an extra 1 damage from each attack', 'Has a lower chance of curing illness and infection'],
    ['hungry', 'Every other turn, extra hunger is depleted', 'Rations and snacks have no effect '],
    ['disconnected', 'Starts with lower relationships with other party members', 'Can never become family with other party members'],
    ['hypochondriac', 'Every turn has a 10% chance to use a medical item without benefit', 'Every turn has a 10% chance to display symptoms of illness despite not being sick'],
    ['depressed', 'Every turn has a 10% chance to lower morale', 'Morale can’t rise above good'],
    ['clumsy', 'Every turn has a 10% chance to get hurt', 'Does 1 less damage for each attack']
];

const relationships = [
    'cold',
    'strangers',
    'acquaintances',
    'friends',
    'family'
];

function getEvent(chance) {
    var who = "The party";
    if (context.gameParty.characters.length === 1) {
        who = context.gameParty.characters[0].name;
    }
    const singlePlayerEvents = [
        `${who} watches the clouds go by.`, 
        `${who} stays in bed all day.`
    ];
    if (context.gameParty.characters.length > 1) {
        //choose a random character for the event
        let pone = context.gameParty.characters[Math.floor(Math.random() * context.gameParty.characters.length)].name
        //choose a second player who is not pone
        let ptwo;
        do {
            ptwo = context.gameParty.characters[Math.floor(Math.random() * context.gameParty.characters.length)].name;
        } while (ptwo === pone);
        const multiPlayerEvents = [
            `${pone} spots a rabbit in a clearing and calls ${ptwo} to hunt for it, but it turns out to be a white bag rolling in the wind.`,
            `A zombie approaches the party but immediately collapses.`
        ]
        var event = multiPlayerEvents[Math.floor(Math.random() * multiPlayerEvents.length)];
    } else {
        var event = singlePlayerEvents[Math.floor(Math.random() * singlePlayerEvents.length)];
    }
    var friendChance = 0.2;
    var enemyChance = 0.1 + friendChance;
    var itemChance = 0.4 + enemyChance;
    var secondItem = 0 + itemChance;
    if (context.gameParty.characters.length == 2) {
        friendChance = 0.15;
        enemyChance = 0.15 + friendChance;
        itemChance = 0.45 + enemyChance;
        secondItem = 0.05 + itemChance;
    }
    if (context.gameParty.characters.length == 3) {
        friendChance = 0.1;
        enemyChance = 0.2 + friendChance;
        itemChance = 0.5 + enemyChance;
        secondItem = 0.1 + itemChance;
    }
    if (context.gameParty.characters.length == 4) {
        friendChance = 0.05;
        enemyChance = 0.2 + friendChance;
        itemChance = 0.55 + enemyChance;
        secondItem = 0.15 + itemChance;
    }
    var illnessChance = secondItem + 0.05;
    var miniEventChance = illnessChance + 0.05;
    if ((chance <= friendChance) && context.gameParty.characters.length < 4) {
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
                foundFood(who);
            } else if (whichItem <= 0.67) {
                foundMedical(who);
            } else {
                foundWeapon(who,i)
            }
        }
    } else if (chance > secondItem && chance <= illnessChance) {
        var healthyCharacters = context.gameParty.characters.filter(character => !character.sick);
        if (healthyCharacters.length > 0) {
            var sickCharacter = healthyCharacters[Math.floor(Math.random() * healthyCharacters.length)];
            sickCharacter.health -= 1;
            sickCharacter.sick = true;
            updateStatBars(sickCharacter);
            addEvent(event);
        }
    } else if (chance > illnessChance && chance <= miniEventChance) {
        if (context.gameParty.characters.length > 3) {
            if (Math.random() < 0.5) {
                let name = context.gameParty.characters[Math.random() * context.gameParty.characters.length].name;
                addEvent(`${name} found a pack of cards while looking through the ruins of a house. The party plays a few rounds.`);
                for (const character of context.gameParty.characters) {
                    character.morale += 1;
                    character.capAttributes();
                    updateStatBars(character);
                }
            } else {
                addEvent('Rain begins to pelt down as the party is trying to sleep. Their sleeping bags all end up getting soaked.');
                for (const character of context.gameParty.characters) {
                    character.morale -= 1;
                    character.capAttributes();
                    updateStatBars(character);
                }
            }
        }
        if (context.gameParty.characters.length === 2) {
            var index1 = Math.floor(Math.random() * context.gameParty.characters.length);
            var name1 = context.gameParty.characters[index1];
            var index2;
            do {
                index2 = Math.floor(Math.random() * context.gameParty.characters.length);
            } while (index2 === index1);
            var name2 = context.gameParty.characters[index2];
            if (Math.random() < 0.5) {
                var hasFood = false;
                for (const foodItem of food) {
                    if (context.gameParty.inventoryMap.has(foodItem[0])) {
                        addEvent(`${name1.name} and ${name2.name} are arguing over who gets to eat the ${foodItem[0]}.`);
                        name1.relationships.set(name2, name1.relationships.get(name2) - 1);
                        name2.relationships.set(name1, name2.relationships.get(name1) - 1);
                        updateRelationships();
                        hasFood = true;
                        break;
                    };
                };
                if (!hasFood) {
                    addEvent(event);
                }
            } else {
                addEvent(`It's cold tonight, and ${name1.name} and ${name2.name} sit together by the fire.`);
                name1.relationships.set(name2, name1.relationships.get(name2) + 1);
                name2.relationships.set(name1, name2.relationships.get(name1) + 1);
                updateRelationships();
            }
        }
        if (context.gameParty.characters.length === 1) {
            if (Math.random < 0.5) {
                var character = context.gameParty.characters[0];
                character.health -= 1;
                updateStatBars(character);
                addEvent(`${character.name} tripped over a loose brick and hurt their leg.`);
            } else {
                var character = context.gameParty.characters[0];
                character.morale += 1;
                character.capAttributes();
                updateStatBars(character);
                addEvent(`${character.name} finds an old piano and plays around a bit. They're not very good at it, but it was fun.`);
            }
        }
    } else {
        // output the event to the events div
        addEvent(event);
    }
}

function updateRelationships() {
    for (const character of context.gameParty.characters) {
        const characterItem = document.getElementById(character.name);
        const relationshipsDiv = characterItem.querySelector('.relationships');
        relationshipsDiv.innerHTML = '<p>Relationships</p>';
        const relationshipsList = document.createElement('ul');
        relationshipsDiv.appendChild(relationshipsList);
        for (const [relatedCharacter, relationshipType] of character.relationships.entries()) {
            const relationshipItem = document.createElement('li');
            relationshipItem.textContent = `${character.name} and ${relatedCharacter.name} are ${relationships[relationshipType]}`;
            relationshipsList.appendChild(relationshipItem);
        }
    }
}

function foundFriend() {
    const playTurnButton = document.getElementById('playTurnButton');
    playTurnButton.style.display = 'none';
    const friendDiv = document.createElement('div');
    friendDiv.textContent = 'You are approached by an adventurer who wants to join your party';
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.addEventListener('click', () => {
        // make morale of party members go up when a new member joins
        for (const character of context.gameParty.characters) {
            character.morale += 1;
            character.capAttributes();
            updateStatBars(character);
        }
        if (context.gameParty.characters.length < 4) {
            addPlayer();
        }
        friendDiv.remove();
        acceptButton.remove();
        declineButton.remove();
        playTurnButton.style.display = 'block';
    });
    const declineButton = document.createElement('button');
    declineButton.textContent = 'Decline';
    declineButton.addEventListener('click', () => {
        addEvent(`The adventurer walks away.`);
        friendDiv.remove();
        acceptButton.remove();
        declineButton.remove();
        playTurnButton.style.display = 'block';
    });
    document.getElementById('gameButtons').appendChild(friendDiv);
    document.getElementById('gameButtons').appendChild(acceptButton);
    document.getElementById('gameButtons').appendChild(declineButton);
}

function checkDeathEffects(character) {
    // when a character dies check the relationships of the other characters and set morale accordingly
    /*
    Family -3
    Friends -2
    Acquaintances -1
    Strangers +0
    Cold +1
    */
        for (const remainingCharacter of context.gameParty.characters) {
            if (remainingCharacter !== character) {
                const relationship = remainingCharacter.relationships.get(character);
                if (relationship === 4) {
                    remainingCharacter.morale -= 3;
                }
                if (relationship === 3) {
                    remainingCharacter.morale -= 2;
                }
                if (relationship === 2) {
                    remainingCharacter.morale -= 1;
                }
                if (relationship === 0) {
                    remainingCharacter.morale += 1;
                }
                remainingCharacter.capAttributes();
                updateStatBars(remainingCharacter);        }
        }
    }
    
function foundEnemy() {
    const enemy = [
        ['zombie']
    ];
    const playTurnButton = document.getElementById('playTurnButton');
    playTurnButton.style.display = 'none';
    var numberOfEnemies = Math.floor(Math.random() * context.gameParty.characters.length) + 1;
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
        enemies.push({
            type: enemyType[0],
            hp: enemyHP,
            morale: enemyMorale,
            attack: 1 // Set attack to 1 for now
        });
    }
    var players = context.gameParty.characters
        .map(character => {
            let baseAttack = weaponArray[character.weapon][1];
            if (character.posTrait === 'fighter') {
                baseAttack += 1;
            }
            if (character.negTrait === 'clumsy') {
                baseAttack -= 1;
                if (baseAttack < 0) {
                    baseAttack = 0;
                }
            }
            return {
                type: character.name,
                hp: character.health,
                morale: character.morale,
                attack: baseAttack
            };
        }
    );
    
    // Combine enemies and players into a single array
    var combatants = players.concat(enemies.map(enemy => ({
        type: 'enemy',
        hp: enemy.hp,
        morale: enemy.morale,
        attack: enemy.attack
    })));

    // Sort the combined array by morale
    combatants.sort((a, b) => b.morale - a.morale);

    // Function to handle the turn-based logic
    function handleTurn(index) {

        if (index >= combatants.length) {
            // All turns are done, start over
            handleTurn(0);
            return;
        }

        // All we need to do is update the players array to check if anyone has used a health item
        players.forEach(player => { 
            player.hp = context.gameParty.characters.find(c => c.name === player.type).health;
        });

        const combatant = combatants[index];
        if (combatant.type === 'enemy') {
        // Enemy's turn to attack
        // Add a button to commence the attack
        const attackButton = document.createElement('button');
        attackButton.textContent = `The ${combatant.type} attacks!`;
        attackButton.id = 'attackButton';
        attackButton.addEventListener('click', () => {
            const target = players[Math.floor(Math.random() * players.length)];
            const character = context.gameParty.characters.find(c => c.name === target.type);
            let damage = combatant.attack
            target.hp -= damage;
            if (character.negTrait === 'vulnerable') {
                target.hp -= 1;
                damage += 1;
            }
            if (Math.random() < 0.05) {
                character.infected = true;
            }
            character.health = target.hp;
            addEvent(`The ${combatant.type} attacks ${target.type} for ${damage} damage.`);
            if (target.hp <= 0) {
                addEvent(`${target.type} has succumbed to their wounds!`);
                // Remove defeated player from combatants array
                combatants.splice(combatants.indexOf(target), 1);
                players = players.filter(p => p !== target);
                checkDeathEffects(character);
                context.gameParty.removeCharacter(character);
                updateRelationships();
                // Check if the player was infected
                if (character.infected) {
                    combatants.push({
                        type: 'enemy',
                        hp: 4 + Math.floor(Math.random() * 4),
                        morale: Math.floor(Math.random() * 10),
                        attack: weaponArray[character.weapon][1]
            
                    });
                    addEvent(`${character.name} has become a zombie!`);
                }
                // Check if all players are defeated
                if (combatants.filter(c => c.type !== 'enemy').length === 0) {
                    document.getElementById('attackButton').remove();
                    playTurn();
                    return;
                }
            }
            character.updateCharacter();
            updateStatBars(character);
            handleTurn(index + 1);
            attackButton.remove();
        });
        const weaponButtons = document.getElementById('gameButtons');
        weaponButtons.appendChild(attackButton);
    } else {
        // Show attack buttons for each enemy
        combatants.forEach((enemy, enemyIndex) => {
            if (enemy.type === 'enemy') {
                const character = context.gameParty.characters.find(c => c.name === combatant.type);
                const weaponButtons = document.getElementById('gameButtons');
                var attackButton = false;
                if (character.sick) {
                    if (!weaponButtons.querySelector(`.attack[data-combatant="${combatant.type}"]`)) {
                        attackButton = document.createElement('button');
                        attackButton.setAttribute('data-combatant', combatant.type);
                        attackButton.textContent = `${combatant.type} is unable to battle. Continue.`;
                        attackButton.classList.add('attack');
                        attackButton.addEventListener('click', () => {
                            weaponButtons.querySelectorAll('.attack').forEach(button => button.remove());
                            handleTurn(index + 1);
                        });
                    }
                } else {                    
                    var criticalHit = 0;
                    var criticalMiss = 0;
                    if (character.morale === 6 || character.morale === 7) {
                        if (Math.random() < 0.1) {
                            criticalHit = 1;
                        }
                    }
                    if (character.morale === 8 || character.morale === 9) {
                        if (Math.random() < 0.2) {
                            criticalHit = 1;
                        }
                    }
                    if (character.morale === 0 || character.morale === 1) {
                        if (Math.random() < 0.2) {
                            criticalMiss = 1;
                        }
                    }
                    if (character.morale === 2 || character.morale === 3) {
                        if (Math.random() < 0.1) {
                            criticalMiss = 1;
                        }
                    }
                    attackButton = document.createElement('button');
                    attackButton.textContent = `${combatant.type} attacks ${enemy.type} (${enemy.hp} HP)`;
                    attackButton.classList.add('attack');
                    attackButton.addEventListener('click', () => {
                        var nothingHappened = 0;
                        var attacks = 1;
                        if (character.posTrait === 'fighter' && Math.floor(Math.random() * 10) >= 5) {
                            attacks = 2;
                        }
                        for (var i = 0; i < attacks; i++) {
                            let damage = combatant.attack;
                            if (i == 1) {
                                const allEnemies = combatants.filter(c => c.type === 'enemy' && c.hp > 0 && c !== enemy);
                                if (allEnemies.length > 0) {
                                    enemy = allEnemies[Math.floor(Math.random() * allEnemies.length)];
                                    enemyIndex = combatants.indexOf(enemy); 
                                    addEvent(`${combatant.type} hits another ${enemy.type} for ${damage} damage.`, 'green');
                                } else {
                                    nothingHappened = 1;
                                }
                            } else {
                                if (criticalHit == 1) {
                                    damage += 1;
                                    addEvent(`${combatant.type} lands a critical hit! ${combatant.type} hit the ${enemy.type} for ${damage} damage.`, 'green');
                                } else if (criticalMiss == 1) {
                                    damage = 0;
                                    addEvent(`${combatant.type} misses!`, 'orange');
                                } else {
                                    addEvent(`${combatant.type} hit the ${enemy.type} for ${damage} damage.`, 'blue');
                                }
                            }
                            if (nothingHappened == 0) {
                                enemy.hp -= damage;                            
                            }
                            if (enemy.hp <= 0) {
                                addEvent(`The ${enemy.type} has been defeated!`, 'green');
                                // Remove defeated enemy from combatants array
                                combatants.splice(enemyIndex, 1);
                                // Scavengers get a random food item
                                const character = context.gameParty.characters.find(c => c.name === combatant.type);
                                if (character.posTrait === 'scavenger') {
                                    const foodItem = food[Math.floor(Math.random() * food.length)];
                                    addItemToInventory(foodItem);
                                    addEvent(`${combatant.type} made food with some... questionable meat.`);
                                    context.gameParty.updateInventory();
                                    updateFoodButtons();
                                }
                                // Check if all enemies are defeated
                                if (combatants.filter(c => c.type === 'enemy').length === 0) {
                                    // Unhide the playTurnButton
                                    const playTurnButton = document.getElementById('playTurnButton');
                                    playTurnButton.style.display = 'block';
                                    break;
                                }
                            }
                        }
                        weaponButtons.querySelectorAll('.attack').forEach(button => button.remove());
                        handleTurn(index + 1);
                        
                    });
                }
                if (attackButton instanceof HTMLButtonElement) {
                    weaponButtons.appendChild(attackButton);
                }
            } 
        });
    }}

    // Start the turn-based combat
    handleTurn(0);
}

function foundWeapon(who, id) {
    const weaponType = weaponArray[Math.floor(Math.random() * (weaponArray.length - 1)) + 1];
    const weapon = weaponType[0];
    const damage = weaponType[1];
    const playTurnButton = document.getElementById('playTurnButton');
    addEvent(`${who} found a ${weapon}`);
    const weaponDiv = document.getElementById('gameButtons');
    for (const character of context.gameParty.characters) {
        const button = document.createElement('button');
        // if character has a weapon, replace it
        if (character.weapon !== null) {
            const oldWeapon = weaponArray[character.weapon];
    const oldWeaponType = oldWeapon[0];
    const oldDamage = oldWeapon[1];
    if (oldDamage < damage) {
        playTurnButton.style.display = 'none';
        button.innerText = `Replace ${oldWeaponType} (${oldDamage} damage) with ${weapon} (${damage} damage) for ${character.name}`;
        button.classList.add(`weapon${id}`);
        button.classList.add(`${weapon}`);
        button.classList.add(character.name);
        button.addEventListener('click', () =>
        {
            character.weapon = weaponArray.indexOf(weaponType); 
            addEvent(`${character.name} replaced their ${oldWeaponType} with the ${weapon}.`);
            weaponDiv.querySelectorAll(`.weapon${id}`).forEach(button => button.remove());
            const characterButtons = weaponDiv.querySelectorAll(`.${character.name}`);
            if (characterButtons.length > 0) {
                characterButtons.forEach(button => button.remove());
            }    
            character.updateCharacter();
            if (weaponDiv.querySelectorAll('.weapon0').length === 0 && weaponDiv.querySelectorAll('.weapon1').length === 0) {
                playTurnButton.style.display = 'block';
            }
        });
        weaponDiv.appendChild(button);
            } //else {
                //if (!document.querySelector('weapon')) {
                  //  playTurnButton.style.display = 'block';
                //}
            //}
        } else {
            button.innerText = `Give ${weapon} (${damage} attack) to ${character.name}`;
            button.addEventListener('click', () => 
            {
                character.weapon = weaponArray.indexOf(weaponType); 
                addEvent(`${character.name} picked up the ${weapon}.`);
                weaponDiv.querySelectorAll('.weapon').forEach(button => button.remove());
                character.updateCharacter();
                playTurnButton.style.display = 'block';
            });
            weaponDiv.appendChild(button);
        }
    }
}

function foundMedical(who) {
    const medicalType = medical[Math.floor(Math.random() * medical.length)];
    addEvent(`${who} found medical supplies (${medicalType[0]}).`);
    addItemToInventory(medicalType);
    updateMedicalButtons();
}

function foundFood(who) {
    const foodType = food[Math.floor(Math.random() * food.length)];
    addEvent(`${who} found food (${foodType[0]}).`);
    addItemToInventory(foodType);
    updateFoodButtons();
}

function addItemToInventory(itemType) {
    // Check if the food item already exists in the inventory
    if (context.gameParty.inventoryMap.has(itemType[0])) {
        // If it exists, update the quantity
        let existingFood = context.gameParty.inventoryMap.get(itemType[0]);
        existingFood.quantity += 1;
        context.gameParty.inventoryMap.set(itemType[0], existingFood);
    } else {
        // If it does not exist, add it to the map
        context.gameParty.inventoryMap.set(itemType[0], {
            name: itemType[0],
            value: itemType[1],
            quantity: 1
        });
    }
}

function updateStatBars(character) {
    const characterDiv = document.getElementById(character.name);
    if (characterDiv) {
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
}

function addEvent(eventText, color = 'black') {
    let currentEvents = '';
    const currentEventDiv = document.getElementById('currentEvent');
    if (currentEventDiv.innerHTML !== '') {
        currentEvents = currentEventDiv.innerHTML;
    }
    // Sanitize the eventText before adding it to innerHTML
    const sanitizedEventText = DOMPurify.sanitize(`<span style="color: ${color};">${eventText}</span>`);
    currentEvents += ` ${sanitizedEventText}`;
    currentEventDiv.innerHTML = currentEvents.trim();
}

async function addPlayer() {
    try {
        if (context.gameParty.characters.length == 0) {
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
            const character = new Character(firstName, age, posTrait[0], negTrait[0], skin, hair, shirt);
            context.gameParty.addCharacter(character);
            addEvent(`${character.name} has joined the party!`);
            character.createCharacter();
            character.updateCharacter();
            updateStatBars(character);
            updateFoodButtons();
            updateMedicalButtons();
        }
        updateRelationships();
    } catch (error) {
        console.error(error);
    }
}

function getName(data) {
    return data.results[0].name.first;
}

function handleSelection(event, items, updateCharacterAttributes) {
    try {
        const selectedItem = event.target.value;
        const item = items.find(i => i[0] === selectedItem);
        if (item) {
            const characterName = event.target.selectedOptions[0].dataset.characterName;
            const character = context.gameParty.characters.find(char => char.name === characterName);

            if (character) {
                if (context.gameParty.inventoryMap.has(item[0])) {
                    const inventoryItem = context.gameParty.inventoryMap.get(item[0]);
                    if (inventoryItem.quantity > 1) {
                        inventoryItem.quantity -= 1;
                    } else {
                        context.gameParty.inventoryMap.delete(item[0]);
                    }
                    updateCharacterAttributes(character, item);
                    character.capAttributes();
                    character.updateCharacter();
                    updateStatBars(character);
                    context.gameParty.updateInventory();
                }
            }
        }
    } catch (error) {
        console.error('Error during event handling:', error);
    }
}

function clearAndPopulateOptions(selectElement, character, items, itemType, defaultOptionText) {
    if (!selectElement) {
        console.error(`${itemType}Select element not found for character: ${character.name}`);
        return;
    }

    const fragment = document.createDocumentFragment();
    const defaultOption = document.createElement('option');
    defaultOption.value = itemType;
    defaultOption.textContent = `${defaultOptionText} ${character.name}`;
    fragment.appendChild(defaultOption);

    for (const item of items) {
        if (context.gameParty.inventoryMap.has(item[0])) {
            const option = document.createElement('option');
            option.textContent = `${item[0]} (+${item[1]})`;
            option.value = item[0];
            option.dataset.characterName = character.name; // Store character name in data attribute
            fragment.appendChild(option);
        }
    }

    selectElement.innerHTML = ''; // Clear existing options
    selectElement.appendChild(fragment); // Append new options
}

function updateButtons(itemType, items, defaultOptionText, updateCharacterAttributes) {
    try {
        const hasItems = Array.from(context.gameParty.inventoryMap.keys()).some(inventoryItem => items.some(item => item.includes(inventoryItem)));
        for (const character of context.gameParty.characters) {
            try {
                const selectElement = document.querySelector(`#${character.name} #options #${itemType}Select`);
                if (selectElement) {
                    const newSelectElement = selectElement.cloneNode(true);
                    selectElement.parentNode.replaceChild(newSelectElement, selectElement);
                    if (hasItems) {
                        clearAndPopulateOptions(newSelectElement, character, items, itemType, defaultOptionText);
                        newSelectElement.addEventListener('change', (event) => handleSelection(event, items, updateCharacterAttributes, context.gameParty));
                    } else {
                        newSelectElement.innerHTML = `<option value="">${defaultOptionText} ${character.name}</option>`;
                    }
                }
            } catch (error) {
                console.error(`Error during DOM manipulation for character: ${character.name}`, error);
            }
        }
    } catch (error) {
        console.error(`Error in update${itemType.charAt(0).toUpperCase() + itemType.slice(1)}Buttons function:`, error);
    }
}

function updateFoodAttributes(character, foodItem) {
    character.hunger += foodItem[1];
    if (character.posTrait === 'satiated') {
        character.hunger += 0.5;
    }
    if (foodItem[0] === 'dessert') {
        character.morale += 1;
        addEvent(`${character.name} enjoyed the ${foodItem[0]}.`);
    } else {
        if (character.negTrait === 'hungry' && (foodItem[0] === 'rations' || foodItem[0] === 'snack')) {
            character.hunger -= foodItem[1];
            addEvent(`That food didn't make ${character.name} feel much better.`);
        } else {
            addEvent(`${character.name} ate the ${foodItem[0]}.`);
        }
    }
    if (character.posTrait === 'satiated') {
        character.hunger += 0.5;
    }
    updateFoodButtons();
}

function updateMedicalAttributes(character, medicalItem) {
    character.health += medicalItem[1];
    addEvent(`${character.name} used the ${medicalItem[0]}.`);
    if (Math.random() < 0.1 && medicalItem[0] === 'medicine' && character.infected) {
        character.infected = false;
        addEvent(`${character.name} has been cured of infection!`);
    }
    if (Math.random() < 0.2 && medicalItem[0] === 'first aid kit' && character.infected) {
        character.infected = false;
        addEvent(`${character.name} has been cured of infection!`);
    }
    if (Math.random() < 0.2 && medicalItem[0] === 'medicine' && character.sick) {
        character.sick = false;
        addEvent(`${character.name} has been cured of illness!`);
    }
    if (Math.random() < 0.3 && medicalItem[0] === 'first aid kit' && character.sick) {
        character.sick = false;
        addEvent(`${character.name} has been cured of illness!`);
    }
    updateMedicalButtons();
}

function updateFoodButtons() {
    updateButtons('food', food, 'Feed', updateFoodAttributes);
}

function updateMedicalButtons() {
    updateButtons('medical', medical, 'Heal', updateMedicalAttributes);
}

const styleSelector = document.getElementById("styleselector");
styleSelector.addEventListener("change", () => {
    document.querySelector("link[rel='stylesheet']").href = styleSelector.value;
});

export { context, setGameParty, addItemToInventory, getEvent, updateStatBars, food, medical, addEvent, getName, posTraits, negTraits, updateRelationships, updateFoodButtons, updateMedicalButtons, foundFriend, foundEnemy, foundFood, foundMedical, foundWeapon, checkDeathEffects };