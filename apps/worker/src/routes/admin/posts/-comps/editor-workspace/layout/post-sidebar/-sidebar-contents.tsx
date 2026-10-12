import type { SEO, DocumentSnapshot } from '#/lexical/core/-editor-data'
import { DocumentPreview } from './-document-preview'
import { buildHtmlDocument } from '#/lexical/document/-document-export'
import { PostMetadata } from './-post-metadata'
import type { Option } from '#/components/texcra-ui/relationship-multi-select'

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
