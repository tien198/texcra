import { m } from '#/paraglide/messages.js'
import { Atmosphere } from '../shared/Atmosphere'
import { StandardStatement } from './StandardStatement'
import styles from './standard.module.css'

export function StandardSection() {
  return (
    <section
      id="standard"
      className={styles.section}
      aria-labelledby="standard-heading"
    >
      <Atmosphere />
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{m.home_standard_eyebrow()}</p>
        <StandardStatement />
      </div>
    </section>
  )
}
