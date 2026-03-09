import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY } from '../game/constants'

/**
 * Green terrain — hillsides sloping DOWN from road edges into the valley.
 * The road sits on a mountain ridge; terrain falls away on both sides.
 * Distant valley floor extends to the horizon.
 */
export function Terrain() {
  const sunDirection = useMemo(() => {
    const dir = new THREE.Vector3()
    dir.setFromSphericalCoords(1, Math.PI / 2 - SKY.sunElevation, SKY.sunAzimuth)
    return dir
  }, [])

  const uniforms = useMemo(() => ({
    uSunDirection: { value: sunDirection },
    uGrassColor: { value: new THREE.Color('#3A8A30') },
    uGrassDarkColor: { value: new THREE.Color('#286820') },
    uHazeColor: { value: new THREE.Color('#B0C8D8') },
  }), [sunDirection])

  return (
    <group>
      {/* Left hillside — slopes down from road, well below road surface */}
      <TerrainSlope
        uniforms={uniforms}
        position={[-60, -15, -100]}
        rotation={[-Math.PI / 2, 0, 0.30]}
        size={[130, 300]}
      />
      {/* Right hillside — slopes down toward ocean side */}
      <TerrainSlope
        uniforms={uniforms}
        position={[55, -12, -110]}
        rotation={[-Math.PI / 2, 0, -0.28]}
        size={[120, 280]}
      />
      {/* Valley floor — large flat ground far below the ridge */}
      <TerrainSlope
        uniforms={uniforms}
        position={[0, -40, -250]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[600, 600]}
      />
    </group>
  )
}

const terrainVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
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
  uniform vec3 uHazeColor;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;

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

    // Half-lambert diffuse
    float diffuse = max(dot(normal, sunDir), 0.0) * 0.5 + 0.5;

    // Grass variation — patchy light/dark green
    vec2 worldUv = vWorldPosition.xz * 0.04;
    float n1 = noise(worldUv * 3.0);
    float n2 = noise(worldUv * 9.0);
    float grassMix = n1 * 0.6 + n2 * 0.3 + 0.1;
    vec3 grassColor = mix(uGrassDarkColor, uGrassColor, grassMix);

    vec3 color = grassColor * diffuse;

    // Atmospheric haze — distance fade to blue-gray
    float dist = length(vWorldPosition - cameraPosition);
    float haze = 1.0 - exp(-dist * 0.003);
    color = mix(color, uHazeColor, haze);

    gl_FragColor = vec4(color, 1.0);
  }
`

interface TerrainSlopeProps {
  uniforms: Record<string, { value: unknown }>
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number]
}

function TerrainSlope({ uniforms, position, rotation, size }: TerrainSlopeProps) {
  return (
    <mesh position={position} rotation={rotation} renderOrder={4}>
      <planeGeometry args={[size[0], size[1], 1, 1]} />
      <shaderMaterial
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
