import { m } from '#/paraglide/messages.js'
import { ProjectLink } from '../shared/ProjectLink'
import styles from './hero.module.css'

export function HeroNarrative() {
  return (
    <div className={styles.narrative}>
      <p className={styles.eyebrow}>{m.home_hero_eyebrow()}</p>
      <h1 id="hero-heading" className={styles.headline}>
        <span className={styles.desktopCopy}>{m.home_hero_title()}</span>
        <span className={styles.mobileCopy}>{m.home_hero_title_mobile()}</span>
      </h1>
      <p className={styles.description}>
        <span className={styles.desktopCopy}>{m.home_hero_description()}</span>
        <span className={styles.mobileCopy}>
          {m.home_hero_description_mobile()}
        </span>
      </p>
      <div className={styles.actions}>
        <ProjectLink />
        <a className={styles.expertiseLink} href="#expertise">
          {m.home_hero_expertise_link()}
        </a>
      </div>
    </div>
  )
}
