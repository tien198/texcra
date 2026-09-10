import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'
import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, events } from '@react-three/fiber'
import { ChromeRing } from '#/components/visual-canvas/ChromeRing'
import type { CanvasProps } from '@react-three/fiber'

const ringEvents: NonNullable<CanvasProps['events']> = (store) => ({
  ...events(store),
  compute(event, state) {
    const { left, top, width, height } =
      state.gl.domElement.getBoundingClientRect()
    if (width === 0 || height === 0) return

    state.pointer.set(
      ((event.clientX - left) / width) * 2 - 1,
      -((event.clientY - top) / height) * 2 + 1,
    )
    state.raycaster.setFromCamera(state.pointer, state.camera)
  },
})

export function ContinuumStudy({
  eventSource,
}: {
  eventSource: HTMLElement | null
}) {
  return (
    <figure
      className={clsx(
        'relative w-full max-w-[500px] md:max-w-none aspect-square overflow-hidden',
      )}
    >
      {eventSource && (
        <Canvas
          eventSource={eventSource}
          events={ringEvents}
          camera={{ position: [0, 0, 10], fov: 36, near: 0.1, far: 100 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.28} color="#c6def5" />
          <directionalLight
            position={[4, 5, 7]}
            intensity={2.2}
            color="#f5fbff"
          />
          <ChromeRing />
          <Environment resolution={256}>
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
          </Environment>
        </Canvas>
      )}

      <div
        className={clsx(
          'absolute inset-[62.9%_0_0]',
          'bg-[linear-gradient(to_bottom,#06182800,#061828_60%)]',
        )}
        aria-hidden="true"
      />
      <figcaption
        className={clsx(
          'absolute top-[90%] left-0 right-0 flex justify-between gap-[16px] pt-[14px] md:pt-[18px] border-t border-[#aec2d050]',
          'text-[#bac9d5] font-heading font-[200] text-[7px] md:text-[8px] lg:text-[9px] tracking-[1.4px] md:tracking-[1px] lg:tracking-[2.2px]',
        )}
      >
        <span>{m.home_artwork_principles()}</span>
        <span>{m.home_artwork_caption()}</span>
      </figcaption>
    </figure>
  )
}
