import { m } from '#/paraglide/messages.js'
import { Atmosphere } from '../shared/Atmosphere'
import { ExpertiseIntro } from './ExpertiseIntro'
import { ServiceRow } from './ServiceRow'
import styles from './expertise.module.css'

export function ExpertiseSection() {
  return (
    <section
      id="expertise"
      className={styles.section}
      aria-labelledby="expertise-heading"
    >
      <Atmosphere reverse />
      <div className={styles.inner}>
        <ExpertiseIntro />
        <div className={styles.services}>
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
