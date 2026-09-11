import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function ProcessIntro() {
  return (
    <div
      className={clsx(
        'flex flex-col md:flex-row items-start md:items-center justify-between gap-[28px] md:gap-[48px] lg:gap-[80px]',
        'mix-blend-difference',
      )}
    >
      <p
        className={clsx(
          'text-[#f3f2ed] md:text-inherit font-ibm-plex-sans-condensed font-[200] text-[9px] md:text-[10px] tracking-[2.2px] md:tracking-[2.4px]',
        )}
      >
        {m.home_process_eyebrow()}
      </p>
      <div className={clsx('w-full md:w-[65%] lg:w-[569px]')}>
        <h2
          id="process-heading"
          className={clsx(
            'text-[#f3f2ed] md:text-inherit font-ibm-plex-sans-condensed font-[200] text-[34px] md:text-[48px] leading-[1.2] tracking-[2.2px] md:tracking-[3.2px] whitespace-pre-line',
          )}
        >
          <span className="hidden md:inline">{m.home_process_title()}</span>
          <span className="inline md:hidden">
            {m.home_process_title_mobile()}
          </span>
        </h2>
        <p
          className={clsx(
            'mt-[20px] text-[#bac9d5] md:text-muted text-[16px] md:text-[17px] leading-[1.7]',
          )}
        >
          <span className="hidden md:inline">
            {m.home_process_description()}
          </span>
          <span className="inline md:hidden">
            {m.home_process_description_mobile()}
          </span>
        </p>
      </div>
    </div>
  )
}
