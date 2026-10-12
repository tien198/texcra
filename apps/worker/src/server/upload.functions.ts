import { createServerFn } from '@tanstack/react-start'

export const uploadImageServerFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    return data
  })
  .handler(async ({ data }) => {
    const file = data.get('file')
    if (!file || typeof file === 'string') {
      throw new Error('No file uploaded or invalid file format')
    }

    // Simulate server-side processing delay to upload image
    // await new Promise((resolve) => setTimeout(resolve, 800))

    // Read file content and encode to base64 Data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type || 'image/jpeg'
    const base64 = buffer.toString('base64')

    return `data:${mimeType};base64,${base64}`
  })
