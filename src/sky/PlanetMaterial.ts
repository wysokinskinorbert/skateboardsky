import * as THREE from 'three'

/**
 * Planet body shader — dark teal sphere with subtle surface noise
 * and Fresnel darkening at edges (limb darkening, like real planets).
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

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);
    vec3 sunDir = normalize(uSunDirection);

    // Lambert diffuse lighting from sun
    float diffuse = max(dot(normal, sunDir), 0.0) * 0.5 + 0.5; // half-lambert for softer look

    // Surface noise detail (subtle bands/continents)
    vec2 uv = vec2(atan(normal.z, normal.x) * 2.0, normal.y * 3.0);
    float surfaceNoise = noise(uv * 8.0) * 0.15 + noise(uv * 16.0) * 0.08;

    // Limb darkening — edges darker (Fresnel), but keep body visible
    float fresnel = dot(normal, viewDir);
    float limbDarkening = smoothstep(0.0, 0.5, fresnel) * 0.7 + 0.3;

    vec3 color = uBodyColor * (1.0 + surfaceNoise) * diffuse * limbDarkening;

    gl_FragColor = vec4(color, 1.0);
  }
`

/**
 * Atmosphere rim shader — Fresnel glow on slightly larger sphere.
 * Uses additive blending so glow adds to scene.
 * HDR intensity > 1.0 triggers bloom in post-processing.
 */

const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uAtmosphereColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);

    // Fresnel — bright only at very edges, transparent at center
    float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
    float glow = pow(fresnel, 5.0) * uIntensity;  // higher power = thinner rim

    // Strict rim mask — only the outermost edge glows
    float rimMask = smoothstep(0.2, 0.7, fresnel);

    vec3 color = uAtmosphereColor * glow;
    float alpha = rimMask * glow * 0.8;

    gl_FragColor = vec4(color, alpha);
  }
`

export function createPlanetBodyUniforms(sunDirection: THREE.Vector3) {
  return {
    uBodyColor: { value: new THREE.Color('#1A4060') },
    uSunDirection: { value: sunDirection.clone().normalize() },
  }
}

export function createAtmosphereUniforms(color: THREE.Color, intensity: number) {
  return {
    uAtmosphereColor: { value: color.clone() },
    uIntensity: { value: intensity },
  }
}

export {
  bodyVertexShader,
  bodyFragmentShader,
  atmosphereVertexShader,
  atmosphereFragmentShader,
}
