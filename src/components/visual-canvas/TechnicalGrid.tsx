import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

const TAU = Math.PI * 2
const GRID_CENTER = new THREE.Vector2(1.35, -0.16)

interface EllipseOptions {
  x: number
  y: number
  radiusX: number
  radiusY?: number
  rotation?: number
  start?: number
  end?: number
  segments?: number
  warp?: number
  phase?: number
  z?: number
}

function ellipsePoints({
  x,
  y,
  radiusX,
  radiusY = radiusX,
  rotation = 0,
  start = 0,
  end = TAU,
  segments = 112,
  warp = 0,
  phase = 0,
  z = -1.28,
}: EllipseOptions) {
  const cosRotation = Math.cos(rotation)
  const sinRotation = Math.sin(rotation)

  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = start + (index / segments) * (end - start)
    const noise = 1 + Math.sin(angle * 3 + phase) * warp + Math.sin(angle * 7 - phase) * warp * 0.28
    const localX = Math.cos(angle) * radiusX * noise
    const localY = Math.sin(angle) * radiusY * noise

    return new THREE.Vector3(
      x + localX * cosRotation - localY * sinRotation,
      y + localX * sinRotation + localY * cosRotation,
      z,
    )
  })
}

function curvePoints(points: THREE.Vector3[], divisions = 96) {
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5).getPoints(divisions)
}

export function TechnicalGrid() {
  const mainArcs = useMemo(
    () =>
      Array.from({ length: 17 }, (_, index) => {
        const radius = 0.38 + index * 0.185
        return ellipsePoints({
          x: GRID_CENTER.x + Math.sin(index * 2.17) * 0.07,
          y: GRID_CENTER.y + Math.cos(index * 1.73) * 0.055,
          radiusX: radius * (1 + Math.sin(index * 1.31) * 0.035),
          radiusY: radius * (0.92 + Math.cos(index * 1.57) * 0.045),
          rotation: -0.06 + Math.sin(index * 0.91) * 0.045,
          warp: index < 4 ? 0 : 0.006 + (index % 4) * 0.002,
          phase: index * 0.83,
          z: -1.31 - (index % 3) * 0.008,
        })
      }),
    [],
  )

  const radialFan = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => {
        const angle = (index / 36) * TAU - 0.08
        const innerRadius = 0.3 + (index % 4) * 0.035
        const outerRadius = 3.15 + Math.sin(index * 2.43) * 0.52
        const bend = Math.sin(index * 4.17) * 0.09

        return [
          new THREE.Vector3(
            GRID_CENTER.x + Math.cos(angle) * innerRadius,
            GRID_CENTER.y + Math.sin(angle) * innerRadius,
            -1.3,
          ),
          new THREE.Vector3(
            GRID_CENTER.x + Math.cos(angle + bend) * outerRadius * 0.57,
            GRID_CENTER.y + Math.sin(angle + bend) * outerRadius * 0.57,
            -1.315,
          ),
          new THREE.Vector3(
            GRID_CENTER.x + Math.cos(angle) * outerRadius,
            GRID_CENTER.y + Math.sin(angle) * outerRadius,
            -1.33,
          ),
        ]
      }),
    [],
  )

  const orbitArcs = useMemo(
    () => [
      ellipsePoints({ x: 2.92, y: 1.22, radiusX: 1.26, radiusY: 0.94, rotation: 0.2, start: -0.15, end: 5.55, z: -1.38 }),
      ellipsePoints({ x: 3.92, y: 0.48, radiusX: 2.2, radiusY: 1.18, rotation: -0.11, start: 0.35, end: 4.8, z: -1.4 }),
      ellipsePoints({ x: 4.28, y: 1.73, radiusX: 1.16, radiusY: 0.68, rotation: 0.1, start: 2.25, end: 6.15, z: -1.39 }),
      ellipsePoints({ x: -1.65, y: 0.76, radiusX: 1.44, radiusY: 0.88, rotation: -0.23, start: -0.55, end: 4.7, z: -1.39 }),
      ellipsePoints({ x: -2.62, y: -1.52, radiusX: 2.35, radiusY: 1.22, rotation: 0.11, start: 3.42, end: 6.82, z: -1.4 }),
      ellipsePoints({ x: 0.3, y: 1.94, radiusX: 1.78, radiusY: 0.72, rotation: 0.08, start: 2.82, end: 6.28, z: -1.37 }),
      ellipsePoints({ x: 1.98, y: -1.36, radiusX: 2.08, radiusY: 0.84, rotation: -0.19, start: -0.15, end: 3.95, z: -1.4 }),
      ellipsePoints({ x: 5.0, y: -0.84, radiusX: 1.72, radiusY: 0.94, rotation: -0.24, start: 1.62, end: 4.85, z: -1.4 }),
    ],
    [],
  )

  const sweepGuides = useMemo(
    () => [
      curvePoints([
        new THREE.Vector3(-5.9, -2.65, -1.42),
        new THREE.Vector3(-3.8, -2.74, -1.42),
        new THREE.Vector3(-1.3, -1.92, -1.42),
        new THREE.Vector3(0.4, -0.82, -1.42),
        new THREE.Vector3(1.0, 0.48, -1.42),
        new THREE.Vector3(2.42, 1.42, -1.42),
        new THREE.Vector3(5.9, 1.72, -1.42),
      ]),
      curvePoints([
        new THREE.Vector3(-5.8, 1.1, -1.41),
        new THREE.Vector3(-3.72, 1.05, -1.41),
        new THREE.Vector3(-1.75, 0.14, -1.41),
        new THREE.Vector3(-0.1, -0.82, -1.41),
        new THREE.Vector3(1.5, -0.98, -1.41),
        new THREE.Vector3(3.4, -0.12, -1.41),
        new THREE.Vector3(5.8, -0.46, -1.41),
      ]),
      curvePoints([
        new THREE.Vector3(-4.9, -0.05, -1.41),
        new THREE.Vector3(-3.1, 0.72, -1.41),
        new THREE.Vector3(-1.0, 0.55, -1.41),
        new THREE.Vector3(0.42, 1.58, -1.41),
        new THREE.Vector3(2.4, 2.1, -1.41),
        new THREE.Vector3(4.28, 1.35, -1.41),
        new THREE.Vector3(5.78, 2.45, -1.41),
      ]),
      curvePoints([
        new THREE.Vector3(-3.8, -3.05, -1.43),
        new THREE.Vector3(-2.0, -2.14, -1.43),
        new THREE.Vector3(-0.68, -0.82, -1.43),
        new THREE.Vector3(-0.54, 0.72, -1.43),
        new THREE.Vector3(0.72, 2.64, -1.43),
        new THREE.Vector3(2.72, 2.95, -1.43),
      ]),
      curvePoints([
        new THREE.Vector3(-1.82, 3.22, -1.43),
        new THREE.Vector3(-0.54, 2.35, -1.43),
        new THREE.Vector3(1.12, 2.72, -1.43),
        new THREE.Vector3(2.78, 2.24, -1.43),
        new THREE.Vector3(4.05, 0.84, -1.43),
        new THREE.Vector3(5.92, 0.88, -1.43),
      ]),
    ],
    [],
  )

  const constructionLines = useMemo(
    () => [
      [new THREE.Vector3(-5.8, 0.94, -1.45), new THREE.Vector3(5.8, 0.94, -1.45)],
      [new THREE.Vector3(-4.7, -1.36, -1.45), new THREE.Vector3(5.9, -1.36, -1.45)],
      [new THREE.Vector3(-2.85, -3.25, -1.45), new THREE.Vector3(-2.85, 3.35, -1.45)],
      [new THREE.Vector3(-0.42, -3.15, -1.45), new THREE.Vector3(-0.42, 3.4, -1.45)],
      [new THREE.Vector3(1.35, -3.2, -1.45), new THREE.Vector3(1.35, 3.42, -1.45)],
      [new THREE.Vector3(3.35, -3.16, -1.45), new THREE.Vector3(3.35, 3.34, -1.45)],
      [new THREE.Vector3(4.72, -2.78, -1.45), new THREE.Vector3(4.72, 2.9, -1.45)],
      [new THREE.Vector3(-4.9, -2.72, -1.45), new THREE.Vector3(5.7, 2.62, -1.45)],
      [new THREE.Vector3(-2.2, 3.2, -1.45), new THREE.Vector3(4.9, -2.2, -1.45)],
    ],
    [],
  )

  const calibrationTicks = useMemo(
    () =>
      Array.from({ length: 64 }, (_, index) => {
        const angle = (index / 64) * TAU
        const isMajor = index % 8 === 0
        const radius = 2.08 + Math.sin(index * 1.91) * 0.025
        const length = isMajor ? 0.2 : index % 4 === 0 ? 0.13 : 0.075
        const direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle))
        const tangentOffset = Math.sin(index * 2.73) * 0.018
        const tangent = new THREE.Vector2(-direction.y, direction.x).multiplyScalar(tangentOffset)

        return {
          major: isMajor,
          points: [
            new THREE.Vector3(
              GRID_CENTER.x + direction.x * radius + tangent.x,
              GRID_CENTER.y + direction.y * radius + tangent.y,
              -1.22,
            ),
            new THREE.Vector3(
              GRID_CENTER.x + direction.x * (radius + length) + tangent.x,
              GRID_CENTER.y + direction.y * (radius + length) + tangent.y,
              -1.22,
            ),
          ],
        }
      }),
    [],
  )

  return (
    <group rotation={[0, 0, -0.018]}>
      {constructionLines.map((points, index) => (
        <Line
          key={`construction-${index}`}
          points={points}
          color="#91b4ce"
          lineWidth={0.28}
          dashed
          dashScale={8}
          dashSize={0.075}
          gapSize={0.13}
          transparent
          opacity={index < 2 ? 0.11 : 0.16}
          depthWrite={false}
        />
      ))}

      {sweepGuides.map((points, index) => (
        <Line
          key={`sweep-${index}`}
          points={points}
          color={index === 0 ? '#c1d8e8' : '#779fbd'}
          lineWidth={index === 0 ? 0.44 : 0.3}
          dashed={index !== 0}
          dashScale={6}
          dashSize={0.1}
          gapSize={0.14}
          transparent
          opacity={index === 0 ? 0.24 : 0.14}
          depthWrite={false}
        />
      ))}

      {orbitArcs.map((points, index) => (
        <Line
          key={`orbit-${index}`}
          points={points}
          color={index % 3 === 0 ? '#aecce1' : '#648dab'}
          lineWidth={index % 3 === 0 ? 0.36 : 0.25}
          dashed={index % 2 === 0}
          dashScale={7}
          dashSize={0.085}
          gapSize={0.12}
          transparent
          opacity={index % 3 === 0 ? 0.19 : 0.11}
          depthWrite={false}
        />
      ))}

      {mainArcs.map((points, index) => (
        <Line
          key={`main-arc-${index}`}
          points={points}
          color={index % 4 === 0 ? '#b7d5e9' : '#6f99b8'}
          lineWidth={index % 4 === 0 ? 0.48 : 0.28}
          dashed={index > 5 && index % 3 === 1}
          dashScale={8}
          dashSize={0.07}
          gapSize={0.1}
          transparent
          opacity={index % 4 === 0 ? 0.24 : 0.135}
          depthWrite={false}
        />
      ))}

      {radialFan.map((points, index) => (
        <Line
          key={`radial-${index}`}
          points={points}
          color="#789fbb"
          lineWidth={index % 6 === 0 ? 0.36 : 0.22}
          transparent
          opacity={index % 6 === 0 ? 0.18 : 0.09}
          depthWrite={false}
        />
      ))}

      {calibrationTicks.map(({ points, major }, index) => (
        <Line
          key={`calibration-${index}`}
          points={points}
          color={major ? '#d8e9f4' : '#85a8c1'}
          lineWidth={major ? 0.65 : 0.36}
          transparent
          opacity={major ? 0.54 : 0.3}
          depthWrite={false}
        />
      ))}
    </group>
  )
}
