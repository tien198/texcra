import { m } from '#/paraglide/messages.js'
import { ProjectLink } from '../../comps/shared/ProjectLink'
import styles from './header.module.css'

export function NavigationLinks() {
  return (
    <>
      <a className={styles.navLink} href="#expertise">
        {m.nav_expertise()}
      </a>
      <a className={styles.navLink} href="#approach">
        {m.nav_approach()}
      </a>
      <a className={styles.navLink} href="#process">
        {m.nav_process()}
      </a>
      <ProjectLink variant="text" />
    </>
  )
}
