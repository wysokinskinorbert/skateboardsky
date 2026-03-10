import { forwardRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { SKY, SUN } from '../game/constants'

/**
 * Custom anamorphic lens flare — screen-space effect matching Shinkai film aesthetic.
 * Renders: warm horizontal streak through sun + soft halo + blue-purple ghost flares.
 * Sun position is projected to screen space each frame.
 */

const fragment = /* glsl */ `
  uniform vec2 uSunPos;
  uniform float uIntensity;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 sunPos = uSunPos;
    vec2 delta = uv - sunPos;

    // === Anamorphic streak (horizontal) ===
    // Tight vertical gaussian, very wide horizontal — dramatic anamorphic
    float streakY = exp(-delta.y * delta.y * 12000.0);
    float streakX = exp(-delta.x * delta.x * 1.8);
    float streak = streakY * streakX;

    // Color: warm gold at center → cool blue at horizontal edges
    vec3 streakColor = mix(
      vec3(1.0, 0.88, 0.55),
      vec3(0.45, 0.55, 0.9),
      smoothstep(0.0, 0.45, abs(delta.x))
    );

    // === Sun glow halo ===
    // Slightly anamorphic (wider than tall) soft glow around sun
    float haloD = length(delta * vec2(1.5, 1.0));
    float halo = exp(-haloD * haloD * 25.0) * 0.2;

    // === Ghost flares ===
    // 4 ghosts mirrored through screen center at increasing distances
    vec3 ghostSum = vec3(0.0);
    vec2 toCenter = vec2(0.5) - sunPos;

    for (int i = 1; i <= 4; i++) {
      float fi = float(i);
      vec2 gp = sunPos + toCenter * (0.4 * fi);
      float gd = length(uv - gp);
      float size = 0.022 + fi * 0.007;

      // Soft disc + subtle ring
      float disc = smoothstep(size, size * 0.25, gd);
      float ring = smoothstep(size * 1.3, size * 1.0, gd)
                 * smoothstep(size * 0.7, size * 1.0, gd);

      // Chromatic shift: blue → purple per ghost
      vec3 gc = mix(vec3(0.3, 0.45, 1.0), vec3(0.6, 0.3, 0.85), fi / 4.0);
      ghostSum += gc * (disc * 0.05 + ring * 0.03) / fi;
    }

    // === Combine ===
    vec3 flare = streakColor * streak * 0.30
               + vec3(1.0, 0.95, 0.85) * halo * 0.5
               + ghostSum;
    flare *= uIntensity;

    outputColor = inputColor + vec4(flare, 0.0);
  }
`

class LensFlareEffect extends Effect {
  constructor() {
    super('LensFlare', fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uSunPos', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uIntensity', new THREE.Uniform(0.0)],
      ]),
    })
  }
}

function edgeFade(x: number, y: number): number {
  const m = 0.15
  const fx = smoothstep(0, m, x) * smoothstep(1, 1 - m, x)
  const fy = smoothstep(0, m, y) * smoothstep(1, 1 - m, y)
  return fx * fy
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export const LensFlare = forwardRef(function LensFlare(_props, ref) {
  const effect = useMemo(() => new LensFlareEffect(), [])

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

    // Fade out smoothly when sun nears screen edges or is behind camera
    const fade = behind ? 0 : edgeFade(sx, sy)
    effect.uniforms.get('uIntensity')!.value = fade
  })

  return <primitive ref={ref} object={effect} dispose={null} />
})
