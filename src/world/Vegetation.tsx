import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD, SKY } from '../game/constants'

type TreeType = 'green' | 'sakura'

interface TreeInstance {
  position: THREE.Vector3
  scale: number
  type: TreeType
  seed: number
}

/**
 * Billboard vegetation along the road — green deciduous trees and
 * pink sakura/cherry blossom trees. Key visual element from film.
 *
 * Trees are procedural billboard quads with alpha-tested shader
 * creating anime-style foliage shapes.
 */
export function Vegetation() {
  const trees = useMemo(() => {
    const curve = createRoadSpline()
    const generated = generateTreeInstances(curve)

    // Force prominent sakura trees at visible positions near camera
    const heroSakura: TreeInstance[] = [
      { position: new THREE.Vector3(-14, 20, -6), scale: 6, type: 'sakura', seed: 9001 },
      { position: new THREE.Vector3(16, 19.5, -12), scale: 5.5, type: 'sakura', seed: 9002 },
      { position: new THREE.Vector3(-20, 17, -28), scale: 7, type: 'sakura', seed: 9003 },
      { position: new THREE.Vector3(22, 15, -42), scale: 5, type: 'sakura', seed: 9004 },
      { position: new THREE.Vector3(-12, 13, -58), scale: 6.5, type: 'sakura', seed: 9005 },
      { position: new THREE.Vector3(18, 11, -75), scale: 6, type: 'sakura', seed: 9006 },
    ]

    return [...heroSakura, ...generated]
  }, [])

  return (
    <group>
      {trees.map((tree, i) => (
        <TreeBillboard
          key={i}
          position={tree.position}
          scale={tree.scale}
          treeType={tree.type}
          seed={tree.seed}
        />
      ))}
    </group>
  )
}

// ─── Road Spline Utility ─────────────────────────────────

function createRoadSpline(): THREE.CatmullRomCurve3 {
  const points = ROAD.splinePoints.map(
    (p) => new THREE.Vector3(p[0], p[1], p[2])
  )
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3)
}

// ─── Tree Instances ──────────────────────────────────────

function generateTreeInstances(curve: THREE.CatmullRomCurve3): TreeInstance[] {
  const trees: TreeInstance[] = []
  const totalLength = curve.getLength()
  const worldUp = new THREE.Vector3(0, 1, 0)

  // Trees along the road at semi-random intervals
  let dist = 8
  let seed = 0

  while (dist < totalLength - 40) {
    const t = dist / totalLength
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize()

    // Pseudo-random placement using golden ratio
    const hash = Math.abs(Math.sin(seed * 12.9898 + 78.233) * 43758.5453) % 1

    // Scatter trees on both sides, further from road
    const sides = hash > 0.3 ? [1, -1] : [hash > 0.15 ? 1 : -1]

    for (const side of sides) {
      const sideOffset = ROAD.width * (0.8 + hash * 1.5) * side
      const forwardJitter = (hash - 0.5) * 8

      const tJitter = Math.min(Math.max(t + forwardJitter / totalLength, 0.01), 0.99)
      const jPoint = curve.getPointAt(tJitter)
      const jTangent = curve.getTangentAt(tJitter).normalize()
      const jRight = new THREE.Vector3().crossVectors(jTangent, worldUp).normalize()

      const treePos = jPoint.clone().add(jRight.clone().multiplyScalar(sideOffset))
      treePos.y -= 0.5 // sink base into terrain slightly

      // Scale variation
      const baseScale = 4 + hash * 5
      const heightVar = 0.7 + Math.abs(Math.sin(seed * 7.77)) * 0.6

      // Type: ~40% sakura, 60% green (film has prominent cherry blossoms among green)
      const type: TreeType = Math.abs(Math.sin(seed * 3.14 + 2.72)) > 0.55 ? 'sakura' : 'green'

      trees.push({
        position: treePos,
        scale: baseScale * heightVar,
        type,
        seed: seed + side * 1000,
      })

      seed++
    }

    // Semi-random spacing: 6-14 meters
    dist += 6 + hash * 8
    seed++
  }

  return trees
}

// ─── Tree Billboard ──────────────────────────────────────

interface TreeBillboardProps {
  position: THREE.Vector3
  scale: number
  treeType: TreeType
  seed: number
}

function TreeBillboard({ position, scale, treeType, seed }: TreeBillboardProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(() => ({
    uSeed: { value: seed },
    uType: { value: treeType === 'sakura' ? 1.0 : 0.0 },
    uFoliageColor: {
      value: treeType === 'sakura'
        ? new THREE.Color('#D8A0A8')
        : new THREE.Color('#2A5828')
    },
    uFoliageColor2: {
      value: treeType === 'sakura'
        ? new THREE.Color('#F0C8D0')
        : new THREE.Color('#3A7838')
    },
    uTrunkColor: { value: new THREE.Color('#5A4030') },
  }), [seed, treeType])

  // Billboard: always face camera
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={[scale, scale * 1.3, 1]}
      renderOrder={5}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={treeVertexShader}
        fragmentShader={treeFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        alphaTest={0.1}
      />
    </mesh>
  )
}

const treeVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const treeFragmentShader = /* glsl */ `
  uniform float uSeed;
  uniform float uType;
  uniform vec3 uFoliageColor;
  uniform vec3 uFoliageColor2;
  uniform vec3 uTrunkColor;

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

  void main() {
    vec2 uv = vUv * 2.0 - 1.0; // -1..1

    // Trunk — very thin vertical line at bottom (barely visible like film)
    float trunkWidth = 0.035;
    float trunkTop = -0.05;
    float isTrunk = step(abs(uv.x), trunkWidth) * step(uv.y, trunkTop) * step(-1.0, uv.y);

    // Foliage — large procedural blob, nearly filling the billboard
    vec2 foliageCenter = vec2(0.0, 0.20);
    // Slightly different shape per tree based on seed
    float foliageRadX = 0.65 + hash(vec2(uSeed, 0.0)) * 0.15;
    float foliageRadY = 0.55 + hash(vec2(0.0, uSeed)) * 0.15;

    vec2 foliageUV = (uv - foliageCenter) / vec2(foliageRadX, foliageRadY);
    float foliageDist = length(foliageUV);

    // Noisy edge for organic shape — more detail for sakura (petal clusters)
    float edgeNoise = noise(foliageUV * 4.0 + vec2(uSeed * 13.37, uSeed * 7.42));
    float edgeNoise2 = noise(foliageUV * 8.0 + vec2(uSeed * 3.14));
    float noiseAmount = uType > 0.5 ? 0.35 : 0.25;
    float foliageShape = 1.0 - foliageDist + (edgeNoise - 0.5) * noiseAmount + (edgeNoise2 - 0.5) * noiseAmount * 0.5;

    float isFoliage = smoothstep(-0.05, 0.1, foliageShape);

    // Color variation within foliage — lighter on top, darker at bottom
    float colorMix = smoothstep(-0.3, 0.5, uv.y) * 0.6 + noise(uv * 3.0 + vec2(uSeed)) * 0.4;
    vec3 foliageColor = mix(uFoliageColor, uFoliageColor2, colorMix);

    // Sunlit side — lighter on right (matching sun direction)
    float sunSide = smoothstep(-0.5, 0.5, uv.x) * 0.15;
    foliageColor += sunSide;

    // Internal shadow for depth
    float internalShadow = smoothstep(0.0, 0.5, foliageShape) * 0.2;
    foliageColor *= 0.85 + internalShadow;

    // Combine trunk + foliage
    float alpha = max(isTrunk, isFoliage);
    vec3 color = mix(uTrunkColor, foliageColor, step(0.01, isFoliage));

    // Distance-based atmospheric haze — gentle to preserve sakura pink
    float dist = length(vWorldPosition - cameraPosition);
    float haze = 1.0 - exp(-dist * 0.002);
    vec3 hazeColor = vec3(0.55, 0.65, 0.75);
    color = mix(color, hazeColor, haze * 0.5);

    if (alpha < 0.1) discard;
    gl_FragColor = vec4(color, alpha);
  }
`
