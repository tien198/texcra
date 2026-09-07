import { CapabilityRail } from './CapabilityRail'
import { HeroNarrative } from './HeroNarrative'
import styles from './hero.module.css'

export function HeroSection() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.artwork} aria-hidden="true">
        <img
          src="/images/continuum-craft.png"
          alt=""
          fetchPriority="high"
          width="1645"
          height="1029"
        />
      </div>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.content}>
        <HeroNarrative />
        <CapabilityRail />
      </div>
    </section>
  )
}
