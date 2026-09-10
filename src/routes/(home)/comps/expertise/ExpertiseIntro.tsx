import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function ExpertiseIntro() {
  return (
    <div
      className={clsx(
        'flex flex-col md:flex-row items-start md:items-end justify-between gap-[24px] md:gap-[40px] pt-[28px] md:pt-[36px] border-t border-[#bac9d566]',
        'mix-blend-difference',
      )}
    >
      <h2
        id="expertise-heading"
        className={clsx(
          'font-heading font-[200] text-[36px] md:text-[54px] leading-[1.16] tracking-[2.2px] md:tracking-[3.2px] whitespace-pre-line',
        )}
      >
        {m.home_expertise_title()}
      </h2>
      <p
        className={clsx(
          'w-auto md:w-[376px] text-[#465157] text-[15px] md:text-[16px] leading-[1.65] whitespace-pre-line',
        )}
      >
        <span className="hidden md:inline">
          {m.home_expertise_description()}
        </span>
        <span className="inline md:hidden">
          {m.home_expertise_description_mobile()}
        </span>
      </p>
    </div>
  )
}
