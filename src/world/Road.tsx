import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY, ROAD } from '../game/constants'
import {
  roadVertexShader,
  roadFragmentShader,
  createRoadUniforms,
} from './RoadMaterial'

/**
 * Spline-based mountain road — serpentine going downhill.
 * Geometry is a flat ribbon extruded along a CatmullRomCurve3,
 * with proper banking at curves and UVs for the road shader.
 */
export function Road() {
  const { geometry, uniforms } = useMemo(() => {
    const curve = createRoadSpline()
    const geo = createRoadGeometry(curve, ROAD.width, ROAD.segments)
    const sunDir = new THREE.Vector3()
    sunDir.setFromSphericalCoords(1, Math.PI / 2 - SKY.sunElevation, SKY.sunAzimuth)
    const uni = createRoadUniforms(sunDir)
    uni.uRoadLength.value = curve.getLength() / ROAD.width
    return { geometry: geo, uniforms: uni }
  }, [])

  return (
    <mesh geometry={geometry} renderOrder={5}>
      <shaderMaterial
        vertexShader={roadVertexShader}
        fragmentShader={roadFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  )
}

/**
 * Creates the serpentine spline — mountain road going downhill
 * with S-curves. Points hand-tuned to match film perspective.
 */
function createRoadSpline(): THREE.CatmullRomCurve3 {
  const points = ROAD.splinePoints.map(
    (p) => new THREE.Vector3(p[0], p[1], p[2])
  )
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3)
}

/**
 * Generates a flat ribbon mesh following the spline curve.
 * The ribbon lies on the road surface with banking at curves.
 *
 * UV mapping:
 * - U (x): 0 = left edge, 1 = right edge
 * - V (y): 0 = start, increases along road length
 */
function createRoadGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  segments: number,
): THREE.BufferGeometry {
  const halfWidth = width / 2
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const totalLength = curve.getLength()

  // Cross-section segments (across road width)
  const crossSegments = 4

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()

    // Up vector — mostly world up, but adjust for slope
    const worldUp = new THREE.Vector3(0, 1, 0)

    // Right vector — perpendicular to tangent in horizontal plane
    const right = new THREE.Vector3()
      .crossVectors(tangent, worldUp)
      .normalize()

    // Recalculate up for proper surface normal
    const up = new THREE.Vector3()
      .crossVectors(right, tangent)
      .normalize()

    // Banking — tilt road at curves based on curvature
    // Approximate curvature from tangent change
    let bankAngle = 0
    if (i > 0 && i < segments) {
      const tPrev = (i - 1) / segments
      const tNext = (i + 1) / segments
      const tangentPrev = curve.getTangentAt(tPrev)
      const tangentNext = curve.getTangentAt(tNext)
      const curvature = tangentNext.clone().sub(tangentPrev).length() * segments * 0.5
      // Bank toward inside of curve — limited to ±8°
      const cross = tangentPrev.clone().cross(tangentNext)
      const bankDir = Math.sign(cross.y)
      bankAngle = bankDir * Math.min(curvature * 2.0, 0.14) // max ~8°
    }

    // Apply banking rotation to right vector
    if (bankAngle !== 0) {
      right.applyAxisAngle(tangent, bankAngle)
      up.crossVectors(right, tangent).normalize()
    }

    const vCoord = (t * totalLength) / width

    for (let j = 0; j <= crossSegments; j++) {
      const crossT = j / crossSegments
      const offset = (crossT - 0.5) * width

      // Small Y offset to ensure road sits above any terrain at same depth
      positions.push(
        point.x + right.x * offset,
        point.y + right.y * offset + 0.15,
        point.z + right.z * offset,
      )
      normals.push(up.x, up.y, up.z)
      uvs.push(crossT, vCoord)
    }
  }

  // Build triangle indices
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < crossSegments; j++) {
      const a = i * (crossSegments + 1) + j
      const b = a + 1
      const c = a + (crossSegments + 1)
      const d = c + 1

      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)

  return geometry
}

/** Exports the road spline for use by camera/physics systems */
export function getRoadSpline(): THREE.CatmullRomCurve3 {
  return createRoadSpline()
}
