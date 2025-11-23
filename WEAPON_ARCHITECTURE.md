# FPS Game - Weapon System Architecture

## Overview
This FPS game implements a professional weapon rendering system inspired by the enari-engine, with proper separation of concerns, gimbal lock prevention, and smooth weapon animations.

## Architecture

### Key Components

#### 1. **ViewmodelRenderer** (`src/view/ViewmodelRenderer.ts`)
- Manages a separate scene and camera dedicated to weapon rendering
- Prevents z-fighting and depth issues by rendering weapons in a separate pass
- Uses `clearDepth()` to render weapon on top of the main scene
- Includes dedicated lighting for the weapon

**Key Features:**
- Separate FOV control for weapon (typically 60°)
- Near clip plane set to 0.01 for close-up weapon rendering
- Synchronized with main camera rotation
- Independent lighting system

#### 2. **Weapon** (`src/weapon/Weapon.ts`)
- Handles weapon model loading, positioning, and animations
- Implements smooth weapon bobbing based on:
  - Player movement (horizontal and vertical sway)
  - Camera rotation (mouse movement)
  - Jump/fall velocity
- Manages recoil effects with recovery

**Key Features:**
- Configurable base position and rotation
- Smooth bobbing using sine waves for natural motion
- Recoil system with automatic recovery
- Lerp-based smooth transitions

#### 3. **Controls** (`src/core/Controls.ts`)
- Uses Euler angles with 'YXZ' order to prevent gimbal lock
- Tracks rotation delta for weapon bobbing
- Clamps vertical rotation to ±89° to avoid gimbal lock
- Manages pointer lock and crosshair visibility

**Gimbal Lock Prevention:**
```typescript
// Using Euler with YXZ order prevents gimbal lock
this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

// Clamp to prevent reaching 90° where gimbal lock occurs
const PI_2 = Math.PI / 2;
this.euler.x = Math.max(-PI_2 + 0.01, Math.min(PI_2 - 0.01, this.euler.x));
```

#### 4. **Camera** (`src/core/Camera.ts`)
- Integrates ViewmodelRenderer and Weapon
- Manages weapon updates and synchronization
- Provides methods for weapon effects (recoil, bobbing)

#### 5. **Renderer** (`src/core/Renderer.ts`)
- Supports multi-pass rendering
- First pass: Main scene with full clear
- Second pass: Weapon scene with depth-only clear
- Manual clear control with `autoClear = false`

### Rendering Pipeline

```
┌─────────────────────────────────────────────────┐
│ Animation Loop (main.ts)                        │
├─────────────────────────────────────────────────┤
│ 1. Update Physics                               │
│ 2. Update Player (movement, collision)          │
│ 3. Update Scene (objects, lighting)             │
│ 4. Update Weapon (bobbing, position)            │
│ 5. Apply rotation bobbing to weapon             │
│                                                  │
│ Rendering:                                       │
│ 6. Clear color + depth buffer                   │
│ 7. Render main scene                            │
│ 8. Clear ONLY depth buffer                      │
│ 9. Render weapon scene (appears on top)         │
└─────────────────────────────────────────────────┘
```

## Weapon Bobbing System

### Movement Bobbing
- Uses sine waves for smooth, natural motion
- Horizontal bobbing: `sin(time * speed)`
- Vertical bobbing: `sin(time * speed * 2) * 0.5` (higher frequency, lower amplitude)
- Smoothly returns to rest when not moving

### Rotation Bobbing
- Tracks mouse delta from Controls
- Applied with sensitivity multiplier
- Adds to weapon rotation for reactive feel

### Jump Bobbing
- Based on vertical velocity
- Clamped to prevent extreme values
- Adds to rotation accumulator

### Recoil System
- Triggered on weapon fire
- Pushes weapon back on Z-axis
- Automatic recovery over time
- Can be extended for more complex patterns

## Key Improvements Over Simple Approach

### 1. **No Z-Fighting**
- Separate scene ensures weapon never clips through world geometry
- Proper depth buffer management

### 2. **No Gimbal Lock**
- Euler angle order 'YXZ' prevents gimbal lock
- Clamped rotation prevents reaching singularity points
- Smooth camera rotation in all directions

### 3. **Professional Weapon Feel**
- Multiple bobbing sources create natural motion
- Smooth interpolation using lerp
- Configurable parameters for tuning

### 4. **Modular Architecture**
- Each component has single responsibility
- Easy to extend with new features
- Clear separation of concerns

### 5. **Performance Optimized**
- Frustum culling disabled only for weapon (small overhead)
- Efficient multi-pass rendering
- Minimal state changes between passes

## Configuration

### Weapon Position Tuning
Edit `src/weapon/Weapon.ts`:
```typescript
public basePosition = new THREE.Vector3(0.3, -0.15, -0.4);
```

### Bobbing Tuning
```typescript
private bobbingAmount = 0.002;  // Intensity
private bobbingSpeed = 10;       // Frequency
```

### Recoil Tuning
```typescript
camera.triggerWeaponRecoil(0.05); // Amount per shot
```

### Camera Sensitivity
Edit `src/core/Controls.ts`:
```typescript
private sensitivity: number = 0.002;
```

## Future Enhancements

1. **Animation System**
   - Integrate GLTF animations (reload, shoot, etc.)
   - Use THREE.AnimationMixer

2. **Multiple Weapons**
   - Weapon switching system
   - Different bobbing profiles per weapon

3. **Advanced Recoil**
   - Per-weapon recoil patterns
   - Camera kickback (pitch/yaw)

4. **Weapon Sway**
   - Idle sway for realism
   - Breathing effect

5. **ADS (Aim Down Sights)**
   - FOV transitions
   - Position/rotation transitions
   - Reduced bobbing when aiming

## References

Inspired by:
- enari-engine FPS implementation
- Modern FPS games (CS:GO, Valorant)
- THREE.js best practices for FPS games

## File Structure

```
src/
├── core/
│   ├── Camera.ts         # Main camera + weapon integration
│   ├── Controls.ts       # Input handling, gimbal lock prevention
│   ├── Renderer.ts       # Multi-pass rendering
│   ├── Scene.ts          # Main scene management
│
├── view/
│   └── ViewmodelRenderer.ts  # Weapon-specific renderer
│
├── weapon/
│   └── Weapon.ts         # Weapon logic, bobbing, recoil
│
├── player/
│   └── Player.ts         # Player physics and movement
│
└── main.ts              # Application entry and game loop
```
