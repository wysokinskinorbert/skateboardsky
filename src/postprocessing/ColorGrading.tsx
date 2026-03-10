import { forwardRef, useMemo } from 'react'
import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'

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
  uniform float uSplitToneStrength;
  uniform vec3 uShadowTint;
  uniform vec3 uHighlightTint;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 color = inputColor.rgb;

    // Brightness + Film-style Contrast (shadow-protecting)
    color = color + uBrightness;
    if (uContrast > 0.0) {
      vec3 contrasted = (color - 0.5) / (1.0 - uContrast) + 0.5;
      // Protect dark values from being crushed to black (film "toe" curve)
      vec3 shadowBlend = smoothstep(vec3(0.0), vec3(0.12), color);
      color = mix(color * (1.0 + uContrast * 0.2), contrasted, shadowBlend);
    } else {
      color = (color - 0.5) * (1.0 + uContrast) + 0.5;
    }

    // Saturation (luminance-based)
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, 1.0 + uSaturation);

    // Split toning — Shinkai signature: cool blue shadows + warm golden highlights
    if (uSplitToneStrength > 0.0) {
      float shadowMask = 1.0 - smoothstep(0.0, 0.45, luma);
      float highlightMask = smoothstep(0.55, 1.0, luma);
      color = mix(color, color * uShadowTint, shadowMask * uSplitToneStrength);
      color = mix(color, color * uHighlightTint, highlightMask * uSplitToneStrength * 0.6);
    }

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
  splitToneStrength?: number
  shadowTint?: THREE.Color
  highlightTint?: THREE.Color
}

class ColorGradingEffect extends Effect {
  constructor({
    brightness = 0.03,
    contrast = 0.22,
    saturation = 0.4,
    vignetteOffset = 0.25,
    vignetteDarkness = 0.4,
    splitToneStrength = 0.0,
    shadowTint = new THREE.Color('#8090C0'),
    highlightTint = new THREE.Color('#F0D090'),
  }: ColorGradingOptions = {}) {
    super('ColorGrading', fragment, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, { value: number | THREE.Color }>([
        ['uBrightness', { value: brightness }],
        ['uContrast', { value: contrast }],
        ['uSaturation', { value: saturation }],
        ['uVignetteOffset', { value: vignetteOffset }],
        ['uVignetteDarkness', { value: vignetteDarkness }],
        ['uSplitToneStrength', { value: splitToneStrength }],
        ['uShadowTint', { value: shadowTint }],
        ['uHighlightTint', { value: highlightTint }],
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
  splitToneStrength?: number
  shadowTint?: THREE.Color
  highlightTint?: THREE.Color
}

export const ColorGrading = forwardRef<ColorGradingEffect, ColorGradingProps>(
  function ColorGrading(props, ref) {
    const effect = useMemo(() => new ColorGradingEffect(props), [
      props.brightness,
      props.contrast,
      props.saturation,
      props.vignetteOffset,
      props.vignetteDarkness,
      props.splitToneStrength,
    ])
    return <primitive ref={ref} object={effect} dispose={null} />
  }
)
