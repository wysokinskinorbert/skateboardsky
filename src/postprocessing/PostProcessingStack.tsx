import {
  EffectComposer,
  Bloom,
  ToneMapping,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { COLOR_GRADING } from '../game/constants'
import { LensFlare } from './LensFlare'
import { GodRays } from './GodRays'
import { AtmosphericHaze } from './AtmosphericHaze'
import { ColorGrading } from './ColorGrading'

/**
 * Post-processing stack matching the film's cinematic Shinkai look:
 * 1. Bloom — HDR sun disc emission creates glow
 * 2. LensFlare — anamorphic streak from sun
 * 3. AtmosphericHaze — depth-based fog
 * 4. ToneMapping — ACES filmic for cinematic roll-off
 * 5. ColorGrading — combined brightness/contrast/saturation/vignette
 *    (single custom effect to avoid multi-effect alpha compositing bugs)
 */
export function PostProcessingStack() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={COLOR_GRADING.bloomIntensity}
        luminanceThreshold={COLOR_GRADING.bloomThreshold}
        luminanceSmoothing={COLOR_GRADING.bloomSmoothing}
        mipmapBlur
      />
      <LensFlare />
      <GodRays />
      <AtmosphericHaze />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <ColorGrading
        brightness={0.02}
        contrast={0.30}
        saturation={0.45}
        vignetteOffset={0.25}
        vignetteDarkness={0.45}
      />
    </EffectComposer>
  )
}
