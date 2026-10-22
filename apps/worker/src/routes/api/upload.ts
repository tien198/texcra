import { createFileRoute } from '@tanstack/react-router'
import { handleImageUpload } from '#/server/upload-handler'
import { getCloudflareBindings } from '#/server/runtime-bindings'

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleImageUpload(request, getCloudflareBindings(request)),
    },
  },
})
