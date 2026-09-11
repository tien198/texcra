import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'
import { ProjectLink } from '../../routes/(home)/comps/shared/-ProjectLink'

export function NavigationLinks() {
  const navLinkClass = clsx(
    'inline-flex items-center w-full md:w-auto min-h-[44px]',
    // 'text-[#d3dce2] hover:text-white',
    'font-sans text-[16px] md:text-[12px] tracking-[0.2px]',
    'hover:underline hover:underline-offset-[5px]',
  )

  return (
    <>
      <a className={navLinkClass} href="#expertise">
        {m.nav_expertise()}
      </a>
      <a className={navLinkClass} href="#approach">
        {m.nav_approach()}
      </a>
      <a className={navLinkClass} href="#process">
        {m.nav_process()}
      </a>
      <ProjectLink variant="text" />
    </>
  )
}
