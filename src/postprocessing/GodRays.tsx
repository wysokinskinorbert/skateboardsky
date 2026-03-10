import { forwardRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { SKY, SUN } from '../game/constants'

/**
 * Screen-space god rays (volumetric light scattering).
 * Radial blur from sun position — rays of light piercing through clouds.
 * Film-accurate Shinkai: warm golden rays fanning from sun through cloud gaps.
 */

const fragment = /* glsl */ `
  uniform vec2 uSunPos;
  uniform float uIntensity;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 delta = uv - uSunPos;
    float dist = length(delta);

    // Radial sampling — march from pixel toward sun, accumulate bright areas
    const int SAMPLES = 32;
    float decay = 0.96;
    float weight = 0.035;
    float illumination = 0.0;

    vec2 samplePos = uv;
    vec2 step = delta / float(SAMPLES) * 0.6;
    float currentDecay = 1.0;

    for (int i = 0; i < SAMPLES; i++) {
      samplePos -= step;
      // Sample scene luminance at this position
      vec4 sampleColor = texture2D(inputBuffer, samplePos);
      float lum = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
      // Only accumulate bright areas (sky/sun, not dark terrain)
      float brightMask = smoothstep(0.5, 1.2, lum);
      illumination += brightMask * weight * currentDecay;
      currentDecay *= decay;
    }

    // Color: warm golden rays, slightly orange
    vec3 rayColor = vec3(1.0, 0.88, 0.60) * illumination * uIntensity;

    // Falloff from sun — rays fade with distance from sun position
    float sunFalloff = 1.0 - smoothstep(0.0, 0.7, dist);
    rayColor *= sunFalloff;

    outputColor = inputColor + vec4(rayColor, 0.0);
  }
`

class GodRaysEffect extends Effect {
  constructor() {
    super('GodRays', fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uSunPos', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uIntensity', new THREE.Uniform(0.0)],
      ]),
    })
  }
}

export const GodRays = forwardRef(function GodRays(_props, ref) {
  const effect = useMemo(() => new GodRaysEffect(), [])

  const sunWorldPos = useMemo(() => {
    const pos = new THREE.Vector3()
    pos.setFromSphericalCoords(
      SUN.distance,
      Math.PI / 2 - SKY.sunElevation,
      SKY.sunAzimuth,
    )
    return pos
  }, [])

  const _proj = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }) => {
    _proj.copy(sunWorldPos).project(camera)

    const sx = (_proj.x + 1) / 2
    const sy = (_proj.y + 1) / 2
    const behind = _proj.z > 1

    const sunPos = effect.uniforms.get('uSunPos')!.value as THREE.Vector2
    sunPos.set(sx, sy)

    // Fade: invisible when sun behind camera, subtle when on-screen
    const onScreen = !behind && sx > -0.2 && sx < 1.2 && sy > -0.2 && sy < 1.2
    effect.uniforms.get('uIntensity')!.value = onScreen ? 0.25 : 0.0
  })

  return <primitive ref={ref} object={effect} dispose={null} />
})
