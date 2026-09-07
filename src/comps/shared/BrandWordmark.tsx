import { m } from '#/paraglide/messages.js'
import styles from './shared.module.css'

export function BrandWordmark() {
  return (
    <a className={styles.wordmark} href="#top" aria-label={m.brand_name()}>
      <span className={styles.brand}>{m.brand_name()}</span>
      <span className={styles.tagline}>{m.brand_tagline()}</span>
    </a>
  )
}
