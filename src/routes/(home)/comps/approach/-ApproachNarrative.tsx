import { MessageUI } from '#/lib/paraglide-message/message-ui'
import { useLocale } from '#/lib/paraglide-message/hooks/useLocale'
import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'
import { ApproachPrinciple } from './-ApproachPrinciple'

export function ApproachNarrative() {
  const locale = useLocale()

  return (
    <div
      className={clsx(
        'flex flex-col justify-between gap-[24px] md:gap-[28px] w-full min-h-0 md:min-h-[752px] text-left md:text-right',
      )}
    >
      <p
        className={clsx(
          'text-secondary font-ibm-plex-sans-condensed font-[200] text-[9px] md:text-[10px] tracking-[2.4px]',
        )}
      >
        <MessageUI locale={locale} message={m.home_approach_eyebrow} />
      </p>
      <h2
        id="approach-heading"
        className={clsx(
          'font-ibm-plex-sans-condensed font-[200] text-[36px] md:text-[48px] leading-[1.2] tracking-[2.2px] md:tracking-[3.2px] whitespace-pre-line',
        )}
      >
        <MessageUI locale={locale} message={m.home_approach_title} />
      </h2>
      <p
        className={clsx(
          'text-[#bac9d5] text-[16px] md:text-[17px] leading-[1.7]',
        )}
      >
        <MessageUI locale={locale} message={m.home_approach_description} />
      </p>
      <ApproachPrinciple
        number="01"
        title={
          <MessageUI locale={locale} message={m.home_approach_depth_title} />
        }
        description={
          <MessageUI
            locale={locale}
            message={m.home_approach_depth_description}
          />
        }
      />
      <ApproachPrinciple
        number="02"
        title={
          <MessageUI
            locale={locale}
            message={m.home_approach_precision_title}
          />
        }
        description={
          <MessageUI
            locale={locale}
            message={m.home_approach_precision_description}
          />
        }
      />
      <ApproachPrinciple
        number="03"
        title={
          <MessageUI
            locale={locale}
            message={m.home_approach_foundations_title}
          />
        }
        description={
          <MessageUI
            locale={locale}
            message={m.home_approach_foundations_description}
          />
        }
      />
    </div>
  )
}
