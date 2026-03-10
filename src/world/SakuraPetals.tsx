import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Sakura petal particle system — pink petals drifting in the wind.
 * Film-accurate: petals float across the scene, catching sunlight.
 * Uses instanced mesh for performance (~200 petals).
 */

const PETAL_COUNT = 200
const SPREAD_X = 80
const SPREAD_Y = 30
const SPREAD_Z = 200
const FALL_SPEED = 0.8
const DRIFT_SPEED = 2.5

export function SakuraPetals() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const petals = useMemo(() => {
    const data: {
      position: THREE.Vector3
      velocity: THREE.Vector3
      rotation: THREE.Euler
      rotSpeed: THREE.Vector3
      scale: number
      phase: number
    }[] = []

    for (let i = 0; i < PETAL_COUNT; i++) {
      const hash = Math.abs(Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1
      const hash2 = Math.abs(Math.sin(i * 7.7777 + 31.337) * 28462.1753) % 1
      const hash3 = Math.abs(Math.sin(i * 3.1415 + 95.771) * 51823.9371) % 1

      data.push({
        position: new THREE.Vector3(
          (hash - 0.5) * SPREAD_X,
          hash2 * SPREAD_Y + 5,
          -hash3 * SPREAD_Z,
        ),
        velocity: new THREE.Vector3(
          (hash - 0.5) * DRIFT_SPEED,
          -FALL_SPEED * (0.5 + hash2 * 0.5),
          (hash3 - 0.5) * DRIFT_SPEED * 0.3,
        ),
        rotation: new THREE.Euler(
          hash * Math.PI * 2,
          hash2 * Math.PI * 2,
          hash3 * Math.PI * 2,
        ),
        rotSpeed: new THREE.Vector3(
          (hash - 0.5) * 3,
          (hash2 - 0.5) * 2,
          (hash3 - 0.5) * 4,
        ),
        scale: 0.12 + hash * 0.15,
        phase: hash * Math.PI * 2,
      })
    }

    return data
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < PETAL_COUNT; i++) {
      const p = petals[i]

      // Update position with sinusoidal drift
      const x = p.position.x + Math.sin(t * 0.5 + p.phase) * DRIFT_SPEED * 0.3
      let y = p.position.y + p.velocity.y * t
      const z = p.position.z + p.velocity.z * t * 0.1

      // Wrap Y — when petal falls below ground, reset to top
      y = ((y % SPREAD_Y) + SPREAD_Y) % SPREAD_Y + 2

      // Wrap X
      const wrappedX = ((x + SPREAD_X / 2) % SPREAD_X + SPREAD_X) % SPREAD_X - SPREAD_X / 2

      dummy.position.set(wrappedX, y, z)
      dummy.rotation.set(
        p.rotation.x + t * p.rotSpeed.x,
        p.rotation.y + t * p.rotSpeed.y,
        p.rotation.z + t * p.rotSpeed.z,
      )
      dummy.scale.setScalar(p.scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, PETAL_COUNT]}
      renderOrder={7}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 0.6]} />
      <shaderMaterial
        vertexShader={petalVertexShader}
        fragmentShader={petalFragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  )
}

const petalVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const petalFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;

    // Petal shape — elongated ellipse with tapered end
    float shape = 1.0 - length(vec2(uv.x * 1.2, uv.y * 0.8));
    shape += smoothstep(0.0, -0.5, uv.y) * 0.2; // taper at base
    float alpha = smoothstep(-0.1, 0.2, shape);

    // Pink color with slight gradient — lighter at center, pinker at edges
    vec3 petalColor = mix(
      vec3(0.95, 0.75, 0.80),  // warm pink
      vec3(1.0, 0.90, 0.92),   // white-pink center
      smoothstep(0.5, 0.0, length(uv))
    );

    // Slight translucency effect — sun backlighting
    petalColor += vec3(0.1, 0.05, 0.05) * smoothstep(-0.3, 0.3, uv.y);

    // Distance fade
    float dist = length(vWorldPosition - cameraPosition);
    float fade = 1.0 - smoothstep(80.0, 160.0, dist);
    alpha *= fade;

    if (alpha < 0.05) discard;
    gl_FragColor = vec4(petalColor, alpha * 0.85);
  }
`
