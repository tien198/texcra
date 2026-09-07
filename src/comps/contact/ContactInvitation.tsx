import { m } from '#/paraglide/messages.js'
import styles from './contact.module.css'

export function ContactInvitation() {
  return (
    <div className={styles.invitation}>
      <p className={styles.eyebrow}>{m.home_contact_eyebrow()}</p>
      <h2 id="contact-heading">{m.home_contact_title()}</h2>
      <p className={styles.description}>{m.home_contact_description()}</p>
    </div>
  )
}
