import type React from 'react'
import { $getNodeByKey } from 'lexical'
import { X } from 'lucide-react'
import { $isBlockNode } from '#/lexical/-block-node'
import type { BlockComponentProps } from './-registry'
import { ImageUpload } from '#/components/image-upload'

export type ImageUploadBlockData = {
  value?: string | null
  label?: string
}

export function ImageUploadBlock({
  data,
  nodeKey,
  editor,
}: BlockComponentProps<ImageUploadBlockData>) {
  const handleChange = (newValue: string | null) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isBlockNode(node)) {
        node.setBlockData({ value: newValue })
      }
    })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (node) {
        node.remove()
      }
    })
  }

  return (
    <div className="group/image-block relative w-full">
      <button
        type="button"
        onClick={handleDelete}
        className="absolute top-1 right-1 z-10 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all hover:bg-black/5 hover:text-foreground group-hover/image-block:opacity-100 focus-visible:opacity-100 dark:hover:bg-white/10"
        aria-label="Delete image block"
        title="Delete image block"
      >
        <X className="size-3.5" />
      </button>
      <ImageUpload
        label={data.label ?? 'Image'}
        value={data.value ?? null}
        onChange={handleChange}
      />
    </div>
  )
}
