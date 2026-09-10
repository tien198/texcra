import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'
import { Atmosphere } from '../../../../components/atmosphere/Atmosphere'
import { ExpertiseIntro } from './ExpertiseIntro'
import { ServiceRow } from './ServiceRow'
import { useExpertiseAtmosphere } from './hooks/useExpertiseAtmosphere'

export function ExpertiseSection() {
  const sectionRef = useExpertiseAtmosphere()

  return (
    <section
      ref={sectionRef}
      id="expertise"
      className={clsx(
        'relative isolate overflow-clip flex flex-col items-center min-h-[1204px] md:min-h-[1241px] md:pt-[420px] px-[24px] md:px-[5%] pb-[64px] md:pb-24 text-[#17242b]',
        // 'bg-[radial-gradient(ellipse_100%_130%_at_50%_130%,#c4d5e7_45%,#fdfbf7_85%,#f7f7f5)]',
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
