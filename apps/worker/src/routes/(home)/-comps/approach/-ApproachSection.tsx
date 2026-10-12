import { clsx } from 'clsx'
import { useState } from 'react'
import styles from './ApproachSection.module.css'
import { ApproachNarrative } from './-ApproachNarrative'
import { ContinuumStudy } from './-ContinuumStudy'

export function ApproachSection() {
  const [eventSource, setEventSource] = useState<HTMLElement | null>(null)

  return (
    <section
      ref={setEventSource}
      id="approach"
      className={clsx(
        'relative isolate overflow-clip flex items-center min-h-0 md:min-h-[1357px] px-6 py-16 md:py-[100px] md:px-[5%] bg-[#061828] text-ivory',
        // Postprocessing can write viewport-sized inline dimensions to the canvas.
        // Keep this section's canvas fitted to its square artwork container.
        '[&_canvas]:h-full! [&_canvas]:w-full!',
      )}
      aria-labelledby="approach-heading"
    >
      <div
        className={clsx(
          'pointer-events-none absolute z-[-2] inset-0 opacity-50',
          'bg-[linear-gradient(to_bottom,#061828,#06182800_20%,#06182800_68%,#061828),url(/images/gradient-dark-transparent.png)] bg-center bg-[100%_100%]',
        )}
        aria-hidden="true"
      />
      <div
        className={clsx(
          styles.sectionGlow,
          'pointer-events-none absolute inset-0 z-[-1]',
        )}
        aria-hidden="true"
      />
      <div
        className={clsx(
          'flex flex-col-reverse md:grid md:grid-cols-[minmax(0,620fr)_minmax(0,604fr)] items-center gap-[40px] lg:gap-[72px] w-full max-w-[1456px] mx-auto',
        )}
      >
        <ContinuumStudy eventSource={eventSource} />
        <ApproachNarrative />
      </div>
    </section>
  )
}
