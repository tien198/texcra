import { SiteFooter } from '#/sections/footer/SiteFooter'
import { SiteHeader } from '#/sections/header/SiteHeader'
import { createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />

      {children}
      <SiteFooter />
    </>
  )
}
