import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY, PLANET } from '../game/constants'
import {
  bodyVertexShader,
  bodyFragmentShader,
  atmosphereVertexShader,
  atmosphereFragmentShader,
  createPlanetBodyUniforms,
  createAtmosphereUniforms,
} from './PlanetMaterial'

/**
 * Giant planet visible as a wide arc in the upper sky.
 * Three layers:
 * 1. Body sphere — dark teal with surface detail and limb darkening
 * 2. Atmosphere sphere — slightly larger, Fresnel rim glow (HDR for bloom)
 * 3. Ring — thin torus with emissive material
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
    () => createPlanetBodyUniforms(sunDirection),
    [sunDirection]
  )

  const atmosphereUniforms = useMemo(
    () => createAtmosphereUniforms(PLANET.atmosphereColor, PLANET.atmosphereIntensity),
    []
  )

  return (
    <group position={PLANET.position}>
      {/* Planet body */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[PLANET.radius, 64, 64]} />
        <shaderMaterial
          vertexShader={bodyVertexShader}
          fragmentShader={bodyFragmentShader}
          uniforms={bodyUniforms}
        />
      </mesh>

      {/* Atmosphere rim glow */}
      <mesh renderOrder={2} scale={PLANET.atmosphereScale}>
        <sphereGeometry args={[PLANET.radius, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={atmosphereUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
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
