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
      {/* Ocean/bay — flat water surface far below in the valley */}
      <OceanPlane />

      {/* Mountain ridges — distant hazy silhouettes */}
      <MountainRidge
        position={[-150, -8, -500]}
        scale={[600, 60, 1]}
        color="#4A6A80"
        hazeAmount={0.6}
      />
      <MountainRidge
        position={[100, -5, -600]}
        scale={[500, 45, 1]}
        color="#5A7A90"
        hazeAmount={0.75}
      />

      {/* City in the valley — silhouette card */}
      <CitySilhouette
        position={[-30, -22, -350]}
        scale={[250, 30, 1]}
        sunDirection={sunDirection}
      />
    </group>
  )
}

// ─── Ocean ──────────────────────────────────────────────

function OceanPlane() {
  const uniforms = useMemo(() => ({
    uShallowColor: { value: new THREE.Color('#3AA0B0') },
    uDeepColor: { value: new THREE.Color('#1A5070') },
    uHazeColor: { value: new THREE.Color('#B8D0E0') },
  }), [])

  return (
    <mesh
      position={[0, -35, -400]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={4}
    >
      <planeGeometry args={[800, 500, 1, 1]} />
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

    // Atmospheric haze at distance
    float dist = length(vWorldPosition - cameraPosition);
    float haze = 1.0 - exp(-dist * 0.002);
    waterColor = mix(waterColor, uHazeColor, haze);

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
    // Procedural city skyline — columns of varying height
    float col = floor(vUv.x * 60.0);
    float buildingHeight = hash(col * 1.37) * 0.5 + 0.1;

    // Variation: some buildings taller, some shorter
    float tallBuilding = step(0.7, hash(col * 2.71)) * 0.3;
    buildingHeight += tallBuilding;

    // Windows — small bright dots
    float windowX = fract(vUv.x * 60.0);
    float windowY = fract(vUv.y * 30.0);
    float windowMask = step(0.3, windowX) * step(windowX, 0.7)
                     * step(0.3, windowY) * step(windowY, 0.7);
    float windowBrightness = windowMask * step(0.5, hash(col * 3.14 + floor(vUv.y * 30.0))) * 0.15;

    // Alpha: below building top = solid, above = transparent
    float alpha = smoothstep(buildingHeight + 0.01, buildingHeight - 0.01, vUv.y);

    // Fade out at horizontal edges
    float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
    alpha *= edgeFade;

    // Color: buildings + atmospheric haze (city is distant, quite hazy)
    vec3 color = mix(uBuildingColor, uHazeColor, 0.5);
    color += windowBrightness;

    gl_FragColor = vec4(color, alpha);
  }
`
