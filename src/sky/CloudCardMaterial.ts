import * as THREE from 'three'

/**
 * Procedural cloud billboard shader — film-accurate Shinkai cumulus.
 * Features:
 * - Time-based shape evolution (edges morph, wisps evolve)
 * - Variable density (thin parts are semi-transparent)
 * - Edge wisps/tendrils (high-freq noise at cloud boundaries)
 * - Strong directional sun-side lighting (3D volumetric look)
 * - Warm horizon bounce light on cloud bottoms
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
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

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
    vec2 uv = vUv * 2.0 - 1.0;
    float dist = length(vec2(uv.x * 0.85, uv.y * 1.15));

    // Time-based shape evolution — slow morphing of cloud edges
    vec2 timeOffset = vec2(uTime * 0.008, uTime * 0.005);

    // Domain warping with time evolution for organic shape changes
    vec2 warpOffset = vec2(
      fbm(uv * 1.2 + vec2(uSeed * 5.55, uSeed * 1.23) + timeOffset),
      fbm(uv * 1.2 + vec2(uSeed * 2.33, uSeed * 8.91) + timeOffset * 0.7)
    ) * 0.5;

    // Cloud shape with time-evolving noise
    vec2 noiseCoord = (uv + warpOffset) * 2.5 + vec2(uSeed * 13.37, uSeed * 7.42);
    float cloudNoise = fbm(noiseCoord + timeOffset * 1.5);
    float macroNoise = fbm(uv * 0.7 + warpOffset + vec2(uSeed * 3.14, uSeed * 2.72) + timeOffset * 0.5);

    // Cumulus shape
    float shape = (1.0 - dist * 1.8);
    shape += (cloudNoise - 0.5) * 0.8;
    shape += (macroNoise - 0.5) * 0.5;
    shape += smoothstep(-0.3, 0.5, uv.y) * 0.25;      // taller top (cumulus dome)
    shape -= smoothstep(0.0, 0.3, -uv.y) * 0.2;        // flatter bottom

    // Edge wisps — high-freq detail at cloud boundaries for "cauliflower" texture
    float edgeZone = smoothstep(0.25, -0.05, shape);
    float wispNoise = fbm((uv + warpOffset) * 5.0 + timeOffset * 2.5 + vec2(uSeed * 11.1));
    shape += edgeZone * (wispNoise - 0.4) * 0.35;

    // Alpha with variable density — thin parts of cloud are semi-transparent
    float baseAlpha = smoothstep(-0.08, 0.3, shape);
    float densityNoise = noise((uv + warpOffset) * 3.0 + vec2(uSeed * 4.44) + timeOffset * 0.3);
    float densityFactor = mix(0.5, 1.0, smoothstep(0.05, 0.45, shape) * (0.5 + 0.5 * densityNoise));
    float alpha = baseAlpha * densityFactor * uOpacity;

    // Base cloud color
    vec3 color = uTint;

    // --- 3D directional lighting ---
    vec3 toCamera = normalize(cameraPosition - vWorldPosition);
    vec3 cloudRight = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
    vec3 cloudUp = normalize(cross(toCamera, cloudRight));

    vec3 sunDirN = normalize(uSunDirection);
    float sunR = dot(sunDirN, cloudRight);
    float sunU = dot(sunDirN, cloudUp);
    vec2 sunOnPlane = normalize(vec2(sunR, sunU));

    float sunFacing = dot(uv, sunOnPlane);
    float lightGrad = smoothstep(-0.5, 0.9, sunFacing);

    // Film-accurate shadow: much darker blue-grey (~38% brightness)
    vec3 cloudShadow = vec3(0.38, 0.42, 0.62);
    vec3 cloudLit = vec3(1.0, 1.0, 1.0);
    color *= mix(cloudShadow, cloudLit, lightGrad);

    // Bottom darkening — cumulus flat dark bottoms
    float bottomDark = smoothstep(-0.6, 0.1, uv.y);
    color *= 0.62 + 0.38 * bottomDark;

    // Internal density darkening
    float intDensity = smoothstep(-0.05, 0.35, shape);
    color *= 0.85 + 0.15 * (1.0 - intDensity * 0.4);

    // Sun backlighting — warm golden edges
    vec3 cloudDir = normalize(vWorldPosition);
    float sunDot = max(dot(cloudDir, normalize(uSunDirection)), 0.0);
    float backlight = pow(sunDot, 3.0) * uBacklightStrength;

    float edgeMask = smoothstep(0.20, -0.15, shape);
    color += uSunColor * backlight * edgeMask * 0.8;
    color += vec3(0.05, 0.03, 0.0) * backlight * lightGrad * 0.3;

    // Warm horizon bounce light on cloud bottoms
    float lowCloud = 1.0 - smoothstep(-0.2, 0.3, uv.y);
    float nearHorizon = 1.0 - smoothstep(0.0, 0.2, normalize(vWorldPosition).y);
    color += vec3(0.15, 0.08, 0.02) * lowCloud * nearHorizon * 0.6;

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
    uSunColor: { value: new THREE.Color('#FFE8C0') },
    uBacklightStrength: { value: config.backlightStrength },
    uTime: { value: 0.0 },
  }
}

export { vertexShader, fragmentShader }
