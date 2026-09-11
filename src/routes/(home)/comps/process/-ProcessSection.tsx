import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'
import { Atmosphere } from '../../../../components/atmosphere/Atmosphere'
import { ProcessIntro } from './-ProcessIntro'
import { ProcessStage } from './-ProcessStage'
import { useProcessAtmosphere } from './hooks/-useProcessAtmosphere'

export function ProcessSection() {
  const sectionRef = useProcessAtmosphere()

  return (
    <section
      ref={sectionRef}
      id="process"
      className={clsx(
        'relative isolate overflow-clip min-h-[150vh] px-[24px] md:px-[5%] pt-[64px] md:pt-[404px] pb-[64px] md:pb-[160px] text-primary',
        'bg-[radial-gradient(ellipse_100%_130%_at_50%_-30%,#c4d5e7_45%,#fdfbf7_85%,#f7f7f5)]',
        '[--atmosphere-height:150vh] [--join-height:190px]',
        'md:[--join-height:300px]',
      )}
      aria-labelledby="process-heading"
    >
      <Atmosphere />
      <div className={clsx('max-w-[1456px] mx-auto')}>
        <ProcessIntro />
        <ol
          className={clsx(
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[28px] md:gap-[40px] lg:gap-[32px] mt-[36px] md:mt-[56px] min-h-[917px] md:min-h-0 p-0 list-none',
          )}
        >
          <ProcessStage
            number="01"
            title={m.home_process_discover_title()}
            description={m.home_process_discover_description()}
            mobileDescription={m.home_process_discover_description_mobile()}
            outcome={m.home_process_discover_outcome()}
          />
          <ProcessStage
            number="02"
            title={m.home_process_design_title()}
            description={m.home_process_design_description()}
            mobileDescription={m.home_process_design_description_mobile()}
            outcome={m.home_process_design_outcome()}
          />
          <ProcessStage
            number="03"
            title={m.home_process_engineer_title()}
            description={m.home_process_engineer_description()}
            mobileDescription={m.home_process_engineer_description_mobile()}
            outcome={m.home_process_engineer_outcome()}
          />
          <ProcessStage
            number="04"
            title={m.home_process_refine_title()}
            description={m.home_process_refine_description()}
            mobileDescription={m.home_process_refine_description_mobile()}
            outcome={m.home_process_refine_outcome()}
          />
        </ol>
      </div>
    </section>
  )
}
