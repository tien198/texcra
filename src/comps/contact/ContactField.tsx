import styles from './contact.module.css'

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
    <label className={styles.field}>
      <span>{label}</span>
      <input
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
