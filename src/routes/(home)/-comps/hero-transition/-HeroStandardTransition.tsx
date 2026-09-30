import { HeroSection } from '../hero/-HeroSection'
import { StandardSection } from '../standard/-StandardSection'
import { useHeroStandardTransition } from './-useHeroStandardTransition'
import styles from './HeroStandardTransition.module.css'

export function HeroStandardTransition() {
  const { transitionRef, stageRef, heroRef, standardRef, sceneTransitionRef } =
    useHeroStandardTransition()

  return (
    <section
      id="top"
      ref={transitionRef}
      className={styles.transition}
      aria-labelledby="hero-heading standard-heading"
    >
      <div ref={stageRef} className={styles.stage}>
        <div ref={heroRef} className={styles.hero}>
          <HeroSection sceneTransitionRef={sceneTransitionRef} />
        </div>
        <div ref={standardRef} className={styles.standard}>
          <StandardSection />
        </div>
      </div>
    </section>
  )
}
