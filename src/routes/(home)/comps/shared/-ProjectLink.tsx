import { clsx } from 'clsx'
import { ArrowUpRight } from 'lucide-react'
import { m } from '#/paraglide/messages.js'

export function ProjectLink({
  variant = 'glass',
}: {
  variant?: 'glass' | 'text'
}) {
  const baseClasses = clsx(
    'inline-flex items-center w-fit min-h-[48px] font-manrope font-[300] tracking-[1.2px]',
    'transition-colors duration-[180ms] ease-out',
  )

  const glassClasses = clsx(
    baseClasses,
    'gap-8 px-6 py-[18px] rounded-lg',
    'border border-[#dcefff59] border-t-[#f5fcff99]',
    'bg-[linear-gradient(125deg,#edf8ff30,#b5d9ff0c_48%,#d7edff1c)] text-[#edf7ff] text-[13px]',
    'backdrop-blur-[18px]',
    'shadow-[0_1px_1px_#ffffff38,0_-1px_2px_#b6dfff1f,0_8px_24px_-6px_#020e1b66]',
    'hover:bg-[#bddfff20] hover:border-[#edf7ff]',
  )

  const textClasses = clsx(
    baseClasses,
    'gap-2 py-[14px] text-ivory text-[16px]',
    '[&>span]:underline [&>span]:underline-offset-[6px] [&>span]:decoration-[1px]',
  )

  return (
    <a
      className={variant === 'glass' ? glassClasses : textClasses}
      href="#contact"
    >
      <span>{m.action_start_project()}</span>
      <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
    </a>
  )
}
