# The Wanderers - Copilot Instructions

## Project Architecture

This is a multi-platform zombie survival text adventure game with a shared core engine.

### Directory Structure

```
core/                    # Platform-agnostic game engine (source of truth)
├── game-engine.js       # Main game logic
├── game-session.js      # Session state management
├── character.js         # Character model
├── party.js             # Party management
├── inventory.js         # Inventory system
├── constants.js         # Shared constants (traits, items, etc.)
├── game-stats.js        # Statistics tracking
└── renderer.interface.js # Abstract renderer interface

cli/                     # Command-line interface
├── cli-game.js          # CLI entry point
└── cli-renderer.js      # Terminal-based renderer

discord/                 # Discord bot interface
├── bot.js               # Discord bot entry
├── discord-renderer.js  # Discord embeds/buttons renderer
└── session-manager.js   # Multi-session management

the-wanderers/           # Web browser interface
├── index.html           # Web entry point
├── web-game.js          # Web game initialization
├── web-renderer.js      # DOM-based renderer
├── core/                # ⚠️ SYMLINK or COPY of /core
├── scripts/             # Legacy web code (being migrated)
├── styles/              # CSS
└── images/              # Game assets
```

### Renderer Pattern

All platforms implement the `Renderer` interface from `core/renderer.interface.js`:

```javascript
class Renderer {
    async displayEvent(text, style)        // Show game events
    async displayPartyStatus(characters)   // Update party display
    async displayInventory(inventory, party) // Show/update inventory
    async displayCombat(combatState)       // Combat UI
    async clearCombat()                    // Remove combat UI
    async promptChoice(prompt, options)    // User selection
    async promptConfirm(prompt)            // Yes/No prompt
    async promptCombatAction(...)          // Combat action selection
    async updateStats(character)           // Update character stats display
    // ... see renderer.interface.js for full contract
}
```

### Core Engine Sync

The `the-wanderers/core/` directory is a **symlink** to `/core/` - changes are automatically synced.

To verify:
```powershell
Get-Item "the-wanderers/core" | Select-Object LinkType, Target
# Should show: SymbolicLink -> core
```

If symlink is broken, recreate it (requires Windows Developer Mode):
```powershell
Remove-Item -Force "the-wanderers/core"
New-Item -ItemType SymbolicLink -Path "the-wanderers/core" -Target (Resolve-Path "core").Path
```

### Key Conventions

1. **Game logic belongs in `core/game-engine.js`** - not in renderers
2. **Renderers only handle UI** - no game state mutations
3. **All renderer methods are async** - even if sync in implementation
4. **New features need renderer interface updates** when they require UI
5. **Platform-specific rendering is OK** - each renderer can have unique UI elements
6. **Constants are shared** - add new items/traits to `core/constants.js`

### Testing

```bash
npm test                    # Run all tests
npm run test:cli           # CLI-specific tests (if available)
npm run test:coverage      # Coverage report
```

### Common Tasks

- **Add new item type**: Update `core/constants.js`, then update each renderer's inventory display
- **Add new trait**: Update `core/constants.js`, add effect in `game-engine.js`
- **Add new event type**: Add method to `renderer.interface.js`, implement in all renderers
- **Fix platform-specific bug**: Check the appropriate renderer file

### Specialized Agent Prompts

Use these prompts (in `.github/prompts/`) for specific tasks:

| Prompt | Usage |
|--------|-------|
| `@workspace /core-engine` | Core game logic, session state, constants |
| `@workspace /web-platform` | Web renderer, DOM, CSS, HTML |
| `@workspace /cli-platform` | Terminal renderer, chalk, inquirer |
| `@workspace /discord-platform` | Discord bot, embeds, buttons |
| `@workspace /sync-core` | Sync core engine to web platform |
| `@workspace /implement-renderer-method` | Add new method across all platforms |
| `@workspace /check-feature-parity` | Compare implementations across platforms |
