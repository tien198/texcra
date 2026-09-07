import { m } from '#/paraglide/messages.js'
import styles from './footer.module.css'

export function FooterLegal() {
  return (
    <div className={styles.legal}>
      <p>{m.footer_copyright()}</p>
      <p>{m.footer_motto()}</p>
    </div>
  )
}
