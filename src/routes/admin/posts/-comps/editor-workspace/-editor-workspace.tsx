import { lazy, Suspense, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { useEditorState, useDraftManagement } from './hooks'
import { SeoPanel } from './seo/-seo-panel'
import { StatusBar } from './layout/-status-bar'
import { EditorActions } from './layout/-editor-actions'
import { RelationshipField } from './layout/-relationship-field'
import { PostSidebar } from './layout/post-sidebar/-post-sidebar'
import { ImageUpload } from '#/components/image-upload'
import { TooltipProvider } from '#/components/ui/tooltip'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Kbd } from '#/components/ui/kbd'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Skeleton } from '#/components/ui/skeleton'

import type { Post } from '#/server/post/types'

const RichTextEditor = lazy(() =>
  import('#/lexical/-rich-text-editor').then((m) => ({
    default: m.RichTextEditor,
  })),
)

export default function EditorWorkspace({
  post,
}: {
  post: Post
}) {
  const [preview, setPreview] = useState(false)

  const postId = String(post.id)
  const {
    title,
    heroImage,
    seo,
    snapshot,
    authors,
    categories,
    relatedPosts,
    error,
    handleTitleChange,
    handleHeroImageChange,
    handleSeoChange,
    handleSnapshotChange,
    handleAuthorsChange,
    handleCategoriesChange,
    handleRelatedPostsChange,
  } = useEditorState(postId)

  const {
    lexicalInitialState,
    editorKey,
    hasDraft,
    handleRestoreDraft,
    handleDismissDraft,
  } = useDraftManagement({
    post,
  })

  const words = snapshot?.words ?? 0

  return (
    <TooltipProvider delay={350}>
      <div
        className={
          'flex min-h-[56px] items-center justify-between gap-[16px] border-b border-border px-[var(--admin-gutter)] py-[10px] max-[699px]:flex-col max-[699px]:items-start max-[699px]:gap-[12px]'
        }
      >
        <StatusBar />
        <EditorActions
          hasSnapshot={!!snapshot}
          preview={preview}
          onTogglePreview={() => setPreview((prev) => !prev)}
        />
      </div>

      {hasDraft && (
        <div className="bg-accent/50 border-b border-border px-[var(--admin-gutter)] py-3 flex items-center justify-between">
          <p className="text-sm">A saved draft was found on this device.</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDismissDraft}>
              Dismiss
            </Button>
            <Button size="sm" onClick={handleRestoreDraft}>
              Restore Draft
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-0 right-0 left-0 z-50 p-4">
          <div className="mx-auto max-w-2xl">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      )}
      <div
        className={
          preview && snapshot
            ? 'grid min-h-[calc(100dvh-179px)] grid-cols-[minmax(30%,1fr)_auto]'
            : 'grid min-h-[calc(100dvh-179px)] grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] max-[1023px]:grid-cols-[minmax(0,1fr)_280px] max-[699px]:flex max-[699px]:flex-col'
        }
      >
        <div className={'min-w-0'}>
          <div className="grid gap-[8px] pb-[24px] pl-[var(--admin-gutter)] pr-[40px] pt-[30px] max-[1399px]:pr-[32px] max-[699px]:pr-[var(--admin-gutter)]">
            <Label htmlFor="article-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="article-title"
              aria-label="Article title"
              value={title}
              placeholder="Untitled document"
              onChange={(event) => handleTitleChange(event.target.value)}
            />
          </div>
          <Tabs defaultValue="content" className="gap-0">
            <TabsList
              variant="line"
              className="flex h-[57px] w-full justify-start gap-[20px] border-b border-border px-[var(--admin-gutter)] [&_[data-slot=tabs-trigger]]:h-full [&_[data-slot=tabs-trigger]]:flex-none [&_[data-slot=tabs-trigger]]:rounded-none [&_[data-slot=tabs-trigger]]:border-0 [&_[data-slot=tabs-trigger]]:p-0 [&_[data-slot=tabs-trigger]]:text-[16px] [&_[data-slot=tabs-trigger]]:font-semibold [&_[data-slot=tabs-trigger]]:after:bottom-0 [&_[data-slot=tabs-trigger]]:after:h-[2px]"
              aria-label="Post fields"
            >
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="meta">Meta</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>
            <TabsContent
              value="content"
              keepMounted
              className="px-[var(--admin-gutter)] pb-[40px] pt-[22px] text-[13px] max-[699px]:pb-[28px] [&_[data-slot=card]]:overflow-visible [&_[data-slot=card]]:rounded-none [&_[data-slot=card]]:border-b [&_[data-slot=card]]:border-border [&_[data-slot=card]]:pb-[26px] [&_[data-slot=card]]:shadow-none [&_[data-slot=card]]:[--card-spacing:0px] [&_[data-slot=card-content]]:rounded-none [&_[data-slot=card-content]_.text-sm]:text-[13px] [&_[data-slot=card-description]]:text-[13px] [&_[data-slot=card-footer]]:rounded-none [&_[data-slot=card-footer]]:bg-transparent [&_[data-slot=card-footer]]:pt-[12px] [&_[data-slot=card-header]]:rounded-none [&_[data-slot=card-title]]:text-[14px]"
            >
              <ImageUpload value={heroImage} onChange={handleHeroImageChange} />
              <Suspense
                fallback={
                  <Skeleton className="mt-[24px] h-[400px] w-full rounded-md" />
                }
              >
                <section aria-label="Article editor">
                  <RichTextEditor
                    key={editorKey}
                    initialState={lexicalInitialState}
                    onChange={handleSnapshotChange}
                  />
                  <div
                    className={
                      'mt-[16px] flex flex-wrap justify-between gap-[8px] border-t border-border py-[14px] text-[12px] text-muted-foreground [&>span:last-child]:flex [&>span:last-child]:items-center [&>span:last-child]:gap-[6px]'
                    }
                  >
                    <span>
                      {words.toLocaleString()} words /{' '}
                      {snapshot?.text.length.toLocaleString() ?? 0} characters
                    </span>
                    <span>
                      <Clock3 className="size-3" />
                      {words ? Math.ceil(words / 200) : 0} min read
                    </span>
                  </div>
                </section>
                <p
                  className={
                    'mt-[12px] text-[12px] leading-[1.8] text-muted-foreground'
                  }
                >
                  Type <Kbd>##</Kbd> then space for a heading, or <Kbd>-</Kbd>{' '}
                  then space for a list.
                </p>
                {snapshot && snapshot.headings.length > 0 && (
                  <section
                    aria-label="Document outline"
                    className={
                      'mt-[26px] text-[13px] [&_h2]:mb-[12px] [&_h2]:font-semibold'
                    }
                  >
                    <h2>In this document</h2>
                    <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
                      {snapshot.headings.map((heading) => (
                        <li
                          key={heading.key}
                          className={heading.level > 2 ? 'ml-3' : ''}
                        >
                          {heading.text || 'Untitled heading'}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </Suspense>
            </TabsContent>
            <TabsContent
              value="meta"
              keepMounted
              className={`${'px-[var(--admin-gutter)] pb-[40px] pt-[22px] text-[13px] max-[699px]:pb-[28px] [&_[data-slot=card]]:overflow-visible [&_[data-slot=card]]:rounded-none [&_[data-slot=card]]:border-b [&_[data-slot=card]]:border-border [&_[data-slot=card]]:pb-[26px] [&_[data-slot=card]]:shadow-none [&_[data-slot=card]]:[--card-spacing:0px] [&_[data-slot=card-content]]:rounded-none [&_[data-slot=card-content]_.text-sm]:text-[13px] [&_[data-slot=card-description]]:text-[13px] [&_[data-slot=card-footer]]:rounded-none [&_[data-slot=card-footer]]:bg-transparent [&_[data-slot=card-footer]]:pt-[12px] [&_[data-slot=card-header]]:rounded-none [&_[data-slot=card-title]]:text-[14px]'} space-y-6`}
            >
              <RelationshipField
                label="Related Posts"
                collection="related-posts"
                value={relatedPosts}
                onChange={handleRelatedPostsChange}
              />
              <RelationshipField
                label="Categories"
                collection="categories"
                value={categories}
                onChange={handleCategoriesChange}
              />
            </TabsContent>
            <TabsContent
              value="seo"
              keepMounted
              className={
                'px-[var(--admin-gutter)] pb-[40px] pt-[22px] text-[13px] max-[699px]:pb-[28px] [&_[data-slot=card]]:overflow-visible [&_[data-slot=card]]:rounded-none [&_[data-slot=card]]:border-b [&_[data-slot=card]]:border-border [&_[data-slot=card]]:pb-[26px] [&_[data-slot=card]]:shadow-none [&_[data-slot=card]]:[--card-spacing:0px] [&_[data-slot=card-content]]:rounded-none [&_[data-slot=card-content]_.text-sm]:text-[13px] [&_[data-slot=card-description]]:text-[13px] [&_[data-slot=card-footer]]:rounded-none [&_[data-slot=card-footer]]:bg-transparent [&_[data-slot=card-footer]]:pt-[12px] [&_[data-slot=card-header]]:rounded-none [&_[data-slot=card-title]]:text-[14px]'
              }
            >
              <SeoPanel
                seo={seo}
                title={title}
                heroImage={heroImage}
                onChange={handleSeoChange}
                snapshot={snapshot}
              />
            </TabsContent>
          </Tabs>
        </div>
        <PostSidebar
          title={title}
          heroImage={heroImage}
          seo={seo}
          preview={preview}
          snapshot={snapshot}
          authors={authors}
          onAuthorsChange={handleAuthorsChange}
        />
      </div>
    </TooltipProvider>
  )
}
