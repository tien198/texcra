import { useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { getLocale } from '#/paraglide/runtime'
import { NavigationLinks } from './NavigationLinks'
import { clsx } from 'clsx'

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const isVietnamese = getLocale() === 'vi'

  return (
    <div
      className={clsx('block md:hidden')}
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
        className={clsx(
          'grid place-items-center w-[44px] h-[44px] p-0 border-0 bg-transparent text-[#f7f7f5] cursor-pointer'
        )}
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
        className={clsx(
          'absolute inset-[87px_0_auto] flex flex-col items-start gap-3 p-6',
          'border-b border-[#bac9d54d] bg-[#061828] shadow-[0_16px_24px_#020e1b40]'
        )}
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
