import styles from './atmosphere.module.css'

export function Atmosphere({ reverse = false }: { reverse?: boolean }) {
  return (
    <div
      className={`${styles.atmosphere} ${reverse ? styles.reverse : ''}`}
      aria-hidden="true"
    />
  )
}
