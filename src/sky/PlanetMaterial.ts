import * as THREE from 'three'

/**
 * Planet body shader — dark teal sphere with subtle surface noise,
 * Fresnel limb darkening, and integrated atmosphere rim glow.
 * The atmosphere glow is emissive Fresnel at the body edge (power 12)
 * replacing the previous separate atmosphere sphere approach.
 */

const bodyVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const bodyFragmentShader = /* glsl */ `
  uniform vec3 uBodyColor;
  uniform vec3 uSunDirection;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  // Simple hash for surface detail
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereIntensity;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);
    vec3 sunDir = normalize(uSunDirection);

    // Lambert diffuse lighting from sun
    float diffuse = max(dot(normal, sunDir), 0.0) * 0.5 + 0.5; // half-lambert for softer look

    // Surface noise detail (subtle bands/continents)
    vec2 uv = vec2(atan(normal.z, normal.x) * 2.0, normal.y * 3.0);
    float surfaceNoise = noise(uv * 8.0) * 0.15 + noise(uv * 16.0) * 0.08;

    // Fresnel — used for both limb darkening AND atmosphere rim glow
    float fresnel = dot(normal, viewDir);

    // Limb darkening — edges darker
    float limbDarkening = smoothstep(0.0, 0.5, fresnel) * 0.7 + 0.3;

    vec3 bodyColor = uBodyColor * (1.0 + surfaceNoise) * diffuse * limbDarkening;

    // Atmosphere rim glow — emissive at the very edge of the body silhouette
    // This replaces the separate atmosphere sphere — glow is ONLY on the body edge
    float rimFresnel = 1.0 - fresnel;
    float rimGlow = pow(rimFresnel, 12.0) * uAtmosphereIntensity;
    vec3 atmosphereGlow = uAtmosphereColor * rimGlow;

    // Blend: body transitions to bright atmosphere glow at the rim
    vec3 color = bodyColor + atmosphereGlow;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function createPlanetBodyUniforms(
  sunDirection: THREE.Vector3,
  atmosphereColor: THREE.Color,
  atmosphereIntensity: number,
) {
  return {
    uBodyColor: { value: new THREE.Color('#1A4060') },
    uSunDirection: { value: sunDirection.clone().normalize() },
    uAtmosphereColor: { value: atmosphereColor.clone() },
    uAtmosphereIntensity: { value: atmosphereIntensity },
  }
}

export {
  bodyVertexShader,
  bodyFragmentShader,
}
