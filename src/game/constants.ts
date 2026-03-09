import * as THREE from 'three'

// Sky — sun position for custom Shinkai gradient shader
export const SKY = {
  // Sun position — right side of frame, camera looks -Z so azimuth ~π*0.9 = right of center
  sunAzimuth: Math.PI * 0.9,    // 162° = forward-right, visible in FOV
  sunElevation: Math.PI * 0.10, // ~18° above horizon = golden hour
} as const

// Color grading — matching film's vivid, saturated look
export const COLOR_GRADING = {
  // Renderer tone mapping DISABLED — post-processing handles it via ToneMapping effect
  // toneMappingExposure is still read by ToneMappingEffect to scale HDR input
  toneMapping: THREE.NoToneMapping,
  toneMappingExposure: 1.0,

  // Bloom — HDR emission on sun disc triggers this
  bloomIntensity: 1.2,
  bloomThreshold: 0.6,
  bloomSmoothing: 0.4,
  bloomRadius: 0.7,

  // Split toning: cool shadows + warm highlights (Shinkai signature)
  shadowColor: new THREE.Color('#2A4080'),   // cool blue shadows
  highlightColor: new THREE.Color('#F0C060'), // warm gold highlights
} as const

// Sun disc — HDR emission mesh
export const SUN = {
  color: new THREE.Color('#FFF8E7'),
  emissionIntensity: 5.0,  // HDR — triggers bloom
  radius: 15,
  distance: 450,           // placed on sky dome sphere
} as const

// Planet — giant arc in upper sky, only lower ~25% visible (rest above frame)
export const PLANET = {
  position: [50, 1200, -900] as [number, number, number],
  radius: 800,
  bodyColor: new THREE.Color('#1A4060'),        // dark teal (from keyframes)
  atmosphereColor: new THREE.Color('#50D0F0'),  // bright cyan rim
  atmosphereIntensity: 0.7,                      // rim glow — power 8 Fresnel, slight bloom at peak
  atmosphereScale: 1.025,                        // very tight to body — thin rim
  ringColor: new THREE.Color('#80D0F0'),         // pale cyan ring
  ringIntensity: 1.5,                            // HDR
} as const

// Cloud layers — billboard cards with procedural shapes
export const CLOUDS = {
  // Back layer — behind planet, atmospheric perspective (hazy, blue-tinted)
  back: {
    count: 8,
    distanceRange: [480, 700] as [number, number],
    scaleRange: [30, 65] as [number, number],
    elevationRange: [0.02, 0.14] as [number, number],  // slightly higher to fill more sky
    azimuthSpread: Math.PI * 0.22,                       // ±40° — wider but still centered
    tint: new THREE.Color('#8AB0D0'),                    // soft blue haze
    opacity: 0.4,
  },
  // Front layer — in front of planet, vivid cumulus (dense, overlapping formations)
  front: {
    count: 18,
    distanceRange: [300, 500] as [number, number],
    scaleRange: [40, 90] as [number, number],
    elevationRange: [0.01, 0.18] as [number, number],  // wider range, some near horizon
    azimuthSpread: Math.PI * 0.35,                       // ±63° — fill wide view
    tint: new THREE.Color('#FFFFFF'),                    // pure white
    opacity: 0.85,
  },
  driftSpeed: 0.02,   // very slow horizontal drift
} as const

// Road — serpentine mountain road going downhill
export const ROAD = {
  width: 10,
  segments: 200,
  // Spline control points: [x, y, z] — serpentine S-curves descending
  splinePoints: [
    [0, 28, 5],          // start — under camera
    [0, 27, -10],        // straight lead-in
    [-18, 22, -50],      // first curve left
    [22, 16, -100],      // switchback right
    [-28, 9, -160],      // curve left
    [18, 2, -220],       // switchback right
    [-12, -5, -290],     // curve left into valley
    [0, -10, -350],      // end — disappears into distance
  ] as [number, number, number][],
} as const

// Camera defaults — behind character on mountain road, ~55% sky / ~45% ground
export const CAMERA = {
  fov: 72,
  near: 0.1,
  far: 2000,
  position: [0, 33, 8] as [number, number, number],
  lookAt: [0, 24, -25] as [number, number, number],
} as const
