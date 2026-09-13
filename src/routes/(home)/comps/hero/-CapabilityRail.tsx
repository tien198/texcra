import { MessageUI } from '#/lib/paraglide-message/message-ui'
import { useLocale } from '#/lib/paraglide-message/hooks/useLocale'
import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function CapabilityRail() {
  const locale = useLocale()

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-[12px] md:gap-6 mt-[90px] md:mt-[120px] pt-[12px] md:pt-6 border-t border-[#b8ccd23d] text-[#bac9d5]',
        'font-ibm-plex-sans-condensed font-[200] text-[8px] md:text-[10px] tracking-[2.2px] md:tracking-[2.4px]',
      )}
    >
      <a className={clsx('hidden md:block py-2')} href="#expertise">
        <MessageUI locale={locale} message={m.home_hero_web_capability} />
      </a>
      <a className={clsx('hidden md:block py-2')} href="#expertise">
        <MessageUI locale={locale} message={m.home_hero_software_capability} />
      </a>
      <a className={clsx('hidden md:block py-2')} href="#standard">
        <MessageUI locale={locale} message={m.home_hero_scroll_hint} />
      </a>
      <span className={clsx('block md:hidden')}>
        <MessageUI locale={locale} message={m.home_hero_capabilities_mobile} />
      </span>
      <a className={clsx('block md:hidden py-2')} href="#standard">
        <MessageUI locale={locale} message={m.home_hero_scroll_hint_mobile} />
      </a>
    </div>
  )
}
