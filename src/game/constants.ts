import * as THREE from 'three'

// Sky — sun position for custom Shinkai gradient shader
export const SKY = {
  // Film measurement: sun at horizon level (Y≈42% in portrait frame = ~3-5° elevation)
  sunAzimuth: Math.PI * 0.9,    // 162° = forward-right
  sunElevation: Math.PI * 0.025, // ~4.5° above horizon — golden hour, sun near horizon
} as const

// Color grading — matching film's vivid, saturated look
export const COLOR_GRADING = {
  // Renderer tone mapping DISABLED — post-processing handles it via ToneMapping effect
  // toneMappingExposure is still read by ToneMappingEffect to scale HDR input
  toneMapping: THREE.NoToneMapping,
  toneMappingExposure: 1.0,

  // Bloom — only the brightest sun pixels trigger, contained golden glow
  bloomIntensity: 0.30,
  bloomThreshold: 2.5,
  bloomSmoothing: 0.15,
  bloomRadius: 0.3,

  // Split toning: cool shadows + warm highlights (Shinkai signature)
  shadowColor: new THREE.Color('#2A4080'),   // cool blue shadows
  highlightColor: new THREE.Color('#F0C060'), // warm gold highlights
} as const

// Sun disc — HDR emission mesh, film: ~1% of frame = tiny bright point
// At distance 450, radius 3 = angular size ≈ 0.38° (film: ~0.5°)
export const SUN = {
  color: new THREE.Color('#FFE8C0'),  // golden warm, not white
  emissionIntensity: 2.0,  // higher HDR to trigger bloom at threshold 2.5
  radius: 3,               // smaller disc for film-accurate compact point
  distance: 450,           // placed on sky dome sphere
} as const

// Planet — giant arc in upper sky, positioned high so only bottom arc visible
// Film measurement: arc spans ~90% frame width, only bottom ~15-20% of sphere visible
// Calculation: HFOV≈104.6°, need 94° span → R/D≈0.74 → R=950, D≈1281
export const PLANET = {
  position: [20, 1100, -700] as [number, number, number],
  radius: 950,
  bodyColor: new THREE.Color('#1A3858'),        // dark navy-teal (film: #1A3858)
  atmosphereColor: new THREE.Color('#60D0FF'),  // bright cyan (film: #60D0FF, very thin 1-2px)
  atmosphereIntensity: 0.8,                      // subtle — film has very thin, contained glow
  atmosphereScale: 1.012,                        // extremely tight to body — thinner rim than before
  ringColor: new THREE.Color('#80D0F0'),         // pale cyan ring
  ringIntensity: 1.2,                            // moderate HDR
} as const

// Cloud layers — minimal, film-accurate
export const CLOUDS = {
  back: {
    count: 0,
    distanceRange: [600, 750] as [number, number],
    scaleRange: [40, 70] as [number, number],
    elevationRange: [0.10, 0.18] as [number, number],
    azimuthSpread: Math.PI * 0.30,
    tint: new THREE.Color('#A0B8D0'),
    opacity: 0.18,
  },
  front: {
    count: 0,
    distanceRange: [280, 420] as [number, number],
    scaleRange: [80, 160] as [number, number],
    elevationRange: [0.08, 0.18] as [number, number],
    azimuthSpread: Math.PI * 0.35,
    tint: new THREE.Color('#F0F0F8'),
    opacity: 0.80,
  },
  driftSpeed: 0.015,
  backDriftMultiplier: 0.3,
  frontDriftMultiplier: 1.0,
} as const

// Road — serpentine mountain road going downhill
export const ROAD = {
  width: 10,
  segments: 200,
  // Spline control points: [x, y, z] — serpentine with UP/DOWN undulations
  // Near: wide dramatic curves; Far: progressively narrower (haze hides detail)
  splinePoints: [
    [0, 28, 5],           // start — under camera
    [0, 27, -10],         // straight lead-in
    [-15, 22, -40],       // curve left, descent
    [-22, 15, -70],       // steep descent into first valley
    [6, 22, -95],         // switchback right — RISES 7 units (visible hill crest!)
    [22, 14, -125],       // continuing right, descent
    [-3, 10, -155],       // transition
    [-18, 5, -190],       // curve left, low point
    [-10, 9, -220],       // slight RISE (second crest)
    [10, 2, -255],        // narrower switchback right
    [-5, -2, -295],       // gentle curve left
    [0, -8, -340],        // end — fades into atmospheric haze
  ] as [number, number, number][],
} as const

// Camera defaults — behind character on mountain road, ~60% sky / ~40% ground
export const CAMERA = {
  fov: 72,
  near: 0.1,
  far: 2000,
  position: [0, 33, 8] as [number, number, number],
  lookAt: [0, 27, -30] as [number, number, number],
} as const
