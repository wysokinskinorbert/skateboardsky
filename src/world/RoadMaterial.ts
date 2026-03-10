import * as THREE from 'three'

/**
 * Road surface shader — asphalt with yellow center line,
 * white edge dashes, and subtle surface variation.
 * UV.x = across road (0=left edge, 1=right edge)
 * UV.y = along road (repeats with distance)
 */

const roadVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const roadFragmentShader = /* glsl */ `
  uniform vec3 uAsphaltColor;
  uniform vec3 uLineColor;
  uniform vec3 uSunDirection;
  uniform float uRoadLength;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  // Simple hash for asphalt grain
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
    vec2 uv = vUv;

    // Asphalt base with grain texture
    float grain = noise(uv * vec2(50.0, uRoadLength * 2.0)) * 0.08;
    float coarseGrain = noise(uv * vec2(15.0, uRoadLength * 0.5)) * 0.05;
    vec3 asphalt = uAsphaltColor * (1.0 - grain - coarseGrain);

    // === Yellow center line (continuous) ===
    // Center of road is at uv.x = 0.5
    float centerDist = abs(uv.x - 0.5);
    float centerLine = 1.0 - smoothstep(0.008, 0.012, centerDist);

    // === White edge dashes (intermittent) ===
    // Road edges at uv.x ≈ 0.05 and uv.x ≈ 0.95
    float leftEdgeDist = abs(uv.x - 0.06);
    float rightEdgeDist = abs(uv.x - 0.94);
    float edgeLine = 1.0 - smoothstep(0.006, 0.010, leftEdgeDist);
    edgeLine += 1.0 - smoothstep(0.006, 0.010, rightEdgeDist);
    // Dash pattern — 4m dash, 6m gap (based on road length UV tiling)
    float dashPattern = step(0.4, fract(uv.y * uRoadLength * 0.1));
    edgeLine *= dashPattern;

    // === Sun lighting (half-lambert for softer look) ===
    vec3 normal = normalize(vNormal);
    float diffuse = max(dot(normal, normalize(uSunDirection)), 0.0) * 0.5 + 0.5;

    // === Combine ===
    vec3 color = asphalt * diffuse;
    color = mix(color, uLineColor * diffuse, centerLine);
    color = mix(color, vec3(0.9, 0.9, 0.9) * diffuse, edgeLine * 0.8);

    gl_FragColor = vec4(color, 1.0);
  }
`

export function createRoadUniforms(sunDirection: THREE.Vector3) {
  return {
    uAsphaltColor: { value: new THREE.Color('#727272') },
    uLineColor: { value: new THREE.Color('#E8C840') },
    uSunDirection: { value: sunDirection.clone().normalize() },
    uRoadLength: { value: 50.0 },
  }
}

export { roadVertexShader, roadFragmentShader }
