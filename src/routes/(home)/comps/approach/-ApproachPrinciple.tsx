import { clsx } from 'clsx'

export function ApproachPrinciple({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div
      className={clsx(
        'flex gap-[16px] md:gap-[22px] pt-[20px] border-t border-[#aec2d033]'
      )}
    >
      <span
        className={clsx(
          'text-[#bddfff] font-heading font-[200] text-[10px] tracking-[2.4px]'
        )}
      >
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <h3
          className={clsx(
            'font-heading font-[200] text-[19px] tracking-[1.6px]'
          )}
        >
          {title}
        </h3>
        <p
          className={clsx(
            'mt-[7px] text-[#bac9d5] text-[14px] md:text-[15px] leading-[1.65]'
          )}
        >
          {description}
        </p>
      </div>
    </div>
  )
}
