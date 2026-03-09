# Phase 2 Design: Planet + Clouds + Lens Flare

## Render Order

```
1. SkyDome (ShinkaiSkyMaterial)       renderOrder: 0  — existing
2. BackCloudLayer (6-8 clouds)        renderOrder: 1  — behind planet
3. Planet (body + atmosphere + ring)  renderOrder: 2
4. FrontCloudLayer (8-12 clouds)      renderOrder: 3  — in front of planet
5. LensFlare (screen-space)           renderOrder: 4
6. PostProcessingStack                                 — existing
```

## New Files

```
src/sky/Planet.tsx              — planet component (body sphere + atmosphere + ring)
src/sky/PlanetMaterial.ts       — GLSL: dark teal body + Fresnel atmosphere rim
src/sky/CloudLayer.tsx          — billboard cloud system (back/front)
src/sky/CloudCardMaterial.ts    — procedural cloud shape shader (FBM noise)
src/sky/LensFlare.tsx           — anamorphic lens flare wrapper
src/game/constants.ts           — extended with PLANET, CLOUDS, LENS_FLARE
```

## Planet

3D sphere with custom GLSL shader. Only the lower ~25% of the sphere is visible
(the rest is above the frame), creating the massive arc seen in the film.

- **Body**: sphere r=600 at [100, 500, -400]. Dark teal `#1A4060`, Lambert diffuse,
  noise-based surface detail, Fresnel darkening at edges.
- **Atmosphere rim**: second sphere at scale 1.08x. Fresnel glow `pow(1-dot(V,N), 3.0)`,
  color `#40C0E0` → white, AdditiveBlending, HDR intensity 2.0 (triggers bloom).
- **Ring**: thin torus mesh with emissive material, tilted to match film angle.

```ts
export const PLANET = {
  position: [100, 500, -400] as const,
  radius: 600,
  bodyColor: '#1A4060',
  atmosphereColor: '#40C0E0',
  atmosphereIntensity: 2.0,
  atmosphereScale: 1.08,
}
```

## Clouds — Billboard Cards

Two layers of textured quads always facing camera. Procedural FBM noise shader
generates unique cumulus shapes per card (no external textures needed).

**Procedural shader (CloudCardMaterial.ts):**
- Shape: 3-4 octaves FBM (Worley + Perlin mix) for cumulus silhouette
- Soft edges: smoothstep alpha falloff
- Backlighting: `dot(cloudToSun, sunDir)` brightens sun-facing edges (warm gold)
- Atmospheric tint: back layer mixed with `#6090C0` (blue haze)
- Each cloud unique via `seed` uniform

**Back layer (6-8 clouds):**
- Elevation 5-25 deg, distance ~700, scale 40-80
- Bluish tint, reduced contrast (atmospheric perspective)

**Front layer (8-12 clouds):**
- Elevation 5-35 deg, distance ~400, scale 60-150
- White, high contrast, strong backlighting
- Higher density on left side (away from sun)

**Animation:** slow drift `sin(time * 0.02 + seed) * 0.5`, no rotation.

## Lens Flare

Using `@andersonmancini/lens-flare` (R3F-Ultimate-Lens-Flare) with anamorphic mode.

- Horizontal streak through sun position
- 4-5 ghost flares (blue-purple tint `#1040C0`)
- Star burst on sun disc (6 points)
- Fallback: custom screen-space shader if library doesn't match film

## Build Order

1. Planet (body + atmosphere + ring) — verify arc + bloom
2. Back cloud layer — verify layering behind planet
3. Front cloud layer — verify full depth stack
4. Lens flare — final cinematic touch
5. Polish — iterative tuning against keyframes

## Success Criteria

- Planet visible as wide arc with atmosphere glow matching keyframes 001-003
- Clouds create visible depth — planet clearly BETWEEN layers
- Sun backlighting on cloud edges (warm gold on sun side)
- Lens flare adds cinematic accent
- Visually coherent with Phase 1 sky dome
