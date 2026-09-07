import { ArrowUpRight } from 'lucide-react'
import styles from './expertise.module.css'

type ServiceRowProps = {
  number: string
  title: string
  description: string
  scope: string
  light?: boolean
}
export function ServiceRow({
  number,
  title,
  description,
  scope,
  light = false,
}: ServiceRowProps) {
  return (
    <a
      className={`${styles.row} ${light ? styles.light : ''}`}
      href="#contact"
      aria-label={title}
    >
      <span className={styles.number}>{number}</span>
      <h3>{title}</h3>
      <div className={styles.narrative}>
        <p>{description}</p>
        <span className={styles.scope}>{scope}</span>
      </div>
      <ArrowUpRight
        className={styles.arrow}
        size={28}
        strokeWidth={1.4}
        aria-hidden="true"
      />
    </a>
  )
}
