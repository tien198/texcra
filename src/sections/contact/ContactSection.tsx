import { ContactInvitation } from './ContactInvitation'
import { EnquiryForm } from './EnquiryForm'
import styles from './contact.module.css'

export function ContactSection() {
  return (
    <section
      id="contact"
      className={styles.section}
      aria-labelledby="contact-heading"
    >
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.inner}>
        <ContactInvitation />
        <EnquiryForm />
      </div>
    </section>
  )
}
