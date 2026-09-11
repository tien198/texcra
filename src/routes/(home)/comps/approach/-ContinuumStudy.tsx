import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'
import { Canvas, events } from '@react-three/fiber'
import { Bloom, EffectComposer, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import { ChromeRing } from '#/components/visual-canvas/ChromeRing'
import { StudioLighting } from '#/components/visual-canvas/StudioLighting'
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
        'relative w-full min-w-0 max-w-[540px] justify-self-start',
      )}
    >
      <div className="relative aspect-square w-full" aria-hidden="true">
        <div className="pointer-events-none absolute inset-0">
          {eventSource && (
            <Canvas
              eventSource={eventSource}
              events={ringEvents}
              camera={{ position: [0, 0, 10], fov: 28, near: 0.1, far: 100 }}
              dpr={[1, 1.75]}
              gl={{
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                outputColorSpace: THREE.SRGBColorSpace,
              }}
            >
              <StudioLighting />
              <ChromeRing
                position={[0, 0, 0]}
                maxTilt={THREE.MathUtils.degToRad(8)}
              />
              <EffectComposer multisampling={0}>
                <Bloom
                  intensity={0.7}
                  luminanceThreshold={0.68}
                  luminanceSmoothing={0.5}
                  mipmapBlur
                />
                <SMAA />
              </EffectComposer>
            </Canvas>
          )}
        </div>
      </div>
      <figcaption
        className={clsx(
          'relative mt-2 flex justify-between gap-[16px] pt-[14px] md:pt-[18px] border-t border-[#aec2d050]',
          'text-[#bac9d5] font-ibm-plex-sans-condensed font-[200] text-[7px] md:text-[8px] lg:text-[9px] tracking-[1.4px] md:tracking-[1px] lg:tracking-[2.2px]',
        )}
      >
        <span>{m.home_artwork_principles()}</span>
        <span>{m.home_artwork_caption()}</span>
      </figcaption>
    </figure>
  )
}
