import { m } from '#/paraglide/messages.js'
import styles from './approach.module.css'

export function ContinuumStudy() {
  return (
    <figure className={styles.study}>
      <img
        className={styles.chrome}
        src="/images/continuum-craft.png"
        alt=""
        loading="lazy"
        width="1250"
        height="782"
      />
      <div className={styles.fade} aria-hidden="true" />
      <figcaption>
        <span>{m.home_artwork_principles()}</span>
        <span>{m.home_artwork_caption()}</span>
      </figcaption>
    </figure>
  )
}
