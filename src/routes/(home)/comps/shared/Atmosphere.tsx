import { clsx } from 'clsx'
import styles from './atmosphere.module.css'

export function Atmosphere({ reverse = false }: { reverse?: boolean }) {
  return (
    <div
      className={clsx(
        styles.atmosphere,
        'absolute z-[-1] inset-[0_0_auto] pointer-events-none',
        reverse ? 'top-auto bottom-0 rotate-180' : ''
      )}
      aria-hidden="true"
    />
  )
}
