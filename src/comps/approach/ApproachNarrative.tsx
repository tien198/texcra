import { m } from '#/paraglide/messages.js'
import { ApproachPrinciple } from './ApproachPrinciple'
import styles from './approach.module.css'

export function ApproachNarrative() {
  return (
    <div className={styles.narrative}>
      <p className={styles.eyebrow}>{m.home_approach_eyebrow()}</p>
      <h2 id="approach-heading">{m.home_approach_title()}</h2>
      <p className={styles.introduction}>{m.home_approach_description()}</p>
      <ApproachPrinciple
        number="01"
        title={m.home_approach_depth_title()}
        description={m.home_approach_depth_description()}
      />
      <ApproachPrinciple
        number="02"
        title={m.home_approach_precision_title()}
        description={m.home_approach_precision_description()}
      />
      <ApproachPrinciple
        number="03"
        title={m.home_approach_foundations_title()}
        description={m.home_approach_foundations_description()}
      />
    </div>
  )
}
