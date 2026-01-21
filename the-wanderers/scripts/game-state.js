const context = {
    gameParty: null,
    remainingNames: [],
    turnNumber: 1,
    dayNumber: 1,
    timeOfDay: 'day' // 'day' or 'night'
};

export function setGameParty(gameParty) {
    context.gameParty = gameParty;
}

export { context };