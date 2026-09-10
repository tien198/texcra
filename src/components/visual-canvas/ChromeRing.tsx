import type { ThreeEvent } from '@react-three/fiber'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'

const BASE_ROTATION_X = 0.08
const BASE_ROTATION_Y = -0.2
const BASE_ROTATION_Z = -0.08
const MAX_TILT = THREE.MathUtils.degToRad(30)

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest(
      'a, button, input, select, textarea, [role="button"], [contenteditable="true"]',
    )
  )
}

export function ChromeRing({
  centerRef,
  position = [1.35, -0.16, 0.18],
  maxTilt = MAX_TILT,
}: {
  centerRef?: RefObject<THREE.Group | null>
  position?: [number, number, number]
  /** Maximum interactive tilt in radians. */
  maxTilt?: number
}) {
  const events = useThree((state) => state.events)
  const ring = useRef<THREE.Group>(null)
  const drag = useRef(new THREE.Vector2())
  const activeDrag = useRef<{
    id: number
    target: Element
    x: number
    y: number
  } | null>(null)
  const hovered = useRef(false)
  const targetTilt = useRef(new THREE.Vector2())
  const tickMarks = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const angle = (index / 48) * Math.PI * 2
        const major = index % 4 === 0
        const radius = 1.86
        return {
          angle,
          major,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        }
      }),
    [],
  )

  useEffect(() => {
    const source = events.connected
    if (!source) return

    const resetDrag = () => {
      const active = activeDrag.current
      if (!active && !hovered.current) return
      activeDrag.current = null
      hovered.current = false
      if (active?.target.hasPointerCapture(active.id)) {
        active.target.releasePointerCapture(active.id)
      }
      document.body.style.cursor = 'default'
    }
    const cancelDrag = (event: PointerEvent) => {
      if (event.pointerId === activeDrag.current?.id) resetDrag()
    }

    // Fiber clears its captures on these DOM events without calling mesh handlers.
    source.addEventListener('pointercancel', cancelDrag)
    source.addEventListener('lostpointercapture', cancelDrag)
    window.addEventListener('blur', resetDrag)
    return () => {
      source.removeEventListener('pointercancel', cancelDrag)
      source.removeEventListener('lostpointercapture', cancelDrag)
      window.removeEventListener('blur', resetDrag)
      resetDrag()
    }
  }, [events.connected])

  useFrame(({ pointer }, delta) => {
    if (!ring.current) return
    const frameDelta = Math.min(delta, 1 / 30)
    targetTilt.current.set(
      -pointer.y * maxTilt + drag.current.y,
      pointer.x * maxTilt + drag.current.x,
    )

    if (targetTilt.current.lengthSq() > maxTilt * maxTilt) {
      targetTilt.current.setLength(maxTilt)
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
    if (
      event.button !== 0 ||
      activeDrag.current ||
      isInteractiveTarget(event.nativeEvent.target)
    )
      return
    event.stopPropagation()
    // Use Fiber's target wrapper so the mesh keeps receiving events off its geometry.
    const target = event.target as Element
    target.setPointerCapture(event.pointerId)
    activeDrag.current = {
      id: event.pointerId,
      target,
      x: event.clientX,
      y: event.clientY,
    }
    document.body.style.cursor = 'grabbing'
  }

  const moveDrag = (event: ThreeEvent<PointerEvent>) => {
    const active = activeDrag.current
    if (!active || active.id !== event.pointerId) return
    event.stopPropagation()
    drag.current.x = THREE.MathUtils.clamp(
      drag.current.x + (event.clientX - active.x) * 0.002,
      -0.28,
      0.28,
    )
    drag.current.y = THREE.MathUtils.clamp(
      drag.current.y + (event.clientY - active.y) * 0.002,
      -0.18,
      0.18,
    )
    active.x = event.clientX
    active.y = event.clientY
  }

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    const active = activeDrag.current
    if (!active || active.id !== event.pointerId) return
    activeDrag.current = null
    if (active.target.hasPointerCapture(event.pointerId)) {
      active.target.releasePointerCapture(event.pointerId)
    }
    events.update?.()
    document.body.style.cursor = hovered.current ? 'grab' : 'default'
  }

  return (
    <group ref={centerRef} position={position}>
      <group
        ref={ring}
        rotation={[BASE_ROTATION_X, BASE_ROTATION_Y, BASE_ROTATION_Z]}
      >
        <mesh
          onPointerEnter={(event) => {
            if (isInteractiveTarget(event.nativeEvent.target)) return
            event.stopPropagation()
            hovered.current = true
            if (!activeDrag.current) document.body.style.cursor = 'grab'
          }}
          onPointerLeave={() => {
            hovered.current = false
            if (!activeDrag.current) document.body.style.cursor = 'default'
          }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
        >
          <torusGeometry args={[1.6, 0.16, 8, 120]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            colorWrite={false}
            depthWrite={false}
          />
        </mesh>

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
          <meshBasicMaterial
            color="#8bcfff"
            transparent
            opacity={0.42}
            toneMapped={false}
          />
        </mesh>

        <group position={[0, 0, -0.12]}>
          {tickMarks.map(({ angle, major, x, y }, index) => (
            <mesh key={index} position={[x, y, 0]} rotation={[0, 0, angle]}>
              <boxGeometry
                args={[major ? 0.16 : 0.085, major ? 0.012 : 0.007, 0.008]}
              />
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
