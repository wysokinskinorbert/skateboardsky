# Phase 3 Design: World — Road, Terrain, Horizon

## Approach: 3D Road + 2.5D Horizon Stack (Hybrid)

Near-camera elements (road, terrain) are real 3D geometry.
Distant elements (city, ocean, mountains) are billboard cards.
Atmospheric haze ties all layers together.

## New Files

```
src/world/Road.tsx           — spline-based road with CatmullRomCurve3
src/world/RoadMaterial.ts    — asphalt shader with yellow center line + white dashes
src/world/Terrain.tsx        — green hillside slopes with grass noise
src/world/HorizonStack.tsx   — ocean plane + city silhouette + mountain ridges
src/postprocessing/AtmosphericHaze.tsx — depth-based fog effect
```

## Road

CatmullRomCurve3 with 8 control points forming a mountain serpentine.
Custom ribbon geometry: 200 segments × 4 cross-sections, width 10 units.
Banking at curves (limited ±8°). UV mapping: U = across, V = along.
Shader: asphalt grain (dual noise) + continuous yellow center line +
intermittent white edge dashes. Half-lambert sun lighting.
polygonOffset to ensure road renders above terrain at same depth.

## Terrain

3 planes rotated to XZ:
- Left hillside: slopes down from road left edge
- Right hillside: slopes down toward ocean side
- Valley floor: large flat ground far below

Shader: grass color variation (2-octave noise light/dark green mix),
half-lambert diffuse, exponential distance haze to blue-gray.

## Horizon Stack

- Ocean: flat quad at y=-35, shallow→deep gradient + shimmer + haze
- City silhouette: procedural skyline (60 columns, window lights, 50% haze blend)
- Mountain ridges: 2 layers, noise-based ridge profiles, alpha cutout, progressive haze

## Atmospheric Haze

Custom postprocessing Effect (EffectAttribute.DEPTH):
- Exponential fog: `1 - exp(-(depth - offset) * density)`
- Near color: warm golden #D8C8A8, far color: cool blue #90B0C8
- Density 0.004, offset 30 units, max 60% blend
- Pipeline: Bloom → LensFlare → AtmosphericHaze → ToneMapping

## Camera

Adjusted for road+sky composition:
- FOV 72° (wider than Phase 2's 65° to see both road and planet)
- Position: [0, 33, 8] — on mountain ridge
- LookAt: [0, 24, -25] — forward along road, slightly down
- ~45% sky / ~55% ground split

## Build Order (completed)

1. ✅ Road (spline + shader)
2. ✅ Terrain slopes
3. ✅ Horizon stack (city, ocean, ridges)
4. ✅ Atmospheric haze
