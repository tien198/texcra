import { ArrowUpRight } from 'lucide-react'
import { m } from '#/paraglide/messages.js'
import styles from './shared.module.css'

export function ProjectLink({
  variant = 'glass',
}: {
  variant?: 'glass' | 'text'
}) {
  return (
    <a
      className={variant === 'glass' ? styles.glassLink : styles.textLink}
      href="#contact"
    >
      <span>{m.action_start_project()}</span>
      <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
    </a>
  )
}
