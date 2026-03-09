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
  atmosphereIntensity: 0.5,                      // rim glow — power 12 Fresnel, below bloom threshold
  atmosphereScale: 1.025,                        // very tight to body — thin rim
  ringColor: new THREE.Color('#80D0F0'),         // pale cyan ring
  ringIntensity: 1.5,                            // HDR
} as const

// Cloud layers — billboard cards with procedural shapes
export const CLOUDS = {
  // Back layer — behind planet, atmospheric perspective (hazy, blue-tinted)
  back: {
    count: 5,
    distanceRange: [500, 700] as [number, number],
    scaleRange: [25, 50] as [number, number],
    elevationRange: [0.02, 0.10] as [number, number],  // low elevation — well below planet arc
    azimuthSpread: Math.PI * 0.18,                       // ±32° narrow — avoid planet sides
    tint: new THREE.Color('#8AB0D0'),                    // soft blue haze
    opacity: 0.35,
  },
  // Front layer — in front of planet, vivid cumulus (scattered, gaps show sky)
  front: {
    count: 10,
    distanceRange: [350, 500] as [number, number],
    scaleRange: [35, 70] as [number, number],
    elevationRange: [0.02, 0.16] as [number, number],  // kept below planet body
    azimuthSpread: Math.PI * 0.3,                        // ±54° wide — fill the view
    tint: new THREE.Color('#FFFFFF'),                    // pure white
    opacity: 0.85,
  },
  driftSpeed: 0.02,   // very slow horizontal drift
} as const

// Camera defaults — low angle looking up to show ~70% sky like the film
export const CAMERA = {
  fov: 65,
  near: 0.1,
  far: 2000,
  position: [0, 2, 0] as [number, number, number],
  lookAt: [0, 15, -40] as [number, number, number],
} as const
