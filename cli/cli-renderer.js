/**
 * CLI Renderer - Terminal-based game interface
 * Uses inquirer for prompts and chalk for colored output
 */

import { Renderer } from '../core/renderer.interface.js';
import { 
    hungerArray, healthArray, moraleArray, ageArray, 
    weapons, posTraits, negTraits, relationships, relationshipEmojis 
} from '../core/constants.js';

// Dynamic imports for ES modules
let chalk, inquirer;

async function loadDependencies() {
    if (!chalk) {
        const chalkModule = await import('chalk');
        chalk = chalkModule.default;
    }
    if (!inquirer) {
        const inquirerModule = await import('inquirer');
        inquirer = inquirerModule.default;
    }
}

export class CliRenderer extends Renderer {
    constructor() {
        super();
        this.initialized = false;
    }

    async initialize() {
        await loadDependencies();
        this.initialized = true;
        console.clear();
        console.log(chalk.bold.green('═══════════════════════════════════════'));
        console.log(chalk.bold.green('         THE WANDERERS - CLI           '));
        console.log(chalk.bold.green('═══════════════════════════════════════'));
        console.log();
    }

    async displayEvent(text, style = { type: 'normal' }) {
        await loadDependencies();
        
        let formattedText;
        switch (style.type) {
            case 'danger':
                formattedText = chalk.red('⚠ ' + text);
                break;
            case 'warning':
                formattedText = chalk.yellow('⚡ ' + text);
                break;
            case 'success':
                formattedText = chalk.green('✓ ' + text);
                break;
            case 'info':
                formattedText = chalk.cyan('ℹ ' + text);
                break;
            default:
                formattedText = chalk.white('  ' + text);
        }
        console.log(formattedText);
    }

    async displayEvents(events) {
        for (const event of events) {
            await this.displayEvent(event.text, event.style);
        }
    }

    async promptChoice(prompt, options, config = {}) {
        await loadDependencies();
        
        // If options have shortcuts defined, use expand type for letter shortcuts
        if (options.some(opt => opt.shortcut)) {
            return await this.promptWithShortcuts(prompt, options);
        }
        
        const { answer } = await inquirer.prompt([{
            type: 'list',
            name: 'answer',
            message: prompt,
            choices: options.map(opt => ({
                name: opt.description ? `${opt.label} - ${opt.description}` : opt.label,
                value: opt.id,
                disabled: opt.disabled
            }))
        }]);
        return answer;
    }

    /**
     * Prompt with keyboard shortcuts - supports both arrow navigation AND letter shortcuts
     * Custom implementation for best of both worlds
     */
    async promptWithShortcuts(prompt, options) {
        await loadDependencies();
        
        // Build the shortcuts map
        const shortcuts = new Map();
        for (const opt of options) {
            if (!opt.disabled) {
                shortcuts.set(opt.shortcut.toLowerCase(), opt.id);
            }
        }
        
        let selectedIndex = 0;
        const enabledOptions = options.filter(o => !o.disabled);
        
        const render = () => {
            // Move cursor up to overwrite previous render (except first time)
            if (this._shortcutRendered) {
                process.stdout.write(`\x1b[${options.length + 1}A`);
            }
            this._shortcutRendered = true;
            
            console.log(chalk.cyan('? ') + chalk.bold(prompt));
            options.forEach((opt, i) => {
                const key = chalk.yellow(`[${opt.shortcut.toUpperCase()}]`);
                const desc = opt.description ? chalk.gray(` - ${opt.description}`) : '';
                const prefix = i === selectedIndex ? chalk.cyan('❯ ') : '  ';
                if (opt.disabled) {
                    console.log(chalk.gray(`  ${key} ${opt.label}${desc} (disabled)`));
                } else {
                    console.log(`${prefix}${key} ${opt.label}${desc}`);
                }
            });
        };
        
        return new Promise((resolve) => {
            this._shortcutRendered = false;
            render();
            
            const wasRaw = process.stdin.isRaw;
            process.stdin.setRawMode(true);
            process.stdin.resume();
            
            const onKeyPress = (key) => {
                // Handle Ctrl+C
                if (key[0] === 3) {
                    process.stdin.setRawMode(wasRaw);
                    process.exit();
                }
                
                const keyStr = key.toString();
                const char = keyStr.toLowerCase();
                
                // Check for shortcut
                if (shortcuts.has(char)) {
                    process.stdin.removeListener('data', onKeyPress);
                    process.stdin.setRawMode(wasRaw);
                    console.log(); // New line after selection
                    resolve(shortcuts.get(char));
                    return;
                }
                
                // Arrow keys (escape sequences)
                if (keyStr === '\x1b[A') { // Up arrow
                    do {
                        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
                    } while (options[selectedIndex].disabled);
                    render();
                } else if (keyStr === '\x1b[B') { // Down arrow
                    do {
                        selectedIndex = (selectedIndex + 1) % options.length;
                    } while (options[selectedIndex].disabled);
                    render();
                } else if (keyStr === '\r' || keyStr === '\n') { // Enter
                    if (!options[selectedIndex].disabled) {
                        process.stdin.removeListener('data', onKeyPress);
                        process.stdin.setRawMode(wasRaw);
                        console.log(); // New line after selection
                        resolve(options[selectedIndex].id);
                    }
                }
            };
            
            process.stdin.on('data', onKeyPress);
        });
    }

    async promptConfirm(prompt, config = {}) {
        await loadDependencies();
        
        process.stdout.write(chalk.cyan(`${prompt} `) + chalk.yellow('[Y/n] '));
        
        return new Promise((resolve) => {
            const wasRaw = process.stdin.isRaw;
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.once('data', (key) => {
                const char = key.toString().toLowerCase();
                
                // Handle Ctrl+C
                if (key[0] === 3) {
                    process.stdin.setRawMode(wasRaw);
                    process.exit();
                }
                
                process.stdin.setRawMode(wasRaw);
                
                if (char === 'y' || char === '\r' || char === '\n') {
                    console.log(chalk.green('Yes'));
                    resolve(true);
                } else {
                    console.log(chalk.red('No'));
                    resolve(false);
                }
            });
        });
    }

    async promptInput(prompt, config = {}) {
        await loadDependencies();
        
        const promptConfig = {
            type: 'input',
            name: 'answer',
            message: prompt
        };
        
        if (config.default !== undefined) {
            promptConfig.default = config.default;
        }
        if (config.validate !== undefined) {
            promptConfig.validate = config.validate;
        }
        
        const { answer } = await inquirer.prompt([promptConfig]);
        return answer;
    }

    async updateStats(character) {
        // Stats are shown in displayPartyStatus
    }

    /**
     * Display compact party status (one line per character)
     */
    async displayPartyStatusCompact(characters) {
        await loadDependencies();
        
        console.log(chalk.gray('─── Party: ') + characters.map(char => {
            const healthColor = char.health <= 2 ? 'red' : char.health <= 5 ? 'yellow' : 'green';
            const hungerColor = char.hunger <= 2 ? 'red' : char.hunger <= 5 ? 'yellow' : 'green';
            const moraleColor = char.morale <= 2 ? 'red' : char.morale <= 5 ? 'yellow' : 'green';
            return `${char.name} ` + 
                chalk[healthColor]('♥' + char.health) + ' ' +
                chalk[hungerColor]('🍗' + Math.round(char.hunger)) + ' ' +
                chalk[moraleColor]('☺' + char.morale);
        }).join(chalk.gray(' | ')) + chalk.gray(' ───'));
    }

    /**
     * Display compact inventory (single line summary)
     */
    async displayInventoryCompact(inventory) {
        await loadDependencies();
        
        const categories = inventory.getItemsByCategory();
        const parts = [];
        
        const foodCount = categories.food.reduce((sum, item) => sum + item.quantity, 0);
        const medCount = categories.medical.reduce((sum, item) => sum + item.quantity, 0);
        const weaponCount = categories.weapons.reduce((sum, item) => sum + item.quantity, 0);
        
        if (foodCount > 0) parts.push(chalk.yellow(`🍗${foodCount}`));
        if (medCount > 0) parts.push(chalk.cyan(`🩹${medCount}`));
        if (weaponCount > 0) parts.push(chalk.red(`⚔${weaponCount}`));
        
        if (parts.length === 0) {
            console.log(chalk.gray('─── Inventory: Empty ───'));
        } else {
            console.log(chalk.gray('─── Inventory: ') + parts.join(chalk.gray(' ')) + chalk.gray(' ───'));
        }
    }

    async displayPartyStatus(characters) {
        await loadDependencies();
        
        console.log();
        console.log(chalk.bold.blue('─── Party Status ───'));
        
        for (const char of characters) {
            const healthColor = char.health <= 2 ? 'red' : char.health <= 5 ? 'yellow' : 'green';
            const hungerColor = char.hunger <= 2 ? 'red' : char.hunger <= 5 ? 'yellow' : 'green';
            const moraleColor = char.morale <= 2 ? 'red' : char.morale <= 5 ? 'yellow' : 'green';
            
            console.log();
            console.log(chalk.bold.white(`  ${char.name}`) + chalk.gray(` (${ageArray[char.age]})`));
            console.log(
                chalk.gray('  Health: ') + chalk[healthColor](healthArray[char.health]) +
                chalk.gray(' | Hunger: ') + chalk[hungerColor](hungerArray[Math.round(char.hunger)]) +
                chalk.gray(' | Morale: ') + chalk[moraleColor](moraleArray[char.morale])
            );
            console.log(
                chalk.gray('  Weapon: ') + chalk.cyan(weapons[char.weapon][0]) +
                (char.weapon > 0 ? chalk.gray(` (${char.weaponDurability}/${weapons[char.weapon][2]})`) : '')
            );
            console.log(
                chalk.gray('  Traits: ') + chalk.green(char.posTrait) + chalk.gray(' / ') + chalk.red(char.negTrait)
            );
            
            // Relationships
            if (char.relationships.size > 0) {
                const rels = [];
                for (const [other, level] of char.relationships) {
                    rels.push(`${relationshipEmojis[level]} ${other.name}`);
                }
                console.log(chalk.gray('  Relationships: ') + rels.join(', '));
            }
        }
        console.log();
    }

    async displayInventory(inventory) {
        await loadDependencies();
        
        console.log();
        console.log(chalk.bold.blue('─── Inventory ───'));
        
        const categories = inventory.getItemsByCategory();
        
        if (categories.food.length > 0) {
            console.log(chalk.yellow('  🍗 Food:'));
            for (const item of categories.food) {
                console.log(chalk.white(`    ${item.name} x${item.quantity} (+${item.value})`));
            }
        }
        
        if (categories.medical.length > 0) {
            console.log(chalk.cyan('  🩹 Medical:'));
            for (const item of categories.medical) {
                console.log(chalk.white(`    ${item.name} x${item.quantity} (+${item.value})`));
            }
        }
        
        if (categories.weapons.length > 0) {
            console.log(chalk.red('  ⚔ Weapons:'));
            for (const item of categories.weapons) {
                const weaponDef = weapons.find(w => w[0] === item.name);
                console.log(chalk.white(`    ${item.name} x${item.quantity} (Damage: ${weaponDef[1]}, Durability: ${item.value})`));
            }
        }
        
        if (inventory.isEmpty()) {
            console.log(chalk.gray('  Empty'));
        }
        console.log();
    }

    async notifyPlayerTurn(playerId, characterName, combatState) {
        await loadDependencies();
        console.log();
        console.log(chalk.bold.magenta(`>>> ${characterName}'s turn! <<<`));
    }

    async promptCombatAction(playerId, characterName, options) {
        await loadDependencies();
        
        // If no items available and no weapons to equip, skip straight to attack
        if (!options.canUseFood && !options.canUseMedical && !options.canEquipWeapon) {
            return 'attack';
        }
        
        const choices = [
            { id: 'attack', shortcut: 'a', label: 'Attack', description: 'Strike an enemy' }
        ];
        if (options.canEquipWeapon) {
            choices.push({ id: 'weapon', shortcut: 'w', label: 'Equip Weapon', description: 'Swap weapon (free action)' });
        }
        if (options.canUseFood) {
            choices.push({ id: 'food', shortcut: 'f', label: 'Use Food', description: 'Restore hunger' });
        }
        if (options.canUseMedical) {
            choices.push({ id: 'medical', shortcut: 'm', label: 'Use Medical', description: 'Restore health' });
        }
        
        return await this.promptWithShortcuts(`${characterName}'s action:`, choices);
    }

    async promptAttackTarget(playerId, characterName, enemies) {
        return await this.promptChoice(
            `Choose target for ${characterName}:`,
            enemies
        );
    }

    async displayCombat(combatState) {
        await loadDependencies();
        
        console.log();
        console.log(chalk.bold.red('═══════════════════ COMBAT ═══════════════════'));
        
        // Calculate max name length for alignment
        const enemyNames = combatState.enemies.filter(e => e.hp > 0).map(e => 
            combatState.isSurvivorCombat ? `Survivor` : `Zombie`
        );
        const playerNames = combatState.players.filter(p => p.character.health > 0).map(p => p.name);
        const allNames = [...enemyNames, ...playerNames];
        const maxNameLen = Math.max(...allNames.map(n => n.length), 8);
        
        // Show enemies
        console.log(chalk.red.bold('Enemies:'));
        combatState.enemies.forEach((enemy, i) => {
            if (enemy.hp > 0) {
                const name = (combatState.isSurvivorCombat ? `Survivor ${i + 1}` : `Zombie ${i + 1}`).padEnd(maxNameLen + 2);
                const maxHp = enemy.maxHp || 8;
                const filledBars = Math.ceil((enemy.hp / maxHp) * 10);
                const hpBar = chalk.red('█'.repeat(filledBars)) + chalk.gray('░'.repeat(10 - filledBars));
                console.log(`  ${chalk.red(name)} [${hpBar}] ${String(enemy.hp).padStart(2)} HP`);
            }
        });
        
        // Show party
        console.log(chalk.green.bold('Party:'));
        for (const player of combatState.players) {
            if (player.character.health > 0) {
                const name = player.name.padEnd(maxNameLen + 2);
                const maxHp = 9;
                const filledBars = Math.ceil((player.character.health / maxHp) * 10);
                const hpBar = chalk.green('█'.repeat(filledBars)) + chalk.gray('░'.repeat(10 - filledBars));
                const weapon = weapons[player.character.weapon][0];
                console.log(`  ${chalk.green(name)} [${hpBar}] ${String(player.character.health).padStart(2)} HP  ${chalk.gray(weapon)}`);
            }
        }
        console.log(chalk.gray('══════════════════════════════════════════════'));
    }

    async handleGameOver(stats) {
        await loadDependencies();
        
        console.log();
        console.log(chalk.bold.red('═══════════════════════════════════════'));
        console.log(chalk.bold.red('              GAME OVER                '));
        console.log(chalk.bold.red('═══════════════════════════════════════'));
        console.log();
        console.log(chalk.bold.white('Final Statistics:'));
        console.log(chalk.gray('─────────────────'));
        console.log(chalk.white(`  Zombies Killed: ${stats.zombiesKilled}`));
        console.log(chalk.white(`  Hostile Survivors Killed: ${stats.hostileSurvivorsKilled}`));
        console.log(chalk.white(`  Total Party Members: ${stats.totalPartyMembers}`));
        if (stats.longestSurvivor.name) {
            console.log(chalk.white(`  Longest Survivor: ${stats.longestSurvivor.name} (${stats.longestSurvivor.turns} turns)`));
        }
        console.log(chalk.white(`  Food Eaten: ${stats.foodEaten}`));
        console.log(chalk.white(`  Medical Used: ${stats.medicalUsed}`));
        console.log(chalk.white(`  Favourite Weapon: ${stats.favouriteWeapon}`));
        console.log();
        console.log(chalk.gray('Merchant Trades Accepted: ' + stats.survivorEncounters.merchantTradesAccepted));
        console.log(chalk.gray('People Helped: ' + stats.survivorEncounters.personInNeedHelped));
        console.log(chalk.gray('Hostile Encounters: ' + stats.survivorEncounters.hostileEncounters));
        console.log();
    }

    async updateTurnDisplay(turnNumber, timeOfDay, formattedDate) {
        await loadDependencies();
        
        const timeIcon = timeOfDay === 'day' ? '☀' : '🌙';
        console.log();
        console.log(chalk.bold.blue(`═══ Turn ${turnNumber} - ${timeIcon} ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} (${formattedDate}) ═══`));
    }

    async promptCharacterCreation(availableNames, playerId = null) {
        await loadDependencies();
        
        console.log();
        console.log(chalk.bold.cyan('─── Character Creation ───'));
        
        // Name input
        const suggestedName = availableNames.length > 0 ? availableNames[0] : 'Survivor';
        const name = await this.promptInput(`Enter character name (default: ${suggestedName}):`, {
            default: suggestedName
        });
        
        // Age selection
        const age = await this.promptChoice('Select age category:', [
            { id: '0', label: 'Teen', description: 'Morale boost chance' },
            { id: '1', label: 'Adult', description: 'Balanced' },
            { id: '2', label: 'Elder', description: 'Experience but fragile' }
        ]);
        
        // Birthday selection
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const birthMonth = await this.promptChoice('Select birth month:', 
            months.map((m, i) => ({ id: String(i), label: m }))
        );
        
        // Days depend on month
        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const maxDay = daysInMonth[parseInt(birthMonth)];
        const dayOptions = [];
        for (let d = 1; d <= maxDay; d++) {
            dayOptions.push({ id: String(d), label: String(d) });
        }
        const birthDay = await this.promptChoice('Select birth day:', dayOptions);
        
        // Positive trait
        const posTrait = await this.promptChoice('Select positive trait:', 
            posTraits.map(t => ({
                id: t[0],
                label: t[0],
                description: t[1]
            }))
        );
        
        // Negative trait
        const negTrait = await this.promptChoice('Select negative trait:',
            negTraits.map(t => ({
                id: t[0],
                label: t[0],
                description: t[1]
            }))
        );
        
        return {
            name: name || suggestedName,
            age: parseInt(age),
            posTrait,
            negTrait,
            birthMonth: parseInt(birthMonth),
            birthDay: parseInt(birthDay),
            playerId
        };
    }

    async clearTurn() {
        // Don't clear in CLI - keep history visible
    }

    async dispose() {
        await loadDependencies();
        console.log();
        console.log(chalk.gray('Thanks for playing The Wanderers!'));
        process.exit(0);
    }
}

export default CliRenderer;
