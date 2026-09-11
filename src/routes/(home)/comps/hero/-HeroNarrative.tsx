import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'
import { ProjectLink } from '../shared/-ProjectLink'

export function HeroNarrative() {
  return (
    <div
      className={clsx(
        'flex flex-col justify-between items-start gap-5 md:gap-[30px] w-full md:w-[min(744px,100%)] min-h-[450px] md:min-h-[385px]'
      )}
    >
      <p
        className={clsx(
          'font-heading font-[200] text-[#bddfff] text-[9px] md:text-[10px] tracking-[2.2px] md:tracking-[2.4px]'
        )}
      >
        {m.home_hero_eyebrow()}
      </p>
      <h1
        id="hero-heading"
        className={clsx(
          'font-heading font-[200] text-[42px] md:text-[44px] tracking-[2.8px] md:tracking-[4.2px] leading-[1.06] md:leading-[1.28] whitespace-pre-line break-words md:break-normal'
        )}
      >
        <span className="hidden md:block">{m.home_hero_title()}</span>
        <span className="block md:hidden">{m.home_hero_title_mobile()}</span>
      </h1>
      <p
        className={clsx(
          'max-w-[280px] md:max-w-[560px] text-[#c6d1d9] font-sans text-[16px] md:text-[14px] leading-[1.6] md:leading-[1.7] whitespace-pre-line'
        )}
      >
        <span className="hidden md:block">{m.home_hero_description()}</span>
        <span className="block md:hidden">
          {m.home_hero_description_mobile()}
        </span>
      </p>
      <div className={clsx('flex items-center gap-[30px] md:pt-[6px]')}>
        <ProjectLink />
        <a
          className={clsx(
            'hidden md:inline-flex items-center min-h-[44px] text-[#dbeefff0] text-[13px] tracking-[0.2px] hover:underline hover:underline-offset-[6px]'
          )}
          href="#expertise"
        >
          {m.home_hero_expertise_link()}
        </a>
      </div>
    </div>
  )
}
