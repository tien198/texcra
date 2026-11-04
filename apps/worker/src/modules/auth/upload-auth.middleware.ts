import { ImageProcessingError } from 'shared/image-processing'
import { createAuthMiddleware } from './auth.middleware'
import { ImageHttpResponder } from '#/modules/media/http'

export function createUploadAuthMiddleware() {
  return createAuthMiddleware({
    onUnauthorized: () =>
      ImageHttpResponder.getInstance().toErrorResponse(
        new ImageProcessingError(
          'UNAUTHORIZED',
          'Authentication is required to upload images.',
        ),
      ),
    onError: (error) => ImageHttpResponder.getInstance().toErrorResponse(error),
  })
}

export const uploadAuthMiddleware = createUploadAuthMiddleware()
