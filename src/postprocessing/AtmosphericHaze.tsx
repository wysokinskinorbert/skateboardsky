import { forwardRef, useMemo } from 'react'
import { Effect, BlendFunction, EffectAttribute } from 'postprocessing'
import * as THREE from 'three'

/**
 * Atmospheric haze — depth-based fog blending distant objects
 * toward a warm horizon color. Creates the Shinkai-style
 * layered depth illusion where far objects dissolve into haze.
 *
 * Uses scene depth texture to blend toward haze color.
 */

const fragment = /* glsl */ `
  uniform vec3 uNearHazeColor;
  uniform vec3 uFarHazeColor;
  uniform float uDensity;
  uniform float uOffset;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Read depth from depth texture
    float depth = texture2D(depthBuffer, uv).r;

    // Linearize depth (perspective projection)
    float near = cameraNear;
    float far = cameraFar;
    float linearDepth = (near * far) / (far - depth * (far - near));

    // Exponential haze — gentle, only affects far objects
    float haze = 1.0 - exp(-(linearDepth - uOffset) * uDensity);
    haze = clamp(haze, 0.0, 1.0);

    // Haze color gradient: warm near horizon → cool blue at distance
    float colorMix = smoothstep(150.0, 700.0, linearDepth);
    vec3 hazeColor = mix(uNearHazeColor, uFarHazeColor, colorMix);

    // Gentle blend — preserve scene colors, add subtle depth layering
    vec3 color = mix(inputColor.rgb, hazeColor, haze * 0.35);

    outputColor = vec4(color, inputColor.a);
  }
`

class AtmosphericHazeEffect extends Effect {
  constructor() {
    super('AtmosphericHaze', fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ['uNearHazeColor', new THREE.Uniform(new THREE.Color('#C0B898'))],
        ['uFarHazeColor', new THREE.Uniform(new THREE.Color('#80A0C0'))],
        ['uDensity', new THREE.Uniform(0.0015)],
        ['uOffset', new THREE.Uniform(150.0)],
      ]),
    })
  }
}

export const AtmosphericHaze = forwardRef(function AtmosphericHaze(_props, ref) {
  const effect = useMemo(() => new AtmosphericHazeEffect(), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})
