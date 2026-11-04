import { MessageUI, useLocale  } from '#/lib/i18n'
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
