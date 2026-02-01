/**
 * Discord Renderer - Discord.js based game interface
 * Uses embeds, buttons, and select menus for interaction
 */

import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    ComponentType
} from 'discord.js';
import { Renderer } from '../core/renderer.interface.js';
import { 
    hungerArray, healthArray, moraleArray, ageArray, 
    weapons, posTraits, negTraits, relationships, relationshipEmojis 
} from '../core/constants.js';

export class DiscordRenderer extends Renderer {
    /**
     * @param {TextChannel} channel - Discord channel to send messages to
     * @param {Map<string, User>} players - Map of playerId to Discord User
     */
    constructor(channel, players = new Map()) {
        super();
        this.channel = channel;
        this.players = players;
        this.eventBuffer = [];
        this.lastMessage = null;
    }

    /**
     * Set the channel for rendering
     * @param {TextChannel} channel
     */
    setChannel(channel) {
        this.channel = channel;
    }

    async displayEvent(text, style = { type: 'normal' }) {
        let emoji = '';
        switch (style.type) {
            case 'danger': emoji = '⚠️ '; break;
            case 'warning': emoji = '⚡ '; break;
            case 'success': emoji = '✅ '; break;
            case 'info': emoji = 'ℹ️ '; break;
        }
        this.eventBuffer.push(emoji + text);
        
        // Flush if buffer gets large
        if (this.eventBuffer.length >= 10) {
            await this.flushEvents();
        }
    }

    async flushEvents() {
        if (this.eventBuffer.length === 0) return;
        
        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setDescription(this.eventBuffer.join('\n'));
        
        await this.channel.send({ embeds: [embed] });
        this.eventBuffer = [];
    }

    async displayEvents(events) {
        for (const event of events) {
            await this.displayEvent(event.text, event.style);
        }
        await this.flushEvents();
    }

    async promptChoice(prompt, options, config = {}) {
        await this.flushEvents();
        
        const playerId = config.playerId;
        const timeout = config.timeout || 60000;

        // Use buttons for small number of options, select menu for many
        if (options.length <= 5) {
            return await this.promptButtonChoice(prompt, options, playerId, timeout);
        } else {
            return await this.promptSelectChoice(prompt, options, playerId, timeout);
        }
    }

    async promptButtonChoice(prompt, options, playerId, timeout) {
        const row = new ActionRowBuilder();
        
        for (const opt of options) {
            const button = new ButtonBuilder()
                .setCustomId(opt.id)
                .setLabel(opt.label.substring(0, 80))
                .setStyle(opt.id === 'cancel' ? ButtonStyle.Secondary : ButtonStyle.Primary)
                .setDisabled(opt.disabled || false);
            row.addComponents(button);
        }

        const message = await this.channel.send({
            content: playerId ? `<@${playerId}> ${prompt}` : prompt,
            components: [row]
        });

        try {
            const filter = playerId 
                ? i => i.user.id === playerId
                : i => true;
            
            const interaction = await message.awaitMessageComponent({
                filter,
                componentType: ComponentType.Button,
                time: timeout
            });

            await interaction.deferUpdate();
            await message.edit({ components: [] });
            
            return interaction.customId;
        } catch (error) {
            await message.edit({ components: [] });
            throw new Error('Selection timed out');
        }
    }

    async promptSelectChoice(prompt, options, playerId, timeout) {
        const select = new StringSelectMenuBuilder()
            .setCustomId('choice')
            .setPlaceholder('Choose an option...')
            .addOptions(options.map(opt => ({
                label: opt.label.substring(0, 100),
                value: opt.id,
                description: opt.description?.substring(0, 100),
                default: false
            })));

        const row = new ActionRowBuilder().addComponents(select);

        const message = await this.channel.send({
            content: playerId ? `<@${playerId}> ${prompt}` : prompt,
            components: [row]
        });

        try {
            const filter = playerId 
                ? i => i.user.id === playerId
                : i => true;
            
            const interaction = await message.awaitMessageComponent({
                filter,
                componentType: ComponentType.StringSelect,
                time: timeout
            });

            await interaction.deferUpdate();
            await message.edit({ components: [] });
            
            return interaction.values[0];
        } catch (error) {
            await message.edit({ components: [] });
            throw new Error('Selection timed out');
        }
    }

    async promptConfirm(prompt, config = {}) {
        const result = await this.promptChoice(prompt, [
            { id: 'yes', label: 'Yes' },
            { id: 'no', label: 'No' }
        ], config);
        return result === 'yes';
    }

    async promptInput(prompt, config = {}) {
        await this.flushEvents();
        
        const playerId = config.playerId;
        const timeout = config.timeout || 60000;

        await this.channel.send(playerId ? `<@${playerId}> ${prompt}` : prompt);

        try {
            const filter = playerId
                ? m => m.author.id === playerId
                : m => true;
            
            const collected = await this.channel.awaitMessages({
                filter,
                max: 1,
                time: timeout
            });

            const message = collected.first();
            return message?.content || config.default || '';
        } catch (error) {
            return config.default || '';
        }
    }

    async updateStats(character) {
        // Stats shown in party status embed
    }

    /**
     * Silent refresh of party UI after character death
     * Discord shows compact updates in the event flow
     */
    async refreshPartyUI(characters, inventory) {
        // No-op for Discord - updates appear in event flow
    }

    async displayPartyStatus(characters) {
        await this.flushEvents();
        
        const embed = new EmbedBuilder()
            .setTitle('🏕️ Party Status')
            .setColor(0x3498DB);

        for (const char of characters) {
            const healthBar = this.createBar(char.health, 9);
            const hungerBar = this.createBar(Math.round(char.hunger), 9);
            const moraleBar = this.createBar(char.morale, 9);
            
            let status = '';
            if (char.sick) status += '🤒 ';
            if (char.infected) status += '☣️ ';

            const weaponText = char.weapon > 0 
                ? `${weapons[char.weapon][0]} (${char.weaponDurability}/${weapons[char.weapon][2]})`
                : 'Fists';

            embed.addFields({
                name: `${status}${char.name} (${ageArray[char.age]})`,
                value: [
                    `❤️ Health: ${healthBar} ${healthArray[char.health]}`,
                    `🍖 Hunger: ${hungerBar} ${hungerArray[Math.round(char.hunger)]}`,
                    `😊 Morale: ${moraleBar} ${moraleArray[char.morale]}`,
                    `⚔️ Weapon: ${weaponText}`,
                    `✨ ${char.posTrait} / 💔 ${char.negTrait}`
                ].join('\n'),
                inline: true
            });
        }

        await this.channel.send({ embeds: [embed] });
    }

    createBar(value, max) {
        const filled = Math.round((value / max) * 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    async displayInventory(inventory, party = null) {
        await this.flushEvents();
        
        const embed = new EmbedBuilder()
            .setTitle('🎒 Party Inventory')
            .setColor(0xE67E22);

        const categories = inventory.getItemsByCategory();
        
        if (categories.food.length > 0) {
            embed.addFields({
                name: '🍗 Food',
                value: categories.food.map(i => `${i.name} x${i.quantity} (+${i.value})`).join('\n'),
                inline: true
            });
        }
        
        if (categories.medical.length > 0) {
            embed.addFields({
                name: '🩹 Medical',
                value: categories.medical.map(i => `${i.name} x${i.quantity} (+${i.value})`).join('\n'),
                inline: true
            });
        }
        
        if (categories.weapons.length > 0) {
            embed.addFields({
                name: '⚔️ Weapons',
                value: categories.weapons.map(i => {
                    const w = weapons.find(w => w[0] === i.name);
                    return `${i.name} x${i.quantity} (DMG: ${w[1]})`;
                }).join('\n'),
                inline: true
            });
        }

        if (inventory.isEmpty()) {
            embed.setDescription('*Your inventory is empty*');
        }

        await this.channel.send({ embeds: [embed] });
    }

    async notifyPlayerTurn(playerId, characterName, combatState) {
        await this.flushEvents();
        await this.channel.send(`<@${playerId}> **${characterName}'s turn!**`);
    }

    async promptAttackTarget(playerId, characterName, enemies) {
        return await this.promptChoice(
            `Choose target for **${characterName}**:`,
            enemies,
            { playerId }
        );
    }

    async displayCombat(combatState) {
        await this.flushEvents();
        
        const embed = new EmbedBuilder()
            .setTitle('⚔️ COMBAT')
            .setColor(0xE74C3C);

        // Enemies
        const enemyLines = combatState.enemies
            .filter(e => e.hp > 0)
            .map(e => `👹 ${e.type} ${this.createBar(e.hp, 8)} (${e.hp} HP)`);
        
        if (enemyLines.length > 0) {
            embed.addFields({ name: 'Enemies', value: enemyLines.join('\n'), inline: false });
        }

        // Party
        const partyLines = combatState.players
            .filter(p => p.character.health > 0)
            .map(p => `🧑 ${p.name} ${this.createBar(p.character.health, 9)} (${p.character.health} HP)`);
        
        if (partyLines.length > 0) {
            embed.addFields({ name: 'Party', value: partyLines.join('\n'), inline: false });
        }

        await this.channel.send({ embeds: [embed] });
    }

    async handleGameOver(stats) {
        await this.flushEvents();
        
        const embed = new EmbedBuilder()
            .setTitle('💀 GAME OVER')
            .setDescription('Your party has fallen. Here are your final stats:')
            .setColor(0x992D22)
            .addFields(
                { name: '\u200B', value: '**Combat Stats**', inline: false },
                { name: '🧟 Zombies Killed', value: String(stats.zombiesKilled), inline: true },
                { name: '⚔️ Favourite Weapon', value: stats.favouriteWeapon || 'None', inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, // Spacer for alignment
                { name: '\u200B', value: '**Party Stats**', inline: false },
                { name: '👥 Party Members', value: String(stats.totalPartyMembers), inline: true },
                { name: '🍖 Food Eaten', value: String(stats.foodEaten), inline: true },
                { name: '💊 Medical Used', value: String(stats.medicalUsed), inline: true }
            );

        if (stats.longestSurvivor.name) {
            embed.addFields(
                { name: '\u200B', value: '\u200B', inline: false }, // Spacer
                { name: '🏆 Longest Survivor', value: `**${stats.longestSurvivor.name}** survived for **${stats.longestSurvivor.turns}** turns`, inline: false }
            );
        }

        await this.channel.send({ embeds: [embed] });
    }

    async updateTurnDisplay(turnNumber, timeOfDay, formattedDate) {
        await this.flushEvents();
        
        const timeEmoji = timeOfDay === 'day' ? '☀️' : '🌙';
        const embed = new EmbedBuilder()
            .setTitle(`${timeEmoji} Turn ${turnNumber} - ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}`)
            .setDescription(`📅 ${formattedDate}`)
            .setColor(timeOfDay === 'day' ? 0xF1C40F : 0x34495E);

        await this.channel.send({ embeds: [embed] });
    }

    async promptCharacterCreation(availableNames, playerId = null) {
        // Longer timeout for character creation (2 minutes per selection)
        const creationTimeout = 120000;
        
        // Age
        const age = await this.promptChoice('Select age category:', [
            { id: '0', label: 'Teen', description: 'Morale boost chance' },
            { id: '1', label: 'Adult', description: 'Balanced stats' },
            { id: '2', label: 'Elder', description: 'Experience but fragile' }
        ], { playerId, timeout: creationTimeout });

        // Calculate birth year based on age category (same logic as game-engine)
        const currentYear = new Date().getFullYear();
        let birthYear;
        switch (parseInt(age)) {
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

        // Birth month
        const months = [
            { id: '0', label: 'January' }, { id: '1', label: 'February' },
            { id: '2', label: 'March' }, { id: '3', label: 'April' },
            { id: '4', label: 'May' }, { id: '5', label: 'June' },
            { id: '6', label: 'July' }, { id: '7', label: 'August' },
            { id: '8', label: 'September' }, { id: '9', label: 'October' },
            { id: '10', label: 'November' }, { id: '11', label: 'December' }
        ];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const birthMonth = await this.promptChoice('Select birth month:', months, { playerId, timeout: creationTimeout });
        const monthNum = parseInt(birthMonth);

        // Birth day - split into two selections with smart options based on month and first selection
        // Days in each month (0-indexed): Jan=31, Feb=28/29, Mar=31, Apr=30, May=31, Jun=30, Jul=31, Aug=31, Sep=30, Oct=31, Nov=30, Dec=31
        const monthsWith30Days = [3, 5, 8, 10]; // April, June, September, November (0-indexed)
        const isFebruary = monthNum === 1;
        const has30Days = monthsWith30Days.includes(monthNum);
        
        let birthDay;
        while (true) {
            // Build day range options based on month
            const dayRangeOptions = [
                { id: '0', label: 'Days 1-9' },
                { id: '1', label: 'Days 10-19' },
                { id: '2', label: isFebruary ? 'Days 20-28/29' : 'Days 20-29' }
            ];
            
            // Only show 30-31 option for months that have those days
            if (!isFebruary) {
                if (has30Days) {
                    dayRangeOptions.push({ id: '3', label: 'Day 30' });
                } else {
                    dayRangeOptions.push({ id: '3', label: 'Days 30-31' });
                }
            }
            
            const tens = await this.promptChoice('Select birth day range:', dayRangeOptions, { playerId, timeout: creationTimeout });
            
            // Build day options showing full day numbers
            let dayOptions;
            const tensNum = parseInt(tens);
            if (tensNum === 0) {
                // Days 1-9
                dayOptions = [
                    { id: '1', label: '1' }, { id: '2', label: '2' },
                    { id: '3', label: '3' }, { id: '4', label: '4' },
                    { id: '5', label: '5' }, { id: '6', label: '6' },
                    { id: '7', label: '7' }, { id: '8', label: '8' },
                    { id: '9', label: '9' }
                ];
            } else if (tensNum === 1) {
                // Days 10-19
                dayOptions = [
                    { id: '10', label: '10' }, { id: '11', label: '11' },
                    { id: '12', label: '12' }, { id: '13', label: '13' },
                    { id: '14', label: '14' }, { id: '15', label: '15' },
                    { id: '16', label: '16' }, { id: '17', label: '17' },
                    { id: '18', label: '18' }, { id: '19', label: '19' }
                ];
            } else if (tensNum === 2) {
                // Days 20-29 (or 20-28/29 for February)
                if (isFebruary) {
                    // February: 20-28, plus 29 for leap years (we'll validate later)
                    dayOptions = [
                        { id: '20', label: '20' }, { id: '21', label: '21' },
                        { id: '22', label: '22' }, { id: '23', label: '23' },
                        { id: '24', label: '24' }, { id: '25', label: '25' },
                        { id: '26', label: '26' }, { id: '27', label: '27' },
                        { id: '28', label: '28' }, { id: '29', label: '29 (leap year)' }
                    ];
                } else {
                    dayOptions = [
                        { id: '20', label: '20' }, { id: '21', label: '21' },
                        { id: '22', label: '22' }, { id: '23', label: '23' },
                        { id: '24', label: '24' }, { id: '25', label: '25' },
                        { id: '26', label: '26' }, { id: '27', label: '27' },
                        { id: '28', label: '28' }, { id: '29', label: '29' }
                    ];
                }
            } else {
                // Days 30-31 (or just 30 for 30-day months)
                if (has30Days) {
                    dayOptions = [
                        { id: '30', label: '30' }
                    ];
                } else {
                    dayOptions = [
                        { id: '30', label: '30' },
                        { id: '31', label: '31' }
                    ];
                }
            }
            
            const selectedDay = await this.promptChoice('Select birth day:', dayOptions, { playerId, timeout: creationTimeout });
            
            birthDay = parseInt(selectedDay);
            
            // Validate the full date using JavaScript Date object
            // Date constructor: month is 0-indexed, so birthMonth is already correct
            const testDate = new Date(birthYear, parseInt(birthMonth), birthDay);
            const isValidDate = testDate.getFullYear() === birthYear &&
                                testDate.getMonth() === parseInt(birthMonth) &&
                                testDate.getDate() === birthDay;
            
            if (!isValidDate) {
                const monthName = monthNames[parseInt(birthMonth)];
                await this.displayEvent(`${monthName} ${birthDay}, ${birthYear} is not a valid date. Please select again.`, { type: 'warning' });
                continue;
            }
            break;
        }

        // Positive trait
        const posTrait = await this.promptChoice('Select positive trait:',
            posTraits.map(t => ({
                id: t[0],
                label: t[0],
                description: t[1]
            })),
            { playerId, timeout: creationTimeout }
        );

        // Negative trait  
        const negTrait = await this.promptChoice('Select negative trait:',
            negTraits.map(t => ({
                id: t[0],
                label: t[0],
                description: t[1]
            })),
            { playerId, timeout: creationTimeout }
        );

        return {
            age: parseInt(age),
            birthMonth: parseInt(birthMonth),
            birthDay: birthDay,
            birthYear: birthYear,
            posTrait,
            negTrait,
            playerId
        };
    }

    async notifyReadyState(readyState, readyCount, totalPlayers) {
        await this.flushEvents();
        
        const lines = [];
        for (const [playerId, isReady] of readyState) {
            const player = this.players.get(playerId);
            const name = player?.displayName || playerId;
            lines.push(`${isReady ? '✅' : '⏳'} ${name}`);
        }

        const embed = new EmbedBuilder()
            .setTitle(`Ready Check (${readyCount}/${totalPlayers})`)
            .setDescription(lines.join('\n'))
            .setColor(readyCount === totalPlayers ? 0x2ECC71 : 0xF39C12);

        await this.channel.send({ embeds: [embed] });
    }

    async clearTurn() {
        // Discord doesn't need clearing
    }

    async initialize() {
        const embed = new EmbedBuilder()
            .setTitle('🏕️ THE WANDERERS')
            .setDescription('A survival text adventure begins...')
            .setColor(0x2ECC71);
        
        await this.channel.send({ embeds: [embed] });
    }

    async dispose() {
        await this.flushEvents();
    }
}

export default DiscordRenderer;
