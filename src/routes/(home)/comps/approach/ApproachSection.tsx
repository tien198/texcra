import { clsx } from 'clsx'
import { ApproachNarrative } from './ApproachNarrative'
import { ContinuumStudy } from './ContinuumStudy'

export function ApproachSection() {
  return (
    <section
      id="approach"
      className={clsx(
        'relative isolate overflow-clip flex items-center min-h-0 md:min-h-[1357px] px-6 py-16 md:py-[100px] md:px-[5%] bg-[#061828] text-[#f7f7f5]'
      )}
      aria-labelledby="approach-heading"
    >
      <div
        className={clsx(
          'absolute z-[-2] inset-0 opacity-50',
          'bg-[linear-gradient(to_bottom,#061828,#06182800_20%,#06182800_68%,#061828),url(/images/gradient-dark-transparent.png)] bg-center bg-[100%_100%]'
        )}
        aria-hidden="true"
      />
      <img
        className={clsx(
          'absolute z-[-1] top-2 right-0 pointer-events-none',
          'w-[1393px] md:w-[98.4%] max-w-none md:max-w-[none] h-auto',
          'left-[calc(50%-720px)] md:left-auto opacity-50 md:opacity-100'
        )}
        src="/images/approach-geometry.png"
        alt=""
        loading="lazy"
        width="1417"
        height="1049"
      />
      <div
        className={clsx(
          'flex flex-col-reverse md:grid md:grid-cols-[minmax(0,620fr)_minmax(0,604fr)] items-center gap-[40px] lg:gap-[72px] w-full max-w-[1456px] mx-auto'
        )}
      >
        <ContinuumStudy />
        <ApproachNarrative />
      </div>
    </section>
  )
}
