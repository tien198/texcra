import type { SerializedEditorState } from 'lexical'

export type SEO = {
  title: string
  description: string
  image: string | null
  canonicalUrl: string
}

export type DocumentSnapshot = {
  json: SerializedEditorState
  html: string
  text: string
  words: number
  headings: { key: string; text: string; level: number }[]
  images: { alt: string }[]
}

export type ImagePayload = { src: string; alt: string; caption: string }

export const DEFAULT_SEO: SEO = {
  title: '',
  description:
    'Good writing starts with a little space to think. Turn your next idea into a thoughtful article with clear headings, useful details, and a voice of your own.',
  image: null,
  canonicalUrl: '',
}

export const DEFAULT_TITLE = 'A little space for your next big idea'
export const DEFAULT_HERO_IMAGE = null

export function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

export function isLinkUrl(value: string): boolean {
  return isWebUrl(value) || /^mailto:[^\s@]+@[^\s@]+$/.test(value)
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  )
}
