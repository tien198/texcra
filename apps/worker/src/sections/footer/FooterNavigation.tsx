import { MessageUI } from '#/lib/paraglide-message/message-ui'
import { useLocale } from '#/lib/paraglide-message/hooks/useLocale'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime'
import styles from './footer.module.css'

export function FooterNavigation() {
  const locale = useLocale()

  return (
    <nav
      className={styles.navigation}
      aria-label={
        getLocale() === 'vi' ? 'Điều hướng cuối trang' : 'Footer navigation'
      }
    >
      <a href="#expertise">
        <MessageUI locale={locale} message={m.nav_expertise} />
      </a>
      <a href="#approach">
        <MessageUI locale={locale} message={m.nav_approach} />
      </a>
      <a href="#process">
        <MessageUI locale={locale} message={m.nav_process} />
      </a>
      <a href="#top">
        <MessageUI locale={locale} message={m.footer_back_to_top} />
      </a>
    </nav>
  )
}
