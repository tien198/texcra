import { MessageUI } from '#/lib/paraglide-message/message-ui'
import { useLocale } from '#/lib/paraglide-message/hooks/useLocale'
import { m } from '#/paraglide/messages.js'
import styles from './footer.module.css'

export function FooterLegal() {
  const locale = useLocale()

  return (
    <div className={styles.legal}>
      <p>
        <MessageUI locale={locale} message={m.footer_copyright} />
      </p>
      <p>
        <MessageUI locale={locale} message={m.footer_motto} />
      </p>
    </div>
  )
}
