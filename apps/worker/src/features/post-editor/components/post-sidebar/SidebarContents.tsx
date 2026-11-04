import type { SEO, DocumentSnapshot } from '#/features/lexical-editor/core/editor-data'
import { DocumentPreview } from './DocumentPreview'
import { buildHtmlDocument } from '#/features/lexical-editor/document/document-export'
import { PostMetadata } from './PostMetadata'
import type { Option } from '#/lib/types/option'

export function SidebarContents({
  title,
  heroImage,
  seo,
  preview,
  snapshot,
  setPreviewWidth,
  authors,
  onAuthorsChange,
}: {
  title: string
  heroImage: string | null
  seo: SEO
  preview: boolean
  snapshot: DocumentSnapshot | null
  setPreviewWidth: (width: number | string) => void
  authors: Option[]
  onAuthorsChange: (val: Option[]) => void
}) {
  if (preview && snapshot)
    return (
      <DocumentPreview
        html={buildHtmlDocument({ title, heroImage, seo }, snapshot.html)}
        onWidthChange={setPreviewWidth}
      />
    )
  else
    return (
      <PostMetadata
        title={title}
        authors={authors}
        onAuthorsChange={onAuthorsChange}
      />
    )
}
