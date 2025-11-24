# FPS Game - Multiplayer Architecture

## Project Structure

```
fps-game/
├── client/                 # Frontend (existing src/)
│   ├── src/
│   │   ├── core/          # Camera, Renderer, Controls
│   │   ├── player/        # Local player controller
│   │   ├── ui/            # UI components
│   │   ├── effects/       # Visual effects
│   │   ├── weapon/        # Weapon system
│   │   └── network/       # Network client
│   └── public/            # Assets
│
├── server/                # Backend (Node.js + WebSocket)
│   ├── src/
│   │   ├── game/          # Game state management
│   │   ├── network/       # WebSocket server
│   │   ├── physics/       # Server-side physics
│   │   └── player/        # Player management
│   └── config/
│
└── shared/                # Shared code (types, constants)
    ├── types/             # TypeScript types
    ├── constants/         # Game constants
    └── utils/             # Shared utilities
```

## Architecture Overview

### Frontend (Client)
- **Rendering**: THREE.js scene rendering
- **Input Handling**: Keyboard, mouse controls
- **Local Prediction**: Client-side movement prediction
- **Interpolation**: Smooth other players' movement
- **Visual Effects**: Weapon effects, bullet holes, UI

### Backend (Server)
- **Authoritative Server**: Server validates all actions
- **Physics Simulation**: Server-side RAPIER physics
- **State Management**: Game state, player positions
- **Broadcasting**: Send updates to all clients
- **Anti-cheat**: Validate player actions

### Shared
- **Types**: Player state, game events, network messages
- **Constants**: Movement speed, weapon stats, physics settings
- **Validation**: Input validation, state validation

## Network Protocol

### Client → Server
```typescript
{
  type: 'player_input',
  data: {
    movement: { forward, backward, left, right, jump },
    rotation: { pitch, yaw },
    actions: { shooting, reloading }
  }
}
```

### Server → Client
```typescript
{
  type: 'game_state',
  data: {
    tick: number,
    players: Map<id, PlayerState>,
    timestamp: number
  }
}
```

## Implementation Plan

1. **Phase 1**: Setup backend server with WebSocket
2. **Phase 2**: Create shared types and constants
3. **Phase 3**: Implement network client
4. **Phase 4**: Add player synchronization
5. **Phase 5**: Add shooting synchronization
6. **Phase 6**: Optimize with interpolation/prediction
