var turnNumber = 1;

import Party from './party.js';
import { Character, ageArray } from './character.js';
import { context, setGameParty, getEvent, addItemToInventory, updateStatBars, food, medical, addEvent, getName, posTraits, negTraits, updateRelationships, updateFoodButtons, updateMedicalButtons, checkDeathEffects } from './helpers.js';

function playTurn() {
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
    updateParty();
    if (context.gameParty.characters.length === 0) {
        const allButtons = document.getElementById('buttons');
        allButtons.remove();
        const partyInventoryDiv = document.getElementById('partyInventory');
        partyInventoryDiv.remove();
        // output character is dead to the events div
        addEvent('The adventure has come to an end. You survived for ' + turnNumber + ' turns.');
        const playTurnButton = document.getElementById('playTurnButton');
        if (playTurnButton) {        
            playTurnButton.remove()
        }
    } else {
        const chance = Math.random();
        getEvent(chance);
        context.gameParty.updateInventory();
        turnNumber += 1;
        const playTurnButton = document.getElementById('playTurnButton');
        if (playTurnButton) {
            playTurnButton.innerText = `Play Turn ${turnNumber}`;
        }
    }
    
    function updateParty() {
        for (const character of context.gameParty.characters) {
            if (character.checkHunger()) {
                checkPosTraitEvents(character);
                checkNegTraitEvents(character);
                // Make sure attributes are within bounds
                character.capAttributes();
                updateStatBars(character);
                if (character.sick || character.infected) {
                    if (Math.random() < 0.1) {
                        character.morale -= 1;
                        addEvent(`${character.name} is not feeling very well.`);
                        updateStatBars(character);
                    }
                    if (Math.random() < 0.1) {
                        character.health -= 1;
                        addEvent(`${character.name} is feeling worse.`);
                        updateStatBars(character);
                    }
                }
                if (character.infected) {
                    if (Math.random() < 0.1) {
                        addEvent(`${character.name} is feeling angry.`);
                    }
                    if (Math.random() < 0.1) {
                        character.posTrait = posTraits[Math.floor(Math.random() * posTraits.length)][0];
                        character.negTrait = negTraits[Math.floor(Math.random() * negTraits.length)][0];
                        addEvent(`${character.name} is feeling strange.`);
                        updateStatBars(character);
                    }
                }
                if (character.morale <= 0 && context.gameParty.characters.length > 1) {
                    addEvent(`${character.name} has lost all hope. They have left the party.`);
                    checkDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                }
            } else {
                addEvent(`${character.name} died of hunger.`);
                checkDeathEffects(character);
                context.gameParty.removeCharacter(character);
                updateRelationships();
            }
        };
    }


    function checkNegTraitEvents(character) {
        if (character.negTrait === 'hungry') {
            // every other turn, hunger goes up
            if (turnNumber % 2 === 0) {
                character.hunger -= 0.5;
            }
        }
        if (character.negTrait === 'hypochondriac') {
            // 10% chance of using a medical item without benefit
            if (Math.random() < 0.1) {
                // Collect medical items from the inventory Map
                const medicalitems = [];
                context.gameParty.inventoryMap.forEach((value, key) => {
                    if (medical.some(medicalItem => medicalItem.includes(key))) {
                        medicalitems.push(key);
                    }
                });

                if (medicalitems.length > 0) {
                    const item = medicalitems[Math.floor(Math.random() * medicalitems.length)];
                    context.gameParty.inventoryMap.delete(item);
                    addEvent(`${character.name} used the ${item} but it had no effect.`); 
                    updateMedicalButtons();
                }
            }
        }
        if (character.negTrait === 'depressed') {
            // 10% chance of decreasing morale
            if (Math.random() < 0.1) {
                character.morale -= 1;
                addEvent(`${character.name} has been crying.`);
            }
            // Can't go above good
            if (character.morale > 7) {
                character.morale -= 2;
            }
        }
        if (character.negTrait === 'clumsy') {
            // 10% chance of getting hurt
            if (Math.random() < 0.1) {
                character.health -= 1;
                addEvent(`${character.name} tripped and hurt themself.`);
                if (character.health <= 0) {
                    checkDeathEffects(character);
                    context.gameParty.removeCharacter(character);
                    updateRelationships();
                } else {
                    character.updateCharacter();
                    updateStatBars(character);
                }
            }
        }
    }

    function checkPosTraitEvents(character) {
        if (character.posTrait === 'resilient') {
            // 10% chance of healing
            if (Math.random() < 0.1) {
                character.health += 1;
                addEvent(`${character.name} is feeling a bit better.`);
            }
        }
        if (character.posTrait === 'satiated') {
            // every other turn, hunger goes down
            if (turnNumber % 2 === 0) {
                character.hunger += 0.5;
            }
        }
        if (character.posTrait === 'scavenger') {
            // 10% chance of finding an extra food item
            if (Math.random() < 0.1) {
                addEvent(`${character.name} was able to scavenge some extra food.`);
                const foodType = food[Math.floor(Math.random() * food.length)];
                addItemToInventory(foodType);
                updateFoodButtons(); 
            }
        }
        if (character.posTrait === 'optimistic') {
            // 10% chance of increasing own morale
            if (Math.random() < 0.1) {
            character.morale += 1;
            addEvent(`${character.name} looks happy today.`);
            }
            // Can't go below bad
            if (character.morale < 2) {
            character.morale += 2;
            addEvent(`${character.name} clings on to hope`);
            }
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
        startGame();
        const playTurnButton = document.createElement('button');
        playTurnButton.id = 'playTurnButton';
        playTurnButton.textContent = 'Play Turn 1';
        playTurnButton.addEventListener('click', () => {
            playTurn();
        });
        document.getElementById('gameButtons').appendChild(playTurnButton);
        context.gameParty.addCharacter(character);
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

async function startGame() {
    let gameParty;
    if (!context.gameParty) {
        gameParty = new Party();
    }
    setGameParty(gameParty);
}

createCharacterForm();

export { playTurn };