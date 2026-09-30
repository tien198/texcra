import { useState } from 'react'
import type {
  SEO,
  DocumentSnapshot,
} from '../../../../../../../lexical/core/-editor-data'
import { SidebarContents } from './-sidebar-contents'

export function PostSidebar({
  title,
  heroImage,
  seo,
  preview,
  snapshot,
}: {
  title: string
  heroImage: string | null
  seo: SEO
  preview: boolean
  snapshot: DocumentSnapshot | null
}) {
  const [previewWidth, setPreviewWidth] = useState<number | string>('100%')

  return (
    <aside
      aria-label="Post metadata"
      className={
        preview && snapshot
          ? 'flex flex-col border-l border-border max-[699px]:border-l-0 max-[699px]:border-t'
          : 'flex flex-col gap-[22px] border-l border-border pb-[40px] pl-[40px] pr-[var(--admin-gutter)] pt-[30px] max-[1399px]:pl-[28px] max-[699px]:border-l-0 max-[699px]:border-t max-[699px]:px-[var(--admin-gutter)] max-[699px]:py-[24px]'
      }
      style={{
        width:
          preview && snapshot
            ? previewWidth !== '100%'
              ? `${previewWidth}px`
              : '100%'
            : undefined,
        minWidth:
          preview && snapshot && previewWidth === '100%' ? '400px' : undefined,
      }}
    >
      <SidebarContents
        title={title}
        heroImage={heroImage}
        seo={seo}
        preview={preview}
        snapshot={snapshot}
        setPreviewWidth={setPreviewWidth}
      />
    </aside>
  )
}
