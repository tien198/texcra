import { createFileRoute } from '@tanstack/react-router'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime'
import { HeroSection } from '#/comps/hero/HeroSection'
import { StandardSection } from '#/comps/standard/StandardSection'
import { ExpertiseSection } from '#/comps/expertise/ExpertiseSection'
import { ApproachSection } from '#/comps/approach/ApproachSection'
import { ProcessSection } from '#/comps/process/ProcessSection'
import { ContactSection } from '#/comps/contact/ContactSection'

export const Route = createFileRoute('/')({
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
        <HeroSection />
        <StandardSection />
        <ExpertiseSection />
        <ApproachSection />
        <ProcessSection />
        <ContactSection />
      </main>
    </>
  )
}
