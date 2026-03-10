import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SKY, CLOUDS } from '../game/constants'
import {
  vertexShader,
  fragmentShader,
  createCloudCardUniforms,
} from './CloudCardMaterial'

interface CloudLayerProps {
  layer: 'back' | 'front'
}

interface CloudInstance {
  position: THREE.Vector3
  scale: number
  seed: number
}

/**
 * Generates cloud positions distributed across the sky hemisphere.
 * Clouds are placed at various azimuths and elevations, with more
 * density away from the sun (left side) matching the film.
 */
function generateCloudInstances(
  count: number,
  distanceRange: [number, number],
  scaleRange: [number, number],
  elevationRange: [number, number],
  azimuthSpread: number,
): CloudInstance[] {
  const clouds: CloudInstance[] = []

  for (let i = 0; i < count; i++) {
    const seed = i * 1.618 + 0.5 // golden ratio for spread

    // Distribute azimuth within visible range, centered on -Z (azimuth=0 here)
    // Use golden ratio distribution mapped to [-azimuthSpread, +azimuthSpread]
    const goldenT = ((seed * 137.508) % 360) / 360 // 0..1
    const azimuth = (goldenT * 2 - 1) * azimuthSpread

    // Elevation — distributed across range with some variation
    const t = (i + 0.5) / count
    const elevation = elevationRange[0] + t * (elevationRange[1] - elevationRange[0])

    // Distance within range — pseudo-random per seed
    const distT = ((seed * 3.14) % 1)
    const distance = distanceRange[0] + distT * (distanceRange[1] - distanceRange[0])

    // Convert spherical to cartesian (camera looks -Z)
    const x = Math.sin(azimuth) * Math.cos(elevation) * distance
    const y = Math.sin(elevation) * distance + 10 // offset above horizon
    const z = -Math.cos(azimuth) * Math.cos(elevation) * distance

    // Scale variation — pseudo-random per seed
    const scaleT = ((seed * 7.77) % 1)
    const scale = scaleRange[0] + scaleT * (scaleRange[1] - scaleRange[0])

    clouds.push({
      position: new THREE.Vector3(x, y, z),
      scale,
      seed: i,
    })
  }

  return clouds
}

/**
 * Billboard cloud layer — renders multiple procedural cloud cards.
 * 'back' layer renders behind the planet (renderOrder 1).
 * 'front' layer renders in front of the planet (renderOrder 3).
 */
export function CloudLayer({ layer }: CloudLayerProps) {
  const config = layer === 'back' ? CLOUDS.back : CLOUDS.front
  const renderOrder = layer === 'back' ? 1 : 3

  const sunDirection = useMemo(() => {
    const dir = new THREE.Vector3()
    dir.setFromSphericalCoords(
      1,
      Math.PI / 2 - SKY.sunElevation,
      SKY.sunAzimuth
    )
    return dir
  }, [])

  const clouds = useMemo(
    () =>
      generateCloudInstances(
        config.count,
        config.distanceRange,
        config.scaleRange,
        config.elevationRange,
        config.azimuthSpread,
      ),
    [config]
  )

  const backlightStrength = layer === 'front' ? 1.2 : 0.5

  return (
    <group>
      {clouds.map((cloud) => (
        <CloudCard
          key={cloud.seed}
          position={cloud.position}
          scale={cloud.scale}
          seed={cloud.seed}
          tint={config.tint}
          opacity={config.opacity}
          sunDirection={sunDirection}
          backlightStrength={backlightStrength}
          renderOrder={renderOrder}
        />
      ))}
    </group>
  )
}

interface CloudCardProps {
  position: THREE.Vector3
  scale: number
  seed: number
  tint: THREE.Color
  opacity: number
  sunDirection: THREE.Vector3
  backlightStrength: number
  renderOrder: number
}

function CloudCard({
  position,
  scale,
  seed,
  tint,
  opacity,
  sunDirection,
  backlightStrength,
  renderOrder,
}: CloudCardProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const basePosition = useMemo(() => position.clone(), [position])

  const uniforms = useMemo(
    () =>
      createCloudCardUniforms({
        seed,
        tint,
        opacity,
        sunDirection,
        backlightStrength,
      }),
    [seed, tint, opacity, sunDirection, backlightStrength]
  )

  // Billboard + gentle wind drift
  useFrame(({ camera, clock }) => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion)

      // Slow sinusoidal drift — unique phase per cloud
      const t = clock.getElapsedTime()
      const driftX = Math.sin(t * CLOUDS.driftSpeed + seed * 2.47) * scale * 0.3
      const driftY = Math.sin(t * CLOUDS.driftSpeed * 0.7 + seed * 1.13) * scale * 0.08
      meshRef.current.position.set(
        basePosition.x + driftX,
        basePosition.y + driftY,
        basePosition.z,
      )
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={[scale, scale * 0.6, 1]}
      renderOrder={renderOrder}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
