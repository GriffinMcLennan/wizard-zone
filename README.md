# Wizard Zone

A real-time multiplayer first-person battle royale where wizards duel with fireballs, arcane rays, and explosive nova blasts. Last wizard standing wins.

![Game Preview](https://img.shields.io/badge/status-playable-green)

## Features

- **First-person combat** - WASD movement with mouse look
- **Multiple abilities** - Fireballs, dashes, launch jumps, AOE blasts, and hitscan beams
- **Server-authoritative** - 60Hz tick rate for responsive, cheat-resistant gameplay
- **Battle royale format** - Automatic matchmaking, countdowns, and winner detection
- **Spectator mode** - Watch remaining players after elimination

## Tech Stack

| Layer | Technology |
|-------|------------|
| Client | React + TypeScript + React Three Fiber + Zustand |
| Server | Node.js + Express + ws (WebSocket) |
| Shared | npm workspaces monorepo with shared types |

## Getting Started

```bash
# Install dependencies
npm install

# Run development servers (client + server + shared watch)
npm run dev
```

- Client: http://localhost:5173
- Server: ws://localhost:3001

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move |
| Mouse | Look |
| Space | Jump |
| Shift | Dash |
| Q | Launch Jump |
| LMB | Fireball |
| E | Nova Blast (AOE) |
| R | Arcane Ray (hitscan) |

## Project Structure

```
wizard_zone_v2/
├── client/           # React Three Fiber frontend
├── server/           # Node.js game server
└── packages/
    └── shared/       # Shared types & constants
```

## How It Works

1. Players connect via WebSocket and join a game room
2. Server runs authoritative simulation at 60Hz
3. Clients send inputs, receive state updates
4. Game phases: waiting → countdown → playing → game over
5. Last wizard alive wins the round

## Scripts

```bash
npm run dev           # Start all (client + server + shared watch)
npm run build         # Build all packages
npm run test:server   # Run server tests
```

## License

MIT
