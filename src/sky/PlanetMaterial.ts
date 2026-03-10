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

    // Surface detail — gas giant bands + storm patterns (film-accurate)
    vec2 uv = vec2(atan(normal.z, normal.x) * 2.0, normal.y * 3.0);
    // Horizontal bands (like Jupiter) — more prominent for visual distinction
    float bands = noise(vec2(0.0, uv.y * 12.0)) * 0.20;
    // Storm swirls — large-scale vortex pattern
    float storm1 = noise(uv * 4.0 + vec2(bands * 2.0, 0.0)) * 0.25;
    float storm2 = noise(uv * 9.0 + vec2(storm1 * 3.0, bands)) * 0.14;
    // Fine texture
    float detail = noise(uv * 18.0) * 0.08;
    float surfaceNoise = bands + storm1 + storm2 + detail - 0.20;

    // Fresnel — used for both limb darkening AND atmosphere rim glow
    float fresnel = dot(normal, viewDir);

    // Limb darkening — edges darker
    float limbDarkening = smoothstep(0.0, 0.5, fresnel) * 0.7 + 0.3;

    vec3 bodyColor = uBodyColor * (1.0 + surfaceNoise) * diffuse * limbDarkening;

    // Atmosphere rim glow — very bright emissive at body edge (Shinkai-style)
    float rimFresnel = 1.0 - fresnel;

    // Film-accurate: razor-thin atmosphere rim (~2-3px in rendered frame)
    // Using smoothstep cutoff instead of pow() for precise pixel-width control.
    // rimFresnel 0.996 = ~0.23° from edge, 0.9995 = ~0.03° from edge
    // At HFOV~105°/1200px, each pixel ≈ 0.087°, so this band ≈ 2-3px wide.
    float rimBand = smoothstep(0.993, 0.999, rimFresnel);
    vec3 atmosphereGlow = uAtmosphereColor * rimBand * uAtmosphereIntensity * 1.5;

    // Blend: body + thin atmosphere line at rim
    vec3 color = bodyColor + atmosphereGlow;

    // Clip planet below terrain level — prevents bleed through terrain gaps
    if (vWorldPosition.y < 0.0) discard;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function createPlanetBodyUniforms(
  sunDirection: THREE.Vector3,
  bodyColor: THREE.Color,
  atmosphereColor: THREE.Color,
  atmosphereIntensity: number,
) {
  return {
    uBodyColor: { value: bodyColor.clone() },
    uSunDirection: { value: sunDirection.clone().normalize() },
    uAtmosphereColor: { value: atmosphereColor.clone() },
    uAtmosphereIntensity: { value: atmosphereIntensity },
  }
}

export {
  bodyVertexShader,
  bodyFragmentShader,
}
