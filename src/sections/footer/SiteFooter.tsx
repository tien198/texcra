import { MessageUI } from '#/lib/paraglide-message/message-ui'
import { useLocale } from '#/lib/paraglide-message/hooks/useLocale'
import { m } from '#/paraglide/messages.js'
import { FooterNavigation } from './FooterNavigation'
import { FooterLegal } from './FooterLegal'
import styles from './footer.module.css'

export function SiteFooter() {
  const locale = useLocale()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <p>
            <MessageUI locale={locale} message={m.footer_tagline} />
          </p>
          <FooterNavigation />
        </div>
        <FooterLegal />
        <p className={styles.wordmark} aria-hidden="true">
          <MessageUI locale={locale} message={m.brand_name} />
        </p>
      </div>
    </footer>
  )
}
