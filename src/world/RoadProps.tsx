import { useMemo } from 'react'
import * as THREE from 'three'
import { ROAD, SKY } from '../game/constants'

/**
 * Road props — utility poles with power lines, guardrails, and street lamps
 * placed along the road spline. Film-accurate road furniture.
 */
export function RoadProps() {
  const { poles, guardrailData, lamps } = useMemo(() => {
    const curve = createRoadSpline()
    return {
      poles: generatePolePositions(curve),
      guardrailData: generateGuardrailGeometry(curve),
      lamps: generateLampPositions(curve),
    }
  }, [])

  const sunDirection = useMemo(() => {
    const dir = new THREE.Vector3()
    dir.setFromSphericalCoords(1, Math.PI / 2 - SKY.sunElevation, SKY.sunAzimuth)
    return dir
  }, [])

  return (
    <group>
      {/* Utility poles with power lines — right side of road */}
      {poles.map((pole, i) => (
        <UtilityPole
          key={`pole-${i}`}
          position={pole.position}
          rotation={pole.rotation}
        />
      ))}

      {/* Power lines connecting poles */}
      <PowerLines poles={poles} />

      {/* Metal guardrails — W-beam with posts at curve outer edges */}
      {guardrailData.map((data, i) => (
        <Guardrail
          key={`rail-${i}`}
          data={data}
        />
      ))}

      {/* Street lamps — left side of road, near curves */}
      {lamps.map((lamp, i) => (
        <StreetLamp
          key={`lamp-${i}`}
          position={lamp.position}
          rotation={lamp.rotation}
        />
      ))}
    </group>
  )
}

// ─── Road Spline Utility ─────────────────────────────────

function createRoadSpline(): THREE.CatmullRomCurve3 {
  const points = ROAD.splinePoints.map(
    (p) => new THREE.Vector3(p[0], p[1], p[2])
  )
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3)
}

// ─── Utility Poles ────────────────────────────────────────

interface PoleData {
  position: THREE.Vector3
  rotation: THREE.Euler
}

function generatePolePositions(curve: THREE.CatmullRomCurve3): PoleData[] {
  const poles: PoleData[] = []
  const totalLength = curve.getLength()
  const spacing = 35 // meters between poles

  // Place poles at regular intervals, right side of road
  for (let dist = 20; dist < totalLength - 30; dist += spacing) {
    const t = dist / totalLength
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()

    // Right vector
    const worldUp = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize()

    // Place pole on right side, offset from road edge
    const polePos = point.clone().add(right.multiplyScalar(ROAD.width * 0.7))
    polePos.y += 0.15

    // Rotation: pole cross-arm faces perpendicular to road
    const angle = Math.atan2(tangent.x, tangent.z)

    poles.push({
      position: polePos,
      rotation: new THREE.Euler(0, angle, 0),
    })
  }

  return poles
}

function UtilityPole({ position, rotation }: { position: THREE.Vector3; rotation: THREE.Euler }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main vertical post — dark wood */}
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 10, 6]} />
        <meshStandardMaterial color="#3A2A1A" roughness={0.9} />
      </mesh>

      {/* Cross-arm — horizontal beam for wires */}
      <mesh position={[0, 9.5, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3.5, 0.12, 0.12]} />
        <meshStandardMaterial color="#4A3828" roughness={0.85} />
      </mesh>

      {/* Insulators — small white/grey caps */}
      {[-1.4, -0.5, 0.5, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 9.7, 0]}>
          <cylinderGeometry args={[0.06, 0.04, 0.2, 6]} />
          <meshStandardMaterial color="#C0C8C0" roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Power Lines ──────────────────────────────────────────

function PowerLines({ poles }: { poles: PoleData[] }) {
  const lineGeometries = useMemo(() => {
    if (poles.length < 2) return []

    const geometries: THREE.BufferGeometry[] = []
    // 4 wires across the cross-arm
    const wireOffsets = [-1.4, -0.5, 0.5, 1.4]

    for (const xOffset of wireOffsets) {
      const points: THREE.Vector3[] = []

      for (let i = 0; i < poles.length; i++) {
        const pole = poles[i]
        // Wire attachment point at cross-arm height
        const attachPoint = pole.position.clone()
        attachPoint.y += 9.7

        // Apply cross-arm offset in pole's local frame
        const angle = pole.rotation.y
        attachPoint.x += Math.cos(angle) * xOffset
        attachPoint.z -= Math.sin(angle) * xOffset

        // Add catenary sag point between poles
        if (i > 0) {
          const prev = points[points.length - 1]
          const mid = prev.clone().lerp(attachPoint, 0.5)
          mid.y -= 1.2 // sag
          points.push(mid)
        }

        points.push(attachPoint)
      }

      const curvePoints = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
      const tubeGeo = new THREE.TubeGeometry(curvePoints, points.length * 8, 0.025, 3, false)
      geometries.push(tubeGeo)
    }

    return geometries
  }, [poles])

  return (
    <>
      {lineGeometries.map((geo, i) => (
        <mesh key={i} geometry={geo} renderOrder={6}>
          <meshStandardMaterial color="#1A1A1A" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
    </>
  )
}

// ─── Guardrails ───────────────────────────────────────────

interface GuardrailData {
  posts: THREE.Vector3[]
  beamGeometry: THREE.BufferGeometry
  postRotations: number[]
}

function generateGuardrailGeometry(curve: THREE.CatmullRomCurve3): GuardrailData[] {
  const results: GuardrailData[] = []
  const totalLength = curve.getLength()
  const worldUp = new THREE.Vector3(0, 1, 0)

  // Detect curve sections and place guardrails on outer edge
  const sampleCount = 100
  let curveStart = -1
  let curveSide = 0

  for (let i = 1; i < sampleCount - 1; i++) {
    const t = i / sampleCount
    const tPrev = (i - 1) / sampleCount
    const tNext = (i + 1) / sampleCount

    const tangentPrev = curve.getTangentAt(tPrev)
    const tangentNext = curve.getTangentAt(tNext)
    const curvature = tangentNext.clone().sub(tangentPrev).length() * sampleCount

    const cross = tangentPrev.clone().cross(tangentNext)
    const side = Math.sign(cross.y)

    if (curvature > 2.5) {
      if (curveStart < 0) {
        curveStart = t
        curveSide = side
      }
    } else if (curveStart >= 0) {
      const data = createGuardrailWBeam(curve, curveStart, t, -curveSide)
      if (data) results.push(data)
      curveStart = -1
    }
  }

  if (curveStart >= 0) {
    const data = createGuardrailWBeam(curve, curveStart, 0.98, -curveSide)
    if (data) results.push(data)
  }

  return results
}

function createGuardrailWBeam(
  curve: THREE.CatmullRomCurve3,
  tStart: number,
  tEnd: number,
  side: number,
): GuardrailData | null {
  const worldUp = new THREE.Vector3(0, 1, 0)
  const roadOffset = ROAD.width * 0.55
  const beamHeight = 0.65 // height of the metal beam
  const beamThickness = 0.03

  // Generate posts and beam spine points
  const posts: THREE.Vector3[] = []
  const postRotations: number[] = []
  const postSpacing = 3.0 // meters between posts
  const segLength = (tEnd - tStart)
  const numPosts = Math.max(2, Math.floor(segLength * curve.getLength() / postSpacing))

  const beamPoints: THREE.Vector3[] = []

  for (let i = 0; i <= numPosts; i++) {
    const t = tStart + (i / numPosts) * segLength
    const point = curve.getPointAt(Math.min(t, 0.999))
    const tangent = curve.getTangentAt(Math.min(t, 0.999)).normalize()
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize()

    const basePos = point.clone().add(right.clone().multiplyScalar(side * roadOffset))
    basePos.y += 0.15

    posts.push(basePos.clone())
    postRotations.push(Math.atan2(tangent.x, tangent.z))

    // Beam attachment point (at beam height)
    const beamPoint = basePos.clone()
    beamPoint.y += beamHeight
    beamPoints.push(beamPoint)
  }

  if (beamPoints.length < 2) return null

  // Create thin beam geometry as TubeGeometry
  const beamCurve = new THREE.CatmullRomCurve3(beamPoints, false, 'catmullrom', 0.5)
  const beamGeometry = new THREE.TubeGeometry(beamCurve, numPosts * 4, beamThickness, 4, false)

  return { posts, beamGeometry, postRotations }
}

function Guardrail({ data }: { data: GuardrailData }) {
  return (
    <group>
      {/* Metal W-beam (thin tube) */}
      <mesh geometry={data.beamGeometry} renderOrder={6}>
        <meshStandardMaterial
          color="#A0A8A8"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Support posts */}
      {data.posts.map((pos, i) => (
        <mesh
          key={i}
          position={[pos.x, pos.y + 0.35, pos.z]}
          rotation={[0, data.postRotations[i], 0]}
        >
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color="#707878" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Street Lamps ─────────────────────────────────────────

interface LampData {
  position: THREE.Vector3
  rotation: THREE.Euler
}

function generateLampPositions(curve: THREE.CatmullRomCurve3): LampData[] {
  const lamps: LampData[] = []
  const totalLength = curve.getLength()
  const spacing = 55

  for (let dist = 40; dist < totalLength - 40; dist += spacing) {
    const t = dist / totalLength
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()

    const worldUp = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize()

    // Left side of road
    const lampPos = point.clone().add(right.multiplyScalar(-ROAD.width * 0.6))
    lampPos.y += 0.15

    const angle = Math.atan2(tangent.x, tangent.z)

    lamps.push({
      position: lampPos,
      rotation: new THREE.Euler(0, angle, 0),
    })
  }

  return lamps
}

function StreetLamp({ position, rotation }: { position: THREE.Vector3; rotation: THREE.Euler }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Pole */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 5, 6]} />
        <meshStandardMaterial color="#505858" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Arm extending over road */}
      <mesh position={[0.8, 4.8, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.03, 0.04, 1.8, 4]} />
        <meshStandardMaterial color="#505858" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Lamp housing — small, subtle */}
      <mesh position={[1.5, 4.9, 0]}>
        <boxGeometry args={[0.25, 0.10, 0.15]} />
        <meshStandardMaterial
          color="#B0A890"
          emissive="#908068"
          emissiveIntensity={0.1}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}
