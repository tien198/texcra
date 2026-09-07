import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function ContinuumStudy() {
  return (
    <figure
      className={clsx(
        'relative w-full max-w-[500px] md:max-w-none aspect-square overflow-hidden'
      )}
    >
      <img
        className={clsx(
          'absolute top-[-19.35%] left-[-87.42%] w-[201.61%] max-w-none h-[126.13%] object-cover'
        )}
        src="/images/continuum-craft.png"
        alt=""
        loading="lazy"
        width="1250"
        height="782"
      />
      <div
        className={clsx(
          'absolute inset-[62.9%_0_0]',
          'bg-[linear-gradient(to_bottom,#06182800,#061828_60%)]'
        )}
        aria-hidden="true"
      />
      <figcaption
        className={clsx(
          'absolute top-[90%] left-0 right-0 flex justify-between gap-[16px] pt-[14px] md:pt-[18px] border-t border-[#aec2d050]',
          'text-[#bac9d5] font-heading font-[200] text-[7px] md:text-[8px] lg:text-[9px] tracking-[1.4px] md:tracking-[1px] lg:tracking-[2.2px]'
        )}
      >
        <span>{m.home_artwork_principles()}</span>
        <span>{m.home_artwork_caption()}</span>
      </figcaption>
    </figure>
  )
}
