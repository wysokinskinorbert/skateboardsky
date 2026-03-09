import {
  EffectComposer,
  Bloom,
  BrightnessContrast,
  HueSaturation,
  Vignette,
  ToneMapping,
} from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'
import { COLOR_GRADING } from '../game/constants'
import { LensFlare } from './LensFlare'

/**
 * Post-processing stack matching the film's cinematic Shinkai look:
 * 1. Bloom — HDR sun disc emission creates glow
 * 2. ToneMapping — ACES filmic for cinematic roll-off
 * 3. BrightnessContrast — slightly elevated contrast
 * 4. HueSaturation — vivid saturated colors (Shinkai signature)
 * 5. Vignette — subtle darkening at edges
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
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <BrightnessContrast
        brightness={0.02}
        contrast={0.15}
      />
      <HueSaturation
        blendFunction={BlendFunction.NORMAL}
        hue={0}
        saturation={0.3}
      />
      <Vignette
        offset={0.3}
        darkness={0.35}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
