import { getLocale } from '#/paraglide/runtime'
import { BrandWordmark } from '../../routes/(home)/comps/shared/-BrandWordmark'
import { MobileNavigation } from './MobileNavigation'
import { NavigationLinks } from './NavigationLinks'
import { clsx } from 'clsx'
import styles from './header.module.css'

export function SiteHeader() {
  const positionClass = 'fixed inset-x-0 top-0 z-10 h-[88px] md:h-[100px]'

  return (
    <>
      <div
        aria-hidden="true"
        className={clsx(styles.backdrop, positionClass)}
      />
      <header
        className={clsx(
          styles.header,
          positionClass,
          'border-b border-[#ffffff20]',
        )}
      >
        <div
          className={clsx(
            'flex items-center justify-between h-full max-w-[1600px] mx-auto px-6 md:px-[5%] py-5 md:py-6 gap-6',
          )}
        >
          <BrandWordmark />
          <nav
            className={clsx('hidden md:flex items-center gap-5 lg:gap-8')}
            aria-label={
              getLocale() === 'vi' ? 'Điều hướng chính' : 'Main navigation'
            }
          >
            <NavigationLinks />
          </nav>
          <MobileNavigation />
        </div>
      </header>
    </>
  )
}
