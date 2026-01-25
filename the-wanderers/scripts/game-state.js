// Check for custom start date via URL parameter (e.g., ?startDate=2026-10-31)
function getStartDate() {
    if (typeof window !== 'undefined' && window.location) {
        const urlParams = new URLSearchParams(window.location.search);
        const startDateParam = urlParams.get('startDate');
        if (startDateParam) {
            const parsedDate = new Date(startDateParam);
            if (!isNaN(parsedDate.getTime())) {
                console.log(`Starting game on custom date: ${parsedDate.toDateString()}`);
                return parsedDate;
            }
        }
    }
    return new Date(); // Default to current date
}

const context = {
    gameParty: null,
    remainingNames: [],
    turnNumber: 1,
    timeOfDay: 'day', // 'day' or 'night'
    currentDate: getStartDate() // Game starts on URL param date or current real date
};

export function setGameParty(gameParty) {
    context.gameParty = gameParty;
}

export function advanceDay() {
    const newDate = new Date(context.currentDate);
    newDate.setDate(newDate.getDate() + 1);
    context.currentDate = newDate;
}

export function getFormattedDate() {
    const options = { month: 'short', day: 'numeric' };
    return context.currentDate.toLocaleDateString('en-US', options);
}

export { context };