import { m } from '#/paraglide/messages.js'
import styles from './process.module.css'

export function ProcessIntro() {
  return (
    <div className={styles.intro}>
      <p className={styles.eyebrow}>{m.home_process_eyebrow()}</p>
      <div className={styles.narrative}>
        <h2 id="process-heading">
          <span className={styles.desktopCopy}>{m.home_process_title()}</span>
          <span className={styles.mobileCopy}>
            {m.home_process_title_mobile()}
          </span>
        </h2>
        <p>
          <span className={styles.desktopCopy}>
            {m.home_process_description()}
          </span>
          <span className={styles.mobileCopy}>
            {m.home_process_description_mobile()}
          </span>
        </p>
      </div>
    </div>
  )
}
