import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function BrandWordmark() {
  return (
    <a
      className={clsx(
        'flex flex-col items-start gap-[2px] w-fit font-heading font-[200]'
      )}
      href="#top"
      aria-label={m.brand_name()}
    >
      <span
        className={clsx(
          'text-[#d7e0e1] text-[20px] md:text-[26px] tracking-[4.6px] md:tracking-[5.2px] leading-[1.3] opacity-[0.94]'
        )}
      >
        {m.brand_name()}
      </span>
      <span
        className={clsx(
          'text-[#bac9d5] text-[7px] md:text-[9px] tracking-[2.2px] leading-[1.3]'
        )}
      >
        {m.brand_tagline()}
      </span>
    </a>
  )
}
