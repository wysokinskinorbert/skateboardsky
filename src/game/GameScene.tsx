import { Canvas, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { SkyDome } from '../sky/SkyDome'
import { CloudLayer } from '../sky/CloudLayer'
import { Planet } from '../sky/Planet'
import { Road } from '../world/Road'
import { Terrain } from '../world/Terrain'
import { HorizonStack } from '../world/HorizonStack'
import { CameraSetup } from './CameraSetup'
import { PostProcessingStack } from '../postprocessing/PostProcessingStack'
import { CAMERA, COLOR_GRADING } from './constants'
import * as THREE from 'three'

export function GameScene() {
  return (
    <Canvas
      camera={{
        fov: CAMERA.fov,
        near: CAMERA.near,
        far: CAMERA.far,
        position: CAMERA.position,
      }}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: COLOR_GRADING.toneMapping,
        toneMappingExposure: COLOR_GRADING.toneMappingExposure,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraSetup />
      <RendererSetup />
      <color attach="background" args={['#000000']} />
      <SkyDome />
      {/* Phase 2: render order — back clouds (1) → planet (2) → front clouds (3) */}
      <CloudLayer layer="back" />
      <Planet />
      <CloudLayer layer="front" />
      <HorizonStack />
      <Terrain />
      <Road />
      <PostProcessingStack />

      {/* Ambient fill light — cool blue like Shinkai shadows */}
      <ambientLight intensity={0.3} color="#8090C0" />
    </Canvas>
  )
}

/** Ensure renderer clear alpha = 1 for EffectComposer render targets */
function RendererSetup() {
  const { gl } = useThree()
  useEffect(() => {
    gl.setClearColor(new THREE.Color('#000000'), 1)
  }, [gl])
  return null
}
