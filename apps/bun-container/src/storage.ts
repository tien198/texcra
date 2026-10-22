import {
  IMAGE_PROCESSING_LIMITS,
  ImageProcessingError,
} from 'shared/image-processing'
import type { IImageStorage, StorageWrite } from 'shared/image-processing'

export type HttpFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

export class R2BridgeStorage implements IImageStorage {
  constructor(private readonly fetcher: HttpFetcher = fetch) {}

  async putObject(object: StorageWrite, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted()
    if (
      !Number.isSafeInteger(object.contentLength) ||
      object.contentLength <= 0 ||
      object.contentLength > IMAGE_PROCESSING_LIMITS.maxOutputBytes ||
      !/^media\/[a-f0-9-]+\/[a-f0-9-]+-(?:original|thumbnail|square|small|medium|large|xlarge|og)\.(?:jpg|png|webp|avif)$/.test(
        object.r2Key,
      )
    ) {
      throw new ImageProcessingError('STORAGE_FAILED', 'Invalid bridge write')
    }
    try {
      const response = await this.fetcher(
        `http://r2.internal/${object.r2Key}`,
        {
          method: 'PUT',
          headers: {
            'content-type': object.contentType,
            'content-length': String(object.contentLength),
            'cache-control': 'public, max-age=31536000, immutable',
          },
          body: object.body,
          signal,
          redirect: 'error',
        },
      )
      // The bridge response is an acknowledgement; never buffer its body.
      await response.body?.cancel()
      if (!response.ok)
        throw new Error(`Bridge rejected upload (${response.status})`)
      signal?.throwIfAborted()
    } catch (error) {
      signal?.throwIfAborted()
      throw new ImageProcessingError(
        'STORAGE_FAILED',
        error instanceof Error ? error.message : 'Bridge write failed',
      )
    }
  }
}
