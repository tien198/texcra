import { m } from '#/paraglide/messages.js'
import { FooterNavigation } from './FooterNavigation'
import { FooterLegal } from './FooterLegal'
import styles from './footer.module.css'

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <p>{m.footer_tagline()}</p>
          <FooterNavigation />
        </div>
        <FooterLegal />
        <p className={styles.wordmark} aria-hidden="true">
          {m.brand_name()}
        </p>
      </div>
    </footer>
  )
}
