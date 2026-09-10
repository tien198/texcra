import { createFileRoute } from '@tanstack/react-router'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime'
import { HeroStandardTransition } from '#/routes/(home)/comps/hero-transition/HeroStandardTransition'
import { ExpertiseSection } from '#/routes/(home)/comps/expertise/ExpertiseSection'
import { ApproachSection } from '#/routes/(home)/comps/approach/ApproachSection'
import { ProcessSection } from '#/routes/(home)/comps/process/ProcessSection'
import { ContactSection } from '#/sections/contact/ContactSection'

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
    </>
  )
}
