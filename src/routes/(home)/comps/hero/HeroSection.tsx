import { clsx } from 'clsx'
import { VisualScene } from '#/components/visual-canvas/VisualScene'
import { CapabilityRail } from './CapabilityRail'
import { HeroNarrative } from './HeroNarrative'

export function HeroSection() {
  return (
    <section
      id="top"
      className={clsx(
        'relative isolate min-h-[751px] md:h-[100dvh] md:min-h-0 overflow-clip bg-[#061828] text-[#f7f7f5]'
      )}
      aria-labelledby="hero-heading"
    >
      <div aria-hidden="true">
        <VisualScene />
      </div>
      <div
        className={clsx(
          'absolute z-[-1] inset-0 top-[101px] md:top-0 pointer-events-none',
          'bg-[linear-gradient(to_bottom,#061828_0%,#061828f5_11%,#06182800_40%,#06182800_60%,#061828_83%,#061828_100%)]',
          'md:bg-[linear-gradient(to_top,#061828_0%,#06182800_19.33%),linear-gradient(to_left,#061828f5_0%,#06182825_22%,#061828e5_76%,#061828_100%)]'
        )}
        aria-hidden="true"
      />
      <div
        className={clsx(
          'relative z-[1] flex flex-col justify-between min-h-[663px] md:min-h-[800px] max-w-[1600px] mx-auto px-6 py-8 pb-10 md:px-[5%] md:pt-[112px] md:pb-[50px]'
        )}
      >
        <HeroNarrative />
        <CapabilityRail />
      </div>
    </section>
  )
}
