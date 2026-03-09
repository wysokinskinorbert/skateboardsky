import { Canvas } from '@react-three/fiber'
import { SkyDome } from '../sky/SkyDome'
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
        toneMapping: COLOR_GRADING.toneMapping,
        toneMappingExposure: COLOR_GRADING.toneMappingExposure,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraSetup />
      <SkyDome />
      <PostProcessingStack />

      {/* Ambient fill light — cool blue like Shinkai shadows */}
      <ambientLight intensity={0.3} color="#8090C0" />
    </Canvas>
  )
}
