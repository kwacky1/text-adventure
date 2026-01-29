/**
 * Discord Bot for The Wanderers
 * Multiplayer survival text adventure
 */

import { 
    Client, 
    Events,
    GatewayIntentBits, 
    SlashCommandBuilder,
    REST,
    Routes,
    Collection
} from 'discord.js';
import { GameSession, GameEngine } from '../core/index.js';
import { weapons } from '../core/constants.js';
import { SessionManager } from './session-manager.js';
import { DiscordRenderer } from './discord-renderer.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // Optional: for testing

if (!TOKEN || !CLIENT_ID) {
    console.error('Missing DISCORD_TOKEN or CLIENT_ID environment variables');
    process.exit(1);
}

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize managers
const sessionManager = new SessionManager(join(dataDir, 'sessions.db'));
const engines = new Map(); // channelId -> GameEngine

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start a new game of The Wanderers'),
    
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Join an active game'),
    
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the current game'),
    
    new SlashCommandBuilder()
        .setName('ready')
        .setDescription('Mark yourself as ready for the next turn'),
    
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Advance to the next turn (host only, or when all ready)'),
    
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('View party status'),
    
    new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View and use inventory items'),
    
    new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use an item on a character')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to use')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('character')
                .setDescription('Character to use item on')
                .setRequired(true)
                .setAutocomplete(true)),
    
    new SlashCommandBuilder()
        .setName('interact')
        .setDescription('Have your character talk to another party member')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Character to talk to')
                .setRequired(true)
                .setAutocomplete(true)),
    
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View game statistics'),
    
    new SlashCommandBuilder()
        .setName('end')
        .setDescription('End the current game (host only)')
];

// Register commands
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    try {
        console.log('Registering slash commands...');
        
        if (GUILD_ID) {
            // Guild commands (instant, for testing)
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
        } else {
            // Global commands (can take up to an hour)
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands }
            );
        }
        
        console.log('Slash commands registered!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Get or create engine for a channel
function getEngine(channelId, channel) {
    if (engines.has(channelId)) {
        return engines.get(channelId);
    }
    
    const session = sessionManager.getSession(channelId);
    if (!session) return null;
    
    const renderer = new DiscordRenderer(channel);
    const engine = new GameEngine(session, renderer);
    engines.set(channelId, engine);
    
    return engine;
}

/**
 * Get channel from interaction, fetching if not cached
 */
async function getChannel(interaction) {
    return interaction.channel || await client.channels.fetch(interaction.channelId);
}

// Autocomplete handler for /use and /interact commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isAutocomplete()) return;
    
    const { commandName, channelId, user, options } = interaction;
    const session = sessionManager.getSession(channelId);
    
    if (!session) {
        await interaction.respond([]);
        return;
    }
    
    try {
        const focusedOption = options.getFocused(true);
        
        if (commandName === 'use') {
            if (focusedOption.name === 'item') {
                // Get items organized by category with values
                const categories = session.party.inventory.getItemsByCategory();
                const choices = [];
                
                // Food items
                for (const item of categories.food) {
                    choices.push({
                        name: `🍖 ${item.name} x${item.quantity} (+${item.value} hunger)`,
                        value: item.name
                    });
                }
                
                // Medical items
                for (const item of categories.medical) {
                    choices.push({
                        name: `💊 ${item.name} x${item.quantity} (+${item.value} health)`,
                        value: item.name
                    });
                }
                
                // Weapon items - look up damage from constants
                for (const item of categories.weapons) {
                    const weaponDef = weapons.find(w => w[0] === item.name);
                    const damage = weaponDef ? weaponDef[1] : '?';
                    choices.push({
                        name: `⚔️ ${item.name} x${item.quantity} (DMG: ${damage})`,
                        value: item.name
                    });
                }
                
                // Filter by what user has typed
                const filtered = choices.filter(choice =>
                    choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                ).slice(0, 25); // Discord max 25 choices
                
                await interaction.respond(filtered);
            } else if (focusedOption.name === 'character') {
                // Get user's own character first (default), then others
                const userCharacter = session.party.characters.find(c => c.playerId === user.id);
                const choices = [];
                
                if (userCharacter) {
                    choices.push({
                        name: `${userCharacter.name} (you)`,
                        value: userCharacter.name
                    });
                }
                
                for (const char of session.party.characters) {
                    if (char.playerId !== user.id) {
                        choices.push({
                            name: char.name,
                            value: char.name
                        });
                    }
                }
                
                const filtered = choices.filter(choice =>
                    choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                ).slice(0, 25);
                
                await interaction.respond(filtered);
            }
        } else if (commandName === 'interact') {
            if (focusedOption.name === 'target') {
                // Get other characters (not self)
                const userCharacter = session.party.characters.find(c => c.playerId === user.id);
                const choices = session.party.characters
                    .filter(c => c !== userCharacter)
                    .map(c => ({
                        name: c.name,
                        value: c.name
                    }));
                
                const filtered = choices.filter(choice =>
                    choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                ).slice(0, 25);
                
                await interaction.respond(filtered);
            }
        }
    } catch (error) {
        console.error('Autocomplete error:', error);
        await interaction.respond([]);
    }
});

// Command handlers
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName, channelId, user, channel } = interaction;
    
    try {
        switch (commandName) {
            case 'start':
                await handleStart(interaction);
                break;
            case 'join':
                await handleJoin(interaction);
                break;
            case 'leave':
                await handleLeave(interaction);
                break;
            case 'ready':
                await handleReady(interaction);
                break;
            case 'play':
                await handlePlay(interaction);
                break;
            case 'status':
                await handleStatus(interaction);
                break;
            case 'inventory':
                await handleInventory(interaction);
                break;
            case 'use':
                await handleUse(interaction);
                break;
            case 'interact':
                await handleInteract(interaction);
                break;
            case 'stats':
                await handleStats(interaction);
                break;
            case 'end':
                await handleEnd(interaction);
                break;
        }
    } catch (error) {
        console.error(`Error handling ${commandName}:`, error);
        const reply = interaction.replied || interaction.deferred
            ? interaction.followUp.bind(interaction)
            : interaction.reply.bind(interaction);
        await reply({ content: `Error: ${error.message}`, ephemeral: true });
    }
});

async function handleStart(interaction) {
    const { channelId, user } = interaction;
    // Fetch channel if not cached (can be null in slash commands)
    const channel = interaction.channel || await client.channels.fetch(channelId);
    
    if (sessionManager.hasSession(channelId)) {
        await interaction.reply({ content: 'A game is already active in this channel. Use `/end` first.', ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    const session = sessionManager.createSession(channelId, user.id, user.displayName);
    
    // Fetch names from randomuser.me API
    await session.initializeNames();
    
    const renderer = new DiscordRenderer(channel);
    const engine = new GameEngine(session, renderer);
    engines.set(channelId, engine);
    
    await renderer.initialize();
    
    // Create first character for host
    await interaction.followUp(`<@${user.id}> is starting a new game! Create your character:`);
    
    try {
        const characterData = await renderer.promptCharacterCreation([user.displayName], user.id);
        characterData.name = user.displayName;
        characterData.playerId = user.id;
        
        await engine.initializeGame(characterData);
        // Party status is already displayed by initializeGame
        
        await interaction.followUp('Game started! Other players can `/join`. Use `/ready` when ready, then `/play` to advance turns.');
        
        sessionManager.saveSession(channelId, session);
    } catch (error) {
        // Character creation timed out or failed - cleanup
        engines.delete(channelId);
        sessionManager.deleteSession(channelId);
        await interaction.followUp(`Game creation cancelled: ${error.message}. Use \`/start\` to try again.`);
    }
}

async function handleJoin(interaction) {
    const { channelId, user } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel. Use `/start` to begin.', ephemeral: true });
        return;
    }
    
    if (session.party.isFull()) {
        await interaction.reply({ content: 'Party is full (max 4 players).', ephemeral: true });
        return;
    }
    
    if (session.players.has(user.id)) {
        await interaction.reply({ content: 'You are already in this game.', ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    session.addPlayer(user.id, user.displayName);
    
    const engine = getEngine(channelId, channel);
    const renderer = engine.renderer;
    
    await interaction.followUp(`<@${user.id}> is joining! Create your character:`);
    
    try {
        const characterData = await renderer.promptCharacterCreation([user.displayName], user.id);
        characterData.name = user.displayName;
        characterData.playerId = user.id;
        
        const character = engine.createCharacterFromData(characterData);
        session.party.addCharacter(character);
        session.stats.recordNewPartyMember(character.name, session.turnNumber);
        
        await renderer.displayEvent(`${character.name} has joined the party!`, { type: 'success' });
        await renderer.displayPartyStatus(session.party.characters);
        
        sessionManager.saveSession(channelId, session);
    } catch (error) {
        // Character creation timed out or failed - remove player from session
        session.removePlayer(user.id);
        await interaction.followUp(`<@${user.id}> join cancelled: ${error.message}. Use \`/join\` to try again.`);
    }
}

async function handleLeave(interaction) {
    const { channelId, user } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    if (!session.players.has(user.id)) {
        await interaction.reply({ content: 'You are not in this game.', ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    session.removePlayer(user.id);
    
    const engine = getEngine(channelId, channel);
    await engine.renderer.displayPartyStatus(session.party.characters);
    
    await interaction.followUp(`<@${user.id}> has left the game.`);
    
    if (session.party.isEmpty()) {
        sessionManager.deleteSession(channelId);
        engines.delete(channelId);
        await interaction.followUp('The party is empty. Game ended.');
    } else {
        sessionManager.saveSession(channelId, session);
    }
}

async function handleReady(interaction) {
    const { channelId, user } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    if (!session.players.has(user.id)) {
        await interaction.reply({ content: 'You are not in this game.', ephemeral: true });
        return;
    }
    
    const allReady = session.setPlayerReady(user.id, true);
    
    const readyCount = session.readyPlayers.size;
    const totalPlayers = session.players.size;
    
    await interaction.reply(`<@${user.id}> is ready! (${readyCount}/${totalPlayers})`);
    
    if (allReady) {
        await interaction.followUp('All players ready! Use `/play` to advance the turn.');
    }
    
    sessionManager.saveSession(channelId, session);
}

async function handlePlay(interaction) {
    const { channelId, user } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    if (!session.players.has(user.id)) {
        await interaction.reply({ content: 'You are not in this game.', ephemeral: true });
        return;
    }
    
    // Check if in combat or active encounter - can't advance turn
    if (session.inCombat || session.status === 'combat') {
        await interaction.reply({ content: 'Cannot advance turn during combat! Finish the battle first.', ephemeral: true });
        return;
    }
    
    if (session.pendingEncounter) {
        await interaction.reply({ content: 'Cannot advance turn during an encounter! Resolve it first.', ephemeral: true });
        return;
    }
    
    // Check if all ready or host override
    const isSinglePlayer = session.players.size === 1;
    if (!session.areAllPlayersReady()) {
        if (user.id === session.hostId) {
            session.hostOverride(user.id);
            if (!isSinglePlayer) {
                await interaction.reply('Host override - advancing turn!');
            } else {
                await interaction.reply('Advancing turn...');
            }
        } else {
            const readyCount = session.readyPlayers.size;
            const totalPlayers = session.players.size;
            await interaction.reply({ 
                content: `Not all players ready (${readyCount}/${totalPlayers}). Only the host can override.`, 
                ephemeral: true 
            });
            return;
        }
    } else {
        if (!isSinglePlayer) {
            await interaction.reply('All players ready - advancing turn!');
        } else {
            await interaction.reply('Advancing turn...');
        }
    }
    
    const engine = getEngine(channelId, channel);
    
    try {
        await engine.playTurn();
        await engine.renderer.displayPartyStatus(session.party.characters);
        await engine.renderer.displayInventory(session.party.inventory);
        
        if (session.isGameOver()) {
            const stats = session.endGame();
            await engine.renderer.handleGameOver(stats);
            sessionManager.deleteSession(channelId);
            engines.delete(channelId);
        } else {
            sessionManager.saveSession(channelId, session);
        }
    } catch (error) {
        console.error('Error during turn:', error);
        await interaction.followUp(`Error during turn: ${error.message}`);
    }
}

async function handleStatus(interaction) {
    const { channelId } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    const engine = getEngine(channelId, channel);
    await engine.renderer.displayPartyStatus(session.party.characters);
    
    await interaction.followUp('Party status displayed above.');
}

async function handleInventory(interaction) {
    const { channelId } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    const engine = getEngine(channelId, channel);
    await engine.renderer.displayInventory(session.party.inventory);
    
    await interaction.followUp('Use `/use <item> <character>` to use items.');
}

async function handleUse(interaction) {
    const { channelId, user, channel, options } = interaction;
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    if (!session.players.has(user.id)) {
        await interaction.reply({ content: 'You are not in this game.', ephemeral: true });
        return;
    }
    
    const itemName = options.getString('item').toLowerCase();
    const characterName = options.getString('character');
    
    const character = session.party.getCharacterByName(characterName);
    if (!character) {
        await interaction.reply({ content: `Character "${characterName}" not found.`, ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    const engine = getEngine(channelId, channel);
    
    // Try food, medical, then weapon
    let success = await engine.useFood(character, itemName);
    if (!success) {
        success = await engine.useMedical(character, itemName);
    }
    if (!success) {
        success = await engine.equipWeapon(character, itemName);
    }
    
    if (success) {
        await engine.renderer.displayPartyStatus(session.party.characters);
        await interaction.followUp(`Used ${itemName} on ${characterName}!`);
        sessionManager.saveSession(channelId, session);
    } else {
        await interaction.followUp({ content: `Could not use "${itemName}". Check spelling or if it's in inventory.`, ephemeral: true });
    }
}

async function handleInteract(interaction) {
    const { channelId, user, options } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    if (!session.players.has(user.id)) {
        await interaction.reply({ content: 'You are not in this game.', ephemeral: true });
        return;
    }
    
    // Find the user's character
    const userCharacter = session.party.characters.find(c => c.playerId === user.id);
    if (!userCharacter) {
        await interaction.reply({ content: 'Could not find your character.', ephemeral: true });
        return;
    }
    
    if (userCharacter.actionsUsed.interact) {
        await interaction.reply({ content: 'Your character has already interacted this turn.', ephemeral: true });
        return;
    }
    
    const targetName = options.getString('target');
    const target = session.party.getCharacterByName(targetName);
    
    if (!target) {
        await interaction.reply({ content: `Character "${targetName}" not found.`, ephemeral: true });
        return;
    }
    
    if (target === userCharacter) {
        await interaction.reply({ content: 'You cannot talk to yourself!', ephemeral: true });
        return;
    }
    
    if (target.actionsUsed.interact) {
        await interaction.reply({ content: `${target.name} has already interacted this turn.`, ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    const engine = getEngine(channelId, channel);
    const result = await engine.interact(userCharacter, target);
    
    if (result.success) {
        await engine.renderer.displayPartyStatus(session.party.characters);
        await interaction.followUp(`${userCharacter.name} talked to ${target.name}!`);
        sessionManager.saveSession(channelId, session);
    } else {
        await interaction.followUp({ content: `Could not interact: ${result.reason}`, ephemeral: true });
    }
}

async function handleStats(interaction) {
    const { channelId } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    const stats = session.stats.getStats();
    const engine = getEngine(channelId, channel);
    
    // Reuse game over display for stats
    await engine.renderer.handleGameOver(stats);
    await interaction.followUp('Current game statistics displayed above.');
}

async function handleEnd(interaction) {
    const { channelId, user } = interaction;
    const channel = await getChannel(interaction);
    
    const session = sessionManager.getSession(channelId);
    if (!session) {
        await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        return;
    }
    
    if (user.id !== session.hostId) {
        await interaction.reply({ content: 'Only the host can end the game.', ephemeral: true });
        return;
    }
    
    await interaction.deferReply();
    
    const stats = session.endGame();
    const engine = getEngine(channelId, channel);
    await engine.renderer.handleGameOver(stats);
    
    sessionManager.deleteSession(channelId);
    engines.delete(channelId);
    
    await interaction.followUp('Game ended!');
}

// Startup
client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await registerCommands();
    
    // Cleanup stale sessions
    const cleaned = sessionManager.cleanupStaleSessions(24);
    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} stale sessions`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    sessionManager.close();
    client.destroy();
    process.exit(0);
});

// Login
client.login(TOKEN);
