import { createFileRoute } from '@tanstack/react-router'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime'
import { SiteHeader } from '#/sections/header/SiteHeader'
import { SiteFooter } from '#/sections/footer/SiteFooter'
import { HeroStandardTransition } from '#/routes/(home)/-comps/hero-transition/-HeroStandardTransition'
import { ExpertiseSection } from '#/routes/(home)/-comps/expertise/-ExpertiseSection'
import { ApproachSection } from '#/routes/(home)/-comps/approach/-ApproachSection'
import { ProcessSection } from '#/routes/(home)/-comps/process/-ProcessSection'
import { ContactSection } from '#/sections/contact/ContactSection'

/**
 * Main landing page route inside the `(home)` route group.
 *
 * - `(home)` is a Route Group: the folder name is parenthesized to omit any prefix
 *   from the URL, so this route resolves directly to `/`.
 * - Shared marketing layout chrome (`<SiteHeader />` and `<SiteFooter />`) is rendered
 *   directly within this route component. This avoids TanStack Router layout nesting
 *   quirks with route groups while ensuring the public marketing chrome wraps the page
 *   and non-home routes (e.g. `/admin/*`, `/api/*`) remain unaffected.
 */
export const Route = createFileRoute('/(home)/')({
  head: () => ({
    links: [
      { rel: 'icon', type: 'image/png', href: '/images/continuum-craft.png' },
    ],
    meta: [
      { title: `${m.brand_name()} — ${m.brand_tagline()}` },
      { name: 'description', content: m.home_hero_description() },
      { name: 'theme-color', content: '#061828' },
    ],
  }),
  component: Home,
})

function Home() {
  return (
    <>
      <SiteHeader />
      <a className="skip-link" href="#main-content">
        {getLocale() === 'vi' ? 'Đến nội dung chính' : 'Skip to content'}
      </a>
      <main id="main-content">
        <HeroStandardTransition />
        <ExpertiseSection />
        <ApproachSection />
        <ProcessSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  )
}
