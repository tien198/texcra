import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'

export function ProjectTypeSelector() {
  const options = [
    { value: 'website', label: m.contact_project_type_website() },
    { value: 'software', label: m.contact_project_type_software() },
    { value: 'discuss', label: m.contact_project_type_discuss() },
  ]
  return (
    <fieldset className={clsx('border-0 p-0 m-0 min-w-0')}>
      <legend className={clsx('text-[13px] p-0 mb-[14px]')}>
        {m.contact_project_type_label()}
      </legend>
      <div className={clsx('flex flex-wrap gap-[8px] md:gap-[12px]')}>
        {options.map((option) => (
          <label
            key={option.value}
            className={clsx('group relative cursor-pointer')}
          >
            <input
              className={clsx('absolute w-[1px] h-[1px] opacity-0 peer')}
              type="radio"
              name="projectType"
              value={option.value}
              defaultChecked={option.value === 'website'}
              required
            />
            <span
              className={clsx(
                'block min-h-[44px] px-[10px] md:px-[18px] py-[12px] border border-[#aec2d033] text-[#bac9d5] text-[12px] md:text-[13px]',
                'peer-checked:border-[#bddfff88] peer-checked:text-secondary peer-checked:bg-[#bddfff0d]',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#bddfff] peer-focus-visible:outline-offset-[4px]',
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
