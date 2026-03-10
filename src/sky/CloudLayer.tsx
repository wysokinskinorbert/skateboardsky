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

  const clouds = useMemo(() => {
    const generated = generateCloudInstances(
      config.count,
      config.distanceRange,
      config.scaleRange,
      config.elevationRange,
      config.azimuthSpread,
    )

    // Film-accurate: 7 clouds in band at elevation 0°-13° above horizontal
    // Camera at y=33. Hero clouds ~30% HFOV, medium ~15%, small ~8%
    // Distances 380-470, scales calculated from angular size requirements
    if (layer === 'front') {
      const heroPositions: { pos: [number, number, number]; scale: number; seed: number }[] = [
        // === HERO CLOUDS (2) — each ~30% of frame width ===
        // Left hero cumulus — dominant, high in cloud band
        { pos: [-160, 95, -450], scale: 200, seed: 100 },
        // Right hero cumulus — near sun side, slightly smaller
        { pos: [120, 100, -470], scale: 180, seed: 101 },

        // === MEDIUM CLOUDS (3) — each ~12-18% of frame width ===
        // Far left — filling left edge of cloud band
        { pos: [-320, 78, -430], scale: 110, seed: 102 },
        // Center gap-fill — between heroes
        { pos: [-20, 82, -400], scale: 130, seed: 103 },
        // Far right — balancing composition
        { pos: [300, 72, -440], scale: 95, seed: 104 },

        // === SMALL ACCENT CLOUDS (2) — wisps and fragments ===
        // High accent — above left hero
        { pos: [-80, 115, -460], scale: 55, seed: 105 },
        // Low near horizon — partially behind landscape
        { pos: [180, 50, -370], scale: 70, seed: 106 },
      ]
      for (const h of heroPositions) {
        generated.push({
          position: new THREE.Vector3(h.pos[0], h.pos[1], h.pos[2]),
          scale: h.scale,
          seed: h.seed,
        })
      }
    }

    return generated
  }, [config, layer])

  const backlightStrength = layer === 'front' ? 1.2 : 0.5
  const driftMultiplier = layer === 'back' ? CLOUDS.backDriftMultiplier : CLOUDS.frontDriftMultiplier

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
          driftMultiplier={driftMultiplier}
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
  driftMultiplier: number
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
  driftMultiplier,
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

  // Billboard + gentle wind drift + time uniform update
  useFrame(({ camera, clock }) => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion)

      const t = clock.getElapsedTime()

      // Update time uniform for cloud shape animation
      if (uniforms.uTime) {
        uniforms.uTime.value = t
      }

      // Slow sinusoidal drift — unique phase per cloud, parallax per layer
      const speed = CLOUDS.driftSpeed * driftMultiplier
      const driftX = Math.sin(t * speed + seed * 2.47) * scale * 0.3
      const driftY = Math.sin(t * speed * 0.7 + seed * 1.13) * scale * 0.08
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
      scale={[scale * 1.1, scale * 0.65, 1]}
      renderOrder={renderOrder}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
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
