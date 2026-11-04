import { ImageProcessingError } from 'shared/image-processing'

const DEFAULT_MAX_JSON_BYTES = 64 * 1024

export class BoundedJsonReader {
  private static readonly instances = new Map<number, BoundedJsonReader>()

  public constructor(
    private readonly defaultMaxBytes: number = DEFAULT_MAX_JSON_BYTES,
  ) {}

  public static getInstance(
    defaultMaxBytes: number = DEFAULT_MAX_JSON_BYTES,
  ): BoundedJsonReader {
    let instance = BoundedJsonReader.instances.get(defaultMaxBytes)
    if (!instance) {
      instance = new BoundedJsonReader(defaultMaxBytes)
      BoundedJsonReader.instances.set(defaultMaxBytes, instance)
    }
    return instance
  }

  /** Only small JSON control responses are buffered, with a hard byte ceiling. */
  public async read(
    response: Response,
    maxBytes: number = this.defaultMaxBytes,
  ): Promise<unknown> {
    if (!response.body) {
      throw new ImageProcessingError(
        'INTERNAL_ERROR',
        'The processor returned an empty response.',
      )
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8', { fatal: true })
    let bytes = 0
    let text = ''
    try {
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        bytes += chunk.value.byteLength
        if (bytes > maxBytes) {
          throw new ImageProcessingError(
            'INTERNAL_ERROR',
            'The processor response was too large.',
          )
        }
        text += decoder.decode(chunk.value, { stream: true })
      }
      text += decoder.decode()
      return JSON.parse(text)
    } catch (error) {
      await reader.cancel(error).catch(() => undefined)
      throw error
    } finally {
      reader.releaseLock()
    }
  }
}
