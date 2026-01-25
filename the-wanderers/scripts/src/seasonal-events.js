import { context } from '../game-state.js';
import { food } from '../party.js';
import { addEvent, updateStatBars, updateFoodButtons } from './ui.js';
import { addItemToInventory } from './inventory.js';

/**
 * Seasonal events configuration
 * Each event has:
 * - month: 0-11 (January = 0)
 * - day: 1-31
 * - name: Display name for the event
 * - onTrigger: Function to execute when the event occurs
 * - duration: Number of days the event lasts (optional, defaults to 1)
 */
export const SEASONAL_EVENTS = {
    halloween: {
        month: 9,  // October
        day: 31,
        name: "Halloween",
        duration: 1,
        onTrigger: triggerHalloween
    },
    christmas: {
        month: 11, // December
        day: 25,
        name: "Christmas",
        duration: 1,
        onTrigger: triggerChristmas
    },
    newYear: {
        month: 0,  // January
        day: 1,
        name: "New Year's Day",
        duration: 1,
        onTrigger: triggerNewYear
    }
    // Add more seasonal events here as needed
};

// Track which events have triggered this year to avoid repeats
let triggeredEventsThisYear = new Set();
let lastKnownYear = null;

/**
 * Check if any seasonal events should trigger today
 */
export function checkSeasonalEvents() {
    const currentDate = context.currentDate;
    const currentYear = currentDate.getFullYear();
    
    // Reset triggered events if it's a new year
    if (lastKnownYear !== currentYear) {
        triggeredEventsThisYear.clear();
        lastKnownYear = currentYear;
    }
    
    for (const [eventId, event] of Object.entries(SEASONAL_EVENTS)) {
        if (isEventActive(event) && !triggeredEventsThisYear.has(eventId)) {
            triggeredEventsThisYear.add(eventId);
            event.onTrigger();
        }
    }
}

/**
 * Check if a seasonal event is currently active
 * @param {Object} event - The event configuration
 * @returns {boolean}
 */
function isEventActive(event) {
    const currentDate = context.currentDate;
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();
    
    // Check if we're within the event's duration
    for (let i = 0; i < (event.duration || 1); i++) {
        const eventDate = new Date(currentDate.getFullYear(), event.month, event.day + i);
        if (currentMonth === eventDate.getMonth() && currentDay === eventDate.getDate()) {
            return true;
        }
    }
    return false;
}

/**
 * Reset seasonal event tracking (useful for testing or new games)
 */
export function resetSeasonalEvents() {
    triggeredEventsThisYear.clear();
    lastKnownYear = null;
}

// ==================== HALLOWEEN EVENT ====================

const HALLOWEEN_ZOMBIE_DESCRIPTIONS = [
    'A zombie dressed as a vampire lurches toward the camp!',
    'A zombie in a tattered witch costume stumbles out of the darkness!',
    'A zombie wearing a pumpkin on its head shambles nearby!',
    'A zombie in a skeleton costume groans menacingly!',
    'A zombie dressed as a mummy (or maybe just wrapped in toilet paper) approaches!',
    'A zombie wearing a superhero cape trips over itself toward you!',
    'A zombie with fake fangs and a cape - a vampire zombie - appears!',
    'A zombie in a princess dress emerges from the shadows!',
    'A zombie wearing cat ears and drawn-on whiskers hisses at the party!'
];

const HALLOWEEN_CANDY = [
    'a bag of candy corn',
    'some chocolate bars',
    'a handful of lollipops',
    'some gummy worms',
    'a box of candy skulls',
    'some pumpkin-shaped candies',
    'a bag of caramel apples'
];

/**
 * Trigger Halloween event
 */
function triggerHalloween() {
    addEvent('🎃 It\'s Halloween! The night feels especially eerie...');
    
    // Give each party member a candy treat (counts as dessert)
    const dessert = food.find(f => f[0] === 'dessert');
    if (dessert && context.gameParty) {
        for (const character of context.gameParty.characters) {
            const candy = HALLOWEEN_CANDY[Math.floor(Math.random() * HALLOWEEN_CANDY.length)];
            addEvent(`${character.name} found ${candy} hidden in their bag!`);
            addItemToInventory(dessert);
        }
        updateFoodButtons();
        context.gameParty.inventory.updateDisplay();
    }
    
    // Morale boost for the whole party - they're enjoying the spooky atmosphere!
    if (context.gameParty) {
        for (const character of context.gameParty.characters) {
            character.morale += 1;
            character.capAttributes();
            updateStatBars(character);
        }
        if (context.gameParty.characters.length === 1) {
            addEvent(`${context.gameParty.characters[0].name} enjoys the spooky atmosphere!`);
        } else {
            addEvent('The party enjoys the spooky atmosphere!');
        }
    }
    
    // Note: Combat encounters on Halloween will use HALLOWEEN_ZOMBIE_DESCRIPTIONS
    // This is handled by checking isHalloween() in the combat module
}

/**
 * Check if it's currently Halloween (for use by other modules like combat)
 * @returns {boolean}
 */
export function isHalloween() {
    const currentDate = context.currentDate;
    return currentDate.getMonth() === 9 && currentDate.getDate() === 31;
}

/**
 * Get a Halloween-themed zombie description for combat
 * @returns {string}
 */
export function getHalloweenZombieDescription() {
    return HALLOWEEN_ZOMBIE_DESCRIPTIONS[Math.floor(Math.random() * HALLOWEEN_ZOMBIE_DESCRIPTIONS.length)];
}

// ==================== CHRISTMAS EVENT ====================

/**
 * Trigger Christmas event (placeholder for future implementation)
 */
function triggerChristmas() {
    addEvent('🎄 Merry Christmas! Even in the apocalypse, the holiday spirit persists...');
    
    // Give gifts and morale boost
    if (context.gameParty) {
        for (const character of context.gameParty.characters) {
            character.morale += 2;
            character.capAttributes();
            updateStatBars(character);
        }
        
        // Give the party some food supplies
        const meal = food.find(f => f[0] === 'meal');
        if (meal) {
            if (context.gameParty.characters.length === 1) {
                addEvent(`${context.gameParty.characters[0].name} found a Christmas feast!`);
            } else {
                addEvent('The party found a Christmas feast!');
            }
            addItemToInventory(meal);
            addItemToInventory(meal);
            updateFoodButtons();
            context.gameParty.inventory.updateDisplay();
        }
    }
}

// ==================== NEW YEAR EVENT ====================

/**
 * Trigger New Year event (placeholder for future implementation)
 */
function triggerNewYear() {
    const year = context.currentDate.getFullYear();
    addEvent(`🎆 Happy New Year ${year}! A time for new beginnings...`);
    
    // Full morale boost for the whole party
    if (context.gameParty) {
        for (const character of context.gameParty.characters) {
            character.morale += 1;
            character.capAttributes();
            updateStatBars(character);
        }
        if (context.gameParty.characters.length === 1) {
            addEvent(`${context.gameParty.characters[0].name} feels hopeful about the new year!`);
        } else {
            addEvent('The party feels hopeful about the new year!');
        }
    }
}
