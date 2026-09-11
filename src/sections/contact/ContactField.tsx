import { clsx } from 'clsx'

type ContactFieldProps = {
  name: string
  label: string
  placeholder: string
  type?: 'text' | 'email'
  autoComplete: string
}
export function ContactField({
  name,
  label,
  placeholder,
  type = 'text',
  autoComplete,
}: ContactFieldProps) {
  return (
    <label
      className={clsx(
        'flex flex-col gap-[16px] border-b border-[#aec2d050] pb-[14px] min-w-0',
      )}
    >
      <span className={clsx('text-[13px]')}>{label}</span>
      <input
        className={clsx(
          'w-full min-w-0 p-0 border-0 rounded-none bg-transparent text-ivory text-[16px] leading-[1.4] placeholder:text-[#8ca0b0] placeholder:opacity-100',
        )}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        maxLength={200}
      />
    </label>
  )
}
