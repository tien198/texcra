import { MessageUI } from '#/lib/paraglide-message/message-ui'
import { useLocale } from '#/lib/paraglide-message/hooks/useLocale'
import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function BrandWordmark() {
  const locale = useLocale()

  return (
    <a
      className={clsx(
        'flex flex-col items-start gap-[2px] w-fit font-ibm-plex-sans-condensed font-[200]',
      )}
      href="#top"
      aria-label={m.brand_name({}, { locale })}
    >
      <span
        className={clsx(
          'text-[#d7e0e1] text-[20px] md:text-[26px] tracking-[4.6px] md:tracking-[5.2px] leading-[1.3] opacity-[0.94]',
        )}
      >
        <MessageUI locale={locale} message={m.brand_name} />
      </span>
      <span
        className={clsx(
          'text-[#bac9d5] text-[7px] md:text-[9px] tracking-[2.2px] leading-[1.3]',
        )}
      >
        <MessageUI locale={locale} message={m.brand_tagline} />
      </span>
    </a>
  )
}
