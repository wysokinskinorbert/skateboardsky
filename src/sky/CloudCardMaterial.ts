import * as THREE from 'three'

/**
 * Procedural cloud billboard shader.
 * Generates cumulus-like shapes using FBM noise with soft alpha edges.
 * Supports sun backlighting (warm golden edge on sun-facing side).
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uSeed;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uBacklightStrength;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  // Hash functions for noise
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

  // FBM — fractal Brownian motion for cloud shape (5 octaves for detail)
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    // Center UV: -1 to 1
    vec2 uv = vUv * 2.0 - 1.0;

    // Elliptical distance — wider than tall (cumulus proportion)
    float dist = length(vec2(uv.x * 0.8, uv.y * 1.1));

    // Cloud shape: FBM noise offset by seed for uniqueness
    vec2 noiseCoord = uv * 3.0 + vec2(uSeed * 13.37, uSeed * 7.42);
    float cloudNoise = fbm(noiseCoord);

    // Second noise layer at different scale for macro silhouette variation
    float macroNoise = fbm(uv * 1.0 + vec2(uSeed * 3.14, uSeed * 2.72));

    // Third noise — large-scale warp for unique silhouette per cloud
    float warpNoise = fbm(uv * 0.6 + vec2(uSeed * 5.55, uSeed * 1.23));

    // Cumulus shape: noise-driven organic silhouette
    float shape = (1.0 - dist * 1.1);                   // gentle radial envelope
    shape += (cloudNoise - 0.5) * 0.65;                // strong fine noise — bumpy edges
    shape += (macroNoise - 0.5) * 0.35;                // macro shape — big lumps
    shape += (warpNoise - 0.5) * 0.15;                 // warp — unique silhouette
    shape += smoothstep(-0.4, 0.6, uv.y) * 0.15;      // slightly taller top
    shape -= smoothstep(0.0, 0.5, -uv.y) * 0.08;      // very gentle flat bottom hint

    // Alpha: wide soft edge for puffy, painterly look
    float alpha = smoothstep(-0.02, 0.45, shape);
    alpha *= uOpacity;

    // Base cloud color — bright white/grey
    vec3 color = uTint;

    // Self-shadowing: darker at bottom, brighter at top (Shinkai-style)
    float heightGradient = smoothstep(-0.6, 0.7, uv.y);
    color *= 0.65 + 0.35 * heightGradient;

    // Inner volumetric shadow — darker where noise is lower
    float innerShadow = smoothstep(0.3, 0.7, cloudNoise);
    color *= 0.85 + 0.15 * innerShadow;

    // Sun backlighting — warm golden edge on sun-facing side
    vec3 cloudDir = normalize(vWorldPosition);
    float sunDot = max(dot(cloudDir, normalize(uSunDirection)), 0.0);
    float backlight = pow(sunDot, 3.0) * uBacklightStrength;

    // Backlight affects edges more (where alpha is partially transparent)
    float edgeMask = smoothstep(0.15, 0.0, shape - 0.05);
    color += uSunColor * backlight * (0.4 + edgeMask * 0.6);

    // Discard fully transparent pixels
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
  }
`

export interface CloudCardConfig {
  seed: number
  tint: THREE.Color
  opacity: number
  sunDirection: THREE.Vector3
  backlightStrength: number
}

export function createCloudCardUniforms(config: CloudCardConfig) {
  return {
    uSeed: { value: config.seed },
    uTint: { value: config.tint.clone() },
    uOpacity: { value: config.opacity },
    uSunDirection: { value: config.sunDirection.clone().normalize() },
    uSunColor: { value: new THREE.Color('#FFE8C0') },  // warm gold backlight
    uBacklightStrength: { value: config.backlightStrength },
  }
}

export { vertexShader, fragmentShader }
