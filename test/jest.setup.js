import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

// Setup DOM elements needed by game modules before they're imported
// This prevents "document is not defined" errors during module initialization
document.body.innerHTML = `
    <div id="characters"></div>
    <div id="gameButtons"></div>
    <div id="currentEvent"></div>
    <div id="events">
        <div></div>
    </div>
    <div id="buttons">
        <div id="gameButtons">
            <button id="playButton">Play Turn 1</button>
        </div>
    </div>
    <div id="day"></div>
    <div id="content"></div>
    <div id="partyInventory"></div>
    <img id="eventImage" src="" alt="Campsite" />
`;