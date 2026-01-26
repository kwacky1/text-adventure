import { ageArray, Character } from '../character.js';
import { context, getFormattedDate } from '../game-state.js';
import { posTraits, negTraits } from './constants.js';
import Party, { food, medical, weapons } from '../party.js';
import { setGameParty } from '../game-state.js';
import { updateStatBars, addEvent, setPlayButton, updateFoodButtons, updateMedicalButtons, updateInteractionButtons, updateRelationships } from './ui.js';
import { playTurn } from '../game.js';
import { newCharacterFlavour } from './events.js';
import { addItemToInventory, updateWeaponButtons } from './inventory.js';
import { resetSeasonalEvents } from './seasonal-events.js';
import { recordNewPartyMember, resetGameStats } from './game-stats.js';

export async function fetchNames(amount = 10) {
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

export function getName(data) {
    return data.name.first;
}

export async function createCharacterForm() {
    const formDiv = document.getElementById('characters');
    const precis = document.createElement('p');
    precis.textContent = 'Create a character to start the game.';
    formDiv.appendChild(precis);

    const form = await createForm();
    formDiv.appendChild(form);
}

async function createForm() {
    const form = document.createElement('form');
    
    // Create selects object to store avatar selection elements
    const selects = {
        skinSelect: null,
        hairStyleSelect: null,
        hairColorSelect: null,
        shirtStyleSelect: null,
        shirtColorSelect: null
    };
    
    // Add all form fields
    await addNameField(form);
    addAgeField(form);
    addTraitFields(form);
    addAvatarCreation(form, selects);
      // Add submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Start Game';
    form.appendChild(submitButton);
      // Add form submit handler with access to selects object
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        // Get form values
        const name = form.querySelector('#character-name').value;
        const age = parseInt(form.querySelector('#character-age').value);
        const posTrait = form.querySelector('#positive-trait').value;
        const negTrait = form.querySelector('#negative-trait').value;
        
        // Get birthday values
        const birthMonth = parseInt(form.querySelector('#birth-month').value);
        const birthDay = parseInt(form.querySelector('#birth-day').value);
        
        // Check for URL param override for birth year (e.g., ?birthYear=1996)
        const urlParams = new URLSearchParams(window.location.search);
        const birthYearParam = urlParams.get('birthYear');
        
        // Calculate birth year based on age category, or use URL param if provided
        // Use game's current date (respects startDate URL param) instead of real-world date
        const currentYear = context.currentDate.getFullYear();
        let birthYear;
        if (birthYearParam && !isNaN(parseInt(birthYearParam))) {
            birthYear = parseInt(birthYearParam);
            console.log(`Using custom birth year from URL: ${birthYear}`);
        } else {
            switch (age) {
                case 0: // teen (13-30)
                    birthYear = currentYear - (Math.floor(Math.random() * 18) + 13);
                    break;
                case 1: // adult (31-60)
                    birthYear = currentYear - (Math.floor(Math.random() * 30) + 31);
                    break;
                case 2: // elder (61+)
                    birthYear = currentYear - (Math.floor(Math.random() * 20) + 61);
                    break;
                default:
                    birthYear = currentYear - 25;
            }
        }
        
        // Get appearance values with full image paths
        const skin = `images/skin/${selects.skinSelect?.value || 'skin_light.png'}`;
        const hair = `images/hair/${selects.hairStyleSelect?.value || 'hair_short-straight'}_${selects.hairColorSelect?.value || 'brown.png'}`;
        const shirt = `images/shirts/${selects.shirtStyleSelect?.value || 'shirt_vest'}_${selects.shirtColorSelect?.value || 'blue.png'}`;

        // Create new party and character
        const gameParty = new Party();
        const newCharacter = new Character(name, age, posTrait, negTrait, skin, hair, shirt, birthMonth, birthDay, birthYear);
        
        // Initialize game state
        setGameParty(gameParty);
        resetSeasonalEvents(); // Reset seasonal event tracking for the new game
        resetGameStats(); // Reset game statistics for new game
        gameParty.addCharacter(newCharacter);
        // Track the first party member with their name and turn 1
        recordNewPartyMember(name, 1);
        
        // Create character UI elements after clearing the form container
        const charactersDiv = document.getElementById('characters');
        charactersDiv.innerHTML = ''; // Remove form and precis text
        newCharacter.createCharacter();
        newCharacter.updateCharacter();
        updateStatBars(newCharacter);

        // Create play turn button
        const playTurnButton = document.createElement('button');
        playTurnButton.id = 'playButton';  // Changed to match what setPlayButton expects
        playTurnButton.textContent = 'Play Turn 1';
        playTurnButton.addEventListener('click', () => {
            playTurn();
        });
        document.getElementById('gameButtons').appendChild(playTurnButton);

        // Show game UI elements
        const buttonsDiv = document.getElementById('buttons');
        buttonsDiv.style.display = 'block';

        const eventsDiv = document.getElementById('content');
        eventsDiv.style.display = 'flex';
        
        // Show day counter
        const dayCounter = document.getElementById('day');
        dayCounter.textContent = `Day (${getFormattedDate()})`;
        dayCounter.style.display = 'block';

        // Add introduction text based on positive trait
        let introText = 'A new illness has swept the world and the infected have begun to rise from the dead. ';
        switch(posTrait) {
            case 'resilient':
                introText += `Despite this, ${name} knows they're going to push through.`;
                break;
            case 'friendly':
                introText += `The other survivors are out there somewhere, and ${name}'s already looking.`;
                break;
            case 'scavenger':
                introText += `Luckily, ${name} is equipped for this situation.`;
                break;
            case 'optimistic':
                introText += `The world is ending, but ${name}'s life doesn't have to just yet.`;
                break;
            case 'fighter':
                introText += `They'd better look out, though - ${name} knows how to fight.`;
                break;
            default:
                introText += `The world is ending, but ${name}'s life doesn't have to just yet.`;
        }
        addEvent(introText);

        // Scroll to top
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        // Update inventory display
        gameParty.inventory.updateDisplay();
    });
    
    return form;
}

async function addNameField(form) {
    await fetchNames();
    const firstName = context.remainingNames.shift();

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name: ';    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'character-name';
    nameInput.value = firstName;
    nameLabel.appendChild(nameInput);
    form.appendChild(nameLabel);
}

function addAgeField(form) {
    const birthdaySection = document.createElement('div');
    birthdaySection.className = 'birthday-section';
    
    // Month selector
    const monthLabel = document.createElement('label');
    monthLabel.textContent = 'Birth Month: ';
    const monthSelect = document.createElement('select');
    monthSelect.id = 'birth-month';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    monthSelect.selectedIndex = Math.floor(Math.random() * 12);
    monthLabel.appendChild(monthSelect);
    form.appendChild(monthLabel);
    
    // Day selector
    const dayLabel = document.createElement('label');
    dayLabel.textContent = 'Birth Day: ';
    const daySelect = document.createElement('select');
    daySelect.id = 'birth-day';
    for (let i = 1; i <= 28; i++) { // Use 28 to avoid invalid dates
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daySelect.appendChild(option);
    }
    daySelect.selectedIndex = Math.floor(Math.random() * 28);
    dayLabel.appendChild(daySelect);
    form.appendChild(dayLabel);
    
    // Age category (determines birth year)
    const ageLabel = document.createElement('label');
    ageLabel.textContent = 'Age: ';    
    const ageInput = document.createElement('select');
    ageInput.id = 'character-age';
    for (let i = 0; i < ageArray.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = ageArray[i];
        ageInput.appendChild(option);
    }
    ageInput.selectedIndex = Math.floor(Math.random() * ageArray.length);
    ageLabel.appendChild(ageInput);
    form.appendChild(ageLabel);
}

function addTraitFields(form) {    // Positive traits
    const posTraitsLabel = document.createElement('label');
    posTraitsLabel.textContent = 'Positive Trait: ';
    const posTraitsSelect = createTraitSelect(posTraits, 'positive-trait');
    posTraitsLabel.appendChild(posTraitsSelect);
    form.appendChild(posTraitsLabel);

    let posTraitsDescription = createTraitDescription(posTraits[posTraitsSelect.selectedIndex]);
    form.appendChild(posTraitsDescription);

    // Update positive trait description when selection changes
    posTraitsSelect.addEventListener('change', () => {
        const newDescription = createTraitDescription(posTraits[posTraitsSelect.selectedIndex]);
        form.replaceChild(newDescription, posTraitsDescription);
        posTraitsDescription = newDescription;
    });    // Negative traits
    const negTraitsLabel = document.createElement('label');
    negTraitsLabel.textContent = 'Negative Trait: ';
    const negTraitsSelect = createTraitSelect(negTraits, 'negative-trait');
    negTraitsLabel.appendChild(negTraitsSelect);
    form.appendChild(negTraitsLabel);

    let negTraitsDescription = createTraitDescription(negTraits[negTraitsSelect.selectedIndex]);
    form.appendChild(negTraitsDescription);

    // Update negative trait description when selection changes
    negTraitsSelect.addEventListener('change', () => {
        const newDescription = createTraitDescription(negTraits[negTraitsSelect.selectedIndex]);
        form.replaceChild(newDescription, negTraitsDescription);
        negTraitsDescription = newDescription;
    });
}

function createTraitSelect(traits, id) {
    const select = document.createElement('select');
    select.id = id;
    for (const trait of traits) {
        const option = document.createElement('option');
        option.value = trait[0];
        option.textContent = trait[0];
        select.appendChild(option);
    }
    select.selectedIndex = Math.floor(Math.random() * traits.length);
    return select;
}

function createTraitDescription(trait) {
    const description = document.createElement('p');
    const effectsList = document.createElement('ul');
    let effect1 = document.createElement('li');
    effect1.textContent = trait[1];
    effectsList.appendChild(effect1);
    let effect2 = document.createElement('li');
    effect2.textContent = trait[2];
    effectsList.appendChild(effect2);
    description.appendChild(effectsList);
    return description;
}

function addAvatarCreation(form, selects) {
    const avatarSection = document.createElement('div');
    avatarSection.innerHTML = '<p>Create your avatar:</p>';

    const previewContainer = addAvatarPreview(avatarSection);
    
    addSkinSelection(avatarSection, selects);
    addHairSelection(avatarSection, selects);
    addShirtSelection(avatarSection, selects);

    // Do initial preview update once everything is set up
    requestAnimationFrame(() => {
        updateAvatarPreview(
            previewContainer,
            selects.skinSelect,
            selects.hairStyleSelect,
            selects.hairColorSelect,
            selects.shirtStyleSelect,
            selects.shirtColorSelect
        );
    });

    form.appendChild(avatarSection);
}

function addSkinSelection(container, selects) {
    const skinLabel = document.createElement('label');
    skinLabel.textContent = 'Skin: ';    const skinSelect = document.createElement('select');
    skinSelect.name = 'skin';
    const skinImages = ['skin_dark.png', 'skin_dark-mid.png', 'skin_mid.png', 'skin_light-mid.png', 'skin_light.png'];
    // Make sure we have a default selection
    skinSelect.value = skinImages[0];
    populateImageSelect(skinSelect, skinImages);
    skinLabel.appendChild(skinSelect);
    container.appendChild(skinLabel);
    
    selects.skinSelect = skinSelect;
    // Add change listener for preview update
    skinSelect.addEventListener('change', () => {
        updateAvatarPreview(
            container.querySelector('.avatar'),
            selects.skinSelect,
            selects.hairStyleSelect,
            selects.hairColorSelect,
            selects.shirtStyleSelect,
            selects.shirtColorSelect
        );
    });
}

function addHairSelection(container, selects) {
    // Hair style
    const hairStyleLabel = document.createElement('label');
    hairStyleLabel.textContent = 'Hair Style: ';    const hairStyleSelect = document.createElement('select');
    hairStyleSelect.name = 'hair-style';
    const hairStyleImages = ['hair_long-curly', 'hair_long-straight', 'hair_short-fluffy', 'hair_short-straight'];
    populateImageSelect(hairStyleSelect, hairStyleImages);
    hairStyleLabel.appendChild(hairStyleSelect);
    container.appendChild(hairStyleLabel);

    // Hair color
    const hairColourLabel = document.createElement('label');
    hairColourLabel.textContent = 'Hair Colour: ';    const hairColourSelect = document.createElement('select');
    hairColourSelect.name = 'hair-color';
    const hairColourImages = ['blonde.png', 'ginger.png', 'brown.png', 'red.png', 'black.png'];
    populateImageSelect(hairColourSelect, hairColourImages);
    hairColourLabel.appendChild(hairColourSelect);
    container.appendChild(hairColourLabel);

    selects.hairStyleSelect = hairStyleSelect;
    selects.hairColorSelect = hairColourSelect;
    
    // Add change listeners for preview update
    hairStyleSelect.addEventListener('change', () => {
        updateAvatarPreview(
            container.querySelector('.avatar'),
            selects.skinSelect,
            selects.hairStyleSelect,
            selects.hairColorSelect,
            selects.shirtStyleSelect,
            selects.shirtColorSelect
        );
    });
    
    hairColourSelect.addEventListener('change', () => {
        updateAvatarPreview(
            container.querySelector('.avatar'),
            selects.skinSelect,
            selects.hairStyleSelect,
            selects.hairColorSelect,
            selects.shirtStyleSelect,
            selects.shirtColorSelect
        );
    });
}

function addShirtSelection(container, selects) {
    // Shirt style
    const shirtStyleLabel = document.createElement('label');
    shirtStyleLabel.textContent = 'Shirt Style: ';    const shirtStyleSelect = document.createElement('select');
    shirtStyleSelect.name = 'shirt-style';
    const shirtStyleImages = ['shirt_hoodie', 'shirt_jacket', 'shirt_scarf', 'shirt_vest'];
    populateImageSelect(shirtStyleSelect, shirtStyleImages);
    shirtStyleLabel.appendChild(shirtStyleSelect);
    container.appendChild(shirtStyleLabel);

    // Shirt color
    const shirtColourLabel = document.createElement('label');
    shirtColourLabel.textContent = 'Shirt Colour: ';    const shirtColourSelect = document.createElement('select');
    shirtColourSelect.name = 'shirt-color';
    const shirtColourImages = ['red.png', 'yellow.png', 'green.png', 'blue.png'];
    populateImageSelect(shirtColourSelect, shirtColourImages);
    shirtColourLabel.appendChild(shirtColourSelect);
    container.appendChild(shirtColourLabel);

    selects.shirtStyleSelect = shirtStyleSelect;
    selects.shirtColorSelect = shirtColourSelect;
    
    // Add change listeners for preview update
    shirtStyleSelect.addEventListener('change', () => {
        updateAvatarPreview(
            container.querySelector('.avatar'),
            selects.skinSelect,
            selects.hairStyleSelect,
            selects.hairColorSelect,
            selects.shirtStyleSelect,
            selects.shirtColorSelect
        );
    });
    
    shirtColourSelect.addEventListener('change', () => {
        updateAvatarPreview(
            container.querySelector('.avatar'),
            selects.skinSelect,
            selects.hairStyleSelect,
            selects.hairColorSelect,
            selects.shirtStyleSelect,
            selects.shirtColorSelect
        );
    });
}

function populateImageSelect(select, images) {
    images.forEach((image, index) => {
        const option = document.createElement('option');
        option.value = image;
        option.textContent = image.split('.')[0].replace(/_/g, ' ');
        select.appendChild(option);
    });
    select.selectedIndex = Math.floor(Math.random() * images.length);
}

function addAvatarPreview(container) {
    const avatarPreviewContainer = document.createElement('div');
    avatarPreviewContainer.className = 'avatar';
    avatarPreviewContainer.style.position = 'relative';

    const avatarPreview = document.createElement('div');
    avatarPreview.className = 'avatar-preview';
    avatarPreview.style.position = 'relative';
    avatarPreview.style.width = '100px';
    avatarPreview.style.height = '100px';

    container.appendChild(avatarPreviewContainer);
    avatarPreviewContainer.appendChild(avatarPreview);
    return avatarPreviewContainer;
}

function updateAvatarPreview(container, skinSelect, hairStyleSelect, hairColorSelect, shirtStyleSelect, shirtColorSelect) {
    // Find the preview div inside the container
    const previewDiv = container.querySelector('.avatar-preview');
    if (!previewDiv) {
        console.error('Avatar preview container not found');
        return;
    }
    
    // Clear existing preview images
    previewDiv.innerHTML = '';

    // Style for all images - original styling
    const commonStyle = {
        position: 'absolute',
        width: '88px',
        height: '88px',
        left: '162px',
        imageRendering: 'pixelated'
    };    // Create and add preview images in order
    const images = [
        // Hair outline
        {
            src: `images/hair/outline_${hairStyleSelect.value}.png`,
            alt: 'Hair outline'
        },
        // Shirt outline
        {
            src: `images/shirts/outline_${shirtStyleSelect.value}.png`,
            alt: 'Shirt outline'
        },
        // Skin layer
        {
            src: `images/skin/${skinSelect.value || 'skin_light.png'}`,
            alt: 'Character skin'
        },
        // Colored hair
        {
            src: `images/hair/${hairStyleSelect.value}_${hairColorSelect.value}`,
            alt: 'Hair color'
        },
        // Colored shirt
        {
            src: `images/shirts/${shirtStyleSelect.value}_${shirtColorSelect.value}`,
            alt: 'Shirt color'
        }
    ];

    // Add all images with proper styling
    images.forEach(({src, alt}) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        Object.assign(img.style, commonStyle);
        previewDiv.appendChild(img);
    });
}

async function addPlayer() {
    try {
        // If we don't have any remaining names, fetch more
        if (!context.remainingNames || context.remainingNames.length === 0) {
            await fetchNames(10);
            if (!context.remainingNames || context.remainingNames.length === 0) {
                await fetchNames(10); // Try one more time if first attempt failed
            }
        }
        
        // Get a random name
        const firstName = context.remainingNames && context.remainingNames.length > 0 ? 
            context.remainingNames.shift() : 
            "Survivor";

        // Generate random attributes
        const skinImages = ['skin_dark.png', 'skin_dark-mid.png', 'skin_mid.png', 'skin_light-mid.png', 'skin_light.png'];
        const hairStyleImages = ['hair_long-curly', 'hair_long-straight', 'hair_short-fluffy', 'hair_short-straight'];
        const hairColorImages = ['blonde.png', 'ginger.png', 'brown.png', 'red.png', 'black.png'];
        const shirtStyleImages = ['shirt_hoodie', 'shirt_jacket', 'shirt_scarf', 'shirt_vest'];
        const shirtColorImages = ['red.png', 'yellow.png', 'green.png', 'blue.png'];

        const skin = `images/skin/${skinImages[Math.floor(Math.random() * skinImages.length)]}`;
        const hairStyle = hairStyleImages[Math.floor(Math.random() * hairStyleImages.length)];
        const hairColor = hairColorImages[Math.floor(Math.random() * hairColorImages.length)];
        const shirtStyle = shirtStyleImages[Math.floor(Math.random() * shirtStyleImages.length)];
        const shirtColor = shirtColorImages[Math.floor(Math.random() * shirtColorImages.length)];

        // Create the full image paths as strings
        const hair = `images/hair/${hairStyle}_${hairColor}`;
        const shirt = `images/shirts/${shirtStyle}_${shirtColor}`;

        // Random age from ageArray
        const age = Math.floor(Math.random() * ageArray.length);

        // Random traits
        const posTrait = posTraits[Math.floor(Math.random() * posTraits.length)][0];
        const negTrait = negTraits[Math.floor(Math.random() * negTraits.length)][0];

        // Create and add the character
        const newCharacter = new Character(firstName, age, posTrait, negTrait, skin, hair, shirt);
        context.gameParty.addCharacter(newCharacter);
        // Track new party member with their name and current turn
        recordNewPartyMember(firstName, context.turnNumber);
        
        // Create UI elements for the character
        newCharacter.createCharacter();
        newCharacter.updateCharacter();
        updateStatBars(newCharacter);
    }
    catch (error) {
        console.error(error);
    }
}

export function foundFriend() {
    // Hide the play button when friend event starts
    setPlayButton('hide');
    
    const friendDiv = document.createElement('div');
    const flavourText = newCharacterFlavour[Math.floor(Math.random() * newCharacterFlavour.length)];
    friendDiv.textContent = `You are approached by an adventurer who wants to join your party. ${flavourText}`;
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.addEventListener('click', async () => {
        await addPlayer();
        const newMember = context.gameParty.characters[context.gameParty.characters.length - 1];
        
        // 60% chance to bring an item
        if (Math.random() < 0.6) {
            const itemType = Math.random();
            let itemMessage = "";
            
            if (itemType <= 0.4) {                // 40% chance for food
                const foodType = food[Math.floor(Math.random() * food.length)];
                const variation = foodType[2][Math.floor(Math.random() * foodType[2].length)];
                addItemToInventory(foodType);
                updateFoodButtons();
                itemMessage = ` They brought ${variation} (${foodType[0]}) with them.`;
            } else if (itemType <= 0.7) {         // 30% chance for medical
                const medicalType = medical[Math.floor(Math.random() * medical.length)];
                addItemToInventory(medicalType);
                updateMedicalButtons();
                itemMessage = ` They brought some medical supplies (${medicalType[0]}) with them.`;
            } else {                // 30% chance for weapon
                const weaponType = weapons[Math.floor(Math.random() * (weapons.length - 1)) + 1];
                // Set the weapon directly to the new member instead of inventory
                newMember.weapon = weapons.indexOf(weaponType);
                newMember.weaponDurability = weaponType[2];
                newMember.updateCharacter();
                itemMessage = ` They brought a ${weaponType[0]} with them.`;
            }
            addEvent(`${newMember.name} has joined the party!${itemMessage}`);
        } else {
            addEvent(`${newMember.name} has joined the party!`);
        }
        
        // Update party inventory display to refresh mini avatars
        context.gameParty.inventory.updateDisplay();

        // make morale of party members go up when a new member joins
        for (const character of context.gameParty.characters) {
            if (character !== newMember) {  // Don't increase new member's morale
                character.morale += 1;
                character.capAttributes();
                updateStatBars(character);
            }
        }

        // Update all dropdowns to include new member and populate their options
        updateFoodButtons();
        updateMedicalButtons();
        updateWeaponButtons();
        updateInteractionButtons();
        updateRelationships();

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
