import { clsx } from 'clsx'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { m } from '#/paraglide/messages.js'
import { Atmosphere } from '../shared/Atmosphere'
import { ExpertiseIntro } from './ExpertiseIntro'
import { ServiceRow } from './ServiceRow'

export function ExpertiseSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const atmosphere = section?.querySelector('[data-atmosphere]')
    if (!section || !atmosphere) return

    gsap.registerPlugin(ScrollTrigger)
    const media = gsap.matchMedia()

    media.add(
      '(prefers-reduced-motion: no-preference)',
      () => {
        gsap.fromTo(
          atmosphere,
          { scaleY: 1 },
          {
            scaleY: 6,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom bottom',
              scrub: true,
            },
          },
        )
      },
      section,
    )

    return () => media.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="expertise"
      className={clsx(
        'relative isolate overflow-clip flex flex-col items-center min-h-[1204px] md:min-h-[1241px] pt-[0] md:pt-[20px] px-[24px] md:px-[5%] pb-[64px] md:pb-[96px] text-[#17242b]',
        'bg-[radial-gradient(ellipse_100%_130%_at_50%_130%,#c4d5e7_45%,#fdfbf7_85%,#f7f7f5)]',
      )}
      aria-labelledby="expertise-heading"
    >
      <Atmosphere reverse />
      <div
        className={clsx('w-full max-w-[1456px] mx-auto flex-1 flex flex-col')}
      >
        <ExpertiseIntro />
        <div
          className={clsx(
            'flex flex-col justify-between min-h-[760px] md:min-h-[688px] mt-[32px] md:mt-[44px]',
          )}
        >
          <ServiceRow
            number="01"
            title={m.home_service_design_title()}
            description={m.home_service_design_description()}
            scope={m.home_service_design_scope()}
          />
          <ServiceRow
            number="02"
            title={m.home_service_development_title()}
            description={m.home_service_development_description()}
            scope={m.home_service_development_scope()}
          />
          <ServiceRow
            number="03"
            title={m.home_service_engineering_title()}
            description={m.home_service_engineering_description()}
            scope={m.home_service_engineering_scope()}
            light
          />
        </div>
      </div>
    </section>
  )
}
