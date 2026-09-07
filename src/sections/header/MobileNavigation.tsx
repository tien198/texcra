import { useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { getLocale } from '#/paraglide/runtime'
import { NavigationLinks } from './NavigationLinks'
import styles from './header.module.css'

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const isVietnamese = getLocale() === 'vi'

  return (
    <div
      className={styles.mobileNavigation}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false)
          toggleRef.current?.focus()
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        className={styles.menuToggle}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={
          isOpen
            ? isVietnamese
              ? 'Đóng menu'
              : 'Close menu'
            : isVietnamese
              ? 'Mở menu'
              : 'Open menu'
        }
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <X size={24} aria-hidden="true" />
        ) : (
          <Menu size={24} aria-hidden="true" />
        )}
      </button>
      <nav
        id="mobile-navigation"
        className={styles.mobileMenu}
        aria-label={isVietnamese ? 'Điều hướng chính' : 'Main navigation'}
        hidden={!isOpen}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a')) {
            setIsOpen(false)
            toggleRef.current?.focus()
          }
        }}
      >
        <NavigationLinks />
      </nav>
    </div>
  )
}
