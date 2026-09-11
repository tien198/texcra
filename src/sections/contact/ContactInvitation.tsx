import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function ContactInvitation() {
  return (
    <div className={clsx('flex flex-col gap-[24px] md:gap-[28px]')}>
      <p
        className={clsx(
          'text-secondary font-ibm-plex-sans-condensed font-[200] text-[9px] md:text-[10px] tracking-[2.2px] md:tracking-[2.4px]',
        )}
      >
        {m.home_contact_eyebrow()}
      </p>
      <h2
        id="contact-heading"
        className={clsx(
          'font-ibm-plex-sans-condensed font-[200] text-[44px] md:text-[60px] leading-[1.12] tracking-[2.8px] md:tracking-[3.2px] whitespace-pre-line',
        )}
      >
        {m.home_contact_title()}
      </h2>
      <p
        className={clsx(
          'text-[#bac9d5] text-[16px] md:text-[17px] leading-[1.65] whitespace-pre-line',
        )}
      >
        {m.home_contact_description()}
      </p>
    </div>
  )
}
