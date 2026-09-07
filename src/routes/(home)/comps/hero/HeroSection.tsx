import { VisualScene } from '#/components/visual-canvas/VisualScene'
import { CapabilityRail } from './CapabilityRail'
import { HeroNarrative } from './HeroNarrative'
import styles from './hero.module.css'

export function HeroSection() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-heading">
      <div aria-hidden="true">
        <VisualScene/>
    
      </div>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.content}>
        <HeroNarrative />
        <CapabilityRail />
      </div>
    </section>
  )
}
