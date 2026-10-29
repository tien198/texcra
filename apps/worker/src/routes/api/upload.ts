import { createFileRoute } from '@tanstack/react-router'
import { getCloudflareBindings } from '#/server/runtime-bindings'
import { handleImageUpload } from './-upload/handler'

export { handleImageUpload } from './-upload/handler'
export {
  parseIncomingUploadMetadata,
  validateIdentifier,
} from './-upload/metadata'
export {
  IDEMPOTENCY_KEY_HEADER,
  LEASE_TICKET_HEADER,
} from './-upload/types'
export type {
  ContainerSidecarStub,
  CoordinatorShardStub,
  HandleImageUploadDependencies,
  IncomingUploadMetadata,
  UploadRouteBindings,
  WorkflowInstanceStub,
} from './-upload/types'

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleImageUpload(request, getCloudflareBindings(request)),
    },
  },
})
