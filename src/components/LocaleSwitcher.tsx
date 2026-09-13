import { MessageUI } from '#/lib/paraglide-message/message-ui'
import { useLocale } from '#/lib/paraglide-message/hooks/useLocale'
// Locale switcher refs:
// - Paraglide docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
// - Router example: https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#switching-locale
import { locales, setLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

export default function ParaglideLocaleSwitcher() {
  const locale = useLocale()

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        color: 'inherit',
      }}
      aria-label={m.language_label({}, { locale })}
    >
      <span style={{ opacity: 0.85 }}>
        <MessageUI
          locale={locale}
          message={m.current_locale}
          inputs={{ locale }}
        />
      </span>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {locales.map((nextLocale) => (
          <button
            key={nextLocale}
            onClick={() => setLocale(nextLocale)}
            aria-pressed={nextLocale === locale}
            style={{
              cursor: 'pointer',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              border: '1px solid #d1d5db',
              background: nextLocale === locale ? '#0f172a' : 'transparent',
              color: nextLocale === locale ? '#f8fafc' : 'inherit',
              fontWeight: nextLocale === locale ? 700 : 500,
              letterSpacing: '0.01em',
            }}
          >
            {nextLocale.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
