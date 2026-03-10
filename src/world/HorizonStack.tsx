import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY } from '../game/constants'

/**
 * Horizon stack — layered 2.5D billboard cards creating depth illusion.
 * From near to far:
 * 1. Ocean/bay — flat quad with gradient (blue-green water)
 * 2. City silhouette — alpha-blended card with procedural city skyline
 * 3. Mountain ridges — distant hazy ridge cards
 * All layers use atmospheric perspective (progressively hazier/bluer).
 */
export function HorizonStack() {
  const sunDirection = useMemo(() => {
    const dir = new THREE.Vector3()
    dir.setFromSphericalCoords(1, Math.PI / 2 - SKY.sunElevation, SKY.sunAzimuth)
    return dir
  }, [])

  return (
    <group>
      {/* Ocean/bay — water surface in the valley below the mountain road.
          Low y-position creates visible gap below terrain slopes. */}
      <OceanPlane />

      {/* Mountain ridges — 3 layers from near to far with increasing haze.
          Positioned higher and larger for film-accurate visibility. */}
      <MountainRidge
        position={[-40, -10, -250]}
        scale={[550, 70, 1]}
        color="#1E3A50"
        hazeAmount={0.25}
      />
      <MountainRidge
        position={[30, -8, -320]}
        scale={[600, 60, 1]}
        color="#2A4A62"
        hazeAmount={0.40}
      />
      <MountainRidge
        position={[-15, -11, -400]}
        scale={[700, 50, 1]}
        color="#3A5A78"
        hazeAmount={0.55}
      />

      {/* City in the valley — coastal town spread along the bay.
          Larger scale and higher position for film-accurate visibility. */}
      <CitySilhouette
        position={[-5, -13, -200]}
        scale={[400, 30, 1]}
        sunDirection={sunDirection}
      />

      {/* Haze veil — warm atmospheric band at the horizon line.
          Shinkai signature: golden/peach glow where sky meets ocean. */}
      <HazeVeil />
    </group>
  )
}

// ─── Ocean ──────────────────────────────────────────────

function OceanPlane() {
  const uniforms = useMemo(() => ({
    uShallowColor: { value: new THREE.Color('#30A8C0') },
    uDeepColor: { value: new THREE.Color('#105878') },
    uHazeColor: { value: new THREE.Color('#80AAC0') },
  }), [])

  return (
    <mesh
      position={[0, -18, -160]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={3}
    >
      <planeGeometry args={[900, 550, 1, 1]} />
      <shaderMaterial
        vertexShader={oceanVertexShader}
        fragmentShader={oceanFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

const oceanVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const oceanFragmentShader = /* glsl */ `
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uHazeColor;

  varying vec3 vWorldPosition;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Gradient: shallow (near) → deep (far)
    float depthGrad = smoothstep(0.0, 1.0, vUv.y);
    vec3 waterColor = mix(uShallowColor, uDeepColor, depthGrad);

    // Subtle shimmer
    float shimmer = hash(vWorldPosition.xz * 0.3) * 0.06;
    waterColor += shimmer;

    // Atmospheric haze at distance — reduced decay to keep vivid ocean color
    float dist = length(vWorldPosition - cameraPosition);
    float haze = 1.0 - exp(-dist * 0.0008);
    waterColor = mix(waterColor, uHazeColor, haze * 0.7);

    gl_FragColor = vec4(waterColor, 1.0);
  }
`

// ─── Mountain Ridge ─────────────────────────────────────

interface MountainRidgeProps {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  hazeAmount: number
}

function MountainRidge({ position, scale, color, hazeAmount }: MountainRidgeProps) {
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uHazeColor: { value: new THREE.Color('#B8D0E0') },
    uHazeAmount: { value: hazeAmount },
  }), [color, hazeAmount])

  return (
    <mesh position={position} scale={scale} renderOrder={4}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        vertexShader={ridgeVertexShader}
        fragmentShader={ridgeFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

const ridgeVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ridgeFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHazeColor;
  uniform float uHazeAmount;

  varying vec2 vUv;

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
    // Procedural mountain ridge silhouette
    float ridgeHeight = 0.3
      + noise(vec2(vUv.x * 5.0, 0.0)) * 0.3
      + noise(vec2(vUv.x * 12.0, 0.5)) * 0.15
      + noise(vec2(vUv.x * 25.0, 1.0)) * 0.08;

    // Alpha: below ridge line = solid, above = transparent
    float alpha = smoothstep(ridgeHeight + 0.02, ridgeHeight - 0.02, vUv.y);

    // Fade out at horizontal edges
    float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
    alpha *= edgeFade;

    vec3 color = mix(uColor, uHazeColor, uHazeAmount);

    gl_FragColor = vec4(color, alpha);
  }
`

// ─── City Silhouette ────────────────────────────────────

interface CitySilhouetteProps {
  position: [number, number, number]
  scale: [number, number, number]
  sunDirection: THREE.Vector3
}

function CitySilhouette({ position, scale, sunDirection }: CitySilhouetteProps) {
  const uniforms = useMemo(() => ({
    uSunDirection: { value: sunDirection },
    uBuildingColor: { value: new THREE.Color('#3A5060') },
    uHazeColor: { value: new THREE.Color('#A0B8C8') },
  }), [sunDirection])

  return (
    <mesh position={position} scale={scale} renderOrder={4}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        vertexShader={cityVertexShader}
        fragmentShader={cityFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

const cityVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const cityFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uBuildingColor;
  uniform vec3 uHazeColor;

  varying vec2 vUv;

  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }

  void main() {
    // Procedural city skyline — many thin columns of varying height
    float col = floor(vUv.x * 80.0);
    float buildingHeight = hash(col * 1.37) * 0.35 + 0.05;

    // Variation: occasional tall buildings (landmarks/towers)
    float tallBuilding = step(0.8, hash(col * 2.71)) * 0.25;
    buildingHeight += tallBuilding;

    // Clusters: buildings group together with gaps between clusters
    float cluster = smoothstep(0.3, 0.5, hash(floor(col / 5.0) * 7.77));
    buildingHeight *= cluster;

    // Windows — subtle tiny dots
    float windowX = fract(vUv.x * 80.0);
    float windowY = fract(vUv.y * 40.0);
    float windowMask = step(0.35, windowX) * step(windowX, 0.65)
                     * step(0.35, windowY) * step(windowY, 0.65);
    float windowBrightness = windowMask * step(0.6, hash(col * 3.14 + floor(vUv.y * 40.0))) * 0.08;

    // Alpha: below building top = solid, above = transparent
    float alpha = smoothstep(buildingHeight + 0.02, buildingHeight - 0.02, vUv.y);

    // Wide fade out at edges — city blends smoothly into surroundings
    float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    alpha *= edgeFade;

    // Atmospheric perspective — city is very distant, heavily hazed
    vec3 color = mix(uBuildingColor, uHazeColor, 0.55);
    color += windowBrightness;

    gl_FragColor = vec4(color, alpha);
  }
`

// ─── Haze Veil ─────────────────────────────────

function HazeVeil() {
  const uniforms = useMemo(() => ({
    uWarmColor: { value: new THREE.Color('#D0A068') },
    uCoolColor: { value: new THREE.Color('#6888A8') },
  }), [])

  return (
    <mesh
      position={[0, -6, -520]}
      renderOrder={4}
    >
      <planeGeometry args={[1400, 80, 1, 1]} />
      <shaderMaterial
        vertexShader={hazeVeilVertexShader}
        fragmentShader={hazeVeilFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

const hazeVeilVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const hazeVeilFragmentShader = /* glsl */ `
  uniform vec3 uWarmColor;
  uniform vec3 uCoolColor;

  varying vec2 vUv;

  void main() {
    // Vertical gradient: warm at bottom (horizon line) → cool at top
    float grad = smoothstep(0.0, 1.0, vUv.y);
    vec3 color = mix(uWarmColor, uCoolColor, grad);

    // Alpha: strongest at center, fading at top and bottom
    float alpha = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.4, vUv.y);
    alpha *= 0.45; // warm atmospheric glow at horizon

    // Horizontal fade at edges
    float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
    alpha *= edgeFade;

    gl_FragColor = vec4(color, alpha);
  }
`
