import { forwardRef, useMemo } from 'react'
import { Effect, BlendFunction } from 'postprocessing'

/**
 * Single custom post-processing effect combining:
 * - Brightness/Contrast adjustment
 * - Hue/Saturation adjustment
 * - Vignette darkening at edges
 *
 * Combined into one shader to avoid multi-effect alpha compositing bugs
 * in the postprocessing library when using different BlendFunctions.
 */

const fragment = /* glsl */ `
  uniform float uBrightness;
  uniform float uContrast;
  uniform float uSaturation;
  uniform float uVignetteOffset;
  uniform float uVignetteDarkness;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 color = inputColor.rgb;

    // Brightness + Contrast
    color = color + uBrightness;
    if (uContrast > 0.0) {
      color = (color - 0.5) / (1.0 - uContrast) + 0.5;
    } else {
      color = (color - 0.5) * (1.0 + uContrast) + 0.5;
    }

    // Saturation (luminance-based)
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, 1.0 + uSaturation);

    // Vignette
    float dist = distance(uv, vec2(0.5));
    float vignette = smoothstep(0.8, uVignetteOffset * 0.8, dist * (uVignetteDarkness + uVignetteOffset));
    color *= vignette;

    outputColor = vec4(color, inputColor.a);
  }
`

interface ColorGradingOptions {
  brightness?: number
  contrast?: number
  saturation?: number
  vignetteOffset?: number
  vignetteDarkness?: number
}

class ColorGradingEffect extends Effect {
  constructor({
    brightness = 0.03,
    contrast = 0.22,
    saturation = 0.4,
    vignetteOffset = 0.25,
    vignetteDarkness = 0.4,
  }: ColorGradingOptions = {}) {
    super('ColorGrading', fragment, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, { value: number }>([
        ['uBrightness', { value: brightness }],
        ['uContrast', { value: contrast }],
        ['uSaturation', { value: saturation }],
        ['uVignetteOffset', { value: vignetteOffset }],
        ['uVignetteDarkness', { value: vignetteDarkness }],
      ]),
    })
  }
}

interface ColorGradingProps {
  brightness?: number
  contrast?: number
  saturation?: number
  vignetteOffset?: number
  vignetteDarkness?: number
}

export const ColorGrading = forwardRef<ColorGradingEffect, ColorGradingProps>(
  function ColorGrading(props, ref) {
    const effect = useMemo(() => new ColorGradingEffect(props), [
      props.brightness,
      props.contrast,
      props.saturation,
      props.vignetteOffset,
      props.vignetteDarkness,
    ])
    return <primitive ref={ref} object={effect} dispose={null} />
  }
)
