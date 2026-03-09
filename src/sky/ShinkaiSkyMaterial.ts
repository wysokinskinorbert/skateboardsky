import * as THREE from 'three'

/**
 * Custom sky shader material matching Makoto Shinkai's anime sky palette.
 * Uses elevation-based gradient with non-linear transitions and sun glow.
 *
 * Colors sampled directly from film keyframes:
 * - Zenith: deep indigo (#0F1B45)
 * - Mid: rich blue (#1E3A80)
 * - Lower: bright blue (#4080B8)
 * - Horizon: warm golden (#D09050)
 * - Haze: pale warm (#F0D8B0)
 * - Sun: HDR warm white (#FFFAE0) — triggers bloom
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
  uniform vec3 uHorizonColor;
  uniform vec3 uHazeColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;

  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(vWorldPosition);
    float elevation = viewDir.y; // -1 (nadir) to +1 (zenith)

    // Remap: 0 at horizon, 1 at zenith (clamp below horizon)
    float t = clamp(elevation, 0.0, 1.0);

    // Non-linear gradient stops — film shows thin warm horizon, blue dominates 80%+
    // haze 0.0 → horizon 0.01 → mid 0.06 → upper 0.30 → zenith 0.75+
    float hazeToHorizon = smoothstep(0.0, 0.015, t);
    float horizonToMid  = smoothstep(0.01, 0.07, t);
    float midToUpper    = smoothstep(0.06, 0.35, t);
    float upperToZenith = smoothstep(0.30, 0.80, t);

    // Build gradient bottom-up
    vec3 sky = uHazeColor;
    sky = mix(sky, uHorizonColor, hazeToHorizon);
    sky = mix(sky, uMidColor, horizonToMid);
    sky = mix(sky, uUpperColor, midToUpper);
    sky = mix(sky, uZenithColor, upperToZenith);

    // Sun warm bleed — Shinkai's signature warm glow bleeding upward near sun
    // Only affects lower sky (near horizon), fades out as elevation increases
    vec3 sunDir = normalize(uSunDirection);
    float sunDot = dot(viewDir, sunDir);
    float sunProximity = pow(max(sunDot, 0.0), 5.0);
    float lowSkyMask = 1.0 - smoothstep(0.05, 0.35, t); // only below ~35% elevation
    sky = mix(sky, mix(sky, uHorizonColor, 0.3), sunProximity * lowSkyMask);

    // Sun glow — tight disc + soft halo (Mie-like forward scatter)
    float sunDisc = pow(max(sunDot, 0.0), 512.0) * uSunIntensity * 3.0;  // sharp bright disc
    float sunGlow = pow(max(sunDot, 0.0), 96.0) * uSunIntensity * 0.25;  // tight glow
    float sunHalo = pow(max(sunDot, 0.0), 12.0) * 0.06;                   // subtle wide halo

    sky += uSunColor * (sunDisc + sunGlow + sunHalo);

    // Below horizon: fade to very dark terrain color
    float belowHorizon = smoothstep(-0.05, 0.0, elevation);
    vec3 groundColor = vec3(0.02, 0.03, 0.02); // very dark green
    sky = mix(groundColor, sky, belowHorizon);

    gl_FragColor = vec4(sky, 1.0);
  }
`

export function createShinkaiSkyUniforms(sunDirection: THREE.Vector3) {
  return {
    uZenithColor:  { value: new THREE.Color('#0F1B45') },  // deep indigo
    uUpperColor:   { value: new THREE.Color('#1E3A80') },  // rich blue
    uMidColor:     { value: new THREE.Color('#4080B8') },  // bright blue
    uHorizonColor: { value: new THREE.Color('#C08850') },  // warm amber
    uHazeColor:    { value: new THREE.Color('#F0D8B0') },  // pale gold haze
    uSunColor:     { value: new THREE.Color('#FFF8E0') },  // warm white
    uSunDirection: { value: sunDirection.clone().normalize() },
    uSunIntensity: { value: 3.0 },                         // HDR for bloom
  }
}

export { vertexShader, fragmentShader }
