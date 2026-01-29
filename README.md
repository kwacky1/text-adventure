# The Wanderers

​Create a character and progress through the turns in a post-apocalyptic, zombie-infested wasteland, while you recruit new friends and face new challenges.

You can customise a starting character with a positive and negative trait, as well as their name and a small avatar to represent them. They'll be able to form relationships with other party members, equip new weapons, and use medicine and food to combat injuries and hunger.

How long can you survive?

---

This project is still under development and not all features are implemented yet. Feel free to give give bug reports, improvements, or suggestions. Itch.io page: [https://goosey-games.itch.io/the-wanderers](https://goosey-games.itch.io/the-wanderers)

---

## Platforms

The Wanderers is available in three versions:

| Platform | Description | Multiplayer |
|----------|-------------|-------------|
| **Web** | Original browser-based version | Single-player |
| **CLI** | Terminal-based version | Single-player |
| **Discord** | Discord bot with slash commands | 1-4 players |

---

## Installation

### Web Version

Download the files and open `the-wanderers/index.html` in a browser, or:

```bash
git clone https://github.com/kwacky1/text-adventure.git
```

### CLI Version

```bash
npm install
npm run cli
```

### Discord Bot

1. Create a Discord application at [discord.com/developers](https://discord.com/developers/applications)
2. Create a bot and get the token
3. Copy `.env.example` to `.env` and fill in your credentials
4. Run the bot:

```bash
npm install
npm run discord
```

#### Discord Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start a new game |
| `/join` | Join an active game |
| `/leave` | Leave the current game |
| `/ready` | Mark yourself as ready |
| `/play` | Advance to next turn |
| `/status` | View party status |
| `/inventory` | View inventory |
| `/use <item> <character>` | Use an item |
| `/stats` | View game statistics |
| `/end` | End the game (host only) |

#### Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Project Structure

```
text-adventure/
├── core/              # Shared game logic (platform-agnostic)
│   ├── character.js   # Character data model
│   ├── party.js       # Party and inventory management
│   ├── game-engine.js # Core game mechanics
│   ├── game-session.js # Session and multiplayer coordination
│   └── constants.js   # Game data and configuration
├── cli/               # CLI version
│   ├── cli-renderer.js
│   └── index.js
├── discord/           # Discord bot version
│   ├── bot.js
│   ├── discord-renderer.js
│   └── session-manager.js
├── the-wanderers/     # Web version
└── test/              # Jest tests
```

---

## Adding New Features

The shared `core/` module ensures new features automatically work across all platforms:

1. Add game logic to `core/game-engine.js`
2. Add any new data to `core/constants.js`
3. Update renderer interface if new UI is needed (`core/renderer.interface.js`)
4. Implement the new renderer methods in each platform adapter

The web version currently uses its own implementation. Migration to use `core/` is planned.

---

## Credits

- Created by: [kwacky1](https://github.com/kwacky1) & [blairdactyl](https://github.com/blairdactyl)

- API used to generate random names: [https://randomuser.me/](https://randomuser.me/)

---

## Licences

Game assets are licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). 

The Wanderers Text Adventure Game
    Copyright (C) 2024  Goosey Games

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or any later version.
