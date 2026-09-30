import { lazy, Suspense, useState } from 'react'
import { Await, ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Menu, UserRound } from 'lucide-react'
import { Breadcrumb } from './-comps/editor-workspace/layout/-breadcrumb'
import { NavSidebar } from './-comps/editor-workspace/layout/-nav-sidebar'
import { EditorFallback } from './-comps/editor-workspace/layout/-editor-fallback'
import { Button } from '#/components/ui/button'
import { getPostByIdServerFn } from '#/server/post/get-post-by-id'

const EditorWorkspace = lazy(
  () => import('./-comps/editor-workspace/-editor-workspace'),
)

const description =
  'A thoughtful space to write for the web. Create rich-text articles with accessible images, search previews, local drafts, and semantic HTML export.'

export const Route = createFileRoute('/admin/posts/$postId')({
  // 2. Do NOT await the fetch, return the promise for SSR streaming
  loader: ({ params }) => {
    const deferredPost = getPostByIdServerFn({ data: { id: params.postId } })
    return { deferredPost }
  },
  head: () => ({
    meta: [
      { title: 'Draft — A thoughtful editor for the web' },
      { name: 'description', content: description },
      {
        property: 'og:title',
        content: 'Draft — A thoughtful editor for the web',
      },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: EditorPage,
  errorComponent: ({ error }) => {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4">
        <h1 className="mb-4 text-2xl font-bold">Failed to load post</h1>
        <p className="text-muted-foreground">{(error as any).message}</p>
      </div>
    )
  },
})

function EditorPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuCollapsed, setMenuCollapsed] = useState(false)

  // 4. Access the deferred promise
  const { deferredPost } = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-background text-foreground font-sans text-[13px] [--admin-nav-width:230px] [--admin-gutter:20px] md:[--admin-gutter:24px] lg:[--admin-gutter:32px] 2xl:[--admin-nav-width:272px] 2xl:[--admin-gutter:60px] [&_[data-slot=input]]:h-10 [&_[data-slot=input]]:px-[14px] [&_[data-slot=input]]:rounded-[3px] [&_[data-slot=input]]:text-[13px] [&_[data-slot=textarea]]:rounded-[3px] [&_[data-slot=textarea]]:text-[13px] [&_[data-slot=label]]:text-[13px] [&_[data-slot=label]]:font-normal [&_[data-slot=button]]:rounded-[3px]">
      <a
        href="#workspace"
        className="sr-only fixed top-2 left-2 z-50 rounded bg-background px-3 py-2 text-sm text-foreground shadow-md ring-1 ring-border focus:not-sr-only"
      >
        Skip to editor
      </a>
      <NavSidebar
        open={menuOpen}
        collapsed={menuCollapsed}
        onClose={() => setMenuOpen(false)}
        onCollapse={() => {
          setMenuCollapsed(true)
          setMenuOpen(false)
        }}
      />
      <div
        className={`min-w-0 transition-[margin] duration-200 ${
          menuCollapsed ? 'ml-0' : 'lg:ml-[var(--admin-nav-width)]'
        }`}
      >
        {/* 5. Wrap the dynamic parts in <Await> to stream them in */}
        <Await promise={deferredPost} fallback={<EditorFallback />}>
          {(post) => (
            <>
              <header className="border-b border-border bg-background/95 px-[var(--admin-gutter)]">
                <div className="flex h-[55px] items-center justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className={
                        menuCollapsed ? 'inline-flex' : 'inline-flex lg:hidden'
                      }
                      aria-label="Open menu"
                      aria-controls="admin-navigation"
                      aria-expanded={menuOpen}
                      onClick={() => {
                        setMenuCollapsed(false)
                        setMenuOpen(true)
                      }}
                    >
                      <Menu />
                    </Button>
                    <Breadcrumb />
                  </div>
                  <UserRound
                    className="size-[26px] rounded-full border border-border bg-secondary p-1 text-secondary-foreground"
                    aria-label="Account"
                  />
                </div>
                <div className="flex min-h-[67px] items-center justify-between pb-[15px]">
                  {/* 6. Display the dynamic post ID */}
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {post.id}
                  </h1>
                  <nav
                    className="flex items-center gap-0.5 md:gap-3 [&_button]:h-[34px] [&_button]:px-[14px] [&_button]:text-[12px] [&_button]:font-semibold [&_button:disabled]:opacity-40"
                    aria-label="Document views"
                  >
                    <Button variant="secondary" aria-current="page">
                      Edit
                    </Button>
                    <Button variant="ghost" disabled>
                      Versions
                    </Button>
                    <Button variant="ghost" disabled>
                      API
                    </Button>
                  </nav>
                </div>
              </header>
              <main id="workspace">
                <ClientOnly fallback={<EditorFallback />}>
                  <Suspense fallback={<EditorFallback />}>
                    <EditorWorkspace postId={post.id.toString()} />
                  </Suspense>
                </ClientOnly>
              </main>
            </>
          )}
        </Await>
      </div>
    </div>
  )
}
