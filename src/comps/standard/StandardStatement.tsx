import { m } from '#/paraglide/messages.js'
import styles from './standard.module.css'

export function StandardStatement() {
  return (
    <div className={styles.statement}>
      <h2 id="standard-heading">{m.home_standard_title()}</h2>
      <p className={styles.desktopCopy}>{m.home_standard_description()}</p>
      <p className={styles.mobileCopy}>
        {m.home_standard_description_mobile()}
      </p>
    </div>
  )
}
