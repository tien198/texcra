import { getLocale } from '#/paraglide/runtime'
import { BrandWordmark } from '../../comps/shared/BrandWordmark'
import { MobileNavigation } from './MobileNavigation'
import { NavigationLinks } from './NavigationLinks'
import styles from './header.module.css'

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <BrandWordmark />
        <nav
          className={styles.desktopNavigation}
          aria-label={
            getLocale() === 'vi' ? 'Điều hướng chính' : 'Main navigation'
          }
        >
          <NavigationLinks />
        </nav>
        <MobileNavigation />
      </div>
    </header>
  )
}
