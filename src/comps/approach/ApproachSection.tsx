import { ApproachNarrative } from './ApproachNarrative'
import { ContinuumStudy } from './ContinuumStudy'
import styles from './approach.module.css'

export function ApproachSection() {
  return (
    <section
      id="approach"
      className={styles.section}
      aria-labelledby="approach-heading"
    >
      <div className={styles.atmosphere} aria-hidden="true" />
      <img
        className={styles.geometry}
        src="/images/approach-geometry.png"
        alt=""
        loading="lazy"
        width="1417"
        height="1049"
      />
      <div className={styles.inner}>
        <ContinuumStudy />
        <ApproachNarrative />
      </div>
    </section>
  )
}
