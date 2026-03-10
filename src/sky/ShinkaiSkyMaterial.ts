import * as THREE from 'three'

/**
 * Custom sky shader — film-accurate Makoto Shinkai gradient.
 * Based on pixel analysis of keyframe_001 (FILM_PIXEL_ANALYSIS.md).
 * Key: the sky is 85% deep blue, with a SUBTLE warm horizon zone.
 * The warm zone is mostly hidden by terrain/landscape in the film.
 */

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uZenithColor;
  uniform vec3 uUpperColor;
  uniform vec3 uMidColor;
  uniform vec3 uLowBlueColor;   // blue just above horizon (film: #4080C0)
  uniform vec3 uHorizonColor;   // muted warm at horizon line
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;

  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
    float elevation = viewDir.y;
    float t = clamp(elevation, 0.0, 1.0);

    // 5-stop gradient — SMOOTH transitions matching film's atmospheric look
    // Key: film sky is dominated by BLUE. Warm zone is tiny and muted.
    // Film pixel analysis (see FILM_PIXEL_ANALYSIS.md):
    //   t=0.00: muted warm horizon (#90A8B0 grey-blue, NOT bright orange)
    //   t=0.03: low blue (#4080C0)
    //   t=0.10: mid blue (#2050B8)
    //   t=0.35: upper blue (#162878)
    //   t=0.75: zenith (#080E35)

    float s_horizonToLow = smoothstep(0.000, 0.040, t);   // horizon → low blue
    float s_lowToMid     = smoothstep(0.025, 0.120, t);   // low blue → mid blue
    float s_midToUpper   = smoothstep(0.080, 0.400, t);   // mid → upper blue
    float s_upperToZen   = smoothstep(0.350, 0.800, t);   // upper → zenith

    vec3 sky = uHorizonColor;
    sky = mix(sky, uLowBlueColor, s_horizonToLow);
    sky = mix(sky, uMidColor,     s_lowToMid);
    sky = mix(sky, uUpperColor,   s_midToUpper);
    sky = mix(sky, uZenithColor,  s_upperToZen);

    // Sun warm influence — VERY subtle, only near sun position
    vec3 sunDir = normalize(uSunDirection);
    float sunDot = dot(viewDir, sunDir);
    float sunProximity = pow(max(sunDot, 0.0), 5.0);
    float lowSkyMask = 1.0 - smoothstep(0.01, 0.08, t);
    vec3 warmTint = vec3(0.15, 0.08, 0.02);
    sky += warmTint * sunProximity * lowSkyMask * 0.5;

    // Sun glow — film-accurate: small contained glow ~2° radius (~5% of frame)
    // pow(1200) = tight disc ~0.6° radius
    // pow(800) = inner glow ~1.5° radius (was 300→3.9°, too wide)
    // pow(200) = outer halo ~3.4° radius (was 60→8.7°, too wide)
    float sunDisc = pow(max(sunDot, 0.0), 1200.0) * uSunIntensity * 1.0;
    float sunGlow = pow(max(sunDot, 0.0), 800.0) * uSunIntensity * 0.04;
    float sunHalo = pow(max(sunDot, 0.0), 200.0) * 0.004;
    sky += uSunColor * (sunDisc + sunGlow + sunHalo);

    // Below horizon: dark terrain
    float belowHorizon = smoothstep(-0.04, 0.0, elevation);
    vec3 groundColor = vec3(0.02, 0.03, 0.02);
    sky = mix(groundColor, sky, belowHorizon);

    gl_FragColor = vec4(sky, 1.0);
  }
`

export function createShinkaiSkyUniforms(sunDirection: THREE.Vector3) {
  return {
    uZenithColor:   { value: new THREE.Color('#080E35') },  // near-black indigo (film: top 3%)
    uUpperColor:    { value: new THREE.Color('#102060') },  // dark blue (film: around planet)
    uMidColor:      { value: new THREE.Color('#1840A0') },  // vivid saturated blue (film dominant)
    uLowBlueColor:  { value: new THREE.Color('#4080C0') },  // light blue near horizon
    uHorizonColor:  { value: new THREE.Color('#90A8B8') },  // muted grey-blue at horizon line
    uSunColor:      { value: new THREE.Color('#FFF8E0') },  // warm white
    uSunDirection:  { value: sunDirection.clone().normalize() },
    uSunIntensity:  { value: 1.5 },
  }
}

export { vertexShader, fragmentShader }
