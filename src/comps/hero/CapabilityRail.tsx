import { m } from '#/paraglide/messages.js'
import styles from './hero.module.css'

export function CapabilityRail() {
  return (
    <div className={styles.rail}>
      <a className={styles.desktopCopy} href="#expertise">
        {m.home_hero_web_capability()}
      </a>
      <a className={styles.desktopCopy} href="#expertise">
        {m.home_hero_software_capability()}
      </a>
      <a className={styles.desktopCopy} href="#standard">
        {m.home_hero_scroll_hint()}
      </a>
      <span className={styles.mobileCopy}>
        {m.home_hero_capabilities_mobile()}
      </span>
      <a className={styles.mobileCopy} href="#standard">
        {m.home_hero_scroll_hint_mobile()}
      </a>
    </div>
  )
}
