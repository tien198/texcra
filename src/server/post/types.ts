import type { SerializedEditorState } from 'lexical'

/** Single post document — matches Payload CMS response shape. */
export type Post = {
  id: number | string
  title: string
  content: SerializedEditorState
  slug: string
  heroImage?: Media | string | null
  authors?: User[] | string[]
  categories?: Category[] | string[]
  publishedAt?: string | null
  status?: 'draft' | 'published'
  createdAt: string
  updatedAt: string
  meta_title?: string
  meta_description?: string
  meta_image_id?: string
}

export type Media = {
  id: number | string
  url: string
  alt?: string
  filename?: string
  mimeType?: string
  width?: number
  height?: number
}

export type User = {
  id: number | string
  name?: string
  email?: string
}

export type Category = {
  id: number | string
  title: string
  slug?: string
}

export type CmsError = {
  message: string
  status?: number
  errors?: Array<{ message: string; field?: string }>
}
