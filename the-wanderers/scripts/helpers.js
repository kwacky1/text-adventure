import { Character, ageArray, hungerArray, moraleArray, healthArray } from './character.js';
import { playTurn } from './game.js';
import Party, { food, medical, weapons } from './party.js';

const context = {
    gameParty: null,
    remainingNames: []
};

function setGameParty(gameParty) {
    context.gameParty = gameParty;
}

async function fetchNames(amount = 10) {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    document.body.appendChild(spinner);

    try {
        const response = await fetch('https://randomuser.me/api/?results=' + amount + '&nat=au,br,ca,ch,de,dk,es,fi,fr,gb,ie,in,mx,nl,no,nz,rs,tr,ua,us');
        const data = await response.json();
        context.remainingNames = data.results.map(result => getName(result));
    } finally {
        // Hide the spinner
        spinner.style.display = 'none';
    }
}

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
    if (window.location.hostname === '127.0.0.1') {
        console.log(`Base event: "${event}"`);
        console.log(`Chance: ${chance}`);
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
        friendChance = 0;
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
            event = `${sickCharacter.name} is feeling queasy.`;
            addEvent(event);
        }
    } else if (chance > illnessChance && chance <= miniEventChance) {
        if (context.gameParty.characters.length >= 3) {
            if (Math.random() < 0.5) {
                let name = context.gameParty.characters[Math.floor(Math.random() * context.gameParty.characters.length)].name;
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
                    if (context.gameParty.inventory.hasItem(foodItem[0])) {
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
    setPlayButton('show');
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
    const friendDiv = document.createElement('div');
    friendDiv.textContent = 'You are approached by an adventurer who wants to join your party';
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.addEventListener('click', async () => {
        // make morale of party members go up when a new member joins
        for (const character of context.gameParty.characters) {
            character.morale += 1;
            character.capAttributes();
            updateStatBars(character);
        }
        await addPlayer();
        friendDiv.remove();
        acceptButton.remove();
        declineButton.remove();
        setPlayButton('show');
    });
    const declineButton = document.createElement('button');
    declineButton.textContent = 'Decline';
    declineButton.addEventListener('click', () => {
        addEvent(`The adventurer walks away.`);
        friendDiv.remove();
        acceptButton.remove();
        declineButton.remove();
        setPlayButton('show');
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
    const weaponDiv = document.getElementById('gameButtons');
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
            updateStatBars(remainingCharacter);
            addWeaponChoiceButton(weaponDiv, remainingCharacter, weapons[character.weapon], 0, character.name + "'s");
        }
    }
}

function foundEnemy() {
    const enemy = [
        ['zombie']
    ];
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
            let baseAttack = weapons[character.weapon][1];
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
        // add a button to commence the attack
        setPlayButton('hide');
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
                        attack: weapons[character.weapon][1]

                    });
                    addEvent(`${character.name} has become a zombie!`);
                }
                // Check if all players are defeated
                if (combatants.filter(c => c.type !== 'enemy').length === 0) {
                    document.getElementById('attackButton').remove();
                    playTurn();
                    return;
                }
            } else {
                checkPartyAlerts(character);
                character.updateCharacter();
                updateStatBars(character);
            }    
            handleTurn(index + 1);
            attackButton.remove();
            setPlayButton('show');
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
                        setPlayButton('hide');
                        attackButton = document.createElement('button');
                        attackButton.setAttribute('data-combatant', combatant.type);
                        attackButton.textContent = `${combatant.type} feels too weak to battle. Continue.`;
                        attackButton.classList.add('attack');
                        attackButton.addEventListener('click', () => {
                            weaponButtons.querySelectorAll('.attack').forEach(button => button.remove());
                            addEvent(`${combatant.type} was unable to battle.`, 'altTurn');
                            addWeaponChoiceButton(weaponButtons, character, weapons[character.weapon], 0);
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
                    setPlayButton('hide');
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
                            
                            // Only reduce durability if not using fists (which have infinite durability)
                            if (character.weapon !== 0 && character.weaponDurability > 0) {
                                // Reduce weapon durability by 1 for each attack
                                character.weaponDurability -= 1;
                                
                                // Check if weapon has broken
                                if (character.weaponDurability <= 0) {
                                    addEvent(`${character.name}'s ${weapons[character.weapon][0]} has broken!`, 'orange');
                                    // Set weapon back to fists
                                    character.weapon = 0;
                                    character.weaponDurability = 100;
                                    character.updateCharacter();
                                    // Adjust damage for this attack since the weapon broke
                                    damage = weapons[0][1]; // fist damage
                                    if (character.posTrait === 'fighter') {
                                        damage += 1;
                                    }
                                    if (character.negTrait === 'clumsy') {
                                        damage -= 1;
                                        if (damage < 0) damage = 0;
                                    }
                                }
                            }
                            
                            if (i == 1) {
                                const allEnemies = combatants.filter(c => c.type === 'enemy' && c.hp > 0 && c !== enemy);
                                if (allEnemies.length > 0) {
                                    enemy = allEnemies[Math.floor(Math.random() * allEnemies.length)];
                                    enemyIndex = combatants.indexOf(enemy);
                                    addEvent(`${combatant.type} hits another ${enemy.type} for ${damage} damage.`, 'doubleHit');
                                } else {
                                    nothingHappened = 1;
                                }
                            } else {
                                if (criticalHit == 1) {
                                    damage += 1;
                                    addEvent(`${combatant.type} lands a critical hit! ${combatant.type} hit the ${enemy.type} for ${damage} damage.`, 'critHit');
                                } else if (criticalMiss == 1) {
                                    damage = 0;
                                    addEvent(`${combatant.type} misses!`, 'orange');
                                } else {
                                    addEvent(`${combatant.type} hit the ${enemy.type} for ${damage} damage.`, 'altTurn');
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
                                    context.gameParty.inventory.updateDisplay();
                                    updateFoodButtons();
                                }
                                // Check if all enemies are defeated
                                if (combatants.filter(c => c.type === 'enemy').length === 0) {
                                    break;
                                }
                            }
                        }
                        // Update character stats to reflect weapon durability changes
                        character.updateCharacter();
                        weaponButtons.querySelectorAll('.attack').forEach(button => button.remove());
                        setPlayButton('show');
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
    const weaponType = weapons[Math.floor(Math.random() * (weapons.length - 1)) + 1];
    addEvent(`${who} found a ${weaponType[0]}.`);
    // Add the weapon to inventory instead of immediately offering it
    addItemToInventory([weaponType[0], weaponType[2]]);
    context.gameParty.inventory.updateDisplay();
    
    // Offer the weapon to characters
    const weaponDiv = document.getElementById('gameButtons');
    for (const character of context.gameParty.characters) {
        addWeaponChoiceButton(weaponDiv, character, weaponType, id);
    }
}

function addWeaponChoiceButton(weaponDiv, character, weaponType, id, from = 'found') {
    const button = document.createElement('button');
    // if character has a weapon, replace it
    if (character.weapon !== null) {
        const oldWeapon = weapons[character.weapon];
        offerWeapon(oldWeapon, weaponType, id, character, button, weaponDiv, from);
    } else {
        const weaponName = weaponType[0];
        const damage = weaponType[1];
        button.innerText = `Give ${from} ${weaponName} (${damage} attack) to ${character.name}`;
        button.addEventListener('click', () => {
            // Set weapon index and durability
            character.weapon = weapons.indexOf(weaponType);
            character.weaponDurability = weaponType[2];
            
            addEvent(`${character.name} picked up the ${weaponName}.`);
            // Remove the weapon from inventory
            context.gameParty.inventory.removeItem(weaponName);
            context.gameParty.inventory.updateDisplay();
            weaponDiv.querySelectorAll('.weapon').forEach(button => button.remove());
            character.updateCharacter();
            setPlayButton('show');
        });
        weaponDiv.appendChild(button);
    }
}

// Add functions for weapon management
function updateWeaponAttributes(character, weaponItem) {
    const weaponInfo = weapons.find(w => w[0] === weaponItem[0]);
    if (weaponInfo) {
        // Store the old weapon and durability
        const oldWeapon = weapons[character.weapon];
        const oldWeaponDurability = character.weaponDurability;
        
        // Set new weapon
        character.weapon = weapons.indexOf(weaponInfo);
        character.weaponDurability = weaponItem[1]; // Use the stored durability
        
        // If the old weapon wasn't fists, add it back to inventory
        if (oldWeapon[0] !== 'fist') {
            addItemToInventory([oldWeapon[0], oldWeaponDurability]);
        }
        
        addEvent(`${character.name} equipped the ${weaponItem[0]}.`);
        updateWeaponButtons();
    }
}

function updateWeaponButtons() {
    // This works similar to the food and medical buttons
    // First collect all available weapons in inventory
    const weaponItems = weapons.slice(1).filter(weaponItem => 
        context.gameParty.inventory.hasItem(weaponItem[0])
    );
    
    updateButtons('weapon', weaponItems, 'Give weapon to', updateWeaponAttributes);
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
    // Use the new Inventory class's addItem method instead of directly manipulating inventoryMap
    context.gameParty.inventory.addItem(itemType);
}

function checkPartyAlerts(character) {
    // Check if the character is in the party before proceeding
    if (context.gameParty.characters.includes(character)) {
        const moralePercentage = (character.morale / (moraleArray.length - 1)) * 100;
        const hungerPercentage = (character.hunger / (hungerArray.length - 1)) * 100;
        const healthPercentage = (character.health / (healthArray.length - 1)) * 100;

        // Define threshold percentages
        const lowThreshold = 30;

        // Function to display a message when below a threshold
        if (moralePercentage < lowThreshold) {
            addEvent(`${character.name} is feeling ${moraleArray[Math.round(character.morale)]}.`);
        }
        if (hungerPercentage < lowThreshold) {
            addEvent(`${character.name} is ${hungerArray[Math.round(character.hunger)]}.`);
        }
        if (healthPercentage < lowThreshold) {
            addEvent(`${character.name} is ${healthArray[Math.round(character.health)]}.`);
        }
    }
}

function updateStatBars(character) {
    const characterDiv = document.getElementById(character.name);
    if (characterDiv) {
        const moraleStat = characterDiv.querySelector('#moraleStat');
        const hungerStat = characterDiv.querySelector('#hungerStat');
        const healthStat = characterDiv.querySelector('#healthStat');

        const moralePercentage = (character.morale / (moraleArray.length - 1)) * 100;
        const hungerPercentage = (character.hunger / (hungerArray.length - 1)) * 100;
        const healthPercentage = (character.health / (healthArray.length - 1)) * 100;

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

function addEvent(eventText, style = "default") {
    let currentEvents = '';
    const currentEventDiv = document.getElementById('currentEvent');
    if (currentEventDiv.innerHTML !== '') {
        currentEvents = currentEventDiv.innerHTML;
    }
    // Sanitize the eventText before adding it to innerHTML
    const sanitizedEventText = DOMPurify.sanitize(`<span class="${style}">${eventText}</span>`);
    currentEvents += ` ${sanitizedEventText}`;
    currentEventDiv.innerHTML = currentEvents.trim();
}

async function addPlayer() {
    try {
        if (context.gameParty.characters.length == 0) {
            createCharacterForm();
        } else {
            if (context.remainingNames.length === 0) {
                await fetchNames();
            }
            let firstName = context.remainingNames.shift();

            // Ensure the name doesn't contain characters that can't be used as class names
            firstName = firstName.replace(/[^a-zA-Z0-9]/g, '');

            const age = Math.floor(Math.random() * ageArray.length);
            const posTrait = posTraits[Math.floor(Math.random() * posTraits.length)];
            const negTrait = negTraits[Math.floor(Math.random() * negTraits.length)];
            const skinTypes = ['skin_dark.png', 'skin_dark-mid.png', 'skin_mid.png', 'skin_light-mid.png', 'skin_light.png'];
            const skin = "images/skin/" + skinTypes[Math.floor(Math.random() * skinTypes.length)];
            let hairColour = ['blonde.png', 'ginger.png', 'brown.png', 'red.png', 'black.png'];
            let hairStyle = ['hair_long-curly', 'hair_long-straight', 'hair_short-fluffy', 'hair_short-straight'];
            const hair = "images/hair/" + hairStyle[Math.floor(Math.random() * hairStyle.length)] + '_' + hairColour[Math.floor(Math.random() * hairColour.length)];
            let shirtColour = ['red.png', 'yellow.png', 'green.png', 'blue.png'];
            let shirtStyle = ['shirt_hoodie', 'shirt_jacket', 'shirt_scarf', 'shirt_vest'];
            const shirt = "images/shirts/" + shirtStyle[Math.floor(Math.random() * shirtStyle.length)] + '_' + shirtColour[Math.floor(Math.random() * shirtColour.length)];
            const character = new Character(firstName, age, posTrait[0], negTrait[0], skin, hair, shirt);
            context.gameParty.addCharacter(character);
            addEvent(`${character.name} has joined the party!`);
            character.createCharacter();
            character.updateCharacter();
            updateStatBars(character);
            updateFoodButtons();
            updateMedicalButtons();
            updateWeaponButtons(); // Add this line to update weapon buttons when new player joins
            updateInteractionButtons();
        }
        updateRelationships();
    } catch (error) {
        console.error(error);
    }
}

function getName(data) {
    return data.name.first;
}

function handleSelection(event, items, updateCharacterAttributes) {
    try {
        const selectedItem = event.target.value;
        if (selectedItem === 'interact') {
            const characterName = event.target.selectedOptions[0].dataset.characterName;
            const targetName = event.target.selectedOptions[0].dataset.targetName;
            event.target.remove(event.target.selectedIndex);
            const character = context.gameParty.characters.find(char => char.name === characterName);
            const target = context.gameParty.characters.find(char => char.name === targetName);
            const chance = Math.random();
            if (chance <= 0.5) {
                addEvent(`${target.name} is not interested in talking right now.`);
            } else if (chance <= 0.75) {
                addEvent(`${target.name} is happy to chat.`);
                if (character.relationships.get(target) < 4) {
                    character.relationships.set(target, character.relationships.get(target) + 1);
                    target.relationships.set(character, target.relationships.get(character) + 1);
                    updateRelationships();
                }
            } else {
                addEvent(`${target.name} is feeling down.`);
            }
            
        } else {
            const item = items.find(i => i[0] === selectedItem);
            if (item) {
                const characterName = event.target.selectedOptions[0].dataset.characterName;
                const character = context.gameParty.characters.find(char => char.name === characterName);

                if (character) {
                    // Use the inventory's removeItem method instead of directly manipulating inventoryMap
                    if (context.gameParty.inventory.hasItem(item[0])) {
                        context.gameParty.inventory.removeItem(item[0]);
                        updateCharacterAttributes(character, item);
                        character.capAttributes();
                        character.updateCharacter();
                        updateStatBars(character);
                        context.gameParty.inventory.updateDisplay();
                    }
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
    defaultOption.textContent = `${defaultOptionText}`;
    fragment.appendChild(defaultOption);

    if (itemType === 'interaction') {
        const others = context.gameParty.characters.filter(c => c !== character);
        for (const other of others) {
            const option = document.createElement('option');
            option.textContent = other.name;
            option.value = 'interact';
            option.dataset.characterName = character.name;
            option.dataset.targetName = other.name;
            fragment.appendChild(option);
        }
    } else {
        for (const item of items) {
            // Use hasItem instead of checking inventoryMap directly
            if (context.gameParty.inventory.hasItem(item[0])) {
                const option = document.createElement('option');
                option.textContent = `${item[0]} (+${item[1]})`;
                option.value = item[0];
                option.dataset.characterName = character.name;
                fragment.appendChild(option);
            }
        }
    }

    selectElement.innerHTML = ''; // Clear existing options
    selectElement.appendChild(fragment); // Append new options
}

function updateButtons(itemType, items, defaultOptionText, updateCharacterAttributes) {
    try {
        let hasItems = false;
        if (itemType === 'interaction') {
            hasItems = true;
        } else {
            // Update this to use the Inventory class methods instead of directly accessing inventoryMap
            hasItems = items.some(item => context.gameParty.inventory.hasItem(item[0]));
        }
        for (const character of context.gameParty.characters) {
            try {
                const selectElement = document.querySelector(`#${character.name.split(' ').join('')} #options #${itemType}Select`);
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

function updateInteractionAttributes(character, interactionItem) {
    addEvent(`${character.name} interacted with ${interactionItem[0]}.`);
    updateInteractionButtons();
}

function updateFoodButtons() {
    updateButtons('food', food, 'Feed', updateFoodAttributes);
}

function updateMedicalButtons() {
    updateButtons('medical', medical, 'Heal', updateMedicalAttributes);
}

function updateInteractionButtons() {
    updateButtons('interaction', null, 'Interact with', updateInteractionAttributes);
}

const styleSelector = document.getElementById("styleselector");
styleSelector.addEventListener("change", () => {
    document.querySelector("link[rel='stylesheet']").href = styleSelector.value;
});

async function createCharacterForm() {
    const formDiv = document.getElementById('characters');
    const precis = document.createElement('p');

    precis.textContent = 'Create a character to start the game.';
    formDiv.appendChild(precis);

    const form = document.createElement('form');

    await fetchNames();
    const firstName = context.remainingNames.shift();

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
      option.value = trait[0];
      option.textContent = trait[0];
      posTraitsSelect.appendChild(option);
    }
    posTraitsSelect.selectedIndex = Math.floor(Math.random() * posTraits.length);
    posTraitsLabel.appendChild(posTraitsSelect);
    form.appendChild(posTraitsLabel);

    const posTraitsDescription = document.createElement('p');
    const posEffectsList = document.createElement('ul');
    let posEffect1 = document.createElement('li');
    posEffect1.textContent = posTraits[posTraitsSelect.selectedIndex][1];
    posEffectsList.appendChild(posEffect1);
    let posEffect2 = document.createElement('li');
    posEffect2.textContent = posTraits[posTraitsSelect.selectedIndex][2];
    posEffectsList.appendChild(posEffect2);
    posTraitsDescription.appendChild(posEffectsList);
    form.appendChild(posTraitsDescription);

    const negTraitsLabel = document.createElement('label');
    negTraitsLabel.textContent = 'Negative Trait: ';
    const negTraitsSelect = document.createElement('select');
    for (const trait of negTraits) {
      const option = document.createElement('option');
      option.value = trait[0];
      option.textContent = trait[0];
      negTraitsSelect.appendChild(option);
    }
    negTraitsSelect.selectedIndex = Math.floor(Math.random() * negTraits.length);
    negTraitsLabel.appendChild(negTraitsSelect);
    form.appendChild(negTraitsLabel);

    const negTraitsDescription = document.createElement('p');
    const negEffectsList = document.createElement('ul');
    let negEffect1 = document.createElement('li');
    negEffect1.textContent = negTraits[negTraitsSelect.selectedIndex][1];
    negEffectsList.appendChild(negEffect1);
    let negEffect2 = document.createElement('li');
    negEffect2.textContent = negTraits[negTraitsSelect.selectedIndex][2];
    negEffectsList.appendChild(negEffect2);
    negTraitsDescription.appendChild(negEffectsList);
    form.appendChild(negTraitsDescription);

    // Avatar creation section
    const avatarSection = document.createElement('div');
    avatarSection.innerHTML = '<p>Create your avatar:</p>';

    // Skin selection
    const skinLabel = document.createElement('label');
    skinLabel.textContent = 'Skin: ';
    const skinSelect = document.createElement('select');
    const skinImages = ['skin_dark.png', 'skin_dark-mid.png', 'skin_mid.png', 'skin_light-mid.png', 'skin_light.png'];
    skinImages.forEach(skin => {
        const option = document.createElement('option');
        option.value = skin;
        const skinText = skin.split('.')[0];
        option.textContent = skinText.split('_')[1];
        skinSelect.appendChild(option);
    });
    skinSelect.selectedIndex = Math.floor(Math.random() * skinImages.length);
    skinLabel.appendChild(skinSelect);
    avatarSection.appendChild(skinLabel);

    // Hair style selection
    const hairStyleLabel = document.createElement('label');
    hairStyleLabel.textContent = 'Hair Style: ';
    const hairStyleSelect = document.createElement('select');
    const hairStyleImages = ['hair_long-curly', 'hair_long-straight', 'hair_short-fluffy', 'hair_short-straight'];
    hairStyleImages.forEach(hairStyle => {
        const option = document.createElement('option');
        option.value = hairStyle;
        option.textContent = hairStyle.split('_')[1].replace('-',' and ');
        hairStyleSelect.appendChild(option);
    });
    hairStyleSelect.selectedIndex = Math.floor(Math.random() * hairStyleImages.length);
    hairStyleLabel.appendChild(hairStyleSelect);
    avatarSection.appendChild(hairStyleLabel);

    // Hair colour selection
    const hairColourLabel = document.createElement('label');
    hairColourLabel.textContent = 'Hair Colour: ';
    const hairColourSelect = document.createElement('select');
    const hairColourImages = ['blonde.png', 'ginger.png', 'brown.png', 'red.png', 'black.png'];
    hairColourImages.forEach((hairColour, index) => {
        const option = document.createElement('option');
        option.value = hairColour;
        // grab the name of the file before the .png
        option.textContent = hairColourImages[index].split('.')[0];
        hairColourSelect.appendChild(option);
    });
    hairColourSelect.selectedIndex = Math.floor(Math.random() * hairColourImages.length);
    hairColourLabel.appendChild(hairColourSelect);
    avatarSection.appendChild(hairColourLabel);

    // shirt style selection
    const shirtStyleLabel = document.createElement('label');
    shirtStyleLabel.textContent = 'Shirt Style: ';
    const shirtStyleSelect = document.createElement('select');
    const shirtStyleImages = ['shirt_hoodie', 'shirt_jacket', 'shirt_scarf', 'shirt_vest'];
    shirtStyleImages.forEach(shirtStyle => {
        const option = document.createElement('option');
        option.value = shirtStyle;
        option.textContent = shirtStyle.split('_')[1];
        shirtStyleSelect.appendChild(option);
    });
    shirtStyleSelect.selectedIndex = Math.floor(Math.random() * shirtStyleImages.length);
    shirtStyleLabel.appendChild(shirtStyleSelect);
    avatarSection.appendChild(shirtStyleLabel);

    // shirt colour selection
    const shirtColourLabel = document.createElement('label');
    shirtColourLabel.textContent = 'Shirt Colour: ';
    const shirtColourSelect = document.createElement('select');
    const shirtColourImages = ['red.png', 'yellow.png', 'green.png', 'blue.png'];
    shirtColourImages.forEach((shirtColour, index) => {
        const option = document.createElement('option');
        option.value = shirtColour;
        option.textContent = shirtColourImages[index].split('.')[0];
        shirtColourSelect.appendChild(option);
    });
    shirtColourSelect.selectedIndex = Math.floor(Math.random() * shirtColourImages.length);
    shirtColourLabel.appendChild(shirtColourSelect);
    avatarSection.appendChild(shirtColourLabel);

    // Avatar preview container
    const avatarPreviewContainer = document.createElement('div');
    avatarPreviewContainer.className = 'avatar';
    avatarPreviewContainer.style.position = 'relative';

    const avatarPreview = document.createElement('div');
    avatarPreview.className = 'avatarSprite';

    // Outlines
    const hairOutline = document.createElement('img');
    hairOutline.src = "images/hair/outline_hair_" + hairStyleSelect.value.split('_')[1] + ".png";
    avatarPreview.appendChild(hairOutline);
    const shirtOutline = document.createElement('img');
    shirtOutline.src = "images/shirts/outline_shirt_" + shirtStyleSelect.value.split('_')[1] + ".png";
    avatarPreview.appendChild(shirtOutline);

    // Skin preview
    const skinPreview = avatarPreview.appendChild(document.createElement('img'));
    skinPreview.src = "images/skin/" + skinSelect.value;
    skinPreview.alt = nameInput.value + '\'s skin sprite.';
    avatarPreview.appendChild(skinPreview);

    // Hair preview
    const hairPreview = avatarPreview.appendChild(document.createElement('img'));
    hairPreview.src = "images/hair/" + hairStyleSelect.value + '_' + hairColourSelect.value;
    hairPreview.alt = nameInput.value + '\'s hair sprite. . Their hair is ';
    switch (hairStyleSelect.value) {
        case 'short1':
            hairPreview.alt += 'short and straight.';
            break;
        case 'short2':
            hairPreview.alt += 'short and fluffy.';
            break;
        case 'long1':
            hairPreview.alt += 'long and straight.';
            break;
        case 'long2':
            hairPreview.alt += 'long and curly.';
            break;
    }
    avatarPreview.appendChild(hairPreview);

    // shirt preview
    const shirtPreview = avatarPreview.appendChild(document.createElement('img'));
    shirtPreview.src = "images/shirts/" + shirtStyleSelect.value + '_' + shirtColourSelect.value;
    shirtPreview.alt = nameInput.value + '\'s shirt sprite';
    switch (shirtStyleSelect.value) {
      case "images/shirts/shirt1.png":
        shirtPreview.alt += "hoodie.";
        break;
      case "images/shirts/shirt2.png":
        shirtPreview.alt += "vest.";
        break;
      case "images/shirts/shirt3.png":
        shirtPreview.alt += "jacket.";
        break;
      case "images/shirts/shirt4.png":
        shirtPreview.alt += "scarf.";
        break;
    }
    avatarPreview.appendChild(shirtPreview);
    
    avatarPreviewContainer.appendChild(avatarPreview);
    avatarSection.appendChild(avatarPreviewContainer);


    // Event listeners to update previews
    posTraitsSelect.addEventListener('change', () => {
        const posTraitIndex = posTraits.findIndex(trait => trait[0] === posTraitsSelect.value);
        const effectsList = document.createElement('ul');
        let effect1 = document.createElement('li');
        effect1.textContent = posTraits[posTraitIndex][1];
        effectsList.appendChild(effect1);
        let effect2 = document.createElement('li');
        effect2.textContent = posTraits[posTraitIndex][2];
        effectsList.appendChild(effect2);
        posTraitsDescription.innerHTML = '';
        posTraitsDescription.appendChild(effectsList);
    });

    negTraitsSelect.addEventListener('change', () => {
        const negTraitIndex = negTraits.findIndex(trait => trait[0] === negTraitsSelect.value);
        const effectsList = document.createElement('ul');
        let effect1 = document.createElement('li');
        effect1.textContent = negTraits[negTraitIndex][1];
        effectsList.appendChild(effect1);
        let effect2 = document.createElement('li');
        effect2.textContent = negTraits[negTraitIndex][2];
        effectsList.appendChild(effect2);
        negTraitsDescription.innerHTML = '';
        negTraitsDescription.appendChild(effectsList);
    });

    skinSelect.addEventListener('change', () => {
        skinPreview.src = "images/skin/" + skinSelect.value;
    });

    hairStyleSelect.addEventListener('change', () => {
        hairOutline.src = "images/hair/outline_hair_" + hairStyleSelect.value.split('_')[1] + ".png";
        hairPreview.src = "images/hair/" + hairStyleSelect.value + '_' + hairColourSelect.value;
    });

    hairColourSelect.addEventListener('change', () => {
        hairPreview.src = "images/hair/" + hairStyleSelect.value + '_' + hairColourSelect.value;
    });

    shirtStyleSelect.addEventListener('change', () => {
        shirtOutline.src = "images/shirts/outline_shirt_" + shirtStyleSelect.value.split('_')[1] + ".png";
        shirtPreview.src = "images/shirts/" + shirtStyleSelect.value + '_' + shirtColourSelect.value;
    });

    shirtColourSelect.addEventListener('change', () => {
        shirtPreview.src = "images/shirts/" + shirtStyleSelect.value + '_' + shirtColourSelect.value;
    });

    form.appendChild(avatarSection);

    const submitButton = document.createElement('button');

    submitButton.textContent = 'Start Game';
    submitButton.addEventListener('click', () => {
        const name = nameInput.value;
        const age = ageInput.value;
        const posTrait = posTraitsSelect.value;
        const negTrait = negTraitsSelect.value;
        const skin = "images/skin/" + skinSelect.value;
        const hair = "images/hair/" + hairStyleSelect.value + '_' + hairColourSelect.value;
        const shirt = "images/shirts/" + shirtStyleSelect.value + '_' + shirtColourSelect.value;
        const character = new Character(name, age, posTrait, negTrait, skin, hair, shirt);
        formDiv.innerHTML = "";
        startGame();
        const playTurnButton = document.createElement('button');
        playTurnButton.id = 'playTurnButton';
        playTurnButton.textContent = 'Play Turn 1';
        playTurnButton.addEventListener('click', () => {
            playTurn();
        });
        document.getElementById('gameButtons').appendChild(playTurnButton);
        context.gameParty.addCharacter(character);
        context.gameParty.inventory.updateDisplay();
        character.createCharacter();
        character.updateCharacter();
        updateStatBars(character);

        //unhide the buttons div
        const buttonsDiv = document.getElementById('buttons');
        buttonsDiv.style.display = 'block';

        //unhide the events div
        const eventsDiv = document.getElementById('content');
        eventsDiv.style.display = 'flex';

        addEvent(`A new illness has swept the world and the infected have begun to rise from the dead. The world is ending, but ${character.name}'s life doesn't have to just yet.`)
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
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
}

async function startGame() {
    let gameParty;
    if (!context.gameParty) {
        gameParty = new Party();
    }
    setGameParty(gameParty);
}

function setPlayButton(display) {
    const playTurnButton = document.getElementById('playTurnButton');
    if (playTurnButton === null) {
        return;
    }
    switch (display) {
        case "show":
            // Check if there are other buttons in the gameButtons container
            const gameButtons = document.getElementById('gameButtons');
            const otherButtons = gameButtons.querySelectorAll('button:not(#playTurnButton)');
            // Only show the playTurnButton if there are no other buttons visible
            if (otherButtons.length === 0) {
                playTurnButton.style.display = 'block';
            }
            break;
        case "hide":
            playTurnButton.style.display = 'none';
            break;
        case "remove":
            playTurnButton.remove();
            break;
        default:
            playTurnButton.innerText = display;
    }
}

export { context, addItemToInventory, getEvent, updateStatBars, food, medical, addEvent, posTraits, negTraits, updateRelationships, updateFoodButtons, updateMedicalButtons, checkDeathEffects, updateInteractionButtons, createCharacterForm, checkPartyAlerts, setPlayButton };