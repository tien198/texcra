import { ImageProcessingError } from 'shared/image-processing'
import type { IImageStorage, StorageWrite } from 'shared/image-processing'
import { APP_CONFIG } from './config'

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
      object.contentLength > APP_CONFIG.storage.maxOutputBytes ||
      !APP_CONFIG.storage.r2KeyPattern.test(object.r2Key)
    ) {
      throw new ImageProcessingError('STORAGE_FAILED', 'Invalid bridge write')
    }
    try {
      const response = await this.fetcher(
        `${APP_CONFIG.storage.bridgeOrigin}/${object.r2Key}`,
        {
          method: 'PUT',
          headers: {
            'content-type': object.contentType,
            'content-length': String(object.contentLength),
            'cache-control': APP_CONFIG.storage.cacheControl,
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

export const storage = new R2BridgeStorage()
