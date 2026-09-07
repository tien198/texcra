import styles from './approach.module.css'

export function ApproachPrinciple({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className={styles.principle}>
      <span className={styles.number}>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}
