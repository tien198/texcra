import { createServerFn } from '@tanstack/react-start'
import { getPostById } from './queries.ts'

export const getPostByIdServerFn = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .validator((data: { id: string }) => {
    if (!data.id) {
      throw new Error('Post ID is required')
    }
    return { id: data.id }
  })
  .handler(async ({ data }) => {
    // Simulated network delay to test SSR streaming
    // await new Promise((resolve) => setTimeout(resolve, 2000))

    const post = await getPostById(data.id)

    if (!post) {
      throw new Error(`Post not found: ${data.id}`)
    }

    return post
  })
