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

  // Bloom — HDR emission on sun disc triggers this (tighter, film-accurate)
  bloomIntensity: 0.6,
  bloomThreshold: 1.8,
  bloomSmoothing: 0.3,
  bloomRadius: 0.5,

  // Split toning: cool shadows + warm highlights (Shinkai signature)
  shadowColor: new THREE.Color('#2A4080'),   // cool blue shadows
  highlightColor: new THREE.Color('#F0C060'), // warm gold highlights
} as const

// Sun disc — HDR emission mesh, smaller and more controlled for film-accurate glow
export const SUN = {
  color: new THREE.Color('#FFF0D0'),  // warmer golden, less white
  emissionIntensity: 2.2,  // HDR — triggers bloom (tight, film-accurate)
  radius: 7,               // compact disc (film: small bright point with tight glow)
  distance: 450,           // placed on sky dome sphere
} as const

// Planet — giant arc in upper sky, positioned high so only bottom arc visible
// Film reference: planet arc sits in top ~20-25% of frame with sky visible below
export const PLANET = {
  position: [30, 1050, -750] as [number, number, number],
  radius: 650,
  bodyColor: new THREE.Color('#1A4060'),        // dark teal (from keyframes)
  atmosphereColor: new THREE.Color('#70D8FF'),  // vivid cyan
  atmosphereIntensity: 1.2,                      // subtle rim — film has very thin, contained glow
  atmosphereScale: 1.025,                        // very tight to body — thin rim
  ringColor: new THREE.Color('#90E0FF'),         // pale cyan ring
  ringIntensity: 1.5,                            // HDR
} as const

// Cloud layers — billboard cards with procedural shapes
export const CLOUDS = {
  // Back layer — behind planet, atmospheric perspective (hazy, blue-tinted)
  back: {
    count: 16,
    distanceRange: [500, 750] as [number, number],
    scaleRange: [50, 120] as [number, number],
    elevationRange: [0.04, 0.25] as [number, number],
    azimuthSpread: Math.PI * 0.35,
    tint: new THREE.Color('#C0D8F0'),                    // brighter blue-white
    opacity: 0.5,
  },
  // Front layer — vivid cumulus, some MASSIVE hero clouds
  front: {
    count: 35,
    distanceRange: [200, 550] as [number, number],
    scaleRange: [60, 220] as [number, number],          // hero clouds up to 220 units!
    elevationRange: [-0.03, 0.30] as [number, number],  // from below horizon to high
    azimuthSpread: Math.PI * 0.45,                       // ±81° wide spread
    tint: new THREE.Color('#FFFFFF'),                    // pure white
    opacity: 0.92,
  },
  driftSpeed: 0.02,
  // Parallax: back layer drifts slower than front (depth illusion)
  backDriftMultiplier: 0.4,
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
