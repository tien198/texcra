import { useLocale } from '#/lib/paraglide-message/hooks/useLocale'
import { BrandWordmark } from '../../routes/(home)/comps/shared/-BrandWordmark'
import { ProjectLink } from '../../routes/(home)/comps/shared/-ProjectLink'
import { LanguageSelect } from './LanguageSelect'
import { MobileNavigation } from './MobileNavigation'
import { NavigationLinks } from './NavigationLinks'
import { clsx } from 'clsx'
import styles from './header.module.css'

export function SiteHeader() {
  const locale = useLocale()
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
          <div className="flex items-center gap-3 lg:gap-8">
            <nav
              className="hidden items-center gap-3 md:flex lg:gap-8"
              aria-label={
                locale === 'vi' ? 'Điều hướng chính' : 'Main navigation'
              }
            >
              <NavigationLinks includeProjectLink={false} />
            </nav>
            <LanguageSelect />
            <div className="hidden md:block">
              <ProjectLink variant="text" />
            </div>
            <MobileNavigation />
          </div>
        </div>
      </header>
    </>
  )
}
