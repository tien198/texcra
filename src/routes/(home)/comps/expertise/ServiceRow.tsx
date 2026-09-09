import { clsx } from 'clsx'
import { ArrowUpRight } from 'lucide-react'

type ServiceRowProps = {
  number: string
  title: string
  description: string
  scope: string
  light?: boolean
}
export function ServiceRow({
  number,
  title,
  description,
  scope,
}: ServiceRowProps) {
  return (
    <a
      className={clsx(
        'group grid grid-cols-[28px_minmax(0,1fr)_24px] md:grid-cols-[36px_minmax(200px,1fr)_minmax(0,1.5fr)_28px] lg:grid-cols-[64px_410px_minmax(0,1fr)_28px] gap-x-[12px] gap-y-[18px] md:gap-[24px] lg:gap-[32px] py-[28px] md:py-[32px] border-t border-[#59666b66]',
        'text-white',
        'mix-blend-difference duration-1',
      )}
      href="#contact"
      aria-label={title}
    >
      <span
        className={clsx(
          '  font-heading font-[200] text-[12px] tracking-[1.8px] pt-[6px] md:pt-0',
        )}
      >
        {number}
      </span>
      <h3
        className={clsx(
          'font-heading font-[200] text-[25px] md:text-[30px] tracking-[1.5px] md:tracking-[2.8px]',
        )}
      >
        {title}
      </h3>
      <div
        className={clsx(
          'grid gap-[18px] md:gap-[20px]   col-[2_/_4] row-[2] md:col-auto md:row-auto',
        )}
      >
        <p className={clsx('text-[15px] md:text-[17px] leading-[1.65]')}>
          {description}
        </p>
        <span
          className={clsx(
            '  font-heading font-[200] text-[9px] md:text-[10px] leading-[1.6] tracking-[1.7px] md:tracking-[2.4px]',
          )}
        >
          {scope}
        </span>
      </div>
      <ArrowUpRight
        className={clsx(
          'transition-transform duration-[180ms] ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[3px] w-[24px] md:w-[28px] col-[3] row-[1] md:col-auto md:row-auto',
        )}
        size={28}
        strokeWidth={1.4}
        aria-hidden="true"
      />
    </a>
  )
}
