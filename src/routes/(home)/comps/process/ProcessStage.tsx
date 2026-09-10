import { clsx } from 'clsx'

type ProcessStageProps = {
  number: string
  title: string
  description: string
  mobileDescription: string
  outcome: string
}
export function ProcessStage({
  number,
  title,
  description,
  mobileDescription,
  outcome,
}: ProcessStageProps) {
  return (
    <li
      className={clsx(
        'flex flex-col items-start gap-[15px] md:gap-[22px] border-t border-[#b5bec2] pt-[24px]',
      )}
    >
      <span
        className={clsx(
          'text-[#465157] font-heading font-[200] text-[18px] tracking-[1.8px]',
        )}
      >
        {number}
      </span>
      <h3
        className={clsx('font-heading font-[200] text-[39px] tracking-[2.2px]')}
      >
        {title}
      </h3>
      <p
        className={clsx(
          'text-[#465157] text-[22.5px] md:text-[24px] leading-[1.7]',
        )}
      >
        <span className="hidden md:inline">{description}</span>
        <span className="inline md:hidden">{mobileDescription}</span>
      </p>
      <span
        className={clsx(
          'text-[#465157] font-heading font-[200] text-[13.5px] leading-[1.5] tracking-[2.2px]',
        )}
      >
        {outcome}
      </span>
    </li>
  )
}
