import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function StandardStatement() {
  return (
    <div className={clsx('grid gap-6')}>
      <h2
        id="standard-heading"
        className={clsx(
          'font-heading font-[200] text-[36px] md:text-[54px] leading-[1.16] tracking-[2.2px] md:tracking-[3.2px] whitespace-pre-line'
        )}
      >
        {m.home_standard_title()}
      </h2>
      <p
        className={clsx(
          'hidden md:block text-[#465157] text-[18px] leading-[1.75] whitespace-pre-line'
        )}
      >
        {m.home_standard_description()}
      </p>
      <p
        className={clsx(
          'block md:hidden text-[#465157] text-[16px] leading-[1.75] whitespace-pre-line'
        )}
      >
        {m.home_standard_description_mobile()}
      </p>
    </div>
  )
}
