import { createFileRoute } from '@tanstack/react-router'
import { getCloudflareBindings } from '#/cloudflare/bindings'
import { handleImageUpload } from '#/modules/media/application/upload-image.use-case'
import { uploadAuthMiddleware } from '#/modules/auth'

export { handleImageUpload } from '#/modules/media/application/upload-image.use-case'
export {
  createUploadAuthMiddleware,
  uploadAuthMiddleware,
} from '#/modules/auth'
export {
  parseIncomingUploadMetadata,
  validateIdentifier,
} from '#/modules/media/application/upload-metadata.parser'
export {
  IDEMPOTENCY_KEY_HEADER,
  LEASE_TICKET_HEADER,
} from '#/modules/media/application/upload-image.types'
export type {
  HandleImageUploadDependencies,
  IncomingUploadMetadata,
  UploadRouteBindings,
  WorkflowInstanceStub,
} from '#/modules/media/application/upload-image.types'

export const Route = createFileRoute('/api/upload')({
  server: {
    middleware: [uploadAuthMiddleware],
    handlers: {
      POST: ({ request }) =>
        handleImageUpload(request, getCloudflareBindings(request)),
    },
  },
})
