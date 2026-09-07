import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime'
import styles from './footer.module.css'

export function FooterNavigation() {
  return (
    <nav
      className={styles.navigation}
      aria-label={
        getLocale() === 'vi' ? 'Điều hướng cuối trang' : 'Footer navigation'
      }
    >
      <a href="#expertise">{m.nav_expertise()}</a>
      <a href="#approach">{m.nav_approach()}</a>
      <a href="#process">{m.nav_process()}</a>
      <a href="#top">{m.footer_back_to_top()}</a>
    </nav>
  )
}
