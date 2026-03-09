import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY, PLANET } from '../game/constants'
import {
  bodyVertexShader,
  bodyFragmentShader,
  createPlanetBodyUniforms,
} from './PlanetMaterial'

/**
 * Giant planet visible as a wide arc in the upper sky.
 * Two layers:
 * 1. Body sphere — dark teal with surface detail, limb darkening, and atmosphere rim glow
 *    (rim glow is emissive Fresnel in the body shader itself — no separate atmosphere sphere)
 * 2. Ring — thin torus with emissive material
 */
export function Planet() {
  const sunDirection = useMemo(() => {
    const dir = new THREE.Vector3()
    dir.setFromSphericalCoords(
      1,
      Math.PI / 2 - SKY.sunElevation,
      SKY.sunAzimuth
    )
    return dir
  }, [])

  const bodyUniforms = useMemo(
    () => createPlanetBodyUniforms(
      sunDirection,
      PLANET.atmosphereColor,
      PLANET.atmosphereIntensity,
    ),
    [sunDirection]
  )

  return (
    <group position={PLANET.position}>
      {/* Planet body + integrated atmosphere rim glow */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[PLANET.radius, 64, 64]} />
        <shaderMaterial
          vertexShader={bodyVertexShader}
          fragmentShader={bodyFragmentShader}
          uniforms={bodyUniforms}
        />
      </mesh>

      {/* Ring — thin tilted torus */}
      <mesh renderOrder={2} rotation={[0.3, 0.1, 0.15]}>
        <torusGeometry args={[PLANET.radius * 1.25, 1.5, 16, 128]} />
        <meshBasicMaterial
          color={PLANET.ringColor}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
