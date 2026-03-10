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
    float dist = length(vec2(uv.x * 0.85, uv.y * 1.15));

    // Domain warping — distort UV for organic irregular shapes
    vec2 warpOffset = vec2(
      fbm(uv * 1.2 + vec2(uSeed * 5.55, uSeed * 1.23)),
      fbm(uv * 1.2 + vec2(uSeed * 2.33, uSeed * 8.91))
    ) * 0.5;

    // Cloud shape: FBM noise with warped coordinates
    vec2 noiseCoord = (uv + warpOffset) * 2.5 + vec2(uSeed * 13.37, uSeed * 7.42);
    float cloudNoise = fbm(noiseCoord);

    // Second noise at different scale for big lump variation
    float macroNoise = fbm(uv * 0.7 + warpOffset + vec2(uSeed * 3.14, uSeed * 2.72));

    // Cumulus shape: strong radial falloff so edges go to zero
    float shape = (1.0 - dist * 1.8);                   // aggressive falloff — truly round
    shape += (cloudNoise - 0.5) * 0.8;                 // strong noise — bumpy organic edges
    shape += (macroNoise - 0.5) * 0.5;                 // big lumps
    shape += smoothstep(-0.3, 0.5, uv.y) * 0.25;      // taller top (cumulus dome)
    shape -= smoothstep(0.0, 0.3, -uv.y) * 0.2;       // flatter bottom

    // Alpha: soft puffy edge
    float alpha = smoothstep(-0.08, 0.3, shape);
    alpha *= uOpacity;

    // Base cloud color — bright white
    vec3 color = uTint;

    // Shinkai-style shading: bright white top, subtle cool shadow at bottom
    float heightGradient = smoothstep(-0.4, 0.5, uv.y);
    vec3 shadowTint = vec3(0.80, 0.82, 0.92); // very subtle cool shadow
    vec3 litTint = vec3(1.0, 1.0, 1.0);       // pure white
    color *= mix(shadowTint, litTint, heightGradient);

    // Inner volumetric detail — very subtle
    float innerDetail = smoothstep(0.3, 0.7, cloudNoise);
    color *= 0.94 + 0.06 * innerDetail;

    // Sun backlighting — STRONG warm golden edges (Shinkai signature)
    vec3 cloudDir = normalize(vWorldPosition);
    float sunDot = max(dot(cloudDir, normalize(uSunDirection)), 0.0);
    float backlight = pow(sunDot, 2.0) * uBacklightStrength;

    // Translucent rim glow — bright golden edges where light passes through
    float edgeMask = smoothstep(0.25, -0.1, shape);
    color += uSunColor * backlight * (0.6 + edgeMask * 1.2);

    // Top highlight from sun
    float topHighlight = smoothstep(0.0, 0.5, uv.y) * pow(sunDot, 1.2) * 0.2;
    color += topHighlight;

    // Slight warm tint on sun-facing clouds
    color += vec3(0.08, 0.04, 0.0) * backlight * 0.5;

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
