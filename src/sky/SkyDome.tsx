import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY } from '../game/constants'
import {
  vertexShader,
  fragmentShader,
  createShinkaiSkyUniforms,
} from './ShinkaiSkyMaterial'

/**
 * Custom anime sky dome — inverted sphere with Shinkai-style gradient shader.
 * Colors sampled from film keyframes: deep indigo zenith → rich blue → warm golden horizon.
 * Sun glow is HDR (intensity > 1.0) to trigger bloom in post-processing.
 */
export function SkyDome() {
  const sunDirection = useMemo(() => {
    const dir = new THREE.Vector3()
    dir.setFromSphericalCoords(
      1,
      Math.PI / 2 - SKY.sunElevation,
      SKY.sunAzimuth
    )
    return dir
  }, [])

  const uniforms = useMemo(
    () => createShinkaiSkyUniforms(sunDirection),
    [sunDirection]
  )

  return (
    <mesh>
      <sphereGeometry args={[900, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
