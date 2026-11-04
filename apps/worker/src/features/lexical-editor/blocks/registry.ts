import type React from 'react'
import type { LexicalEditor } from 'lexical'
import { BannerBlock } from './BannerBlock'
import { CTABlock } from './CTABlock'
import { ImageUploadBlock } from './ImageUploadBlock'

export type BlockComponentProps<T = any> = {
  data: T
  nodeKey: string
  editor: LexicalEditor
}

export type BlockConfig<T = any> = {
  type: string
  Component: React.FC<BlockComponentProps<T>>
  defaultData: T
}

export const BLOCK_REGISTRY: Record<string, BlockConfig | undefined> = {
  banner: {
    type: 'banner',
    Component: BannerBlock,
    defaultData: {
      style: 'info',
      title: 'New Banner',
      description: 'Banner description...',
    },
  },
  cta: {
    type: 'cta',
    Component: CTABlock,
    defaultData: { title: 'Call to Action', buttonText: 'Click Me' },
  },
  'image-upload': {
    type: 'image-upload',
    Component: ImageUploadBlock,
    defaultData: {
      value: null,
      label: 'Image',
    },
  },
}
