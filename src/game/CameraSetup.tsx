import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { CAMERA } from './constants'

/**
 * Sets the camera lookAt target on mount.
 * R3F's Canvas camera prop doesn't support lookAt directly,
 * so we apply it imperatively after the camera is created.
 */
export function CameraSetup() {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    camera.lookAt(new THREE.Vector3(...CAMERA.lookAt))
    camera.updateProjectionMatrix()
  }, [camera])

  return null
}
