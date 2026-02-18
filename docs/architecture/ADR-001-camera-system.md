# ADR-001: Camera System

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** Massless MMORPG camera design

---

## Context

Metin2 uses a third-person camera with adjustable rotation (mouse right-click drag) and zoom (scroll wheel). The camera follows the player character from a slightly elevated perspective, similar to many action MMORPGs. We need to decide on our camera implementation for Babylon.js.

## Decision

**Use a Metin2-style third-person chase camera** with the following characteristics:

### Camera Type
- Babylon.js `ArcRotateCamera` attached to the player character
- Target: Player character mesh position (with vertical offset to chest height)
- Default angle: ~45° elevation, behind and above the character

### Controls
- **Mouse right-click + drag**: Rotate camera around character (alpha/beta)
- **Scroll wheel**: Zoom in/out (radius)
- **No left-click camera rotation**: Left click is for targeting/interaction
- **Auto-rotate**: Camera slowly returns behind the character during movement (toggleable)

### Parameters
| Parameter | Value | Notes |
|-----------|-------|-------|
| Min radius | 3 units | Close third-person |
| Max radius | 25 units | Far overview |
| Default radius | 12 units | Comfortable play distance |
| Min beta (elevation) | 0.3 rad (~17°) | Near-horizontal |
| Max beta (elevation) | 1.4 rad (~80°) | Near top-down |
| Default beta | 0.8 rad (~45°) | Metin2-style angle |
| Alpha (rotation) | Unrestricted | Full 360° rotation |
| Smoothing | Lerp factor 0.1 | Smooth follow, not snappy |
| Collision | Ray-based | Prevent camera clipping through terrain/walls |

### Camera Collision
- Cast a ray from target to camera position
- If ray hits geometry, move camera to hit point + small offset
- Prevents seeing through walls/terrain

### Indoor/Dungeon Adjustment
- Automatically reduce max radius in indoor zones
- Lower max beta to prevent ceiling clipping
- Transition smoothly when entering/leaving buildings

## Alternatives Considered

### Fixed Isometric Camera
- Pro: Simpler, classic feel, good for mobile
- Con: Doesn't match Metin2 feel, limits world appreciation, less immersive
- **Rejected**: Doesn't serve the Metin2 spiritual successor identity

### Free Camera (WASD + Mouse)
- Pro: Maximum freedom, FPS-like
- Con: Not genre-appropriate, disorienting in MMO context
- **Rejected**: Wrong genre feel, would require different UI/combat design

### Fixed Angle with Zoom Only
- Pro: Simple, consistent visual style
- Con: Players expect rotation in 3D MMOs, feels restrictive
- **Rejected**: Too limiting for a 3D MMORPG

## Consequences

- Need to implement camera collision detection to prevent clipping
- Mouse input system must differentiate between camera rotation (right-click) and targeting (left-click)
- UI elements need to account for variable camera angles
- Terrain/building design must consider visibility from multiple angles
- Performance: Single `ArcRotateCamera` with ray-based collision is lightweight
