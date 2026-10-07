import type { SerializedEditorState } from 'lexical'
import { getDb } from '../db'
import type { Post } from './types'

export async function getPostById(
  id: string | number,
): Promise<Post | undefined> {
  const db = getDb()

  const post = await db.query.posts.findFirst({
    where: { id: Number(id) },
    with: {
      heroImage: true,
      authors: true,
      categories: true,
    },
  })

  if (!post) {
    return undefined
  }

  return {
    id: post.id,
    title: post.title || '',
    slug: post.slug || '',
    status: post.status ?? 'draft',
    meta_title: post.metaTitle ?? undefined,
    meta_description: post.metaDescription ?? undefined,
    meta_image_id: post.metaImageId ? String(post.metaImageId) : undefined,
    heroImage: post.heroImage
      ? {
          id: post.heroImage.id,
          url: post.heroImage.url || '',
          alt: post.heroImage.alt ?? undefined,
          filename: post.heroImage.filename ?? undefined,
          mimeType: post.heroImage.mimeType ?? undefined,
          width:
            post.heroImage.width != null
              ? Number(post.heroImage.width)
              : undefined,
          height:
            post.heroImage.height != null
              ? Number(post.heroImage.height)
              : undefined,
        }
      : null,
    authors: post.authors.map((u) => ({
      id: u.id,
      name: u.name ?? undefined,
      email: u.email,
    })),
    categories: post.categories.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
    })),
    content: (typeof post.content === 'string'
      ? JSON.parse(post.content)
      : post.content) as SerializedEditorState,
    publishedAt: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : null,
    createdAt: new Date(post.createdAt).toISOString(),
    updatedAt: new Date(post.updatedAt).toISOString(),
  }
}
