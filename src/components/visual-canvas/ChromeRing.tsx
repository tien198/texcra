import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const BASE_ROTATION_X = 0.08
const BASE_ROTATION_Y = -0.2
const BASE_ROTATION_Z = -0.08
const MAX_TILT = THREE.MathUtils.degToRad(30)

export function ChromeRing() {
  const ring = useRef<THREE.Group>(null)
  const drag = useRef(new THREE.Vector2())
  const dragging = useRef(false)
  const hovered = useRef(false)
  const targetTilt = useRef(new THREE.Vector2())
  const tickMarks = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const angle = (index / 48) * Math.PI * 2
        const major = index % 4 === 0
        const radius = 1.86
        return { angle, major, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
      }),
    [],
  )

  useFrame(({ pointer }, delta) => {
    if (!ring.current) return
    const frameDelta = Math.min(delta, 1 / 30)
    targetTilt.current.set(
      -pointer.y * MAX_TILT + drag.current.y,
      pointer.x * MAX_TILT + drag.current.x,
    )

    if (targetTilt.current.lengthSq() > MAX_TILT * MAX_TILT) {
      targetTilt.current.setLength(MAX_TILT)
    }

    ring.current.rotation.x = THREE.MathUtils.damp(
      ring.current.rotation.x,
      BASE_ROTATION_X + targetTilt.current.x,
      3.5,
      frameDelta,
    )
    ring.current.rotation.y = THREE.MathUtils.damp(
      ring.current.rotation.y,
      BASE_ROTATION_Y + targetTilt.current.y,
      3.5,
      frameDelta,
    )
  })

  const startDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    dragging.current = true
    const target = event.nativeEvent.target as Element | null
    target?.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'grabbing'
  }

  const moveDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return
    drag.current.x = THREE.MathUtils.clamp(
      drag.current.x + (event.nativeEvent.movementX ?? 0) * 0.002,
      -0.28,
      0.28,
    )
    drag.current.y = THREE.MathUtils.clamp(
      drag.current.y + (event.nativeEvent.movementY ?? 0) * 0.002,
      -0.18,
      0.18,
    )
  }

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    dragging.current = false
    const target = event.nativeEvent.target as Element | null
    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    document.body.style.cursor = hovered.current ? 'grab' : 'default'
  }

  return (
    <group position={[1.35, -0.16, 0.18]}>
      <mesh
        rotation={[BASE_ROTATION_X, BASE_ROTATION_Y, BASE_ROTATION_Z]}
        onPointerEnter={(event) => {
          event.stopPropagation()
          hovered.current = true
          if (!dragging.current) document.body.style.cursor = 'grab'
        }}
        onPointerLeave={() => {
          hovered.current = false
          if (!dragging.current) document.body.style.cursor = 'default'
        }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
      >
        <torusGeometry args={[1.6, 0.16, 8, 120]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>

      <group
        ref={ring}
        rotation={[BASE_ROTATION_X, BASE_ROTATION_Y, BASE_ROTATION_Z]}
      >
        <mesh>
          <torusGeometry args={[1.6, 0.058, 18, 220]} />
          <meshPhysicalMaterial
            color="#eef4f7"
            metalness={1}
            roughness={0.055}
            envMapIntensity={2.1}
            clearcoat={1}
            clearcoatRoughness={0.06}
          />
        </mesh>

        <mesh position={[0, 0, -0.012]}>
          <torusGeometry args={[1.6, 0.087, 14, 180]} />
          <meshBasicMaterial
            color="#78bcf1"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        <mesh position={[0, 0, -0.08]}>
          <torusGeometry args={[1.39, 0.006, 5, 160]} />
          <meshBasicMaterial color="#8bcfff" transparent opacity={0.42} toneMapped={false} />
        </mesh>

        <group position={[0, 0, -0.12]}>
          {tickMarks.map(({ angle, major, x, y }, index) => (
            <mesh key={index} position={[x, y, 0]} rotation={[0, 0, angle]}>
              <boxGeometry args={[major ? 0.16 : 0.085, major ? 0.012 : 0.007, 0.008]} />
              <meshBasicMaterial
                color={major ? '#dcefff' : '#7eacd0'}
                transparent
                opacity={major ? 0.8 : 0.45}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>

        <pointLight color="#8dccff" intensity={4.5} distance={5} decay={2} />
      </group>
    </group>
  )
}
