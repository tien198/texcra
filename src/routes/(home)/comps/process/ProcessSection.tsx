import { m } from '#/paraglide/messages.js'
import { Atmosphere } from '../shared/Atmosphere'
import { ProcessIntro } from './ProcessIntro'
import { ProcessStage } from './ProcessStage'
import styles from './process.module.css'

export function ProcessSection() {
  return (
    <section
      id="process"
      className={styles.section}
      aria-labelledby="process-heading"
    >
      <Atmosphere />
      <div className={styles.inner}>
        <ProcessIntro />
        <ol className={styles.stages}>
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
