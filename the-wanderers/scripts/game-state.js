const context = {
    gameParty: null,
    remainingNames: [],
    turnNumber: 1
};

export function setGameParty(gameParty) {
    context.gameParty = gameParty;
}

export { context };