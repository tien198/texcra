import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, events, useFrame, useThree } from '@react-three/fiber'
import type { CanvasProps } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import type { RefObject } from 'react'
import {
  Bloom,
  EffectComposer,
  SMAA,
  Vignette,
} from '@react-three/postprocessing'
import * as THREE from 'three'
import styles from './VisualScene.module.css'
import { ChromeRing } from './ChromeRing'
import { FlowField } from './FlowField'
import { TechnicalGrid } from './TechnicalGrid'

export interface VisualSceneTransition {
  progress: number
  /** Normalized canvas coordinates, measured from the top-left corner. */
  targetX: number
  targetY: number
}

function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <group rotation={[0, 0.15, 0]}>
        <Lightformer
          intensity={4.5}
          color="#e9f4ff"
          position={[-4, 3, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[7, 1.1, 1]}
        />
        <Lightformer
          intensity={7}
          color="#ffffff"
          position={[4, 1, 3]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[4, 0.35, 1]}
        />
        <Lightformer
          intensity={3.5}
          color="#398ed1"
          position={[0, -4, 1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[7, 2, 1]}
        />
        <Lightformer
          form="ring"
          intensity={3}
          color="#bfdfff"
          position={[0, 0, -4]}
          scale={5}
        />
      </group>
    </Environment>
  )
}

function SceneContent({
  hasInteracted,
  sceneTransitionRef,
}: {
  hasInteracted: RefObject<boolean>
  sceneTransitionRef?: RefObject<VisualSceneTransition>
}) {
  const { viewport } = useThree()
  const compact = viewport.width < 8
  const composition = useRef<THREE.Group>(null)
  const ringCenter = useRef<THREE.Group>(null)
  const target = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    const group = composition.current
    const center = ringCenter.current
    const transition = sceneTransitionRef?.current
    if (!group || !center || !group.parent) return
    if (!transition || transition.progress === 0) {
      group.position.set(0, 0, 0)
      return
    }

    // Project the ring's resting center, including the responsive parent transform.
    // Preserve its depth when converting the clip center back into world space.
    const point = target.current.copy(center.position)
    group.parent.localToWorld(point)
    point.project(camera)
    point.x = THREE.MathUtils.lerp(
      point.x,
      transition.targetX * 2 - 1,
      transition.progress,
    )
    point.y = THREE.MathUtils.lerp(
      point.y,
      1 - transition.targetY * 2,
      transition.progress,
    )
    point.unproject(camera)
    group.parent.worldToLocal(point)
    group.position.copy(point).sub(center.position)
  }, -1)

  return (
    <>
      <ambientLight intensity={0.28} color="#c6def5" />
      <directionalLight position={[4, 5, 7]} intensity={2.2} color="#f5fbff" />
      <group
        scale={compact ? 0.78 : 1}
        position={compact ? [0.65, -0.45, 0] : [0.45, -0.06, 0]}
      >
        <TechnicalGrid />
        <group ref={composition}>
          <FlowField hasInteracted={hasInteracted} />
          <ChromeRing centerRef={ringCenter} />
        </group>
      </group>
      <StudioEnvironment />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.68}
          luminanceSmoothing={0.5}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.64} />
        <SMAA />
      </EffectComposer>
    </>
  )
}

export function VisualScene({
  eventSource,
  sceneTransitionRef,
}: {
  eventSource: HTMLElement | null
  sceneTransitionRef?: RefObject<VisualSceneTransition>
}) {
  const hasInteracted = useRef(false)
  const sceneEvents = useCallback<NonNullable<CanvasProps['events']>>(
    (store) => ({
      ...events(store),
      compute(event, state) {
        // DOM overlays have their own offsets; always measure against the canvas.
        const { left, top, width, height } =
          state.gl.domElement.getBoundingClientRect()
        if (width === 0 || height === 0) return

        state.pointer.set(
          ((event.clientX - left) / width) * 2 - 1,
          -((event.clientY - top) / height) * 2 + 1,
        )
        state.raycaster.setFromCamera(state.pointer, state.camera)
        if (event.type === 'pointermove' || event.type === 'pointerdown') {
          hasInteracted.current = true
        }
      },
    }),
    [],
  )

  return (
    <div className={styles.visualScene} aria-hidden="true">
      {eventSource && (
        <Canvas
          eventSource={eventSource}
          events={sceneEvents}
          camera={{ position: [0, 0, 10], fov: 36, near: 0.1, far: 100 }}
          dpr={[1, 1.75]}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
        >
          <SceneContent
            hasInteracted={hasInteracted}
            sceneTransitionRef={sceneTransitionRef}
          />
        </Canvas>
      )}
    </div>
  )
}
