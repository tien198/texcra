import styles from './process.module.css'

type ProcessStageProps = {
  number: string
  title: string
  description: string
  mobileDescription: string
  outcome: string
}
export function ProcessStage({
  number,
  title,
  description,
  mobileDescription,
  outcome,
}: ProcessStageProps) {
  return (
    <li className={styles.stage}>
      <span className={styles.number}>{number}</span>
      <h3>{title}</h3>
      <p>
        <span className={styles.desktopCopy}>{description}</span>
        <span className={styles.mobileCopy}>{mobileDescription}</span>
      </p>
      <span className={styles.outcome}>{outcome}</span>
    </li>
  )
}
