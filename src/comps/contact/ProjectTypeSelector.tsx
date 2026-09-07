import { m } from '#/paraglide/messages.js'
import styles from './contact.module.css'

export function ProjectTypeSelector() {
  const options = [
    { value: 'website', label: m.contact_project_type_website() },
    { value: 'software', label: m.contact_project_type_software() },
    { value: 'discuss', label: m.contact_project_type_discuss() },
  ]
  return (
    <fieldset className={styles.projectType}>
      <legend>{m.contact_project_type_label()}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name="projectType"
              value={option.value}
              defaultChecked={option.value === 'website'}
              required
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
