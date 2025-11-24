# FPS Game - Multiplayer Setup Guide

## Project Structure

The project is now organized into modular components:

```
fps-game/
├── src/                    # Frontend (client)
│   ├── core/              # Camera, Renderer, Controls  
│   ├── player/            # Local player controller
│   ├── ui/                # UI components
│   ├── effects/           # Visual effects
│   ├── weapon/            # Weapon system
│   └── main.ts            # Client entry point
│
├── server/                # Backend (game server)
│   ├── src/
│   │   ├── game/         # GameServer - main game loop
│   │   ├── network/      # NetworkManager - WebSocket
│   │   ├── player/       # ServerPlayer - player state
│   │   ├── types/        # Shared types
│   │   └── constants/    # Game constants
│   └── package.json
│
└── shared/               # Shared between client/server
    ├── types/            # TypeScript interfaces
    └── constants/        # Game constants
```

## What Goes Where?

### Frontend (Client) - `/src`
✅ **Stays in Frontend:**
- Rendering (THREE.js)
- Camera controls
- UI (loading screen, home screen, crosshair)
- Visual effects (muzzle flash, bullet holes)
- Audio (weapon sounds)
- Input handling
- Client prediction
- Interpolation

### Backend (Server) - `/server`
✅ **Moves to Backend:**
- Physics simulation (RAPIER)
- Player state management
- Hit detection
- Game logic
- Player validation
- Spawn management
- Health/damage system

### Shared - `/shared`
✅ **Shared Between Both:**
- Type definitions
- Game constants (speeds, damage, etc.)
- Network message types
- Validation rules

## Setup Instructions

### 1. Install Server Dependencies

```bash
cd server
npm install
```

### 2. Start the Server

```bash
# Development mode (auto-reload)
cd server
npm run dev

# Production mode
npm run build
npm start
```

Server will run on `ws://localhost:3001`

### 3. Update Client to Connect

The client needs to be updated to:
1. Connect to WebSocket server
2. Send player input
3. Receive and apply game state
4. Render other players

### 4. Next Steps

1. **Install server dependencies** (ws, @types/ws, tsx)
2. **Create network client** in `/src/network/NetworkClient.ts`
3. **Update Player class** to send input to server
4. **Add other players rendering** in main scene
5. **Test multiplayer** with multiple browser tabs

## Current Status

### ✅ Completed
- Project structure created
- Server architecture designed
- Shared types defined
- Game constants extracted
- Server components scaffolded:
  - GameServer (physics + game loop)
  - ServerPlayer (player management)
  - NetworkManager (WebSocket handling)

### 🔄 Next Steps
1. Install server dependencies
2. Create client network manager
3. Integrate multiplayer into existing game
4. Add other players rendering
5. Implement shooting synchronization
6. Add interpolation/prediction

## Running Multiplayer

### Terminal 1 - Server
```bash
cd server
npm run dev
```

### Terminal 2 - Client  
```bash
npm run dev
```

### Testing
Open multiple browser tabs to `http://localhost:5173` and see players interact!

## Network Flow

```
Client                Server                Other Clients
  |                     |                         |
  |--- PLAYER_JOIN ---->|                         |
  |<-- PLAYER_JOINED ---|                         |
  |<-- GAME_STATE ------|                         |
  |                     |--- PLAYER_JOINED ------>|
  |                     |                         |
  |--- PLAYER_INPUT --->|                         |
  |                     |--- GAME_STATE --------->|
  |<-- GAME_STATE ------|                         |
  |                     |                         |
  |--- PLAYER_SHOOT --->|                         |
  |                     |--- PLAYER_SHOT -------->|
```

## Important Notes

- Server runs at 60Hz tick rate
- Client sends input at 60Hz
- Physics is authoritative on server
- Client uses interpolation for smooth movement
- All shooting/damage is validated server-side
