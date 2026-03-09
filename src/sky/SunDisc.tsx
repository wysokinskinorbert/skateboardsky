import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY, SUN } from '../game/constants'

/**
 * Sun disc — a mesh with HDR emissive material placed at the sun position.
 * The high emission value (>1.0) triggers bloom in post-processing,
 * creating the intense glow visible in every keyframe of the film.
 */
export function SunDisc() {
  const position = useMemo(() => {
    const pos = new THREE.Vector3()
    pos.setFromSphericalCoords(
      SUN.distance,
      Math.PI / 2 - SKY.sunElevation,
      SKY.sunAzimuth
    )
    return pos
  }, [])

  return (
    <mesh position={position}>
      <sphereGeometry args={[SUN.radius, 32, 32]} />
      <meshStandardMaterial
        color={SUN.color}
        emissive={SUN.color}
        emissiveIntensity={SUN.emissionIntensity}
        toneMapped={false}
      />
    </mesh>
  )
}
