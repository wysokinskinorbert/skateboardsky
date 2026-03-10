import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY } from '../game/constants'

/**
 * Green terrain — hillsides sloping DOWN from road edges into the valley.
 * Layout matches film keyframes: road on mountain ridge, green slopes
 * descending on both sides revealing the valley below (city, ocean, mountains).
 *
 * Structure:
 * 1. Base ground — opaque plane at road level covering near/mid terrain
 * 2. Left hillside — slopes down from road-left into the valley
 * 3. Right hillside — slopes down from road-right into the valley
 */
export function Terrain() {
  const sunDirection = useMemo(() => {
    const dir = new THREE.Vector3()
    dir.setFromSphericalCoords(1, Math.PI / 2 - SKY.sunElevation, SKY.sunAzimuth)
    return dir
  }, [])

  const uniforms = useMemo(() => ({
    uSunDirection: { value: sunDirection },
    uGrassColor: { value: new THREE.Color('#40A835') },
    uGrassDarkColor: { value: new THREE.Color('#2A7A22') },
  }), [sunDirection])

  // Slope tilt: ~30° steep hillside descent into the valley
  const slopeAngle = 0.52

  return (
    <group>
      {/* BASE GROUND — narrow strip at road level, near-camera only. */}
      <TerrainPlane
        uniforms={uniforms}
        position={[0, 21, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[50, 70]}
        fade="none"
      />

      {/* LEFT HILLSIDE — strip descending from road-left into valley.
          Wider and longer than before to frame the road properly. */}
      <TerrainPlane
        uniforms={uniforms}
        position={[-38, 8, -20]}
        rotation={[-Math.PI / 2, 0, -slopeAngle]}
        size={[55, 150]}
        fade="right"
      />

      {/* RIGHT HILLSIDE — strip descending from road-right into valley. */}
      <TerrainPlane
        uniforms={uniforms}
        position={[38, 8, -20]}
        rotation={[-Math.PI / 2, 0, slopeAngle]}
        size={[55, 150]}
        fade="left"
      />
    </group>
  )
}

const terrainVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const terrainFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uGrassColor;
  uniform vec3 uGrassDarkColor;
  uniform int uFadeMode; // 0=none, 1=edges, 2=right only, 3=left only

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
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
    vec3 normal = normalize(vNormal);
    vec3 sunDir = normalize(uSunDirection);

    float diffuse = max(dot(normal, sunDir), 0.0) * 0.5 + 0.5;

    vec2 worldUv = vWorldPosition.xz * 0.04;
    float n1 = noise(worldUv * 3.0);
    float n2 = noise(worldUv * 9.0);
    float grassMix = n1 * 0.6 + n2 * 0.3 + 0.1;
    vec3 grassColor = mix(uGrassDarkColor, uGrassColor, grassMix);

    vec3 color = grassColor * diffuse;

    // Atmospheric perspective — distant terrain fades to cool blue haze
    float distFromCam = length(vWorldPosition - cameraPosition);
    float distHaze = smoothstep(80.0, 450.0, distFromCam);
    vec3 terrainHaze = vec3(0.45, 0.58, 0.68);
    color = mix(color, terrainHaze, distHaze * 0.5);

    float alpha = 1.0;
    if (uFadeMode == 1) {
      // Fade all edges — wider fade for smooth blending with HorizonStack
      alpha = smoothstep(0.0, 0.20, vUv.x) * smoothstep(1.0, 0.80, vUv.x)
            * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.70, vUv.y);
    } else if (uFadeMode == 2) {
      // LEFT slope — organic fades with noise for natural hillside edge
      float nEdge = noise(vWorldPosition.xz * 0.08) * 0.15;
      float outerFade = smoothstep(0.0, 0.40 + nEdge, vUv.x);
      float roadFade = smoothstep(1.0, 0.75, vUv.x);
      float frontFade = smoothstep(0.0, 0.05, vUv.y);
      float nFar = noise(vWorldPosition.xz * 0.05) * 0.12;
      float farFade = smoothstep(1.0, 0.30 + nFar, vUv.y);
      alpha = outerFade * roadFade * frontFade * farFade;
    } else if (uFadeMode == 3) {
      // RIGHT slope — organic fades with noise for natural hillside edge
      float nEdge = noise(vWorldPosition.xz * 0.08) * 0.15;
      float roadFade = smoothstep(0.0, 0.25, vUv.x);
      float outerFade = smoothstep(1.0, 0.60 - nEdge, vUv.x);
      float frontFade = smoothstep(0.0, 0.05, vUv.y);
      float nFar = noise(vWorldPosition.xz * 0.05) * 0.12;
      float farFade = smoothstep(1.0, 0.30 + nFar, vUv.y);
      alpha = roadFade * outerFade * frontFade * farFade;
    }

    gl_FragColor = vec4(color, alpha);
  }
`

interface TerrainPlaneProps {
  uniforms: Record<string, { value: unknown }>
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number]
  fade: 'none' | 'edges' | 'right' | 'left'
}

function TerrainPlane({ uniforms, position, rotation, size, fade }: TerrainPlaneProps) {
  const fadeMode = fade === 'none' ? 0 : fade === 'edges' ? 1 : fade === 'right' ? 2 : 3
  const isTransparent = fade !== 'none'

  const fullUniforms = useMemo(() => ({
    ...uniforms,
    uFadeMode: { value: fadeMode },
  }), [uniforms, fadeMode])

  return (
    <mesh position={position} rotation={rotation} renderOrder={4}>
      <planeGeometry args={[size[0], size[1], 1, 1]} />
      <shaderMaterial
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={fullUniforms}
        side={THREE.DoubleSide}
        transparent={isTransparent}
        depthWrite={!isTransparent}
      />
    </mesh>
  )
}
