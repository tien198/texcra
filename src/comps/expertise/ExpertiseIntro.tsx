import { m } from '#/paraglide/messages.js'
import styles from './expertise.module.css'

export function ExpertiseIntro() {
  return (
    <div className={styles.intro}>
      <h2 id="expertise-heading">{m.home_expertise_title()}</h2>
      <p>
        <span className={styles.desktopCopy}>
          {m.home_expertise_description()}
        </span>
        <span className={styles.mobileCopy}>
          {m.home_expertise_description_mobile()}
        </span>
      </p>
    </div>
  )
}
